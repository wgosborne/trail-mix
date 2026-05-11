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
- [ ] Phase 8 (bug fixes, UX refinement)

## Next Steps

1. Monitor logs for any edge case failures
2. Test guest → login migration thoroughly
3. Verify Strava token refresh if applicable
4. Test on mobile (iOS/Android PWA install)
5. Optimize dashboard rendering for large weeks (20+ items)
6. Consider pagination if inventory grows

## Open Questions / Known Issues

1. **Strava token expiration**: Refresh token not implemented (rare issue, user can re-auth)
2. **USDA search deprecated**: Replaced with Claude API calls. If Claude API capacity becomes a concern, optimize caching.
3. **Guest data loss**: Acceptable per requirements. Browser cache clear = data lost. Users warned at login.
4. **Receipt image storage**: Discarded after parsing (intentional). Users can't view parsed receipt history.

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
