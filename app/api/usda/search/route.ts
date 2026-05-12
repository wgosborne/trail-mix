import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { groceryLookup } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { normalizeName } from '@/lib/grocery-lookup';

const client = new Anthropic();

interface SearchResult {
  id: string;
  name: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'validation_error', message: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedQuery.length > 100) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Query is too long (max 100 characters)' },
        { status: 400 }
      );
    }

    // Check grocery lookup cache and prepend cached result if found
    const cachedRows = await db
      .select()
      .from(groceryLookup)
      .where(eq(groceryLookup.normalizedName, normalizeName(trimmedQuery)))
      .limit(1);
    const cachedResult: SearchResult | null =
      cachedRows.length > 0
        ? {
            id: cachedRows[0].id,
            name: cachedRows[0].normalizedName,
            servingSize: 1,
            servingSizeUnit: cachedRows[0].unit,
            nutrition: {
              calories: Number(cachedRows[0].calories),
              protein: Number(cachedRows[0].proteinG),
              carbs: Number(cachedRows[0].carbsG),
              fat: Number(cachedRows[0].fatG),
              fiber: cachedRows[0].fiberG ? Number(cachedRows[0].fiberG) : undefined,
            },
            source: 'Lookup',
          }
        : null;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a nutrition database assistant. For the food item: "${trimmedQuery}"

Return ONLY valid JSON with nutrition information for a standard serving. Include:
- name: The food name (cleaned, no extra details)
- servingSize: Standard serving amount (e.g., 100 for 100g, 1 for 1 cup)
- servingSizeUnit: Unit of serving (g, cup, oz, count, etc.)
- nutrition: calories, protein (g), carbs (g), fat (g), fiber (g)

Return as a single food object. All nutrition values must be per serving. Estimate if needed.

Example response:
{
  "name": "Grilled Chicken Breast",
  "servingSize": 100,
  "servingSizeUnit": "g",
  "nutrition": {
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6,
    "fiber": 0
  }
}

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

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[CLAUDE-SEARCH] Failed to parse Claude response:', jsonText.substring(0, 500));
      throw parseError;
    }

    // Validate and transform response
    const caloriesValue = parsed.nutrition?.calories ?? 0;
    const proteinValue = parsed.nutrition?.protein ?? 0;
    const carbsValue = parsed.nutrition?.carbs ?? 0;
    const fatValue = parsed.nutrition?.fat ?? 0;
    const fiberValue = parsed.nutrition?.fiber ?? undefined;

    const result: SearchResult = {
      id: `claude-${Date.now()}`,
      name: parsed.name || trimmedQuery,
      servingSize: parsed.servingSize,
      servingSizeUnit: parsed.servingSizeUnit,
      nutrition: {
        calories: Math.round(caloriesValue),
        protein: Math.round(proteinValue * 100) / 100,
        carbs: Math.round(carbsValue * 100) / 100,
        fat: Math.round(fatValue * 100) / 100,
        fiber: fiberValue !== undefined ? Math.round(fiberValue * 100) / 100 : undefined,
      },
    };

    // Only return if we have actual data from Claude (parsed successfully)
    if (parsed.nutrition === undefined || parsed.nutrition === null) {
      return NextResponse.json(
        {
          error: 'no_nutrition_found',
          results: [],
          suggestion: `No nutrition data found for "${trimmedQuery}". Try a different search.`,
        },
        { status: 200 }
      );
    }

    // Prepend cached result if available, then add Claude result
    const results = cachedResult ? [cachedResult, result] : [result];

    return NextResponse.json({
      results,
      query: trimmedQuery,
      count: results.length,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[CLAUDE-SEARCH] Invalid JSON:', error);
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.error('[CLAUDE-SEARCH] Error:', error);
    return NextResponse.json(
      {
        error: 'search_error',
        results: [],
        message: 'Failed to get nutrition information. Please try again.',
      },
      { status: 200 }
    );
  }
}
