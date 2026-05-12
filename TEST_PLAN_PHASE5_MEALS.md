# Meals Feature - Phase 5 Testing Plan

**Status:** Ready for Manual Testing  
**Date:** May 12, 2026  
**Feature:** Meals (Create, Eat, Edit, Delete)  
**Authentication:** Required (Authenticated users only)  

---

## Test Environment Setup

### Prerequisites
- Dev server running on `http://localhost:3001`
- Authenticated user logged in (test account with email)
- At least 3-5 groceries added to inventory for this week

### Test Database State
Ensure your test account has:
- Multiple groceries with varied macros (protein-heavy, carb-heavy, etc.)
- Groceries from current and past weeks (for cross-week ingredient support)

---

## Phase 5: Testing Checklist

### 1. UI Integration Tests

#### 1.1 Meals Tab Visibility
- [ ] Navigate to `/groceries` while logged in
- [ ] Verify "Meals" pill tab appears as 3rd tab after "Add+" and "Inventory"
- [ ] Verify tab styling matches design (purple when active, gray when inactive)
- [ ] Verify responsive behavior on mobile (tabs wrap, sizing adjusts)

#### 1.2 Empty State
- [ ] Click "Meals" tab with no existing meals
- [ ] Verify empty state message displays: "No meals yet"
- [ ] Verify "Create New Meal" button is visible and clickable
- [ ] Verify button styling is consistent with other CTAs

#### 1.3 Week Navigation
- [ ] Verify week navigator appears in Meals tab (for consistency with other tabs)
- [ ] Switch to a different week
- [ ] Verify meals list updates (or shows empty state if no meals for that week)
- [ ] Switch back to original week
- [ ] Verify meals reappear (cached or refetched correctly)

---

### 2. Create Meal Tests

#### 2.1 Create New Meal - Happy Path
- [ ] Click "Create New Meal" button
- [ ] Verify CreateMealForm renders
- [ ] Enter meal name (e.g., "Breakfast: Eggs & Oats")
- [ ] Add ingredients:
  - [ ] Click "Add Ingredient" / ingredient selection dropdown
  - [ ] Select first grocery item from inventory
  - [ ] Enter quantity used (e.g., "2" if item is eggs)
  - [ ] Verify unit matches inventory (auto-filled or selectable)
- [ ] Add at least 2 more ingredients with varying quantities
- [ ] Verify macros calculate and update in real-time:
  - [ ] Total calories = sum of (ingredient calories × quantity used / quantity bought)
  - [ ] Same calculation for protein, carbs, fat
- [ ] Click "Save Meal"
- [ ] Verify success toast: "Meal saved"
- [ ] Verify form closes and returns to meals list
- [ ] Verify new meal appears in meals list with correct name and macros

#### 2.2 Create Meal - Cross-Week Ingredients
- [ ] Create a meal using groceries from different weeks
- [ ] Add one grocery from current week, one from past week
- [ ] Verify system allows selecting from multiple weeks
- [ ] Save the meal
- [ ] Verify meal contains ingredients from both weeks

#### 2.3 Create Meal - Macro Calculation Accuracy
- [ ] Create a meal with known macros:
  - Example: 100g chicken (assume ~31 cal per gram, ~26g protein, 0g carbs, 3g fat)
  - Example: 1 cup rice (assume ~200 cal, ~4g protein, ~45g carbs, 0.5g fat)
- [ ] Enter quantities exactly as ratio to total purchased
- [ ] Verify calculated macros match expected values (within 1% tolerance)
- [ ] Check that nutrition display is rounded appropriately (no excess decimals)

#### 2.4 Create Meal - Validation
- [ ] Attempt to create meal with no name
  - [ ] Verify error message: "Meal name is required"
  - [ ] Verify form doesn't submit
- [ ] Attempt to create meal with no ingredients
  - [ ] Verify error message: "At least one ingredient is required"
  - [ ] Verify form doesn't submit
- [ ] Attempt to add ingredient with zero quantity
  - [ ] Verify validation prevents invalid entry or auto-corrects
- [ ] Add ingredient, then remove it before saving
  - [ ] Verify removal works smoothly
  - [ ] Verify macros recalculate

