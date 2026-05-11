import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

interface NutritionResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName } = body;

    if (!productName || typeof productName !== 'string') {
      return NextResponse.json(
        { error: 'Product name required' },
        { status: 400 }
      );
    }

    // Use Claude to get nutrition data
    const result = await getClaudeNutrition(productName);

    if (result) {
      return NextResponse.json({ results: [result] });
    }
    return NextResponse.json({
      error: 'no_results',
      results: [],
      message: 'Claude couldn\'t find nutrition data for this product.',
    });
  } catch (error) {
    console.error('Nutrition search error:', error);
    return NextResponse.json(
      { error: 'search_error', message: 'Failed to search nutrition data' },
      { status: 500 }
    );
  }
}

async function getClaudeNutrition(productName: string): Promise<NutritionResult | null> {
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Look up the nutrition facts for: "${productName}"

Return ONLY a JSON object with this format (no other text):
{
  "calories": <number>,
  "protein": <grams>,
  "carbs": <grams>,
  "fat": <grams>
}

If this is a branded product, use the standard nutrition label. If generic, use typical values. Return null if you cannot find reliable data.`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return null;
    }

    const text = textContent.text.trim();

    // Parse the JSON response
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (!jsonMatch) return null;
      data = JSON.parse(jsonMatch[0]);
    }

    if (data && data.calories && data.protein !== undefined && data.carbs !== undefined && data.fat !== undefined) {
      return {
        name: productName,
        calories: parseFloat(data.calories) || 0,
        protein: parseFloat(data.protein) || 0,
        carbs: parseFloat(data.carbs) || 0,
        fat: parseFloat(data.fat) || 0,
        source: 'Claude',
      };
    }

    return null;
  } catch (error) {
    console.error('[CLAUDE] Error:', error);
    return null;
  }
}
