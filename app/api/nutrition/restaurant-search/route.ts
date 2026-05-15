import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { groceryLookup } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { normalizeName } from '@/lib/grocery-lookup';

const client = new Anthropic();

interface RestaurantNutrition {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedQuery.length > 200) {
      return NextResponse.json(
        { error: 'Query is too long (max 200 characters)' },
        { status: 400 }
      );
    }

    // Check grocery lookup table first
    const cachedRows = await db
      .select()
      .from(groceryLookup)
      .where(eq(groceryLookup.normalizedName, normalizeName(trimmedQuery)))
      .limit(1);

    if (cachedRows.length > 0) {
      const cached = cachedRows[0];
      const result: RestaurantNutrition = {
        name: cached.normalizedName,
        calories: Math.round(Number(cached.calories) || 0),
        protein: Math.round(Number(cached.proteinG) * 100) / 100 || 0,
        carbs: Math.round(Number(cached.carbsG) * 100) / 100 || 0,
        fat: Math.round(Number(cached.fatG) * 100) / 100 || 0,
      };
      return NextResponse.json({ result }, { status: 200 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a restaurant nutrition database. Look up nutrition facts for this restaurant meal or order: "${trimmedQuery}"

This is likely a meal from a restaurant (e.g., McDonald's, Chipotle, Panera, Olive Garden, etc.). Use known nutrition facts from major restaurant chains. For generic descriptions, estimate based on typical restaurant portions (assume regular/medium size unless specified otherwise).

Return ONLY valid JSON with nutrition for the ENTIRE meal as described:
{
  "name": "Clean meal name (remove restaurant name unless needed for clarity)",
  "calories": <total calories for the whole meal>,
  "protein": <grams of protein>,
  "carbs": <grams of carbs>,
  "fat": <grams of fat>
}

Examples:
- "Big Mac" → name: "McDonald's Big Mac", calories: 550, protein: 25, carbs: 45, fat: 30
- "Chipotle chicken bowl" → name: "Chipotle Chicken Bowl", calories: 650, protein: 38, carbs: 65, fat: 17
- "Panera Mediterranean Salad" → name: "Panera Mediterranean Salad", calories: 520, protein: 24, carbs: 38, fat: 28

Return ONLY the JSON object, no markdown or extra text.`,
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

    let result: RestaurantNutrition;
    try {
      const parsed = JSON.parse(jsonText);
      result = {
        name: parsed.name || trimmedQuery,
        calories: Math.round(parsed.calories || 0),
        protein: Math.round(parsed.protein * 100) / 100 || 0,
        carbs: Math.round(parsed.carbs * 100) / 100 || 0,
        fat: Math.round(parsed.fat * 100) / 100 || 0,
      };
    } catch (parseError) {
      console.error('[RESTAURANT-SEARCH] Failed to parse Claude response:', jsonText.substring(0, 500));
      throw parseError;
    }

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error('[RESTAURANT-SEARCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to look up restaurant meal. Please try again.' },
      { status: 500 }
    );
  }
}
