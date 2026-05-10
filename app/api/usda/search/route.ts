import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query } = body;

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${process.env.USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('USDA API error');
    }

    const data = await response.json();

    const results = data.foods?.map((food: any) => {
      const nutrients = food.foodNutrients || [];
      const getNutrient = (id: number) => {
        const nutrient = nutrients.find((n: any) => n.nutrientId === id);
        return nutrient?.value || 0;
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
    }) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('USDA search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
