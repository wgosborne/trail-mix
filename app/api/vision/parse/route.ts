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
2. Quantity (number)
3. Unit (lbs, oz, count, cups, etc.)

Return ONLY valid JSON (no markdown, no code blocks):
{
  "items": [
    { "name": "Chicken Breast", "quantity": 2, "unit": "lbs" },
    { "name": "Brown Rice", "quantity": 5, "unit": "lbs" }
  ]
}

If this is not a grocery receipt, still attempt extraction. If extraction fails, return: { "items": [] }`,
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

    const parsed = JSON.parse(jsonText);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Vision parsing error:', error);
    return NextResponse.json({ error: 'Parsing failed', items: [] }, { status: 500 });
  }
}