#### 2.5 Create Meal - UI/UX
- [ ] Verify form is mobile-responsive (inputs are min 44px tall)
- [ ] Verify form has clear labels for all fields
- [ ] Verify ingredient dropdown shows:
  - [ ] Grocery name
  - [ ] Current quantity available
  - [ ] Unit
  - [ ] Macro summary (e.g., "120 cal, 5g protein")
- [ ] Verify save button is disabled while loading
- [ ] Verify cancel/back button is functional

---

### 3. Meals List & Display Tests

#### 3.1 Meals List Display
- [ ] View meals list with 2+ meals
- [ ] Verify each meal card displays:
  - [ ] Meal name (prominent, clear)
  - [ ] Number of ingredients (e.g., "3 ingredients")
  - [ ] Total macros (Calories, Protein, Carbs, Fat)
  - [ ] Macro values with appropriate units (cal, g, g, g)
- [ ] Verify macro values are color-coded or styled consistently with app theme
- [ ] Verify cards are laid out in a responsive grid (stacks on mobile)

#### 3.2 Meals List - Empty State After Actions
- [ ] Create a meal, then eat it
- [ ] Verify meal disappears from list
- [ ] Verify "No meals yet" message appears if all meals are eaten/deleted
- [ ] Create another meal
- [ ] Verify list repopulates correctly

---

### 4. Edit Meal Tests

#### 4.1 Edit Meal - Basic Functionality
- [ ] Hover/tap on a meal card to reveal action buttons
- [ ] Click "Edit" button
- [ ] Verify EditMealForm (or CreateMealForm with prepopulated data) renders
- [ ] Verify form is pre-filled with:
  - [ ] Original meal name
  - [ ] All original ingredients and quantities
  - [ ] Macro totals match original meal
- [ ] Change meal name to something different
- [ ] Click "Save Changes"
- [ ] Verify success toast: "Meal updated"
- [ ] Verify meal name updated in list

#### 4.2 Edit Meal - Ingredient Updates
- [ ] Edit a meal
- [ ] Modify one ingredient's quantity
- [ ] Verify macros recalculate
- [ ] Remove one ingredient
- [ ] Verify macros recalculate correctly
- [ ] Add a new ingredient
- [ ] Verify new ingredient is included in macro calculation
- [ ] Save and verify list updates

#### 4.3 Edit Meal - Validation on Edit
- [ ] Try to remove all ingredients
  - [ ] Verify error: "At least one ingredient required"
- [ ] Try to clear meal name
  - [ ] Verify error: "Meal name required"
- [ ] Cancel edit without saving
  - [ ] Verify original meal data unchanged

---

### 5. Eat Meal Tests

#### 5.1 Eat Meal - Happy Path
- [ ] Click "Eat" button on a meal
- [ ] Verify EatMealDialog renders with:
  - [ ] Meal name prominently displayed
  - [ ] List of ingredients and quantities to be deducted
  - [ ] Total macros being logged (e.g., "500 cal, 25g protein")
  - [ ] "Confirm" and "Cancel" buttons
- [ ] Click "Confirm"
- [ ] Verify loading state (button disabled, spinner or loader visible)
- [ ] Verify success toast: "Logged [Meal Name] as eaten"
- [ ] Verify dialog closes

#### 5.2 Eat Meal - Inventory Deduction
- [ ] Note current groceries list before eating meal
- [ ] Eat a meal with known ingredients and quantities
- [ ] Navigate to "Inventory" tab
- [ ] Verify each ingredient's `percent_consumed` increased correctly:
  - Example: If meal used 50% of egg quantity, `percentConsumed` should increase by 50
  - Note: If ingredient was already 40% consumed, it should now be 90%
- [ ] Verify consumed macros in dashboard reflect the eaten meal
- [ ] Switch between weeks to verify data integrity

#### 5.3 Eat Meal - Macro Logging
- [ ] After eating a meal, check daily macro totals
- [ ] Navigate to dashboard or nutrition view
- [ ] Verify meal's macros are added to daily totals:
  - [ ] Calories increase by meal calories × (ingredient quantity used / quantity bought)
  - [ ] Protein, Carbs, Fat calculated similarly
- [ ] Verify progress bars or charts update correctly
- [ ] Verify Strava comparison still accurate if applicable

