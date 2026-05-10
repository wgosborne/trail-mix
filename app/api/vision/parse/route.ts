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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
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
              text: `You are a receipt parser. Extract ALL grocery items from this receipt. For each item, provide:
1. Item name (product description)
2. Quantity (number - just the number, e.g., 2, 5.5)
3. Unit (lbs, oz, count, cups, g, kg, ml, etc.)

Return ONLY valid JSON (no markdown, no code blocks, no explanation):
{
  "items": [
    { "name": "Chicken Breast", "quantity": 2, "unit": "lbs" },
    { "name": "Brown Rice", "quantity": 5, "unit": "lbs" }
  ]
}

If this is not a grocery receipt, still attempt extraction. If extraction fails or no items found, return: { "items": [] }`,
            },
          ],
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Clean the response (remove markdown if present)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    // Validate and parse JSON
    const parsed = JSON.parse(jsonText);

    // Ensure items array exists and contains valid entries
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    // Filter and validate items
    parsed.items = parsed.items.filter((item: any) => {
      return item.name && typeof item.name === 'string' &&
             item.quantity && typeof item.quantity === 'number' && item.quantity > 0 &&
             item.unit && typeof item.unit === 'string';
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Vision parsing error:', error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
