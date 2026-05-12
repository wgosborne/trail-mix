/**
 * Determine macro category tags for a grocery item based on caloric percentages
 * Based on nutritional science: protein & carbs = 4 cal/g, fat = 9 cal/g
 */

export type MacroTag = 'High Protein' | 'High Carb' | 'High Fat' | 'Low Fat';

interface Nutrition {
  protein: number;
  carbs: number;
  fat: number;
  calories?: number; // optional, will be calculated if not provided
}

/**
 * Calculate total calories from macros
 * Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
 */
function calculateCalories(nutrition: Nutrition): number {
  if (nutrition.calories && nutrition.calories > 0) {
    return nutrition.calories;
  }
  return nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9;
}

/**
 * Get applicable macro tags for a grocery item based on caloric percentages
 * Thresholds based on nutritional science and USDA standards:
 * - High Protein: protein contributes ≥25% of total calories (excellent protein source)
 * - High Carb: carbs contribute ≥45% of total calories (significant carb source)
 * - High Fat: fat contributes ≥30% of total calories (significant fat source)
 * - Low Fat: fat contributes <10% of total calories (minimal fat content)
 *
 * These thresholds account for realistic food compositions and ensure items
 * don't get misclassified just because quantity is large.
 */
export function getMacroTags(nutrition: Nutrition): MacroTag[] {
  const tags: MacroTag[] = [];

  // Guard against invalid nutrition data
  if (!nutrition.protein || !nutrition.carbs || !nutrition.fat) {
    return tags;
  }

  const totalCalories = calculateCalories(nutrition);

  // Avoid division by zero
  if (totalCalories <= 0) {
    return tags;
  }

  // Calculate percentage of calories from each macro
  const proteinCalories = nutrition.protein * 4;
  const carbCalories = nutrition.carbs * 4;
  const fatCalories = nutrition.fat * 9;

  const proteinPercentage = (proteinCalories / totalCalories) * 100;
  const carbPercentage = (carbCalories / totalCalories) * 100;
  const fatPercentage = (fatCalories / totalCalories) * 100;

  // Apply thresholds based on caloric percentages
  if (proteinPercentage >= 25) {
    tags.push('High Protein');
  }

  if (carbPercentage >= 45) {
    tags.push('High Carb');
  }

  if (fatPercentage >= 30) {
    tags.push('High Fat');
  } else if (fatPercentage < 10) {
    tags.push('Low Fat');
  }

  return tags;
}

/**
 * Get color for a specific macro tag
 * Colors updated to use professional red, blue, and green palette
 */
export function getTagColor(tag: MacroTag): { bg: string; border: string; text: string } {
  switch (tag) {
    case 'High Protein':
      // RED: High impact, essential macro
      return { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B' };
    case 'High Carb':
      // BLUE: Cool, energetic macro
      return { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF' };
    case 'High Fat':
      // GREEN: Balanced/healthy fat indicator
      return { bg: '#F0FDF4', border: '#16A34A', text: '#166534' };
    case 'Low Fat':
      // Light gray-green accent
      return { bg: '#F0FDF4', border: '#86EFAC', text: '#4B7C59' };
    default:
      return { bg: '#F5F5F5', border: '#CCCCCC', text: '#666666' };
  }
}
