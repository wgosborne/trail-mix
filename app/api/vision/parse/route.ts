import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imageBase64 } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: 'Image required' }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are a Kroger receipt parser. Extract every grocery product from this receipt with accurate quantities and units.

EXTRACTION RULES:
1. Find EVERY product/item in the "Items" or "Groceries" section
2. For each item, extract:
   - "name": Product description (remove quantity/unit from name)
   - "quantity": Number from the product description or receipt (required)
   - "unit": Unit of measure (oz, lbs, g, count, ct, ea, etc.)

IMPORTANT - Extract quantity from product names:
- "Tyson Frozen Chicken, 18 oz" → quantity: 18, unit: "oz", name: "Tyson Frozen Chicken"
- "Mission Tortillas, 8 ct" → quantity: 8, unit: "ct", name: "Mission Tortillas"
- "Simply Orange, 1 gallon" → quantity: 1, unit: "gallon", name: "Simply Orange"
- "Eggs, 1 dozen" → quantity: 12, unit: "count", name: "Eggs"
- "Milk, 1 gallon" → quantity: 1, unit: "gallon", name: "Milk"
- If no unit/quantity in name, default to: quantity: 1, unit: "count" (ea)

Return ONLY valid JSON:
{
  "items": [
    { "name": "Product Name Only", "quantity": 18, "unit": "oz" },
    { "name": "Another Product", "quantity": 1, "unit": "count" }
  ]
}

SPECIAL CASES:
- Quantity is the number (not including the word "pack", "box", etc.)
- Unit is the abbreviation (oz, lbs, g, ct, ea, count, gallon, etc.)
- Name should be clean and readable (no quantity/unit info)

If no items found, return: { "items": [] }
Otherwise, return ALL items with proper quantity/unit extraction.`,
            },
          ],
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let jsonText = textContent.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```\n?$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```\n?$/, '');
    }

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[VISION] JSON parse error:', parseError);
      throw parseError;
    }

    // Ensure items array exists
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    // Filter and normalize items - be lenient, only require name
    parsed.items = parsed.items
      .filter((item: any) => {
        // Must have a name
        return item.name && typeof item.name === 'string' && item.name.trim().length > 0;
      })
      .map((item: any) => {
        const normalized: any = {
          name: item.name.trim(),
        };
        // Add quantity if it's a valid number
        if (typeof item.quantity === 'number' && item.quantity > 0) {
          normalized.quantity = item.quantity;
        }
        // Add unit if it's a non-empty string
        if (typeof item.unit === 'string' && item.unit.trim().length > 0) {
          normalized.unit = item.unit.trim();
        }
        return normalized;
      });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Vision parsing error:', error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
