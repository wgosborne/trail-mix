/**
 * USDA Nutrition Database Lookup Helper
 * Searches USDA database for product nutrition data and scales it based on quantity
 */

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

// Convert units to grams for standardized calculation
function convertToGrams(quantity: number, unit: string): number {
  const conversions: Record<string, number> = {
    'g': 1,
    'oz': 28.3495,
    'lbs': 453.592,
    'lb': 453.592,
    'count': 100, // Assume 100g per item as default
    'ct': 100, // count abbreviation
    'ea': 100, // each
    'cup': 240,
    'cups': 240,
    'ml': 1, // Assume 1ml = 1g for liquids
  };

  const normalizedUnit = unit.toLowerCase().trim();
  const factor = conversions[normalizedUnit] || 100;
  return quantity * factor;
}

/**
 * Simplify product name for better USDA matching
 * Extract core ingredient and basic unit info
 */
function simplifyProductName(name: string): string {
  // Extract core ingredients - look for main protein/food types
  const corePatterns = [
    /\b(chicken|beef|pork|turkey|fish|salmon|tuna|shrimp|eggs?|milk|cheese|yogurt|butter|bread|rice|pasta|beans|vegetables?|fruit|spinach|lettuce|tomato|potato|carrot|broccoli|tortilla|tortillas)\b/i,
  ];

  // Try to find core ingredient
  for (const pattern of corePatterns) {
    const match = name.match(pattern);
    if (match) {
      let simplified = match[0];
      // Add "breast" if chicken is mentioned
      if (simplified.toLowerCase().includes('chicken') && name.toLowerCase().includes('breast')) {
        simplified = 'Chicken Breast';
      }
      return simplified;
    }
  }

  // Fallback: remove brands and descriptors
  let simplified = name
    .replace(/^(Tyson|Great Value|Simply|Kroger|Store Brand|Private Label|Mission)\s+/i, '')
    .replace(/\b(Frozen|Fresh|Organic|Natural|Premium|Pollo Asado)\b/gi, '')
    .replace(/\b(Seasoned|Flavored|Grilled|Roasted|Pulled|Shredded|Seasoning)\b/gi, '')
    .replace(/,.*$/i, '') // Remove everything after comma
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();

  return simplified || name;
}

/**
 * Search USDA for a product and return nutrition scaled to the receipt quantity
 * USDA returns nutrition per 100g, so we scale it based on actual quantity
 */
export async function searchUSDAAndGetNutrition(
  productName: string,
  quantity: number = 1,
  unit: string = 'count'
): Promise<NutritionData | null> {
  try {
    // Use the full product name for better USDA matching
    const searchQuery = productName;

    const response = await fetch('/api/usda/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Check if we have results
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const nutrition = result.nutrition;

      // For "count" items, try to use serving size from USDA
      let scaleFactor = 1;
      if (unit.toLowerCase() === 'count' || unit.toLowerCase() === 'ct' || unit.toLowerCase() === 'ea') {
        // If USDA has serving size, nutrition is per-serving, so just multiply by quantity
        if (result.servingSize && result.servingSizeUnit) {
          scaleFactor = quantity;
        } else {
          // Fallback: estimate based on common items
          const commonWeights: Record<string, number> = {
            'tortilla': 50,
            'egg': 50,
            'slice': 30,
            'count': 100,
          };
          let estimatedGramPerItem = commonWeights[unit.toLowerCase()];

          // If unit not found, check product name
          if (estimatedGramPerItem === undefined) {
            const lowerProductName = productName.toLowerCase();
            if (lowerProductName.includes('tortilla')) {
              estimatedGramPerItem = 50;
            } else if (lowerProductName.includes('egg')) {
              estimatedGramPerItem = 50;
            } else {
              estimatedGramPerItem = 100;
            }
          }

          scaleFactor = (quantity * estimatedGramPerItem) / 100;
        }
      } else {
        const totalGrams = convertToGrams(quantity, unit);
        scaleFactor = totalGrams / 100;
      }

      const scaled = {
        calories: Math.round(nutrition.calories * scaleFactor * 100) / 100,
        protein: Math.round(nutrition.protein * scaleFactor * 100) / 100,
        carbs: Math.round(nutrition.carbs * scaleFactor * 100) / 100,
        fat: Math.round(nutrition.fat * scaleFactor * 100) / 100,
        fiber: nutrition.fiber ? Math.round(nutrition.fiber * scaleFactor * 100) / 100 : undefined,
      };

      return scaled;
    }

    return null;
  } catch (error) {
    console.error(`USDA search error for "${productName}":`, error);
    return null;
  }
}

