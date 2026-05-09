# Architecture: TrailMix (Grocery Inventory + Nutrition Tracker)

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend Framework | Next.js 15 (App Router) | React ecosystem, built-in routing, SSR support, already initialized |
| Frontend Language | TypeScript | Type safety for nutrition/inventory logic |
| State Management | React Context + localStorage | Lightweight for guest mode, no external dependency needed |
| Styling | Tailwind CSS | Fast prototyping, already available in create-next-app |
| Database | PostgreSQL | ACID compliance for nutrition data integrity |
| ORM | Drizzle ORM | Lightweight, TypeScript-first, serverless-ready |
| Authentication | NextAuth.js | Industry standard, credentials + OAuth (Strava ready) |
| Image Processing | Claude Vision API | Receipt parsing, free tier, images discarded post-parse |
| Strava Integration | Direct HTTP API (on-demand) | No background sync, lightweight, user accepts cost |
| Deployment | Vercel + Neon.tech | Next.js native, free tier, PostgreSQL hosting |
| Testing | Vitest + React Testing Library | Fast, React-focused, same ecosystem |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Guest Mode (Unauthenticated)                            │   │
│  │  • localStorage: { groceries: [...], weekStart: "..." }  │   │
│  │  • No persistence, cleared on cache clear                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Authenticated Mode (After Login)                        │   │
│  │  • localStorage → auto-migrated to user_grocery_inv table│   │
│  │  • Session token in httpOnly cookie                      │   │
│  │  • Server-side data persistence                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────────┐  ┌─────▼────────────────┐
│   Next.js Server   │  │  NextAuth.js         │
│  (App Router)      │  │  (Session + OAuth)   │
│                    │  │                      │
│ • /api/groceries   │  │ • POST /auth/signin  │
│ • /api/nutrition   │  │ • GET /auth/session  │
│ • /api/strava      │  │ • POST /auth/logout  │
│ • /api/vision      │  │ • /api/strava/*      │
│ • /api/usda        │  │                      │
└────────┬───────────┘  └──────────────────────┘
         │
    ┌────┴──────┬───────────┬──────────┐
    │            │           │          │
┌───▼──┐  ┌─────▼──┐  ┌────▼──┐  ┌───▼────────┐
│Neon  │  │Strava  │  │USDA   │  │Claude      │
│DB    │  │API     │  │FoodDB │  │Vision API  │
│      │  │        │  │       │  │(temp)      │
└──────┘  └────────┘  └───────┘  └────────────┘
```

---

## Service Architecture

### Frontend (Next.js Client/SSR)

**Pages:**
- `/` – Splash screen with "Guest" / "Sign In" buttons
- `/auth/signin` – Email/password login
- `/auth/register` – New account creation
- `/groceries` – 3-tab layout:
  - **Tab 1 (Camera):** Receipt upload + grocery inventory management
  - **Tab 2 (Dashboard):** Weekly nutrition summary + Strava comparison
  - **Tab 3 (Settings):** Strava connection, macro goals, account settings
- `/week/:weekStart` – View specific week (optional, can toggle from dashboard)

**Components:**
- `TabNavigation` – Switch between Camera/Dashboard/Settings
- `ReceiptUploader` – Image upload → Claude Vision → add to inventory
- `GroceryInventory` – List groceries, adjust % consumed, delete items
- `WeekNavigator` – Jump between weeks (Mon-Sun)
- `NutritionDashboard` – Weekly macros breakdown, Strava comparison
- `StravaConnect` – OAuth button, activity display
- `GroceryForm` – Manual entry for grocery items
- `SettingsPanel` – Goals, macro targets, account options

**State Management (Context):**
- `GuestGroceriesContext` – Manages localStorage for unauthenticated users
- `AuthContext` – Current user session
- `GroceriesContext` – Current week's groceries (synced from DB if logged in)
- `WeekContext` – Current week start date (Mon)

### Backend (Next.js API Routes)

**Authentication APIs:**

```
POST /api/auth/signin
  Request: { email, password }
  Response: { sessionToken, user: { id, email, name } }
  Error: 401 Unauthorized (invalid credentials)

POST /api/auth/register
  Request: { email, password, name }
  Response: { sessionToken, user: { id, email, name } }
  Error: 409 Conflict (email exists)
  Side effect: Auto-migrate localStorage groceries to DB

GET /api/auth/session
  Response: { user: { id, email, name } } or null
  
POST /api/auth/logout
  Response: 204 No Content
```

**Grocery APIs:**

```
GET /api/groceries?week=2026-05-05
  Query: week (Monday ISO date YYYY-MM-DD)
  Response: { 
    groceries: [{ 
      id, 
      foodName, 
      quantityBought, 
      unit, 
      percentConsumed (0-100),
      nutrition: { calories, protein, carbs, fat, fiber },
      dateAdded,
      consumedCalories (calculated)
    }] 
  }
  Error: 401 if not authenticated

POST /api/groceries
  Request: { foodName, quantityBought, unit, dateAdded?, nutrition: { calories, protein, carbs, fat } }
  Response: { id, foodName, quantityBought, unit, percentConsumed: 0, nutrition, dateAdded }
  Validation: foodName required, quantityBought > 0, nutrition required
  Error: 400 Bad Request (invalid input), 401 Unauthorized

PUT /api/groceries/:id
  Request: { percentConsumed?, foodName?, quantityBought? }
  Response: { id, foodName, quantityBought, unit, percentConsumed, nutrition, consumedCalories }
  Error: 404 Not Found, 400 Bad Request

DELETE /api/groceries/:id
  Response: 204 No Content
  Error: 404 Not Found

POST /api/groceries/batch
  Request: { groceries: [{ foodName, quantityBought, unit, nutrition, dateAdded }] }
  Response: { created: number, failed: number, errors: [] }
  Purpose: Migrate localStorage groceries to DB on login
  Error: 400 Bad Request, 401 Unauthorized

GET /api/nutrition?week=2026-05-05
  Query: week (Monday ISO date)
  Response: {
    week: { start, end },
    totals: { 
      caloriesBought, 
      caloriesConsumed, 
      proteinBought, 
      proteinConsumed,
      carbsBought,
      carbsConsumed,
      fatBought,
      fatConsumed
    },
    goals: { dailyCalories, dailyProtein, dailyCarbs, dailyFat },
    surplus/deficit: { calories, protein, carbs, fat },
    groceryCount: number,
    stravaCaloriesBurned: number
  }
  Error: 401 if not authenticated

POST /api/vision/parse
  Request: { imageBase64 }
  Response: {
    suggestion: { foodName, estimatedQuantity, estimatedUnit },
    rawParse: "raw Claude Vision output"
  }
  Error: 400 (invalid base64), 500 (Vision API failed)
  Note: Image discarded after parsing, never stored

GET /api/strava/authorize
  Redirects to Strava OAuth consent screen

GET /api/strava/callback
  Query: code (from Strava), state
  Response: Redirects to /groceries with Strava token saved
  Error: 400 Bad Request, 500 Strava API error

GET /api/strava/activities?week=2026-05-05
  Query: week (optional, default current week)
  Response: {
    week: { start, end },
    activities: [{ stravaId, date, type, durationMinutes, caloriesBurned }],
    weekTotal: { caloriesBurned, distance, movingTime }
  }
  Error: 401 (Strava not authorized), 503 (Strava timeout/unavailable)
  Note: On-demand fetch only (no background sync)

POST /api/usda/search
  Request: { query: "chicken breast" }
  Response: { results: [{ fdcId, name, nutrition: { calories, protein, carbs, fat, fiber } }] }
  Error: 400 Bad Request, 504 USDA timeout

PUT /api/user/goals
  Request: { dailyCalories, dailyProtein, dailyCarbs, dailyFat }
  Response: { userId, goals: {...}, updatedAt }
  Error: 400 Bad Request, 401 Unauthorized

PUT /api/user/strava-disconnect
  Response: 204 No Content
  Side effect: Clears Strava token from user record
```

---

## Data Model

### ER Diagram (Logical)

```
┌──────────────────┐
│     users        │
├──────────────────┤
│ id (PK)          │
│ email (UNIQUE)   │
│ password_hash    │
│ name             │
│ created_at       │
│ updated_at       │
│ strava_token     │
│ strava_user_id   │
│ strava_expires   │
│ daily_cal_goal   │
│ daily_protein_g  │
│ daily_carbs_g    │
│ daily_fat_g      │
└────────┬─────────┘
         │
         │ 1:N
         │
┌────────▼──────────────────┐
│ user_grocery_inventory    │
├───────────────────────────┤
│ id (PK)                   │
│ user_id (FK)              │
│ food_name                 │
│ quantity_bought           │
│ unit                      │
│ percent_consumed (0-100)  │
│ calories_per_unit         │
│ total_calories            │
│ protein_g                 │
│ carbs_g                   │
│ fat_g                     │
│ fiber_g                   │
│ consumed_calories (calc)  │
│ date_added                │
│ week_start                │
│ created_at                │
│ updated_at                │
└───────────────────────────┘
         ▲
         │
         │ 1:N
         │
┌────────┴─────────┐
│    sessions      │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ session_token    │
│ expires_at       │
│ created_at       │
└──────────────────┘

Legend:
  PK = Primary Key
  FK = Foreign Key
```

### Table Schemas (SQL DDL)

```sql
-- Users table (auth + goals + Strava)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  strava_token TEXT,
  strava_user_id INTEGER,
  strava_token_expires_at TIMESTAMP,
  daily_cal_goal INTEGER DEFAULT 2000,
  daily_protein_g DECIMAL(5,1) DEFAULT 150,
  daily_carbs_g DECIMAL(5,1) DEFAULT 200,
  daily_fat_g DECIMAL(5,1) DEFAULT 65,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT password_not_empty CHECK (password_hash != '')
);

CREATE INDEX idx_users_email ON users(email);

-- Grocery inventory table (core data)
CREATE TABLE user_grocery_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name VARCHAR(255) NOT NULL,
  quantity_bought DECIMAL(8,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  percent_consumed DECIMAL(5,2) DEFAULT 0,
  calories_per_unit DECIMAL(8,2),
  total_calories DECIMAL(8,2),
  protein_g DECIMAL(7,2),
  carbs_g DECIMAL(7,2),
  fat_g DECIMAL(7,2),
  fiber_g DECIMAL(7,2),
  date_added DATE NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT quantity_positive CHECK (quantity_bought > 0),
  CONSTRAINT percent_valid CHECK (percent_consumed >= 0 AND percent_consumed <= 100)
);

CREATE INDEX idx_inventory_user_week ON user_grocery_inventory(user_id, week_start);
CREATE INDEX idx_inventory_user_date ON user_grocery_inventory(user_id, date_added);

-- Sessions table (NextAuth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
```

---

## Authentication Flow

### Guest Mode (No Login)
1. User lands on `/` → sees "Guest" button
2. Clicks "Guest" → `/groceries?mode=guest`
3. All data stored in localStorage under key `trail_mix_guest_groceries`
4. Data shape: `{ groceries: [...], weekStart: "2026-05-05" }`
5. **Data loss risk**: Browser cache clear = data gone (acceptable for MVP)
6. User can use all features: upload receipts, manage inventory, view dashboard

### Signup/Login Flow
1. User clicks "Sign In" or "Create Account" on splash
2. Redirected to `/auth/signin` or `/auth/register`
3. Enter email + password (or create new account)
4. POST `/api/auth/signin` or `/api/auth/register` validates, returns sessionToken
5. SessionToken stored in httpOnly cookie (secure + sameSite)
6. Redirected to `/groceries` (authenticated view)
7. **Auto-migration**: If localStorage has guest groceries:
   - POST `/api/groceries/batch` with all items
   - Backend inserts with user_id
   - Frontend clears localStorage
   - User sees all their guest data now in DB
8. From this point on, all data persists to database

### Strava OAuth (On-Demand, In Settings Tab)
1. User on `/groceries` Tab 3 (Settings) clicks "Connect Strava"
2. GET `/api/strava/authorize` → redirects to Strava consent screen
3. User approves access
4. Strava redirects to `/api/strava/callback?code=...&state=...`
5. Backend exchanges code for access_token, stores in `users.strava_token`
6. Redirects back to `/groceries?strava_connected=true`
7. User can now view Strava activities in Dashboard (Tab 2)

### Logout
1. User clicks logout in Settings (Tab 3)
2. POST `/api/auth/logout`
3. Session cookie cleared
4. Redirect to `/`

---

## 3-Tab UI Layout & Navigation

### Tab 1: Camera (Grocery Inventory Management)
**Purpose:** Upload receipts and manage grocery inventory

**Sub-sections:**
- **Upload Receipt:** Camera button → capture image → Claude Vision parses → shows extracted items
  - User reviews extracted items (name, quantity, unit)
  - Can edit/add/remove items before confirming
  - Click "Add to Inventory" → creates grocery entries
  
- **Current Inventory:** List of all groceries for current week
  - Shows: food name, quantity bought, unit, % consumed (slider)
  - User adjusts slider as week progresses ("ate 75% of the chicken")
  - Can delete items (thrown away, not eating)
  - Shows date added
  
- **Navigation:** Week toggle at top ("← Previous Week" / "This Week" / "Next Week →")

### Tab 2: Dashboard (Nutrition Summary & Strava Comparison)
**Purpose:** See weekly macro breakdown and compare to Strava calorie burn

**Display:**
- **Week Header:** "Week of May 5-11, 2026" with week navigation arrows
- **Groceries Consumed:**
  - Macros consumed this week (Protein/Carbs/Fat/Calories) as progress bars
  - Shows: actual consumed vs. total bought
  - Circle chart showing macro breakdown of consumed groceries
  
- **Strava Calories Burned:**
  - Shows: "You burned X calories this week" (pulled from Strava)
  - Shows: X running miles, Y workouts
  - Button to "Sync Activities" (on-demand Strava fetch)
  
- **Alignment Insight:**
  - "Burned 2,500 cal | Consumed 2,100 cal | Deficit: 400 cal"
  - Color-coded: green (aligned), yellow (slight deficit/surplus), red (major mismatch)
  
- **Macro Goals Display:**
  - Current goals (set in Settings)
  - Progress bars for each macro
  
- **Week Toggle:** Arrows or dropdown to view past weeks
  - Pulls old data from DB
  - Shows historical comparison

### Tab 3: Settings (Configuration & Account)
**Purpose:** Connect Strava, set macro goals, manage account

**Sub-sections:**
- **Strava Connection:**
  - If not connected: "Connect Strava" button → OAuth flow
  - If connected: "✓ Connected" + "Disconnect" button
  
- **Macro Goals:**
  - Input fields: Daily Calorie Goal, Daily Protein (g), Daily Carbs (g), Daily Fat (g)
  - "Save Goals" button
  
- **Account:**
  - Display: Current user email, name
  - "Log Out" button
  
- **Help/Info:**
  - How to use (collapse-able)
  - Data accuracy disclaimers

---

## Weekly Time Boundary Logic

### Definition
- **Week**: Monday 00:00 UTC → Sunday 23:59:59 UTC
- **Week identifier**: ISO week start date (Monday) in format `YYYY-MM-DD`
- **Example**: "2026-05-05" = Week of May 5-11 (Mon-Sun)

### Implementation (Backend)

```typescript
// utils/weekBoundary.ts
export function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function getWeekBoundary(weekStart: string): { start: Date; end: Date } {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCSeconds(end.getUTCSeconds() - 1);
  return { start, end };
}

export function isDateInWeek(date: Date, weekStart: string): boolean {
  const { start, end } = getWeekBoundary(weekStart);
  return date >= start && date <= end;
}
```

### Frontend Usage
- Grocery list query: `GET /api/groceries?week=2026-05-05` (always pass Monday)
- Week Navigator: Click arrows to add/subtract 7 days
- Week display: "May 5–11, 2026"
- All dates stored in UTC, converted to user's timezone for display (optional for MVP)

---

## Error Handling Strategy

### Error Categories & Recovery

#### 1. Claude Vision API Fails
- User uploads receipt image
- POST `/api/vision/parse` → Vision API error (500, timeout, invalid image)
- **Response**: 
  ```json
  {
    "error": "vision_parse_failed",
    "message": "Could not parse receipt. Please enter items manually.",
    "fallback": "manual_entry"
  }
  ```
- **Frontend**: Show error toast, display manual form for user to enter food details
- **No automatic retry** on MVP

#### 2. Strava API Timeout / Unavailable
- User clicks "Sync Activities" in Dashboard (Tab 2)
- GET `/api/strava/activities` → Strava returns 503 or timeout
- **Response**:
  ```json
  {
    "error": "strava_unavailable",
    "message": "Strava is currently unavailable. Try again later.",
    "activities": []
  }
  ```
- **HTTP Status**: 503 Service Unavailable
- **Frontend**: Show warning ("Strava not available"), don't block dashboard
- **No fallback sync** (on-demand only, user can retry)

#### 3. USDA FoodDB Search No Match
- POST `/api/usda/search?query=xyz` → no matching foods
- **Response**:
  ```json
  {
    "error": "no_nutrition_found",
    "results": [],
    "suggestion": "Try searching for 'chicken' instead of 'chicko'"
  }
  ```
- **HTTP Status**: 200 OK (valid result, just empty)
- **Frontend**: Show "No foods found", allow user to try different search or manual entry

#### 4. Nutrition Lookup Partially Missing
- User adds grocery item but some macros missing from USDA
- **Response**: Return partial nutrition, null for missing fields
  ```json
  {
    "id": "grocery-123",
    "foodName": "organic salmon",
    "nutrition": {
      "calories": 208,
      "protein": 20,
      "carbs": null,
      "fat": null,
      "fiber": null
    }
  }
  ```
- **Frontend**: Show "⚠️ Partial nutrition data" tooltip, allow user to edit/complete manually

#### 5. Database Connection Lost
- POST `/api/groceries` → DB unreachable
- **Response**:
  ```json
  {
    "error": "database_error",
    "message": "Unable to save. Please try again.",
    "retryable": true
  }
  ```
- **HTTP Status**: 500 Internal Server Error
- **Frontend**: Show error toast with "Retry" button

#### 6. Authentication Expired
- User token expires while viewing `/groceries`
- Any API call returns 401 Unauthorized
- **Response**:
  ```json
  {
    "error": "unauthorized",
    "message": "Your session expired. Please log in again."
  }
  ```
- **Frontend**: Redirect to `/auth/signin`, show message

#### 7. Validation Errors
- POST `/api/groceries` with invalid data (missing foodName, quantity <= 0)
- **Response**:
  ```json
  {
    "error": "validation_error",
    "errors": {
      "foodName": "Food name is required",
      "quantity": "Quantity must be greater than 0"
    }
  }
  ```
- **HTTP Status**: 400 Bad Request
- **Frontend**: Display field-level error messages in form

### Global Error Handling (Frontend)

```typescript
// hooks/useApi.ts
export function useApi<T>(
  url: string,
  options?: RequestInit
): { data: T | null; loading: boolean; error: ApiError | null } {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    setState(s => ({ ...s, loading: true }));
    fetch(url, options)
      .then(res => {
        if (!res.ok) {
          throw new ApiError(res.status, await res.json());
        }
        return res.json();
      })
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => {
        console.error('API Error:', error);
        setState(s => ({ ...s, loading: false, error }));
        toast.error(error.message || 'Something went wrong');
      });
  }, [url]);

  return state;
}
```

### Logging Strategy
- **Backend**: Console logs (Vercel captures stdout)
  - Log level: INFO for key operations, ERROR for failures
  - Include: timestamp, user_id (if authed), operation, duration, error stack
- **Frontend**: Browser console (dev), Sentry optional for production

---

## Deployment Architecture

### Production Stack
- **Frontend**: Vercel (Next.js hosting)
- **Backend**: Vercel Serverless Functions
- **Database**: Neon.tech (PostgreSQL, free tier)
- **Authentication**: NextAuth.js (deployed with Next.js)
- **External APIs**: Strava, USDA FoodDB, Claude Vision (via HTTP from Vercel)

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@neon.tech/trail_mix

# NextAuth
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=https://trail-mix.vercel.app

# Strava OAuth
STRAVA_CLIENT_ID=<from Strava Dashboard>
STRAVA_CLIENT_SECRET=<from Strava Dashboard>

# Claude Vision (API key)
ANTHROPIC_API_KEY=<from Anthropic Dashboard>

# USDA FoodDB
USDA_API_KEY=<from USDA FDC>

# Optional: Logging
SENTRY_DSN=<if using Sentry>
```

### Deployment Steps
1. Push to GitHub `main` branch
2. Vercel auto-deploys
3. Set environment variables in Vercel project settings
4. Run database migrations: `drizzle-kit migrate`
5. Health check: `GET https://trail-mix.vercel.app/api/health` → 200

---

## Database Schema (Quick Reference)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Auth + goals + Strava token | id, email, password_hash, strava_token, daily_cal_goal |
| `user_grocery_inventory` | Grocery inventory core data | id, user_id, food_name, quantity_bought, percent_consumed, nutrition |
| `sessions` | Auth sessions (NextAuth) | id, user_id, session_token, expires_at |

---

## Known Constraints & MVP Decisions

### Guest Mode Data Loss
- **Guest users**: localStorage data is lost on browser cache clear
- **No recovery mechanism**: No recovery codes or email backup
- **Trade-off**: Simpler onboarding, but users must log in to persist data

### Strava Sync
- **On-demand only**: No background jobs or caching
- **Trade-off**: User clicks "Sync" and waits (UX friction) vs. always-fresh data
- **Scales better**: No job queue infrastructure needed

### Receipt Images
- **Discarded after parsing**: No persistent storage
- **Trade-off**: User can't view parsed receipt history, saves storage costs

### Nutrition Data
- **Computed at entry time**: Pulled from USDA once, stored with grocery item
- **No sync on updates**: If USDA updates nutrition, old groceries stay the same
- **Trade-off**: Simpler logic vs. historical accuracy

### Authentication
- **Strava tokens**: Refresh tokens not implemented
- **Trade-off**: User may need to re-auth if token expires (usually not an issue)

### Inventory Carryover
- **Week-to-week carryover**: Unconsumed groceries carry into next week
- **User deletes manually**: If item is thrown out, user deletes it
- **Trade-off**: Simple model, user manages cleanup

---

## Implementation Checklist

### Phase 1: Auth & UI Structure (Days 1-2)
- [ ] Set up Next.js 15 project (already initialized)
- [ ] Configure PostgreSQL on Neon.tech
- [ ] Set up Drizzle ORM, run migrations
- [ ] Implement NextAuth.js (email/password provider)
- [ ] Create splash page (`/`) with Guest / Sign In buttons
- [ ] Create auth pages (`/auth/signin`, `//auth/register`)
- [ ] Implement localStorage-based guest context
- [ ] Create `/groceries` page with 3-tab layout structure
- [ ] Test auth flows (guest → login → migration)

### Phase 2: Grocery Inventory (Days 2-4)
- [ ] Create `POST /api/groceries` endpoint
- [ ] Create `GET /api/groceries?week=` endpoint
- [ ] Create `PUT /api/groceries/:id` (update % consumed)
- [ ] Create `DELETE /api/groceries/:id`
- [ ] Implement grocery form component
- [ ] Implement inventory list view (Tab 1)
- [ ] Implement week navigation logic
- [ ] Test CRUD operations

### Phase 3: USDA Integration (Days 4-5)
- [ ] Create `POST /api/usda/search` endpoint
- [ ] Integrate USDA FoodDB API
- [ ] Implement nutrition lookup & results display
- [ ] Create USDA search UI in grocery form
- [ ] Handle "no match" fallback (manual entry)
- [ ] Test nutrition lookups

### Phase 4: Claude Vision (Days 5-6)
- [ ] Create `POST /api/vision/parse` endpoint
- [ ] Integrate Claude Vision API
- [ ] Create receipt upload component (Tab 1)
- [ ] Implement vision → results → confirmation flow
- [ ] Test receipt parsing with sample images

### Phase 5: Strava Integration (Days 6-7)
- [ ] Create `GET /api/strava/authorize` endpoint
- [ ] Create `GET /api/strava/callback` endpoint
- [ ] Create `GET /api/strava/activities?week=` endpoint
- [ ] Implement Strava OAuth flow in Settings (Tab 3)
- [ ] Display Strava activities in Dashboard (Tab 2)
- [ ] Test Strava OAuth and activity fetch

### Phase 6: Dashboard & Nutrition Summary (Days 7-9)
- [ ] Create `GET /api/nutrition?week=` endpoint
- [ ] Implement weekly summary calculation (totals, consumed vs. bought)
- [ ] Create Dashboard view (Tab 2):
  - Macros consumed (progress bars)
  - Strava calories burned
  - Deficit/surplus comparison
- [ ] Implement week navigation in Dashboard
- [ ] Create Settings page (Tab 3):
  - Strava connection button
  - Macro goals form
  - Account info
- [ ] Test nutrition calculations

### Phase 7: Polish & Error Handling (Days 9-10)
- [ ] Implement comprehensive error handling (all error cases)
- [ ] Input validation (all endpoints)
- [ ] Loading states & optimistic updates (UI)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Test guest → login migration flow
- [ ] Manual testing with real receipts and Strava data
- [ ] Deploy to staging (Vercel preview)

### Phase 8: Final Testing & Launch (Day 10+)
- [ ] Security review
- [ ] Performance testing
- [ ] Set environment variables on Vercel production
- [ ] Deploy to production
- [ ] Monitor logs & errors
- [ ] Gather feedback from yourself (primary user)

---

## Key Implementation Notes

### localStorage Guest Mode Shape

```typescript
interface GuestGroceries {
  groceries: {
    id: string; // client-generated UUID
    foodName: string;
    quantityBought: number;
    unit: string;
    percentConsumed: number; // 0-100
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
    };
    dateAdded: string; // YYYY-MM-DD
    weekStart: string; // YYYY-MM-DD (Monday)
  }[];
  lastSync?: timestamp;
}
```

### Guest → Login Migration

```typescript
// On successful login:
const guestGroceries = JSON.parse(localStorage.getItem('trail_mix_guest_groceries') || '{}');

if (guestGroceries.groceries?.length > 0) {
  // Batch create all groceries in DB
  const response = await fetch('/api/groceries/batch', {
    method: 'POST',
    body: JSON.stringify({ groceries: guestGroceries.groceries })
  });
  
  if (response.ok) {
    // Clear localStorage
    localStorage.removeItem('trail_mix_guest_groceries');
    // Redirect to /groceries
  }
}
```

### Weekly Calculations

```typescript
// Calculate consumed calories
const consumedCalories = totalCalories * (percentConsumed / 100);

// Calculate macro breakdown consumed
const consumedProtein = protein * (percentConsumed / 100);
const consumedCarbs = carbs * (percentConsumed / 100);
const consumedFat = fat * (percentConsumed / 100);

// Compare to Strava
const calorieDeficit = stravaCaloriesBurned - totalConsumedCalories;
const surplus = calorieDeficit > 0 ? false : true;
```

### Strava Sync (On-Demand)

```typescript
// In Dashboard, user clicks "Sync Activities"
const response = await fetch(`/api/strava/activities?week=${currentWeekStart}`);

if (!response.ok) {
  if (response.status === 401) {
    // Strava not connected, show "Connect Strava" button
  } else if (response.status === 503) {
    // Strava unavailable, show error message
  }
}

const { activities, weekTotal } = await response.json();
// Display: weekTotal.caloriesBurned
```

### Claude Vision Flow

```typescript
// User uploads receipt image
const imageBase64 = await fileToBase64(imageFile);

const response = await fetch('/api/vision/parse', {
  method: 'POST',
  body: JSON.stringify({ imageBase64 })
});

if (!response.ok) {
  // Show error: "Could not parse receipt, enter manually"
  // Display manual form
} else {
  const { suggestion } = await response.json();
  // Pre-fill form with suggestion.foodName, suggestion.estimatedQuantity
  // User reviews and adjusts before confirming
}
```

### USDA Search

```typescript
// User searches for food
const response = await fetch(`/api/usda/search?query=${query}`);
const { results } = await response.json();

if (results.length === 0) {
  // Show: "No foods found for '{query}'. Try a different search or enter manually."
  // Allow manual nutrition entry
} else {
  // Show top 3 results
  // User clicks one to select it
  // Nutrition data fills in
}
```

---

## Architecture Review Checklist

- [x] Guest mode with localStorage (data loss on cache clear acceptable)
- [x] Auto-migration from guest → authenticated on login
- [x] On-demand Strava sync (no background jobs)
- [x] Receipt images discarded after parsing
- [x] Claude Vision cost accepted (no rate limiting)
- [x] 3-tab UI (Camera/Dashboard/Settings)
- [x] Grocery inventory model (% consumed per week)
- [x] Weekly boundary logic (Mon-Sun, UTC)
- [x] All error cases documented with recovery
- [x] API routes support guest + authenticated modes
- [x] Database schema supports all requirements
- [x] Authentication secure (httpOnly cookies, NextAuth)
- [x] Deployment plan is Vercel-native
- [x] Solo developer can maintain