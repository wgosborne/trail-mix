# TrailMix - Grocery Inventory & Nutrition Tracker

A PWA for trail runners to track weekly grocery inventory and compare consumed nutrition to Strava calorie burn.

## Problem & Solution

You train hard (40+ mi/week running, 3x/week lifting) but can't dial in nutrition without tedious meal logging and scales. TrailMix solves this by letting you photograph grocery receipts (Claude Vision extracts items), track consumption through the week, and compare macros against actual Strava calorie burn—no login required to start.

## Current Phase

Implementation - Phase 8 (Post-launch Polish & Maintenance)

All core features complete. Project is functional and tested. Current work: bug fixes, UX refinement, and potential optimizations.

## Tech Stack

- **Frontend**: Next.js 16.2 (App Router, TypeScript), Tailwind CSS v4, Recharts for charts, Zod for validation
- **Backend**: Next.js API routes, NextAuth.js (email/password auth)
- **Database**: PostgreSQL (Neon.tech), Drizzle ORM
- **APIs**: Anthropic Claude Vision (receipt parsing), Claude API (USDA replacement for nutrition lookup), Strava OAuth (calorie burn)
- **Deployment**: Vercel + Neon.tech
- **Testing**: Manual (no automated tests in MVP)

## Core Features

1. **Receipt Parsing** - Photograph receipt, Claude Vision extracts items, user reviews and adds to inventory
2. **Grocery Inventory** - Track items by quantity and percent consumed throughout the week
3. **Nutrition Lookup** - Automatically fetch nutrition via Claude API (replaces USDA for simplicity and accuracy)
4. **Weekly Dashboard** - See consumed macros as progress bars, compare to Strava calorie burn, view deficit/surplus
5. **Week Navigation** - Toggle between weeks (Monday-Sunday boundaries)
6. **Strava Integration** - OAuth login to pull weekly calorie burn data
7. **Macro Goals** - Set and track daily targets (calories, protein, carbs, fat)
8. **Guest & Authenticated Modes** - Use immediately in guest mode (localStorage), optional login for persistence
9. **Error Handling** - Input validation, toast notifications, confirmation dialogs for destructive actions

## Core Entities

- **users** - email, password hash, Strava token, daily macro goals
- **user_grocery_inventory** - per-item tracking (name, quantity, percent consumed, nutrition, week)
- **sessions** - NextAuth session storage

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/auth/session | Check current session |
| POST | /api/auth/signin | Email/password login |
| POST | /api/auth/register | Create account |
| POST | /api/auth/logout | Logout |
| GET | /api/groceries | List week's items |
| POST | /api/groceries | Create grocery item |
| PUT | /api/groceries/:id | Update consumption % |
| DELETE | /api/groceries/:id | Delete item |
| GET | /api/nutrition | Weekly macro totals + Strava |
| POST | /api/vision/parse | Parse receipt image |
| GET | /api/strava/authorize | OAuth redirect |
| GET | /api/strava/callback | OAuth callback |
| GET | /api/strava/activities | Get week's Strava activities |
| POST | /api/usda/search | Search foods (deprecated - using Claude now) |
| PUT | /api/user/goals | Update macro targets |

## Key Decisions

1. **Claude Vision for receipts** - Works instantly, no image storage, cost acceptable for MVP
2. **Claude API for nutrition** - Simpler than USDA integration, more reliable for real-world grocery items
3. **Guest + login model** - localStorage for immediate use, optional login to persist across devices/clears
4. **On-demand Strava sync** - User clicks button vs. background sync—simpler, avoids job queue complexity
5. **Weekly aggregation** - Monday-Sunday boundaries, UTC normalized, simple carryover logic for unconsumed items
6. **No automated tests** - Manual testing only to stay focused on shipped features
7. **Zod validation** - Type-safe input validation on all endpoints with user-friendly error messages

## How to Run

### Setup
```bash
# Install dependencies
npm install

# Configure environment variables (.env.local - never commit)
NEXTAUTH_SECRET=<generate-random-string>
NEXTAUTH_URL=http://localhost:3001
ANTHROPIC_API_KEY=<from Anthropic Dashboard>
STRAVA_CLIENT_ID=<from Strava Developer Dashboard>
STRAVA_CLIENT_SECRET=<from Strava Developer Dashboard>
DATABASE_URL=<from Neon.tech PostgreSQL>

# Run database migrations
npx drizzle-kit migrate

# Start dev server
npm run dev
```

App runs on `http://localhost:3001`

### Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel (auto on git push to main)
# Set environment variables in Vercel project settings
```

## Current Status

- [x] Database schema & Drizzle ORM setup
- [x] NextAuth email/password authentication
- [x] Guest mode (localStorage) + login migration
- [x] Grocery CRUD (add, update consumption %, delete)
- [x] Week navigation & boundaries
- [x] Receipt parsing via Claude Vision
- [x] Nutrition auto-lookup via Claude API
- [x] Strava OAuth & weekly activity sync
- [x] Weekly nutrition dashboard with charts
- [x] Macro goals settings
- [x] Input validation & error handling
- [x] Toast notifications
- [x] Confirmation dialogs
- [x] Skeleton loaders
- [x] Phase 7 (Polish) complete
- [x] Phase 8 Priority 1: Strava token auto-refresh
- [x] Phase 8 Priority 2: Recharts warnings fix
- [x] Phase 8 Priority 3: UX refinements & edge case testing

## Phase 8 Progress

**Priority 1: Strava Token Auto-Refresh** ✓ COMPLETE
- Implemented `getValidStravaToken()` helper with automatic refresh logic
- Strava activities endpoint uses auto-refresh before API calls
- Disconnect endpoint clears all credentials
- Test plan created: `TEST_PLAN_PHASE8_PRIORITY1.md`

**Priority 2: Recharts Console Warnings** ✓ COMPLETE
- Fixed hydration mismatches and responsive container warnings

**Priority 3: UX Refinements - Edge Case Testing & Mobile Responsiveness** ✓ COMPLETE
- **Mobile Responsiveness**: Updated all grid layouts to be responsive with `repeat(auto-fit, minmax())`
- **Touch Targets**: Increased padding on all buttons and inputs to minimum 44px height
- **Loading States**: Added skeleton loaders for dashboard, groceries page, and nutrition data
- **Empty States**: Improved messaging for no groceries, no activities, no receipt items
- **Error Handling**: Enhanced error messages in ReceiptUploader, NutritionSearch, and dashboard
- **Accessibility**: Added form labels, improved contrast, better focus states

**Priority 4: Code Cleanup** ✓ COMPLETE
- **TODO Comments**: Removed TODO from strava/activities (rate limit optimization now implemented)
- **Console Logging**: Cleaned up 40+ debug log statements from API routes and utilities
  - Removed verbose debug logs from vision parsing, nutrition search, and USDA lookup
  - Kept error-level console.error() statements for troubleshooting
- **Documentation**: Added JSDoc comments to key utility functions (cache, strava token management)
- **API Error Responses**: Verified consistent error response format across all endpoints
- **Unused Code**: No significant unused imports or dead code found; kept USDA lookup for reference

## Open Questions / Known Issues

1. **USDA search deprecated**: Replaced with Claude API calls. If Claude API capacity becomes a concern, optimize caching.
2. **Guest data loss**: Acceptable per requirements. Browser cache clear = data lost. Users warned at login.
3. **Receipt image storage**: Discarded after parsing (intentional). Users can't view parsed receipt history.
4. **Strava token rotation**: If refresh token expires (6 months), user must re-auth. Acceptable for MVP.

## Phase 8 Completion Summary

Phase 8 (Post-launch Polish & Maintenance) is **COMPLETE**. The project is now in a **stable, maintainable state** with:
- ✓ All core features functional and tested
- ✓ Strava token auto-refresh implemented
- ✓ Console warnings eliminated
- ✓ UX polished for mobile and accessibility
- ✓ Code cleaned up with proper documentation
- ✓ Consistent error handling across all endpoints
- ✓ Grocery lookup table implemented for caching nutrition data

## Phase 9: Grocery Lookup Table (Caching & Performance)

**Implemented: Nutrition Lookup Cache**

Added a persistent `grocery_lookup` table to cache nutrition data after first lookup, speeding up future queries for the same items.

**What was added:**
1. **New table**: `grocery_lookup` (Drizzle schema) — stores normalized food names, units, and nutrition macros
2. **Helper functions** (`lib/grocery-lookup.ts`):
   - `normalizeName()` — normalize food names for consistent lookups (lowercase, trim, collapse whitespace)
   - `findInLookup()` — query cached nutrition by name and unit
   - `upsertLookup()` — insert or update cache entry, preserving 'user' source over 'claude'
3. **New endpoint**: `GET /api/grocery-lookup?name=X&unit=Y` — returns cached nutrition or 404
4. **Integration points**:
   - `POST /api/groceries` — caches entered nutrition data after user adds item
   - `lib/usda-lookup.ts` — `searchNutritionOptions()` checks cache before calling Claude
   - `POST /api/usda/search` — prepends cached result alongside fresh Claude results
5. **Database**: Migration generated and applied (`drizzle/0001_public_grim_reaper.sql`)
6. **Build**: TypeScript compilation successful, all endpoints registered

**Why this matters:**
- Eliminates redundant Claude API calls for frequently-used items
- Reduces latency for repeat lookups
- User-entered values preserved and trusted over Claude estimates
- Clean separation: 'user' source = human-entered, 'claude' source = AI-generated

The codebase is production-ready. Future work would focus on advanced features (meal logging, social sharing, analytics) beyond the current MVP scope.

## Project Files

- `/app` - Next.js pages and API routes
- `/components` - React components (ReceiptUploader, GroceryInventory, NutritionDashboard, etc.)
- `/lib` - Utilities (auth, db, nutrition calculations, validation, toast system)
- `/schema` - Drizzle ORM database schema
- `/handoff` - Phase progression & requirements docs

## Key Dependencies

- `next` (16.2) - React framework
- `next-auth` - Authentication
- `drizzle-orm` - TypeScript ORM
- `postgres` - Database driver
- `@anthropic-ai/sdk` - Claude Vision & API
- `zod` - Input validation
- `recharts` - Dashboard charts
- `bcrypt` - Password hashing
- `tailwindcss` - Styling