/**
 * Search for nutrition data from web sources (Nutritionix, FatSecret, etc)
 * Returns all matching options with scaled nutrition for user to pick
 */
export async function searchNutritionOptions(
  productName: string,
  quantity: number = 1,
  unit: string = 'count'
): Promise<Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }> | null> {
  try {
    const response = await fetch('/api/nutrition/google-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Scale nutrition based on quantity
      return data.results.map((result: any) => {
        const nutrition = result;
        let scaleFactor = 1;

        if (unit.toLowerCase() === 'count' || unit.toLowerCase() === 'ct' || unit.toLowerCase() === 'ea') {
          scaleFactor = quantity;
        } else {
          const totalGrams = convertToGrams(quantity, unit);
          scaleFactor = totalGrams / 100;
        }

        return {
          name: nutrition.name,
          calories: Math.round(nutrition.calories * scaleFactor * 100) / 100,
          protein: Math.round(nutrition.protein * scaleFactor * 100) / 100,
          carbs: Math.round(nutrition.carbs * scaleFactor * 100) / 100,
          fat: Math.round(nutrition.fat * scaleFactor * 100) / 100,
        };
      });
    }

    return null;
  } catch (error) {
    console.error(`Nutrition search error for "${productName}":`, error);
    return null;
  }
}

/**
 * Search USDA and return all matching options with scaled nutrition
 * Lets user pick the correct product
 */
export async function searchUSDAGetAllOptions(
  productName: string,
  quantity: number = 1,
  unit: string = 'count'
): Promise<Array<{ id: string; name: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number }> | null> {
  try {
    const searchQuery = productName;

    const response = await fetch('/api/usda/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results.map((result: any) => {
        const nutrition = result.nutrition;

        // Calculate scale factor same as searchUSDAAndGetNutrition
        let scaleFactor = 1;
        if (unit.toLowerCase() === 'count' || unit.toLowerCase() === 'ct' || unit.toLowerCase() === 'ea') {
          if (result.servingSize && result.servingSizeUnit) {
            // USDA nutrition is per-serving, quantity is in units
            // If serving is "1 tortilla" and we have 8, multiply by 8
            scaleFactor = quantity;
          } else {
            const commonWeights: Record<string, number> = {
              'tortilla': 50,
              'egg': 50,
              'slice': 30,
              'count': 100,
            };
            let estimatedGramPerItem = commonWeights[unit.toLowerCase()];

            if (estimatedGramPerItem === undefined) {
              const lowerProductName = productName.toLowerCase();
              if (lowerProductName.includes('tortilla')) {
                estimatedGramPerItem = 50;
              } else if (lowerProductName.includes('egg')) {
                estimatedGramPerItem = 50;
              } else {
                estimatedGramPerItem = 100;
              }
            }

            scaleFactor = (quantity * estimatedGramPerItem) / 100;
          }
        } else {
          const totalGrams = convertToGrams(quantity, unit);
          scaleFactor = totalGrams / 100;
        }

        return {
          id: result.id,
          name: result.name,
          calories: Math.round(nutrition.calories * scaleFactor * 100) / 100,
          protein: Math.round(nutrition.protein * scaleFactor * 100) / 100,
          carbs: Math.round(nutrition.carbs * scaleFactor * 100) / 100,
          fat: Math.round(nutrition.fat * scaleFactor * 100) / 100,
          fiber: nutrition.fiber ? Math.round(nutrition.fiber * scaleFactor * 100) / 100 : undefined,
        };
      });
    }

    return null;
  } catch (error) {
    console.error(`USDA search error for "${productName}":`, error);
    return null;
  }
}

/**
 * Batch lookup nutrition for multiple products
 * Shows progress via callback
 */
export async function batchLookupNutrition(
  items: Array<{ name: string; quantity: number; unit: string }>,
  onProgress?: (index: number, productName: string, nutrition: NutritionData | null) => void
): Promise<(NutritionData | null)[]> {
  const results: (NutritionData | null)[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const nutrition = await searchUSDAAndGetNutrition(item.name, item.quantity, item.unit);
    results.push(nutrition);

    if (onProgress) {
      onProgress(i, item.name, nutrition);
    }
  }

  return results;
}
