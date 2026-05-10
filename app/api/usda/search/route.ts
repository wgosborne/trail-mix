import { NextRequest, NextResponse } from 'next/server';

interface USDAFood {
  fdcId: string;
  description: string;
  foodNutrients: Array<{
    nutrientId: number;
    value: number;
  }>;
}

interface SearchResult {
  fdcId: string;
  name: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
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

    // Verify API key is configured
    if (!process.env.USDA_API_KEY) {
      console.error('USDA_API_KEY not configured');
      return NextResponse.json(
        { error: 'server_error', message: 'USDA API not configured' },
        { status: 500 }
      );
    }

    // Call USDA API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response: Response;
    try {
      response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(trimmedQuery)}&pageSize=5&api_key=${process.env.USDA_API_KEY}`,
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'no_nutrition_found', results: [], suggestion: 'Try a different search term' },
          { status: 200 }
        );
      }
      throw new Error(`USDA API returned ${response.status}`);
    }

    const data = await response.json();

    // Parse and transform results
    const results: SearchResult[] = (data.foods || [])
      .map((food: USDAFood) => {
        const nutrients = food.foodNutrients || [];

        const getNutrient = (id: number): number => {
          const nutrient = nutrients.find((n) => n.nutrientId === id);
          return nutrient?.value ? Math.round(nutrient.value * 100) / 100 : 0;
        };

        return {
          fdcId: food.fdcId,
          name: food.description,
          nutrition: {
            calories: getNutrient(1008), // Energy (kcal)
            protein: getNutrient(1003), // Protein (g)
            carbs: getNutrient(1005), // Carbohydrates (g)
            fat: getNutrient(1004), // Total lipid (fat) (g)
            fiber: getNutrient(1079), // Fiber, total dietary (g)
          },
        };
      })
      .filter(
        // Only include foods with at least calories and protein data
        (result: SearchResult) => result.nutrition.calories > 0 || result.nutrition.protein > 0
      );

    if (results.length === 0) {
      return NextResponse.json(
        {
          error: 'no_nutrition_found',
          results: [],
          suggestion: `No results found for "${trimmedQuery}". Try a different search.`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      results,
      query: trimmedQuery,
      count: results.length,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Invalid JSON:', error);
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('USDA search timeout:', error);
      return NextResponse.json(
        { error: 'timeout', message: 'USDA search timed out. Please try again.' },
        { status: 504 }
      );
    }

    console.error('USDA search error:', error);
    return NextResponse.json(
      { error: 'search_error', message: 'Failed to search nutrition database' },
      { status: 500 }
    );
  }
}
