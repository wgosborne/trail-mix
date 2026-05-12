import { z } from 'zod';

// Grocery validation schema
export const grocerySchema = z.object({
  foodName: z.string()
    .min(1, 'Food name is required')
    .max(255, 'Food name must be 255 characters or less'),
  quantityBought: z.number()
    .positive('Quantity must be greater than 0'),
  unit: z.enum(['lbs', 'oz', 'g', 'count', 'cups', 'ct', 'ea', 'gallon', 'ml', 'L']).refine(
    val => ['lbs', 'oz', 'g', 'count', 'cups', 'ct', 'ea', 'gallon', 'ml', 'L'].includes(val),
    { message: 'Invalid unit. Choose from: lbs, oz, g, count, cups, ct, ea, gallon, ml, L' }
  ),
  totalCalories: z.number().nonnegative('Calories must be 0 or greater').optional().nullable(),
  proteinG: z.number().nonnegative('Protein must be 0 or greater').optional().nullable(),
  carbsG: z.number().nonnegative('Carbs must be 0 or greater').optional().nullable(),
  fatG: z.number().nonnegative('Fat must be 0 or greater').optional().nullable(),
  fiberG: z.number().nonnegative('Fiber must be 0 or greater').optional().nullable(),
  percentConsumed: z.number()
    .min(0, 'Percent consumed must be 0 or greater')
    .max(100, 'Percent consumed cannot exceed 100')
    .optional()
    .default(0),
  dateAdded: z.string().date('Invalid date format (YYYY-MM-DD)').optional(),
});

// Grocery update schema (partial)
export const groceryUpdateSchema = z.object({
  percentConsumed: z.number()
    .min(0, 'Percent consumed must be 0 or greater')
    .max(100, 'Percent consumed cannot exceed 100')
    .optional(),
  foodName: z.string()
    .min(1, 'Food name is required')
    .max(255, 'Food name must be 255 characters or less')
    .optional(),
  totalCalories: z.number().nonnegative('Calories must be 0 or greater').optional().nullable(),
  proteinG: z.number().nonnegative('Protein must be 0 or greater').optional().nullable(),
  carbsG: z.number().nonnegative('Carbs must be 0 or greater').optional().nullable(),
  fatG: z.number().nonnegative('Fat must be 0 or greater').optional().nullable(),
  fiberG: z.number().nonnegative('Fiber must be 0 or greater').optional().nullable(),
}).strict();

// User goals/targets schema
export const userGoalsSchema = z.object({
  dailyCalGoal: z.number()
    .positive('Daily calorie goal must be greater than 0')
    .max(10000, 'Daily calorie goal cannot exceed 10000'),
  dailyProteinG: z.number()
    .positive('Daily protein goal must be greater than 0')
    .max(500, 'Daily protein goal cannot exceed 500'),
  dailyCarbsG: z.number()
    .positive('Daily carbs goal must be greater than 0')
    .max(1000, 'Daily carbs goal cannot exceed 1000'),
  dailyFatG: z.number()
    .positive('Daily fat goal must be greater than 0')
    .max(500, 'Daily fat goal cannot exceed 500'),
});

// Receipt upload schema
export const receiptSchema = z.object({
  imageBase64: z.string()
    .min(100, 'Invalid image - image appears to be too small'),
});

// USDA search schema
export const usesSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be 100 characters or less'),
});

// Strava disconnect confirmation (simple body)
export const confirmationSchema = z.object({
  confirm: z.boolean()
    .refine(val => val === true, { message: 'Confirmation required' })
});

// Helper function to format validation errors for the user
export function formatValidationError(error: z.ZodError<any>): string {
  const issues = error.issues || [];
  if (issues.length > 0) {
    const firstIssue = issues[0];
    if (firstIssue.path.length > 0) {
      const field = String(firstIssue.path[0]);
      return `${field}: ${firstIssue.message}`;
    }
    return firstIssue.message || 'Validation failed';
  }
  return 'Validation failed';
}
