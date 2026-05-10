# Implementation: Automated Nutrition Lookup for Receipt Items

## Summary
Fully implemented automatic nutrition data lookup for receipt items. When a receipt is uploaded:
1. Items are extracted via Claude Vision
2. USDA database is automatically searched for each item
3. Nutrition data (calories, protein, carbs, fat) is retrieved and pre-populated
4. User sees all fields filled and just clicks "Add Grocery"

## Completed Features

### 1. New Helper Library: `lib/usda-lookup.ts`
- **`searchUSDAAndGetNutrition(productName)`** - Async function to search USDA and get nutrition
  - Takes product name as input
  - Returns NutritionData object or null if not found
  - Handles errors gracefully with console logging
  
- **`batchLookupNutrition(productNames, onProgress?)`** - Batch lookup with progress callback
  - Useful for future batch operations
  - Optional progress callback for UI feedback

### 2. Updated ReceiptUploader Component
**File:** `components/ReceiptUploader.tsx`

Changes:
- Added `nutrition` field to ParsedItem interface (optional)
- Imports `searchUSDAAndGetNutrition` from `lib/usda-lookup`
- After receipt parsing, automatically loops through items and searches USDA
- Real-time status updates: "Looking up nutrition for Chicken Breast..."
- Items with no nutrition match get default zeros (won't block form submission)
- Status cleared after all lookups complete

Flow:
1. User uploads receipt
2. Vision API extracts items (name, qty, unit)
3. For each item, nutrition lookup runs sequentially
4. User sees real-time feedback: "Looking up nutrition for [item]..."
5. Items with nutrition pre-filled, returned to parent component

### 3. Updated GroceryForm Component
**File:** `components/GroceryForm.tsx`

Changes:
- Added `initialNutrition` prop to GroceryFormProps
- useEffect now populates nutrition fields when `initialNutrition` changes
- Auto-fills calories, protein, carbs, fat fields
- If no nutrition provided, fields remain empty for manual entry

Props:
```typescript
initialNutrition?: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}
```

### 4. Updated ParsedItem Interface
**Files:** `app/groceries/page.tsx` and `components/ReceiptUploader.tsx`

Added optional nutrition object to match extracted items:
```typescript
interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
}
```

### 5. Updated Camera Tab
**File:** `app/groceries/page.tsx`

Changes:
- GroceryForm now receives `initialNutrition={currentExtractedItem?.nutrition}`
- Automatically passes pre-filled nutrition to form
- No other logic changes needed

## User Experience Flow

1. **Upload Receipt**
   - User clicks upload button
   - Button shows: "⏳ Processing receipt..."

2. **Extraction & Lookup**
   - Receipt image sent to Claude Vision
   - Receipt parsed into items (name, qty, unit)
   - For each item: "⏳ Looking up nutrition for Chicken Breast..."
   - USDA database searched, nutrition retrieved
   - Items transformed with nutrition data

3. **Form Pre-filled**
   - First item shows in form with:
     - Food name filled
     - Quantity filled
     - Unit filled
     - Calories filled
     - Protein filled
     - Carbs filled
     - Fat filled
   - All user has to do is click "Add Grocery"

4. **Iterate Through Items**
   - Click "Add Grocery" → item saved, moves to next
   - Form automatically updates with next item's pre-filled data
   - Repeat for all extracted items

5. **Fallback for Missing Data**
   - If USDA lookup fails for an item, nutrition fields show 0
   - Validation still passes (allows 0 values for extracted items)
   - User can manually search nutrition or manually enter values

## Data Flow

```
Upload Receipt
    ↓
Parse Receipt (Vision API)
    ↓ items: [{ name, quantity?, unit? }, ...]
For each item:
    Lookup Nutrition (USDA)
    ↓ nutrition: { calories, protein, carbs, fat }
    ↓
Return items with nutrition
    ↓ ParsedItem[] with nutrition
Pass to GroceryForm
    ↓
Auto-populate form fields
    ↓
User submits → adds grocery
```

## Error Handling

1. **USDA Search Fails**
   - Returns null from `searchUSDAAndGetNutrition()`
   - Item gets default zeros: `{ calories: 0, protein: 0, carbs: 0, fat: 0 }`
   - Doesn't block flow, user can continue

2. **No Items Extracted**
   - Shows error: "No grocery items were detected..."
   - Returns early, no nutrition lookup runs
   - Allows user to re-upload

3. **Receipt Parse Fails**
   - Shows error: "Failed to parse receipt..."
   - Allows retry

## Implementation Notes

- **Sequential USDA lookups** - Items looked up one at a time to avoid rate limiting
- **No blocking failures** - If one item's nutrition lookup fails, others continue
- **Default zeros** - Missing nutrition defaults to 0 (valid data, allows submission)
- **Reusable helper** - `lib/usda-lookup.ts` can be used in other components
- **Status feedback** - Real-time UI feedback during nutrition lookup phase
- **No breaking changes** - Existing manual entry flow still works

## Build Status
✓ Compiles successfully (no TypeScript errors)
✓ All imports resolved correctly
✓ No build warnings

## Files Changed

1. **New:** `/lib/usda-lookup.ts` - Helper functions for USDA lookup
2. **Updated:** `/components/ReceiptUploader.tsx` - Auto-lookup on extract
3. **Updated:** `/components/GroceryForm.tsx` - Auto-populate nutrition fields
4. **Updated:** `/app/groceries/page.tsx` - Pass nutrition to form

## Testing Checklist

- [ ] Upload receipt with multiple items
- [ ] Verify "Looking up nutrition for..." messages appear
- [ ] Verify first item form auto-populated (name, qty, unit, calories, protein, carbs, fat)
- [ ] Click "Add Grocery" and verify item saved
- [ ] Verify next item form auto-populated
- [ ] Repeat for all items
- [ ] Verify all items saved with nutrition data
- [ ] Test with receipt that has poor USDA matches (should get zeros, form still works)
- [ ] Verify manual nutrition entry still works for new items (no nutrition pre-fill)

## How to Run

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Navigate to http://localhost:3001/groceries
# Upload a receipt and test the flow
```

## Database Integration Note
Current implementation pre-fills form with nutrition data. When user submits:
- GroceryForm sends nutrition via `nutrition` object in payload
- `/api/groceries` endpoint handles saving (already set up for totalCalories, proteinG, carbsG, fatG)
- Database stores nutrition data per grocery item

## Future Enhancements
- Show "Found nutrition for X" success messages per item
- Cache USDA results to avoid duplicate searches
- Allow user to select from multiple USDA matches
- Show nutrition confidence/freshness indicators
- Batch USDA requests instead of sequential (with rate limiting)
