# TrailMix

A PWA for tracking weekly grocery inventory and comparing consumed nutrition against Strava calorie burn.

## About

TrailMix solves a real problem for endurance athletes: you train hard but can't dial in nutrition without tedious meal logging and scales. Photograph your grocery receipt with your phone, TrailMix extracts items and nutrition via Claude Vision, then you mark items as consumed through the week. At the end of the week, see your macro breakdown and compare it to actual Strava calorie burn.

**No login required to start.** All data stored locally. Optional account login to persist across devices.

## Features

- **Receipt Photography & Parsing** - Photograph grocery receipt, Claude Vision extracts items automatically
- **Grocery Inventory Tracking** - Track quantity bought and percent consumed for each item
- **Automated Nutrition Lookup** - Claude API looks up nutrition data, or you can enter manually
- **Weekly Dashboard** - See consumed macros (protein, carbs, fat, calories) as progress bars
- **Strava Integration** - Connect Strava account to pull weekly calorie burn, compare to consumption
- **Macro Goals** - Set daily targets and see progress toward goals
- **Week Navigation** - View current week or toggle to past weeks
- **Guest & Authenticated Modes** - Guest mode (localStorage) for immediate use, optional login for persistence
- **Mobile PWA** - Install on home screen, works on iOS/Android/desktop

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon.tech recommended for free tier)
- API keys:
  - Anthropic Claude (for Vision & nutrition lookup)
  - Strava OAuth credentials (optional, for Strava integration)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with required variables:
   ```bash
   NEXTAUTH_SECRET=<generate-random-string>
   NEXTAUTH_URL=http://localhost:3001
   DATABASE_URL=<postgres-connection-string>
   ANTHROPIC_API_KEY=<your-anthropic-api-key>
   STRAVA_CLIENT_ID=<your-strava-client-id>
   STRAVA_CLIENT_SECRET=<your-strava-client-secret>
   ```

4. Run database migrations:
   ```bash
   npx drizzle-kit migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3001 in your browser

## Architecture

**Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Recharts for charts
**Backend**: Next.js API routes, NextAuth.js (email/password + Strava OAuth)
**Database**: PostgreSQL with Drizzle ORM
**APIs**: Claude Vision (receipt parsing), Claude API (nutrition lookup), Strava API (activity data)
**Hosting**: Vercel (frontend) + Neon.tech (database)

## Project Structure

```
trail-mix/
├── app/
│   ├── page.tsx                    # Splash/landing
│   ├── groceries/                  # Main app (3-tab layout)
│   │   ├── page.tsx                # Camera tab (receipts & inventory)
│   │   ├── dashboard/page.tsx      # Dashboard tab (nutrition summary)
│   │   └── settings/page.tsx       # Settings tab (goals, Strava, account)
│   ├── auth/                       # Auth pages
│   │   ├── signin/page.tsx
│   │   └── register/page.tsx
│   └── api/                        # API routes
│       ├── groceries/              # CRUD for grocery items
│       ├── nutrition/              # Weekly summary & calculations
│       ├── vision/                 # Claude Vision receipt parsing
│       ├── strava/                 # Strava OAuth & activity sync
│       ├── usda/                   # Nutrition lookup
│       └── auth/                   # NextAuth routes
├── components/                     # React components
├── lib/                            # Utilities & helpers
│   ├── auth.ts                     # NextAuth configuration
│   ├── db.ts                       # Drizzle setup
│   ├── validation.ts               # Zod schemas
│   ├── weekBoundary.ts             # Week calculation
│   ├── nutrition.ts                # Nutrition calculations
│   └── toast.ts                    # Toast notification system
├── schema/                         # Drizzle ORM schema definitions
└── handoff/                        # Phase progression & requirements docs
```

## How to Use

### As Guest

1. Click "Guest" on splash screen
2. Photograph a grocery receipt or manually add items
3. As the week progresses, update the consumption percentage for each item
4. View the dashboard to see your weekly macros vs. Strava burn

### With Account

1. Click "Sign In" or "Create Account"
2. Enter email and password
3. Any guest data you had is migrated to your account
4. From now on, data persists across devices and browser clears

### Connecting Strava

1. Go to Settings (third tab)
2. Click "Connect Strava"
3. Approve access in Strava OAuth flow
4. Your weekly activities will now appear in the Dashboard

## Data Model

**users** - email, password hash, macro goals, Strava token
**user_grocery_inventory** - grocery items with quantity, consumption %, nutrition, week
**sessions** - NextAuth session storage

## Development Notes

### Adding a New Feature

1. Create API route in `/app/api/<feature>/route.ts`
2. Add validation schema in `/lib/validation.ts`
3. Create React component in `/components/<Feature>.tsx`
4. Integrate into the relevant page (camera/dashboard/settings)
5. Test manually with actual data

### Error Handling

- All API endpoints return validation errors (400) and specific error messages
- Client uses toast system for user feedback
- Confirmation dialogs for destructive actions (delete)
- Skeleton loaders for async data loading

### Testing

No automated test suite. Test manually:
- Guest mode: add items, update consumption, view dashboard
- Login: create account, verify data persists
- Strava: connect account, verify activities load
- Edge cases: missing nutrition data, no Strava activities, past weeks

## Deployment

Push to main branch. Vercel auto-deploys.

Set environment variables in Vercel project settings (not in `.env.local`).

## Known Limitations

- Guest data is lost if browser cache is cleared
- Strava token refresh not implemented (user must re-auth if token expires, rare)
- Receipt images are discarded after parsing (can't view history)
- No barcode scanning (future feature)
- No meal planning or macro recommendations
- No export/sharing of reports

## Support

See `/handoff` directory for detailed architecture and phase progression docs.

## License

MIT
