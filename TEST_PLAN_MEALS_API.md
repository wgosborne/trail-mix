# Meal API Test Plan

## Implementation Complete

All meal API endpoints have been successfully implemented and are fully functional. The endpoints follow the same patterns as the grocery API with proper validation, error handling, and database integration.

## Implemented Endpoints

### 1. POST /api/meals - Create Meal
Creates a new meal with ingredients.

**Request:**
```json
{
  "mealName": "Chicken & Rice Bowl",
  "description": "Optional meal description",
  "ingredients": [
    {
      "groceryId": "uuid-of-grocery-1",
      "quantityUsed": 0.5
    },
    {
      "groceryId": "uuid-of-grocery-2",
      "quantityUsed": 1.5
    }
  ]
}
```

**Validation:**
- `mealName`: Required, 1-255 characters
- `description`: Optional, max 1000 characters
- `ingredients`: Required, minimum 1 item
  - `groceryId`: Required, valid UUID
  - `quantityUsed`: Required, must be > 0
- All groceries must belong to authenticated user

**Response (201):**
```json
{
  "id": "meal-uuid",
  "mealName": "Chicken & Rice Bowl",
  "description": "Optional meal description",
  "ingredients": [
    {
      "id": "ingredient-uuid",
      "groceryId": "grocery-uuid-1",
      "quantityUsed": 0.5,
      "grocery": {
        "id": "grocery-uuid-1",
        "foodName": "Chicken Breast",
        "unit": "lbs",
        "totalCalories": 660,
        "proteinG": 140,
        "carbsG": 0,
        "fatG": 14
      }
    }
  ],
  "createdAt": "2026-05-12T..."
}
```

**Error Responses:**
- 401: Unauthorized (no session)
- 400: Validation failed (invalid input)
- 404: Grocery not found or doesn't belong to user
- 500: Server error

---

### 2. GET /api/meals - List All Meals
Fetches all meals for the authenticated user with full ingredient details.

**Response (200):**
```json
[
  {
    "id": "meal-uuid",
    "mealName": "Chicken & Rice Bowl",
    "description": "Optional meal description",
    "ingredients": [
      {
        "id": "ingredient-uuid",
        "groceryId": "grocery-uuid-1",
        "quantityUsed": 0.5,
        "grocery": {
          "id": "grocery-uuid-1",
          "foodName": "Chicken Breast",
          "unit": "lbs",
          "totalCalories": 660,
          "proteinG": 140,
          "carbsG": 0,
          "fatG": 14
        }
      }
    ],
    "createdAt": "2026-05-12T...",
    "updatedAt": "2026-05-12T..."
  }
]
```

**Error Responses:**
- 401: Unauthorized
- 500: Server error

---

### 3. PUT /api/meals/[id] - Update Meal
Updates meal name, description, and/or ingredients.

**Request:**
```json
{
  "mealName": "Updated Meal Name",
  "description": "Updated description",
  "ingredients": [
    {
      "groceryId": "uuid-of-grocery-1",
      "quantityUsed": 0.75
    }
  ]
}
```

**Validation:**
- All fields optional (but if provided, must be valid)
- `ingredients`: If provided, must have minimum 1 item
- All groceries must belong to authenticated user

**Response (200):**
- Returns updated meal with new ingredient details

**Error Responses:**
- 401: Unauthorized
- 404: Meal not found or doesn't belong to user
- 400: Validation failed
- 500: Server error

---

### 4. DELETE /api/meals/[id] - Delete Meal
Deletes a meal and all associated ingredients (cascade delete).

**Response (200):**
```json
{
  "success": true
}
```

**Error Responses:**
- 401: Unauthorized
- 404: Meal not found or doesn't belong to user
- 500: Server error

---

### 5. POST /api/meals/[id]/eat - Consume Meal
Consumes a meal by incrementing the percent_consumed of each ingredient based on the quantity used in the meal.

**Request:**
```json
{
  "dateConsumed": "2026-05-12"  // Optional, defaults to today
}
```

**Validation:**
- `dateConsumed`: Optional, valid date format (YYYY-MM-DD)

**Calculation Logic:**
For each ingredient in the meal:
1. Calculate: `percentUsed = (quantityUsed / quantityBought) * 100`
2. Update grocery: `newPercentConsumed = min(100, currentPercent + percentUsed)`
3. Return updated groceries and weekly totals

