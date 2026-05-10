/**
 * USDA Nutrition Database Lookup Helper
 * Searches USDA database for product nutrition data
 */

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

/**
 * Search USDA database for a product and return its nutrition data
 * Returns the top match's nutrition info or null if no match found
 */
export async function searchUSDAAndGetNutrition(productName: string): Promise<NutritionData | null> {
  try {
    const response = await fetch('/api/usda/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: productName }),
    });

    if (!response.ok) {
      console.warn(`USDA search failed for "${productName}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check if we have results
    if (data.results && data.results.length > 0) {
      // Return the first result's nutrition data
      return data.results[0].nutrition;
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
  productNames: string[],
  onProgress?: (index: number, productName: string, nutrition: NutritionData | null) => void
): Promise<(NutritionData | null)[]> {
  const results: (NutritionData | null)[] = [];

  for (let i = 0; i < productNames.length; i++) {
    const productName = productNames[i];
    const nutrition = await searchUSDAAndGetNutrition(productName);
    results.push(nutrition);

    if (onProgress) {
      onProgress(i, productName, nutrition);
    }
  }

  return results;
}