#### 5.4 Eat Meal - Meal Removal After Eating
- [ ] Eat a meal
- [ ] Verify meal is removed from Meals list
- [ ] Current behavior: Meals are one-time use recipes
- [ ] (Alternative: If meals should be reusable, verify meal remains in list)

#### 5.5 Eat Meal - Edge Cases
- [ ] Attempt to eat a meal where an ingredient is fully consumed (100%)
  - [ ] Verify system handles gracefully (error message or partial logging)
  - [ ] Expected: Error message "Cannot log meal: [ingredient] is fully consumed"
- [ ] Attempt to eat a meal where an ingredient is partially consumed:
  - [ ] Example: Eggs are 80% consumed, meal wants to use 2 eggs (50% of purchase)
  - [ ] Verify system allows and calculates correctly (resulting in 130% or capped at 100%)
  - [ ] OR verify error message if system prevents over-consumption
- [ ] Delete a grocery that's used in a meal
  - [ ] Navigate to Inventory tab, delete a grocery
  - [ ] Verify meals using that grocery show error or are disabled

---

### 6. Delete Meal Tests

#### 6.1 Delete Meal - Confirmation Dialog
- [ ] Click "Delete" button on a meal
- [ ] Verify ConfirmDialog renders with:
  - [ ] Title: "Delete Meal?"
  - [ ] Message: "Remove '[Meal Name]' and its ingredients?"
  - [ ] Red/danger styling on delete button
  - [ ] "Cancel" button to dismiss
- [ ] Click "Cancel"
- [ ] Verify dialog closes and meal remains in list