**Response (200):**
```json
{
  "success": true,
  "message": "Meal \"Chicken & Rice Bowl\" consumed and groceries updated",
  "dateConsumed": "2026-05-12",
  "updatedGroceries": [
    {
      "id": "grocery-uuid-1",
      "foodName": "Chicken Breast",
      "percentConsumed": 25,
      "totalCalories": 660,
      "proteinG": 140,
      "carbsG": 0,
      "fatG": 14
    }
  ],
  "weekTotals": {
    "week": {
      "start": "2026-05-12",
      "end": "2026-05-18"
    },
    "totals": {
      "caloriesBought": 2110,
      "caloriesConsumed": 527.5,
      "proteinBought": 195,
      "proteinConsumed": 48.75,
      "carbsBought": 300,
      "carbsConsumed": 75,
      "fatBought": 27,
      "fatConsumed": 6.75
    },
    "goals": {
      "dailyCalories": 2000,
      "dailyProtein": 150,
      "dailyCarbs": 200,
      "dailyFat": 65
    }
  }
}
```

**Error Responses:**
- 401: Unauthorized
- 404: Meal not found or doesn't belong to user
- 400: Meal has no ingredients
- 500: Server error

---

## Validation Schemas Added to lib/validation.ts

```typescript
// Meal ingredient schema
export const mealIngredientSchema = z.object({
  groceryId: z.string().uuid('Invalid grocery ID'),
  quantityUsed: z.number().positive('Quantity used must be greater than 0'),
});

// Create meal schema
export const createMealSchema = z.object({
  mealName: z.string()
    .min(1, 'Meal name is required')
    .max(255, 'Meal name must be 255 characters or less'),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .nullable(),
  ingredients: z.array(mealIngredientSchema)
    .min(1, 'At least one ingredient is required'),
});

// Update meal schema (partial)
export const updateMealSchema = z.object({
  mealName: z.string()
    .min(1, 'Meal name is required')
    .max(255, 'Meal name must be 255 characters or less')
    .optional(),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .nullable(),
  ingredients: z.array(mealIngredientSchema)
    .min(1, 'At least one ingredient is required')
    .optional(),
}).strict();

// Eat meal schema
export const eatMealSchema = z.object({
  dateConsumed: z.string()
    .date('Invalid date format (YYYY-MM-DD)')
    .optional(),
});
```

---

## Files Modified/Created

### Created Files:
1. `/app/api/meals/route.ts` - POST (create) and GET (list) handlers
2. `/app/api/meals/[id]/route.ts` - PUT (update) and DELETE handlers
3. `/app/api/meals/[id]/eat/route.ts` - POST (consume meal) handler

### Modified Files:
1. `/lib/validation.ts` - Added 4 new Zod schemas for meal validation

### Existing Infrastructure Used:
- Database schema already defined in `/schema/db.ts` (userMeals, mealIngredients tables)
- Drizzle migrations already created in `/drizzle/0002_woozy_lockjaw.sql`
- Authentication via NextAuth (getServerSession)
- Error handling following existing patterns
- Zod validation following existing patterns

---

## Key Features

### Validation
- All inputs validated with Zod schemas
- User-friendly error messages
- Type-safe responses

### Database Operations
- Uses Drizzle ORM with relations
- Proper foreign key constraints
- Cascade delete for meal ingredients
- Transaction-safe operations

### Authorization
- All endpoints require authenticated user session
- User can only access/modify their own meals
- Grocery ownership verified before meal creation

### Error Handling
- Consistent error response format
- Proper HTTP status codes
- Meaningful error messages for debugging

### Response Format
- All responses include formatted numbers (no decimal strings)
- Includes related grocery data in meal responses
- Weekly totals calculated for meal consumption

---

## Testing the Endpoints

### Prerequisites
1. User must be authenticated (logged in)
2. User must have groceries created first

### Quick Test Flow
```bash
# 1. Login to the app (http://localhost:3001/auth/signin)

# 2. Create a few groceries via POST /api/groceries
POST /api/groceries
{
  "foodName": "Chicken Breast",
  "quantityBought": 2,
  "unit": "lbs",
  "totalCalories": 660,
  "proteinG": 140,
  "carbsG": 0,
  "fatG": 14
}

# 3. Get grocery IDs from GET /api/groceries response

# 4. Create a meal using grocery IDs
POST /api/meals
{
  "mealName": "Quick Meal",
  "ingredients": [
    {
      "groceryId": "grocery-id-1",
      "quantityUsed": 0.5
    }
  ]
}

# 5. View all meals
GET /api/meals

# 6. Update the meal
PUT /api/meals/meal-id
{
  "mealName": "Updated Meal Name",
  "ingredients": [
    {
      "groceryId": "grocery-id-1",
      "quantityUsed": 0.75
    }
  ]
}

# 7. Consume the meal (updates grocery consumption)
POST /api/meals/meal-id/eat
{
  "dateConsumed": "2026-05-12"
}

# 8. Delete the meal
DELETE /api/meals/meal-id
```

---

## Status: COMPLETE

✓ All 5 endpoints implemented and tested
✓ Database schema and migrations ready
✓ Validation schemas added
✓ Error handling implemented
✓ Authorization checks in place
✓ TypeScript compilation successful
✓ Ready for integration with frontend
