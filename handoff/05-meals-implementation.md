# Meals Feature Implementation

**Status:** In Progress  
**Phase:** 1 (Database Schema) - COMPLETE

---

## Overview

Implementing persistent meal recipes that users can create from their grocery inventory and "eat" to log macros and deduct consumed items.

**Key Requirements:**
- Authenticated users only (no guest mode)
- Create reusable meal recipes from existing groceries
- Cross-week ingredient support (use groceries from any week)
- "Eat meal" action increases `percent_consumed` on ingredients + logs macros
- UI placed as 3rd pill tab in Intake section, labeled "Meals"

---

## Data Model

### Tables Added

#### `user_meals`
```sql
id (uuid, PK)
user_id (uuid, FK → users)
meal_name (varchar 255)
description (text, nullable)
created_at (timestamp)
updated_at (timestamp)
```
- Index: `idx_meals_user` on user_id

#### `meal_ingredients`
```sql
id (uuid, PK)
meal_id (uuid, FK → user_meals, cascade)
grocery_id (uuid, FK → user_grocery_inventory, cascade)
quantity_used (numeric 8,2)
created_at (timestamp)
```
- Indexes: `idx_meal_ingredients_meal` on meal_id, `idx_meal_ingredients_grocery` on grocery_id

### Relationships (Drizzle)
- `users` → `meals` (one-to-many)
- `userMeals` → `ingredients` (one-to-many via meal_ingredients)
- `userGroceryInventory` → `mealIngredients` (one-to-many)

---

## Phase 1: Database Schema - COMPLETE ✓

### Completed
- [x] Added `userMeals` table to schema/db.ts
- [x] Added `mealIngredients` table to schema/db.ts
- [x] Added Drizzle relations (usersRelations, mealRelations, mealIngredientsRelations)
- [x] Generated migration: `drizzle/0002_woozy_lockjaw.sql`
- [x] Applied migration to database
- [x] Verified build succeeds with schema changes

---

## Phase 2: API Endpoints (Next)

### Endpoints to Implement

**POST /api/meals**
- Create new meal recipe
- Request: `{ mealName, description?, ingredients: [{ groceryId, quantityUsed }] }`
- Response: Created meal with ID
- Validation: Auth required, at least 1 ingredient, valid groceryId references

**GET /api/meals**
- List all meals for authenticated user
- Response: Array of meals with ingredient details
- No pagination (assumes <100 recipes per user)

**PUT /api/meals/:id**
- Update meal name/description and ingredients
- Request: `{ mealName?, description?, ingredients? }`
- Response: Updated meal

**DELETE /api/meals/:id**
- Delete meal (cascade deletes meal_ingredients)
- Response: Success message

**POST /api/meals/:id/eat**
- "Eat" a meal: increase ingredient `percent_consumed`, log macros
- Request: `{ date? }` (defaults to today)
- Logic:
  1. Fetch meal with all ingredients
  2. For each ingredient: calc consumed amount, update grocery's `percent_consumed`
  3. Aggregate macros consumed
  4. Return consumed macros breakdown
- Response: `{ macrosConsumed: { calories, protein, carbs, fat }, updatedGroceryIds }`

---

## Phase 3: Frontend Components (After API)

**MealTab.tsx** (new)
- Pills navigation: "Create Meal", "Saved Meals"
- Lists all user meals with descriptions
- "Eat meal" button → confirmation modal
- "Edit" and "Delete" buttons with confirmations

**CreateMealForm.tsx** (new)
- Dropdown/search to select groceries from current week + past weeks
- Input for quantity to use in meal
- Add/remove ingredient rows
- Submit → POST /api/meals
- Success → toast, redirect to meals list

**MealConfirmation.tsx** (new)
- Modal showing meal ingredients + quantities to be deducted
- Confirms eating → POST /api/meals/:id/eat
- Shows macros being logged

---

## Phase 4: Validation & Error Handling (During API)

- Zod schemas for meal creation/updates
- Auth check on all meal endpoints
- Validate grocery ownership (user can only use their own groceries)
- Check grocery exists and not fully consumed before eating
- Graceful errors for missing meals, invalid IDs

---

## Phase 5: Logging & Testing (After completion)

- Log meal creation/deletion/eating events
- Manual test checklist:
  - Create meal with multiple groceries
  - Eat meal, verify percent_consumed increases
  - Eat same meal twice, verify compounding consumption
  - Delete meal with ingredients
  - Use groceries from past weeks in meal

---

## Current Status

**Phase 1 Complete:**
- Database schema ready
- Migrations applied
- Build passes

**Next:** Implement Phase 2 (API endpoints)
