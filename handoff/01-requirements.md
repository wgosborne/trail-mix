# TrailMix - MVP Requirements

## Problem & Solution

**Problem:** You train hard (40+ mi/week running, 3x/week lifting) but can't dial in nutrition because daily meal logging requires a scale and accuracy you don't trust.

**Solution:** A guest-friendly PWA that tracks weekly grocery inventory + consumption, then compares to Strava calorie burn to show: "Am I eating enough for my training?"

**Success:** Deployed PWA you use daily, easily shareable with friends, works without login.

---

## Core User Flow

1. **Camera Tab:** Photograph grocery receipt → app extracts items + macros via Claude Vision → adds to inventory
2. **Throughout week:** Mark items consumed (e.g., "Chicken 75% consumed")
3. **Dashboard Tab:** See weekly snapshot:
   - Macros consumed this week (Protein/Carbs/Fat/Calories) as progress bars
   - Strava calorie burn for the week
   - Deficit/surplus comparison
   - Toggle to see previous weeks ("Week of May 5-11" vs "Week of May 12-18")
4. **Settings Tab:** Connect Strava, set macro targets, account settings (optional login)

---

## MVP Features

### 1. Grocery Receipt Upload & Parsing
- User opens camera tab, clicks camera icon
- Takes photo of receipt or uploads file
- Claude Vision extracts: item name, quantity, unit, price
- User reviews extracted items in editable table (can edit/remove/add)
- Click "Add to Inventory" → items added to current week's inventory

### 2. USDA Nutrition Matching
- For each item, search USDA FoodData Central API
- Pre-select #1 match, show top 3 if user wants to override
- Display: calories, protein, carbs, fat per serving/unit
- If no match found → user manually enters nutrition data
- Store matched item with USDA FDC ID for reuse

### 3. Grocery Inventory Tracking
- Display current inventory: all items added this week + uncsumed items from previous weeks
- For each item show: name, total quantity, % consumed (slider or input)
- User adjusts as week progresses (e.g., "Chicken 75% consumed")
- Can delete items (thrown out, etc.)
- Unconsumed items carry over to next week

### 4. Weekly Dashboard (Center Tab)
- Macro breakdown (Protein/Carbs/Fat/Calories) as progress bars
- Show: consumed macros this week vs. Strava calorie burn
- Display: surplus or deficit in calories
- Toggle weeks to see past data ("Week of May 5-11" vs current week)
- Show which items contributed to macros

### 5. Strava Integration
- User clicks "Connect Strava" in Settings tab
- OAuth login → app pulls weekly activities + calorie burn
- Display on dashboard: "You burned 2,500 cal this week"
- Show disclaimer: "Strava estimates have ±25-50% margin of error"

### 6. Guest-Friendly with Optional Login
- **No login required to use** — data stored in localStorage
- User can share PWA link, friend installs on home screen, uses immediately
- **Optional login:** User can sign up with email → data migrates from localStorage to account
- Each user sees only their own data (PWA is per-device by default)
- Settings allow user to log in/out

### 7. Macro Targets & Settings
- User can set weekly macro targets (Protein, Carbs, Fat)
- Settings tab shows: target values, current week progress
- Optional: set calorie burn target (reference only, doesn't lock data)

---

## Data Model (Simple)

```
User (optional)
- email, password (hashed)
- strava_oauth_token (encrypted)
- macro_targets (protein/carbs/fat goals)

GroceryItem (localStorage + DB if logged in)
- id, user_id, receipt_date
- item_name, quantity, unit
- calories, protein, carbs, fat (per serving/unit)
- percent_consumed (0-100%)
- usda_fdc_id (matched food ID)
- created_at, deleted_at (soft delete)

StravaActivity (cached in DB, synced weekly)
- user_id, strava_activity_id
- activity_date, calories, type, duration
- synced_at
```

---

## Edge Cases & Handling

| Scenario | Behavior |
|----------|----------|
| Receipt OCR fails (blurry) | Show error, ask user to retake photo |
| Item not in USDA | Show manual entry form (calories, macros) |
| User hasn't connected Strava | Show "Connect Strava" prompt, don't show burn data |
| Zero activities this week | Show "0 calories burned", don't block dashboard |
| User toggles to past week | Show consumed macros/calories from that week (read-only) |
| User clears browser cache | localStorage lost (if not logged in). Prompt to log in to recover. |
| Item carried over to next week | Show in inventory, user marks consumed from new week total |
| Duplicate receipt uploaded | No detection needed yet (user responsible for not re-uploading) |

---

## Out of Scope (MVP)

- ❌ Macro recommendations ("eat more protein")
- ❌ Meal planning
- ❌ Barcode scanning
- ❌ Lifting-specific calorie tracking
- ❌ Social features
- ❌ Export/sharing reports

---

## Tech Stack

- **Frontend:** Next.js 14 (TypeScript), Tailwind CSS, shadcn/ui, PWA
- **Backend:** Next.js API routes, NextAuth.js (optional login)
- **APIs:** Claude Vision (receipt parsing), USDA FoodData Central (nutrition), Strava OAuth
- **Storage:** localStorage (MVP guest), Neon
- **Hosting:** Vercel

---

## Timeline & Success Criteria

**2-week MVP (not "scrappy" — fully functional)**

- [ ] Receive photo, extract items, match to USDA, add to inventory
- [ ] User marks items consumed, see weekly totals on dashboard
- [ ] Connect Strava, see calorie burn
- [ ] Compare consumed macros to Strava burn (deficit/surplus)
- [ ] Toggle between weeks
- [ ] Guest-friendly: no login required to use
- [ ] PWA installable on home screen
- [ ] Works on iOS, Android, desktop
- [ ] You use it for 2 weeks and adjust grocery list based on insight
- [ ] Can easily share with 2-3 friends, they use without friction

---

## Assumptions

1. Strava is single source of truth for calorie burn (±25-50% error acceptable)
2. USDA nutrition data is accurate once user confirms match
3. Users estimate consumption by eye (no scale needed)
4. Weekly snapshot is sufficient (not daily)
5. Inventory carryover is expected behavior
6. Users have Strava account
7. localStorage is acceptable for guest mode (data loss on cache clear is acceptable)