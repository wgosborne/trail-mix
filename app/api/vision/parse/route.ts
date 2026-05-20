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
              text: `You are a grocery receipt parser for any store (Kroger, Aldi, Walmart, etc.). Extract every product from this receipt with best-effort accuracy.

EXTRACTION RULES:
1. Scan the entire receipt for all product/item lines (ignore totals, taxes, payment info)
2. For each item, extract:
   - "name": Product name/description (clean, readable, no quantity/unit in the name)
   - "quantity": Number from the product description or item line (required, at least 1)
   - "unit": Unit of measure if visible (oz, lbs, g, count, ct, ea, lb, gallon, etc.)

IMPORTANT - Handle OCR challenges:
- If text is unclear/blurry, do your BEST to read it (don't skip items)
- Preserve brand names and product types as clearly as possible
- Extract quantity from product descriptions:
  - "Tyson Frozen Chicken, 18 oz" → quantity: 18, unit: "oz", name: "Tyson Frozen Chicken"
  - "Eggs, 1 dz" → quantity: 12, unit: "count", name: "Eggs"
  - "Milk" (no size shown) → quantity: 1, unit: "count", name: "Milk"
  - "Apples 3 lb" → quantity: 3, unit: "lbs", name: "Apples"

Return ONLY valid JSON:
{
  "items": [
    { "name": "Product Name", "quantity": 1, "unit": "count" }
  ]
}

SPECIAL CASES:
- If an item appears twice on receipt, extract it twice (user may have bought multiples)
- Quantity must be a positive number; default to 1 if not readable
- Unit can be empty string "" if not clearly visible
- Name should be readable and clean (the user will review and can fix typos)

If no items found, return: { "items": [] }
Otherwise, return ALL items found, even if text is unclear.`,
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
