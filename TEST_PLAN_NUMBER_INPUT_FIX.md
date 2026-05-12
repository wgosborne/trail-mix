# Test Plan: Number Input Field Fix

## Summary
Fixed issue where number input fields displayed a default "0" or leading "0" placeholder, preventing users from seeing only their entered values. Applied consistent fixes across all numeric inputs in the TrailMix app.

## Changes Made

### 1. EditNutritionDialog Component (`components/EditNutritionDialog.tsx`)
**Issue**: All nutrition fields had `placeholder="0"` which created confusion about what values were entered
**Fix**: Removed all `placeholder="0"` attributes from:
- Calories input
- Protein (g) input
- Carbs (g) input
- Fat (g) input
- Fiber (g) input

**Result**: Fields now show empty state with no placeholder text, only displaying user-entered values

### 2. GroceryForm Component (`components/GroceryForm.tsx`)
**Issue**: Nutrition fields lacked proper HTML constraint attributes
**Fix**: Added `min="0"` attribute to:
- Quantity input
- Calories (kcal) input
- Protein (g) input
- Carbs (g) input
- Fat (g) input

**Result**: Browser enforces minimum value of 0 and shows no default placeholder

### 3. Settings Page (`app/groceries/settings/page.tsx`)
**Issue**: Macro goal inputs lacked proper HTML constraints
**Fix**: Added `min="0"` and `minHeight: '44px'` to all goal inputs:
- Daily Calories
- Daily Protein (g)
- Daily Carbs (g)
- Daily Fat (g)

**Result**: Consistent touch target size (44px minimum) and browser-level validation

### 4. AdjustAmountDialog (`components/AdjustAmountDialog.tsx`)
**Status**: Already correctly implemented
- Has `min={0}` and `max={quantityBought}` attributes
- Uses state-bound value with no problematic placeholder
- No changes needed

## Test Scenarios

### Test 1: GroceryForm - Add Grocery
**Steps:**
1. Navigate to Groceries page
2. Click "Add Grocery" button (or use receipt scanner)
3. Enter food name: "Chicken Breast"
4. Click on Quantity field
5. Verify: No "0" appears before typing
6. Type: "2.5"
7. Click on Calories field
8. Verify: Field shows empty, no "0" placeholder
9. Type: "165"
10. Repeat for Protein, Carbs, Fat fields

**Expected Result**: Only user-entered numbers visible in each field

### Test 2: EditNutritionDialog - Nutrition Values
**Steps:**
1. Add a grocery item to inventory
2. Hover over the item and click "Edit Nutrition" or pencil icon
3. Click on any nutrition field (Calories, Protein, Carbs, Fat, Fiber)
4. Verify: No "0" appears as placeholder
5. Clear field and type new value
6. Verify: Only the new value is displayed

**Expected Result**: Clean input fields with no placeholder "0"

### Test 3: Settings - Macro Goals
**Steps:**
1. Navigate to Settings page (via grocery layout)
2. Scroll to "Nutrition Goals" section
3. Click on Daily Calories field
4. Verify: Current value is shown (e.g., 2000), no leading "0"
5. Clear and type: "2500"
6. Repeat for Protein, Carbs, Fat fields
7. Click "Save Goals"

**Expected Result**: Goals save correctly, no "0" artifacts in display

### Test 4: AdjustAmountDialog - Consume Item
**Steps:**
1. Add grocery item with quantity: "5 lbs"
2. Click on item to adjust consumption
3. Click on the remaining amount field
4. Verify: Current remaining amount displayed (e.g., "5"), no leading "0"
5. Change to: "2.5"
6. Verify: Shows "2.5", no "0" prefix

**Expected Result**: Amount correctly displayed and editable

### Test 5: Mobile Responsiveness
**Steps:**
1. Open browser DevTools
2. Switch to mobile view (375px width)
3. Navigate through all number input fields in tests 1-4
4. Verify: Touch targets are at least 44px in height (for accessibility)
5. Verify: No "0" appears in any field on mobile

**Expected Result**: All inputs accessible and correct on mobile devices

### Test 6: Edge Cases
**Steps:**
1. GroceryForm - leave number field empty and submit (should show validation error)
2. GroceryForm - enter negative number (browser prevents this with min="0")
3. AdjustAmountDialog - try to enter more than purchased amount (validation prevents this)
4. Settings - enter decimal value for Protein/Carbs/Fat with step="0.1"
5. Settings - try to enter negative value (browser prevents with min="0")

**Expected Result**: Validation works correctly, no "0" appears in any scenario

## Files Modified
1. `app/groceries/settings/page.tsx` - 16 insertions, 4 changes
2. `components/EditNutritionDialog.tsx` - 5 removals (placeholders)
3. `components/GroceryForm.tsx` - 5 insertions (min attributes)

## Verification
- [x] Build compiles successfully (npm run build)
- [x] No TypeScript errors
- [x] All routes accessible
- [x] Changes apply to all numeric input contexts

## Impact
- **Positive**: Users get clean input experience with no confusing "0" values
- **Positive**: Consistent HTML validation across all platforms (browser prevents invalid values)
- **Positive**: Improved accessibility with 44px minimum touch targets
- **Zero Breaking Changes**: All changes are additive/fixing; no API or logic changes

## Rollback Plan
If issues arise, simply remove the `min="0"` attributes and `placeholder="0"` removals from the three modified files.