#### 6.2 Delete Meal - Successful Deletion
- [ ] Click "Delete" button on a meal
- [ ] Click "Delete" (confirm) in dialog
- [ ] Verify success toast: "Deleted '[Meal Name]'"
- [ ] Verify meal disappears from list immediately
- [ ] Verify no inventory changes occur (deletion doesn't affect groceries)

#### 6.3 Delete Meal - Multiple Meals
- [ ] Create 3+ meals
- [ ] Delete one meal from middle of list
- [ ] Verify only that meal is deleted
- [ ] Verify other meals remain with correct data

---

### 7. Mobile Responsiveness Tests

#### 7.1 Mobile Meals Tab
- [ ] Open `/groceries` on mobile device (or Chrome DevTools mobile emulation)
- [ ] Click "Meals" tab
- [ ] Verify tab text is readable and button is min 44px tall
- [ ] Verify MealsTab content renders correctly

#### 7.2 Mobile Create Form
- [ ] Open create meal form on mobile
- [ ] Verify form layout is single-column, readable
- [ ] Verify input fields are min 44px tall
- [ ] Verify dropdown for ingredient selection is functional on touch
- [ ] Verify macros display clearly without horizontal scroll
- [ ] Verify save/cancel buttons are easily tappable

#### 7.3 Mobile Meals List
- [ ] View meals list on mobile
- [ ] Verify meal cards stack vertically
- [ ] Verify macros are displayed in compact format (no overflow)
- [ ] Verify action buttons (Eat, Edit, Delete) are visible and tappable
- [ ] Verify dialogs open/close correctly on mobile

#### 7.4 Mobile Eat Dialog
- [ ] Trigger "Eat" on mobile
- [ ] Verify dialog is centered and readable
- [ ] Verify ingredient list is scrollable if needed
- [ ] Verify macro totals are clear
- [ ] Verify buttons are easily tappable

---

### 8. Error Handling & Edge Cases

#### 8.1 API Error Handling
- [ ] Simulate network error (DevTools offline mode)
- [ ] Attempt to create/eat/delete meal
- [ ] Verify error message: "Network error. Please try again."
- [ ] Restore network and retry
- [ ] Verify action succeeds

#### 8.2 Concurrent Actions
- [ ] Open create meal form
- [ ] In another tab, delete a grocery used in the meal
- [ ] Try to save the meal
- [ ] Verify system handles missing grocery gracefully (error message)

#### 8.3 Session Expiration
- [ ] Create/edit a meal, then session expires (sign out in background)
- [ ] Attempt to save
- [ ] Verify redirect to login or appropriate error

#### 8.4 Permission & Ownership
- [ ] Meals should only be visible to the authenticated user
- [ ] (If testing with multiple accounts) Verify meals don't leak between users

---

### 9. Performance & Logging Tests

#### 9.1 Load Time
- [ ] Meals tab load time with 1 meal: < 1 second
- [ ] Meals tab load time with 10 meals: < 2 seconds
- [ ] Create form renders within 500ms
- [ ] Dialog opens immediately on user click

#### 9.2 Console Logging
- [ ] Open browser DevTools Console
- [ ] Create a meal
- [ ] Verify meaningful log entries (no verbose debug spam)
- [ ] Eat a meal
- [ ] Verify logs show action taken (meal ID, ingredients, macros logged)
- [ ] Check for any console errors or warnings

#### 9.3 API Response Logging
- [ ] Open DevTools Network tab
- [ ] Create a meal
- [ ] Verify POST `/api/meals` request logs:
  - [ ] Request payload (meal name, ingredients, quantities)
  - [ ] Response includes created meal with ID
  - [ ] Response time < 1 second
- [ ] Eat a meal
- [ ] Verify POST `/api/meals/:id/eat` request logs:
  - [ ] Response includes updated grocery IDs
  - [ ] Response includes macros logged
  - [ ] No sensitive data leakage

---

## Testing Scenarios

### Scenario A: Full Meal Workflow
1. Start with 5 groceries in inventory
2. Create "Breakfast" meal with 2 ingredients
3. Edit meal to add a 3rd ingredient
4. Create "Lunch" meal with 3 ingredients
5. Eat the "Breakfast" meal
6. Verify groceries' percent_consumed updated
7. Verify dashboard macros updated
8. Delete the "Lunch" meal
9. Verify meal removed and no grocery changes

### Scenario B: Multi-Week Ingredients
1. Switch to past week, add 2 groceries
2. Switch to current week
3. Create meal using 1 current-week grocery + 1 past-week grocery
4. Eat the meal
5. Switch to past week
6. Verify past-week grocery's percent_consumed increased
7. Switch to current week
8. Verify current-week grocery's percent_consumed increased

### Scenario C: Macro Accuracy
1. Create meal with 3 ingredients with known macros
2. Calculate expected total macros manually
3. Compare to app's calculation
4. Verify within 2% tolerance (accounting for rounding)

---

## Success Criteria

All test categories pass without critical failures:
- ✓ UI renders correctly on desktop and mobile
- ✓ CRUD operations (Create, Read, Edit, Delete) work as expected
- ✓ Meal eating updates grocery inventory correctly
- ✓ Macro calculations are accurate
- ✓ Validation prevents invalid data
- ✓ Error messages are clear and helpful
- ✓ No console errors or warnings
- ✓ User can complete full workflow in < 5 minutes

---

## Defect Severity Levels

**Critical:** Feature unusable, data loss, security issue
- Example: "Eating meal doesn't update inventory"
- Example: "Create meal silently fails"

**High:** Feature partially broken, significant UX issue
- Example: "Mobile buttons not clickable"
- Example: "Macros calculated incorrectly"

**Medium:** Feature works but with minor UX issue
- Example: "Success toast disappears too quickly"
- Example: "Form labels slightly misaligned"

**Low:** Polish/cosmetic issues
- Example: "Button color slightly off"
- Example: "Spacing could be tighter"

---

## Notes

- **Guest Mode:** Meals feature is authenticated-only, so guest users should not see Meals tab (verify this in testing)
- **Reusable vs One-Time:** Clarify with product: After eating a meal, should it be deleted or remain for future use?
- **Ingredient Updates:** If a grocery is edited (macro change) after being added to a meal, should meal macros auto-update?
- **Cross-Week Constraints:** Confirm meals can include ingredients from any week, or should be restricted to current week

---

## Test Completion Sign-Off

| Test Area | Result | Notes |
|-----------|--------|-------|
| UI Integration | ❌ PENDING | |
| Create Meal | ❌ PENDING | |
| Meals List | ❌ PENDING | |
| Edit Meal | ❌ PENDING | |
| Eat Meal | ❌ PENDING | |
| Delete Meal | ❌ PENDING | |
| Mobile Responsive | ❌ PENDING | |
| Error Handling | ❌ PENDING | |
| Performance | ❌ PENDING | |

**Overall Status:** ⏳ READY FOR TESTING

---

Generated: 2026-05-12  
Feature: Meals (Phase 5 Testing)  
Version: 1.0
