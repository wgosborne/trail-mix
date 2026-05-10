# Implementation: TrailMix MVP (Phase-by-Phase Breakdown)

## Overview

**Timeline:** 10 days (flexible pacing: 4-5 hrs/day, can shift based on availability)
**Approach:** Iterative phases, each producing working output you can test
**Goal:** Fully functional PWA deployed to Vercel by Day 10

**Key Decisions (Locked In):**
- ✅ Email/password authentication only (no OAuth for auth)
- ✅ Guest mode with localStorage (warn "Sign in to save", no auto-migration on login)
- ✅ Manual testing only (no automated tests in MVP)
- ✅ Neon.tech PostgreSQL (user will set up before Phase 1)
- ✅ API keys in `.env.local` (never commit secrets)
- ✅ Health check endpoint added to Phase 1
- ✅ Discard receipt images after Claude Vision parsing (no storage)

---

## Project Structure (Initial Setup)

```
trail-mix/
├── app/
│   ├── layout.tsx                 # Root layout, NextAuth provider
│   ├── page.tsx                   # Splash page (/)
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx          # Sign in page
│   │   ├── register/
│   │   │   └── page.tsx          # Register page
│   │   └── error.tsx             # Auth error handler
│   ├── groceries/
│   │   ├── layout.tsx            # 3-tab navigation layout
│   │   ├── page.tsx              # Tab 1: Camera
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Tab 2: Dashboard
│   │   └── settings/
│   │       └── page.tsx          # Tab 3: Settings
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signin/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── session/route.ts
│   │   ├── groceries/
│   │   │   ├── route.ts          # GET (list), POST (create), batch migration
│   │   │   └── [id]/route.ts     # PUT (update), DELETE
│   │   ├── nutrition/route.ts    # GET weekly summary
│   │   ├── vision/parse/route.ts
│   │   ├── strava/
│   │   │   ├── authorize/route.ts
│   │   │   ├── callback/route.ts
│   │   │   └── activities/route.ts
│   │   └── usda/search/route.ts
│   └── health/route.ts           # Health check endpoint
├── lib/
│   ├── db.ts                     # Drizzle ORM setup
│   ├── auth.ts                   # NextAuth config
│   ├── weekBoundary.ts           # Week calculation utilities
│   ├── nutrition.ts              # Nutrition calculation helpers
│   └── api.ts                    # API client utils
├── hooks/
│   ├── useGuestGroceries.ts      # Guest localStorage context
│   ├── useAuth.ts                # Auth hook
│   └── useApi.ts                 # Generic API fetch hook
├── components/
│   ├── TabNavigation.tsx
│   ├── ReceiptUploader.tsx
│   ├── GroceryInventory.tsx
│   ├── GroceryForm.tsx
│   ├── NutritionDashboard.tsx
│   ├── StravaConnect.tsx
│   ├── WeekNavigator.tsx
│   ├── SettingsPanel.tsx
│   └── LoadingSpinner.tsx
├── schema/
│   └── db.ts                     # Drizzle schema definitions
├── types/
│   └── index.ts                  # TypeScript types
├── .env.local                    # Environment variables (NOT in git)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Phase 1: Database, Authentication, UI Shell

**Timeline:** Flexible (6-8 hours)
**Goal:** Can log in, see empty 3-tab layout

### Step 1.1: Database Setup (1-2 hours)

**What you're doing:**
- Create PostgreSQL schema on Neon.tech
- Set up Drizzle ORM
- Create migration files

**Create `schema/db.ts`:**
```typescript
import { pgTable, uuid, varchar, text, timestamp, decimal, date, index, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  stravaToken: text('strava_token'),
  stravaUserId: varchar('strava_user_id', { length: 255 }),
  stravaTokenExpiresAt: timestamp('strava_token_expires_at'),
  dailyCalGoal: decimal('daily_cal_goal', { precision: 5, scale: 0 }).default('2000'),
  dailyProteinG: decimal('daily_protein_g', { precision: 5, scale: 1 }).default('150'),
  dailyCarbsG: decimal('daily_carbs_g', { precision: 5, scale: 1 }).default('200'),
  dailyFatG: decimal('daily_fat_g', { precision: 5, scale: 1 }).default('65'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userGroceryInventory = pgTable(
  'user_grocery_inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    foodName: varchar('food_name', { length: 255 }).notNull(),
    quantityBought: decimal('quantity_bought', { precision: 8, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    percentConsumed: decimal('percent_consumed', { precision: 5, scale: 2 }).default('0'),
    caloriesPerUnit: decimal('calories_per_unit', { precision: 8, scale: 2 }),
    totalCalories: decimal('total_calories', { precision: 8, scale: 2 }),
    proteinG: decimal('protein_g', { precision: 7, scale: 2 }),
    carbsG: decimal('carbs_g', { precision: 7, scale: 2 }),
    fatG: decimal('fat_g', { precision: 7, scale: 2 }),
    fiberG: decimal('fiber_g', { precision: 7, scale: 2 }),
    dateAdded: date('date_added').notNull(),
    weekStart: date('week_start').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    userWeekIdx: index('idx_inventory_user_week').on(table.userId, table.weekStart),
    userDateIdx: index('idx_inventory_user_date').on(table.userId, table.dateAdded),
  })
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    userIdx: index('idx_sessions_user').on(table.userId),
    tokenIdx: index('idx_sessions_token').on(table.sessionToken),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  groceries: many(userGroceryInventory),
  sessions: many(sessions),
}));

export const groceryRelations = relations(userGroceryInventory, ({ one }) => ({
  user: one(users, { fields: [userGroceryInventory.userId], references: [users.id] }),
}));
```

**Create `lib/db.ts`:**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/schema/db';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

**Install dependencies:**
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

**Run migrations:**
```bash
npx drizzle-kit push:postgres
```

**Checkpoint:** Database is set up. Verify in Neon.tech dashboard.

---

### Step 1.2: NextAuth Setup (2-3 hours)

**What you're doing:**
- Configure NextAuth.js with email/password provider
- Create auth API routes
- Set up session management

**Create `lib/auth.ts`:**
```typescript
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });

        if (!user) {
          throw new Error('User not found');
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordMatch) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};

export const handler = NextAuth(authOptions);
```

**Create `app/api/auth/[...nextauth]/route.ts`:**
```typescript
import { handler } from '@/lib/auth';

export const GET = handler;
export const POST = handler;
```

**Create `app/auth/signin/page.tsx`:**
```typescript
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/groceries');
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSignIn}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <p className="text-sm mt-4 text-center">
          Don't have an account? <a href="/auth/register" className="text-blue-600">Register</a>
        </p>
      </div>
    </div>
  );
}
```

**Create similar `/auth/register/page.tsx` (sign up flow):**
```typescript
// Similar structure, but calls POST /api/auth/register
```

**Checkpoint:** Can navigate to `/auth/signin`, see login form. NextAuth configured.

---

### Step 1.3: UI Shell - 3-Tab Layout (2-3 hours)

**What you're doing:**
- Create the main `/groceries` page with 3-tab navigation
- Build tab structure (Camera, Dashboard, Settings)
- Add basic styling

**Create `components/TabNavigation.tsx`:**
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TabNavigation() {
  const pathname = usePathname();

  const tabs = [
    { label: '📷 Camera', href: '/groceries' },
    { label: '📊 Dashboard', href: '/groceries/dashboard' },
    { label: '⚙️ Settings', href: '/groceries/settings' },
  ];

  return (
    <div className="flex border-b sticky top-0 bg-white z-10">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition ${
            pathname === tab.href
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
```

**Create `app/groceries/layout.tsx`:**
```typescript
import { TabNavigation } from '@/components/TabNavigation';

export default function GroceriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TabNavigation />
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
```

**Create `app/groceries/page.tsx` (Tab 1: Camera):**
```typescript
export default function CameraTab() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📷 Grocery Inventory</h1>
      <p className="text-gray-600">Upload a receipt or add groceries manually.</p>
      {/* Components will go here in later phases */}
    </div>
  );
}
```

**Create `app/groceries/dashboard/page.tsx` (Tab 2: Dashboard):**
```typescript
export default function DashboardTab() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📊 Weekly Summary</h1>
      <p className="text-gray-600">Your nutrition breakdown and Strava comparison.</p>
      {/* Components will go here in later phases */}
    </div>
  );
}
```

**Create `app/groceries/settings/page.tsx` (Tab 3: Settings):**
```typescript
export default function SettingsTab() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">⚙️ Settings</h1>
      <p className="text-gray-600">Connect Strava, set macro goals, manage account.</p>
      {/* Components will go here in later phases */}
    </div>
  );
}
```

**Checkpoint:** Can navigate between 3 tabs. Layout is working. Ready for content.

---

### Step 1.4: Splash Page & Navigation (1 hour)

**Create `app/page.tsx` (Splash):**
```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Splash() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/groceries');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">🥗 TrailMix</h1>
        <p className="text-xl text-gray-600 mb-8">Track your grocery intake vs. your training burn</p>
        
        <div className="space-y-4">
          <button
            onClick={() => router.push('/groceries?mode=guest')}
            className="block w-48 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium"
          >
            👤 Use as Guest
          </button>
          <button
            onClick={() => router.push('/auth/signin')}
            className="block w-48 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            🔐 Sign In
          </button>
          <button
            onClick={() => router.push('/auth/register')}
            className="block w-48 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
          >
            ✨ Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Checkpoint:** Splash page works, buttons navigate correctly.

---

### Step 1.5: Health Check Endpoint (15 min)

**Create `app/api/health/route.ts`:**
```typescript
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test database connection
    await db.query.users.findFirst();
    return NextResponse.json({ status: 'healthy' }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  }
}
```

**Test health check:**
```bash
curl https://trail-mix.vercel.app/api/health
# Should return: {"status":"healthy"}
```

**Checkpoint:** Database connectivity verified via health endpoint.

---

## Phase 2: Grocery CRUD & Week Navigation

**Timeline:** Flexible (4-6 hours)
**Goal:** Can add, edit, delete, list groceries; navigate weeks

### Step 2.1: Create Guest Context (1 hour)

**Create `hooks/useGuestGroceries.ts`:**
```typescript
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface Grocery {
  id: string;
  foodName: string;
  quantityBought: number;
  unit: string;
  percentConsumed: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  dateAdded: string; // YYYY-MM-DD
  weekStart: string; // YYYY-MM-DD
}

interface GuestGroceriesContextType {
  groceries: Grocery[];
  addGrocery: (grocery: Omit<Grocery, 'id'>) => void;
  updateGrocery: (id: string, updates: Partial<Grocery>) => void;
  deleteGrocery: (id: string) => void;
  weekStart: string;
  setWeekStart: (week: string) => void;
}

const GuestGroceriesContext = createContext<GuestGroceriesContextType | undefined>(undefined);

export function GuestGroceriesProvider({ children }: { children: React.ReactNode }) {
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [weekStart, setWeekStart] = useState<string>(getCurrentWeekStart());
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('trail_mix_guest_groceries');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setGroceries(data.groceries || []);
        setWeekStart(data.weekStart || getCurrentWeekStart());
      } catch (e) {
        console.error('Failed to load guest groceries', e);
      }
    }
    setMounted(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        'trail_mix_guest_groceries',
        JSON.stringify({ groceries, weekStart })
      );
    }
  }, [groceries, weekStart, mounted]);

  const addGrocery = (grocery: Omit<Grocery, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setGroceries([...groceries, { ...grocery, id }]);
  };

  const updateGrocery = (id: string, updates: Partial<Grocery>) => {
    setGroceries(groceries.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const deleteGrocery = (id: string) => {
    setGroceries(groceries.filter((g) => g.id !== id));
  };

  return (
    <GuestGroceriesContext.Provider
      value={{ groceries, addGrocery, updateGrocery, deleteGrocery, weekStart, setWeekStart }}
    >
      {children}
    </GuestGroceriesContext.Provider>
  );
}

export function useGuestGroceries() {
  const context = useContext(GuestGroceriesContext);
  if (!context) {
    throw new Error('useGuestGroceries must be used within GuestGroceriesProvider');
  }
  return context;
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}
```

**Wrap app with provider in `app/layout.tsx`:**
```typescript
import { GuestGroceriesProvider } from '@/hooks/useGuestGroceries';
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SessionProvider>
          <GuestGroceriesProvider>
            {children}
          </GuestGroceriesProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

**Guest Mode Approach (MVP):**
- Guests add groceries to localStorage only
- On login, guests are shown: "Sign in to save your data" (warning message)
- **No auto-migration** — guests must be aware that login doesn't migrate old guest data
- Rationale: Keeps auth simple, avoids merge conflicts, users understand the boundary between guest/authenticated
- Guests can manually re-add items after logging in (acceptable for MVP)

**Checkpoint:** Guest context works, data persists in localStorage.

---

### Step 2.2: Grocery APIs (2-3 hours)

**Create `app/api/groceries/route.ts`:**
```typescript
import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getSession } from 'next-auth/react';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getSession({ req: request });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get('week');
  if (!weekStart) {
    return NextResponse.json({ error: 'week parameter required' }, { status: 400 });
  }

  const groceries = await db.query.userGroceryInventory.findMany({
    where: (table) =>
      eq(table.userId, session.user.id) && eq(table.weekStart, weekStart),
  });

  return NextResponse.json({ groceries });
}

export async function POST(request: NextRequest) {
  const session = await getSession({ req: request });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { foodName, quantityBought, unit, nutrition, dateAdded, weekStart } = body;

  if (!foodName || !quantityBought || !nutrition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const totalCalories = parseFloat(nutrition.calories) * parseFloat(quantityBought);

  const result = await db
    .insert(userGroceryInventory)
    .values({
      userId: session.user.id,
      foodName,
      quantityBought: quantityBought.toString(),
      unit,
      proteinG: nutrition.protein?.toString(),
      carbsG: nutrition.carbs?.toString(),
      fatG: nutrition.fat?.toString(),
      caloriesPerUnit: nutrition.calories?.toString(),
      totalCalories: totalCalories.toString(),
      dateAdded,
      weekStart,
      percentConsumed: '0',
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
```

**Create `app/api/groceries/[id]/route.ts`:**
```typescript
import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { getSession } from 'next-auth/react';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession({ req: request });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { percentConsumed } = body;

  const result = await db
    .update(userGroceryInventory)
    .set({ percentConsumed: percentConsumed?.toString() })
    .where(
      and(
        eq(userGroceryInventory.id, params.id),
        eq(userGroceryInventory.userId, session.user.id)
      )
    )
    .returning();

  if (!result.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession({ req: request });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db
    .delete(userGroceryInventory)
    .where(
      and(
        eq(userGroceryInventory.id, params.id),
        eq(userGroceryInventory.userId, session.user.id)
      )
    );

  return NextResponse.json({ ok: true }, { status: 204 });
}
```

**Checkpoint:** APIs are working. Can create/read/update/delete groceries (test with Postman or curl).

---

### Step 2.3: Grocery Components (1-2 hours)

**Create `components/GroceryForm.tsx`:**
```typescript
'use client';

import { useState } from 'react';

interface GroceryFormProps {
  onSubmit: (grocery: any) => void;
  loading?: boolean;
}

export function GroceryForm({ onSubmit, loading }: GroceryFormProps) {
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('lbs');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      foodName,
      quantityBought: parseFloat(quantity),
      unit,
    });
    setFoodName('');
    setQuantity('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Food name (e.g., Chicken Breast)"
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg"
            step="0.1"
            required
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option>lbs</option>
            <option>oz</option>
            <option>g</option>
            <option>count</option>
            <option>cups</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Adding...' : 'Add Grocery'}
        </button>
      </div>
    </form>
  );
}
```

**Create `components/GroceryInventory.tsx`:**
```typescript
'use client';

interface Grocery {
  id: string;
  foodName: string;
  quantityBought: number;
  unit: string;
  percentConsumed: number;
}

interface GroceryInventoryProps {
  groceries: Grocery[];
  onUpdate: (id: string, percentConsumed: number) => void;
  onDelete: (id: string) => void;
}

export function GroceryInventory({ groceries, onUpdate, onDelete }: GroceryInventoryProps) {
  if (!groceries.length) {
    return <p className="text-gray-500">No groceries added yet.</p>;
  }

  return (
    <div className="space-y-2">
      {groceries.map((grocery) => (
        <div key={grocery.id} className="bg-white p-3 rounded-lg shadow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium">{grocery.foodName}</p>
              <p className="text-sm text-gray-500">
                {grocery.quantityBought} {grocery.unit}
              </p>
            </div>
            <button
              onClick={() => onDelete(grocery.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={grocery.percentConsumed}
              onChange={(e) => onUpdate(grocery.id, parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12 text-right">
              {Math.round(grocery.percentConsumed)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Create `components/WeekNavigator.tsx`:**
```typescript
'use client';

interface WeekNavigatorProps {
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
}

export function WeekNavigator({ weekStart, onWeekChange }: WeekNavigatorProps) {
  function changeWeek(days: number) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + days);
    const newWeek = date.toISOString().split('T')[0];
    onWeekChange(newWeek);
  }

  function formatWeek(week: string): string {
    const date = new Date(week);
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={() => changeWeek(-7)} className="px-3 py-1 border rounded">
        ← Prev
      </button>
      <span className="font-medium">{formatWeek(weekStart)}</span>
      <button onClick={() => changeWeek(7)} className="px-3 py-1 border rounded">
        Next →
      </button>
    </div>
  );
}
```

**Update `app/groceries/page.tsx` to use components:**
```typescript
'use client';

import { GroceryForm } from '@/components/GroceryForm';
import { GroceryInventory } from '@/components/GroceryInventory';
import { WeekNavigator } from '@/components/WeekNavigator';
import { useGuestGroceries } from '@/hooks/useGuestGroceries';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function CameraTab() {
  const { data: session } = useSession();
  const { groceries, addGrocery, updateGrocery, deleteGrocery, weekStart, setWeekStart } =
    useGuestGroceries();
  const [loading, setLoading] = useState(false);

  const currentWeekGroceries = groceries.filter((g) => g.weekStart === weekStart);

  async function handleAddGrocery(grocery: any) {
    if (session?.user) {
      // POST to /api/groceries
      setLoading(true);
      try {
        // API call
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    } else {
      // Guest mode: add to localStorage
      addGrocery({
        ...grocery,
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        dateAdded: new Date().toISOString().split('T')[0],
        weekStart,
        percentConsumed: 0,
      });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📷 Grocery Inventory</h1>
      <WeekNavigator weekStart={weekStart} onWeekChange={setWeekStart} />
      <GroceryForm onSubmit={handleAddGrocery} loading={loading} />
      <GroceryInventory
        groceries={currentWeekGroceries}
        onUpdate={(id, percent) => updateGrocery(id, { percentConsumed: percent })}
        onDelete={deleteGrocery}
      />
    </div>
  );
}
```

**Checkpoint:** Can add, list, update, delete groceries. Week navigation works.

---

## Phase 3: USDA Nutrition Integration

**Timeline:** Flexible (3-4 hours)
**Goal:** Can search USDA, get nutrition data, attach to groceries

### Step 3.1: USDA Search API (1-2 hours)

**Create `app/api/usda/search/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query } = body;

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${process.env.USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('USDA API error');
    }

    const data = await response.json();

    const results = data.foods?.map((food: any) => {
      const nutrients = food.foodNutrients || [];
      const getNutrient = (id: number) => {
        const nutrient = nutrients.find((n: any) => n.nutrientId === id);
        return nutrient?.value || 0;
      };

      return {
        fdcId: food.fdcId,
        name: food.description,
        nutrition: {
          calories: getNutrient(1008), // Energy (kcal)
          protein: getNutrient(1003), // Protein (g)
          carbs: getNutrient(1005), // Carbohydrates (g)
          fat: getNutrient(1004), // Total lipid (fat) (g)
          fiber: getNutrient(1079), // Fiber, total dietary (g)
        },
      };
    }) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('USDA search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
```

**Checkpoint:** Can search USDA foods. Test with curl or Postman.

---

### Step 3.2: USDA Search Component (1-2 hours)

**Create `components/NutritionSearch.tsx`:**
```typescript
'use client';

import { useState } from 'react';

interface NutritionResult {
  fdcId: string;
  name: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface NutritionSearchProps {
  onSelect: (nutrition: NutritionResult['nutrition']) => void;
}

export function NutritionSearch({ onSelect }: NutritionSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NutritionResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/usda/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
    setLoading(false);
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <form onSubmit={handleSearch} className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search (e.g., Chicken Breast)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <button
              key={result.fdcId}
              onClick={() => onSelect(result.nutrition)}
              className="w-full text-left p-2 border rounded hover:bg-gray-50"
            >
              <p className="font-medium text-sm">{result.name}</p>
              <p className="text-xs text-gray-600">
                {Math.round(result.nutrition.calories)} cal | {Math.round(result.nutrition.protein)}g protein
              </p>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <p className="text-sm text-gray-500">No results found.</p>
      )}
    </div>
  );
}
```

**Update `GroceryForm` to include nutrition search:**
```typescript
// Add NutritionSearch to form, populate nutrition on select
```

**Checkpoint:** Can search USDA, select nutrition, attach to groceries.

---

## Phase 4: Claude Vision Receipt Parsing

**Timeline:** Flexible (3-4 hours)
**Goal:** Can upload receipt, parse with Claude Vision, suggest groceries

### Step 4.1: Vision API Route (1-2 hours)

**Create `app/api/vision/parse/route.ts`:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imageBase64 } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: 'Image required' }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are a receipt parser. Extract ALL grocery items from this receipt. For each item, provide:
1. Item name (product description)
2. Quantity (number)
3. Unit (lbs, oz, count, cups, etc.)

Return ONLY valid JSON (no markdown, no code blocks):
{
  "items": [
    { "name": "Chicken Breast", "quantity": 2, "unit": "lbs" },
    { "name": "Brown Rice", "quantity": 5, "unit": "lbs" }
  ]
}

If this is not a grocery receipt, still attempt extraction. If extraction fails, return: { "items": [] }`,
            },
          ],
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Clean the response (remove markdown if present)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const parsed = JSON.parse(jsonText);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Vision parsing error:', error);
    return NextResponse.json({ error: 'Parsing failed', items: [] }, { status: 500 });
  }
}
```

**Checkpoint:** Can send image to Claude Vision, get parsed items.

---

### Step 4.2: Receipt Upload Component (1-2 hours)

**Create `components/ReceiptUploader.tsx`:**
```typescript
'use client';

import { useState, useRef } from 'react';

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
}

interface ReceiptUploaderProps {
  onItemsExtracted: (items: ParsedItem[]) => void;
}

export function ReceiptUploader({ onItemsExtracted }: ReceiptUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string)?.split(',')[1];
      setPreview(event.target?.result as string);

      try {
        const response = await fetch('/api/vision/parse', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64 }),
        });

        const data = await response.json();
        onItemsExtracted(data.items || []);
      } catch (error) {
        console.error('Parse error:', error);
        alert('Failed to parse receipt');
      }

      setLoading(false);
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="font-medium mb-3">📸 Upload Receipt</h3>
      
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full py-8 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 disabled:bg-gray-100"
      >
        {loading ? 'Processing...' : 'Click to upload or take photo'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      {preview && (
        <div className="mt-3">
          <img src={preview} alt="Receipt preview" className="max-w-full h-32 object-cover rounded" />
        </div>
      )}
    </div>
  );
}
```

**Update `app/groceries/page.tsx` to include ReceiptUploader:**
```typescript
// Add ReceiptUploader, on items extracted show form to add with USDA lookup
```

**Checkpoint:** Can upload receipt, see preview, extract items.

---

## Phase 5: Strava Integration

**Timeline:** Flexible (4-5 hours)
**Goal:** OAuth login, fetch activities, display weekly burn

### Step 5.1: Strava OAuth Routes (2-3 hours)

**Create `app/api/strava/authorize/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const state = Math.random().toString(36).substring(7);
  const scope = 'activity:read_all';
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/strava/callback`;

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', process.env.STRAVA_CLIENT_ID!);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl);
}
```

**Create `app/api/strava/callback/route.ts`:**
```typescript
import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getSession } from 'next-auth/react';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getSession({ req: request });
  if (!session?.user) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin`);
  }

  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/groceries/settings?error=no_code`);
  }

  try {
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('No access token');
    }

    // Store token in DB
    await db
      .update(users)
      .set({
        stravaToken: tokenData.access_token,
        stravaUserId: tokenData.athlete.id.toString(),
        stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/groceries/settings?strava_connected=true`);
  } catch (error) {
    console.error('Strava callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/groceries/settings?error=strava_error`);
  }
}
```

**Checkpoint:** OAuth flow works. Token stored in DB.

---

### Step 5.2: Strava Activities Fetch (1-2 hours)

**Create `app/api/strava/activities/route.ts`:**
```typescript
import { db } from '@/lib/db';
import { users } from '@/schema/db';
import { eq } from 'drizzle-orm';
import { getSession } from 'next-auth/react';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getSession({ req: request });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user?.stravaToken) {
    return NextResponse.json({ error: 'Strava not connected' }, { status: 401 });
  }

  try {
    const weekParam = request.nextUrl.searchParams.get('week') || getCurrentWeekStart();
    const weekStart = new Date(weekParam);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const after = Math.floor(weekStart.getTime() / 1000);
    const before = Math.floor(weekEnd.getTime() / 1000);

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30`,
      {
        headers: { Authorization: `Bearer ${user.stravaToken}` },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Strava token expired' }, { status: 401 });
      }
      throw new Error('Strava API error');
    }

    const activities = await response.json();

    const weekTotal = activities.reduce(
      (acc: any, activity: any) => ({
        caloriesBurned: (acc.caloriesBurned || 0) + (activity.calories || 0),
        distance: (acc.distance || 0) + (activity.distance || 0),
        movingTime: (acc.movingTime || 0) + (activity.moving_time || 0),
      }),
      { caloriesBurned: 0, distance: 0, movingTime: 0 }
    );

    return NextResponse.json({
      week: { start: weekParam, end: weekEnd.toISOString().split('T')[0] },
      activities: activities.map((a: any) => ({
        stravaId: a.id,
        date: a.start_date_local?.split('T')[0],
        type: a.type,
        durationMinutes: Math.round(a.moving_time / 60),
        caloriesBurned: a.calories || 0,
      })),
      weekTotal,
    });
  } catch (error) {
    console.error('Strava activities error:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 503 });
  }
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}
```

**Checkpoint:** Can fetch Strava activities for a week.

---

### Step 5.3: Strava UI Component (1-2 hours)

**Create `components/StravaConnect.tsx`:**
```typescript
'use client';

import { useEffect, useState } from 'react';

interface StravaActivity {
  stravaId: number;
  date: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number;
}

interface StravaConnectProps {
  isConnected: boolean;
  onSync?: () => void;
}

export function StravaConnect({ isConnected, onSync }: StravaConnectProps) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [weekTotal, setWeekTotal] = useState({ caloriesBurned: 0, distance: 0 });
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const response = await fetch(`/api/strava/activities?week=${getCurrentWeekStart()}`);
      const data = await response.json();
      setActivities(data.activities);
      setWeekTotal(data.weekTotal);
      onSync?.();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync activities');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isConnected) {
      handleSync();
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="mb-3">Connect your Strava to see your training data.</p>
        <a
          href="/api/strava/authorize"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Connect Strava
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Your Training This Week</h3>
        <button
          onClick={handleSync}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <p className="text-2xl font-bold text-blue-600">
          {Math.round(weekTotal.caloriesBurned)} cal
        </p>
        <p className="text-sm text-gray-600">burned this week</p>
      </div>

      {activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.stravaId} className="bg-gray-50 p-2 rounded text-sm">
              <p className="font-medium">{activity.type} • {activity.durationMinutes} min</p>
              <p className="text-gray-600">{activity.caloriesBurned} cal</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}
```

**Update `app/groceries/settings/page.tsx` to use StravaConnect:**
```typescript
// Add StravaConnect component
```

**Checkpoint:** Can connect Strava, see activities.

---

## Phase 6: Dashboard & Nutrition Summary

**Timeline:** Flexible (4-6 hours)
**Goal:** Show weekly macros, Strava calories, alignment insight

### Step 6.1: Nutrition Summary API (1-2 hours)

**Create `app/api/nutrition/route.ts`:**
```typescript
import { db } from '@/lib/db';
import { userGroceryInventory, users } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { getSession } from 'next-auth/react';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getSession({ req: request });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get('week');
  if (!weekStart) {
    return NextResponse.json({ error: 'week required' }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const groceries = await db.query.userGroceryInventory.findMany({
    where: and(
      eq(userGroceryInventory.userId, session.user.id),
      eq(userGroceryInventory.weekStart, weekStart)
    ),
  });

  // Calculate consumed macros
  const totals = groceries.reduce(
    (acc, g) => {
      const consumed = (parseFloat(g.percentConsumed) / 100) || 0;
      return {
        caloriesBought: acc.caloriesBought + (parseFloat(g.totalCalories) || 0),
        caloriesConsumed: acc.caloriesConsumed + (parseFloat(g.totalCalories) || 0) * consumed,
        proteinBought: acc.proteinBought + (parseFloat(g.proteinG) || 0),
        proteinConsumed: acc.proteinConsumed + (parseFloat(g.proteinG) || 0) * consumed,
        carbsBought: acc.carbsBought + (parseFloat(g.carbsG) || 0),
        carbsConsumed: acc.carbsConsumed + (parseFloat(g.carbsG) || 0) * consumed,
        fatBought: acc.fatBought + (parseFloat(g.fatG) || 0),
        fatConsumed: acc.fatConsumed + (parseFloat(g.fatG) || 0) * consumed,
      };
    },
    {
      caloriesBought: 0,
      caloriesConsumed: 0,
      proteinBought: 0,
      proteinConsumed: 0,
      carbsBought: 0,
      carbsConsumed: 0,
      fatBought: 0,
      fatConsumed: 0,
    }
  );

  return NextResponse.json({
    week: { start: weekStart, end: getWeekEnd(weekStart) },
    totals,
    goals: {
      dailyCalories: parseInt(user?.dailyCalGoal || '2000'),
      dailyProtein: parseFloat(user?.dailyProteinG || '150'),
      dailyCarbs: parseFloat(user?.dailyCarbsG || '200'),
      dailyFat: parseFloat(user?.dailyFatG || '65'),
    },
  });
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 6);
  return date.toISOString().split('T')[0];
}
```

**Checkpoint:** Nutrition summary API returns correct data.

---

### Step 6.2: Dashboard Components (2-4 hours)

**Create `components/NutritionDashboard.tsx`:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { WeekNavigator } from './WeekNavigator';

interface NutritionData {
  totals: {
    caloriesBought: number;
    caloriesConsumed: number;
    proteinConsumed: number;
    carbsConsumed: number;
    fatConsumed: number;
  };
  goals: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
  };
}

interface NutritionDashboardProps {
  weekStart: string;
  onWeekChange: (week: string) => void;
  stravaCaloriesBurned?: number;
}

export function NutritionDashboard({
  weekStart,
  onWeekChange,
  stravaCaloriesBurned = 0,
}: NutritionDashboardProps) {
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNutrition() {
      try {
        const response = await fetch(`/api/nutrition?week=${weekStart}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Fetch error:', error);
      }
      setLoading(false);
    }

    fetchNutrition();
  }, [weekStart]);

  if (loading) return <p>Loading...</p>;
  if (!data) return <p>Failed to load nutrition data</p>;

  const weeklyGoal = data.goals.dailyCalories * 7;
  const calorieDeficit = stravaCaloriesBurned - data.totals.caloriesConsumed;

  return (
    <div>
      <WeekNavigator weekStart={weekStart} onWeekChange={onWeekChange} />

      {/* Strava Calories */}
      <div className="bg-blue-50 p-4 rounded-lg shadow mb-4 border border-blue-200">
        <p className="text-sm text-gray-600">Calories Burned (Strava)</p>
        <p className="text-3xl font-bold text-blue-600">{Math.round(stravaCaloriesBurned)}</p>
        <p className="text-xs text-gray-500 mt-1">±25-50% margin of error</p>
      </div>

      {/* Consumed Macros */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <p className="font-medium mb-3">Macros Consumed This Week</p>

        <MacroBar
          label="Protein"
          value={Math.round(data.totals.proteinConsumed)}
          goal={data.goals.dailyProtein * 7}
          unit="g"
        />
        <MacroBar
          label="Carbs"
          value={Math.round(data.totals.carbsConsumed)}
          goal={data.goals.dailyCarbs * 7}
          unit="g"
        />
        <MacroBar
          label="Fat"
          value={Math.round(data.totals.fatConsumed)}
          goal={data.goals.dailyFat * 7}
          unit="g"
        />
        <MacroBar
          label="Calories"
          value={Math.round(data.totals.caloriesConsumed)}
          goal={weeklyGoal}
          unit="cal"
        />
      </div>

      {/* Alignment */}
      <div className={`p-4 rounded-lg shadow ${calorieDeficit > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <p className="text-sm text-gray-600">Weekly Alignment</p>
        <p className={`text-2xl font-bold ${calorieDeficit > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
          {calorieDeficit > 0 ? '+' : ''}{Math.round(calorieDeficit)} cal
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {calorieDeficit > 0 ? 'Surplus' : 'Deficit'} (you {calorieDeficit > 0 ? 'ate less than' : 'burned more than'} you burned)
        </p>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  goal,
  unit,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
}) {
  const percent = Math.min((value / goal) * 100, 100);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{value}/{Math.round(goal)} {unit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percent >= 100 ? 'bg-green-600' : percent >= 80 ? 'bg-blue-600' : 'bg-yellow-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
```

**Update `app/groceries/dashboard/page.tsx`:**
```typescript
'use client';

import { NutritionDashboard } from '@/components/NutritionDashboard';
import { StravaConnect } from '@/components/StravaConnect';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function DashboardTab() {
  const { data: session } = useSession();
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [stravaCalories, setStravaCalories] = useState(0);

  function handleStravaSync() {
    // Re-fetch Strava data
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Weekly Summary</h1>

      {session?.user && (
        <>
          <StravaConnect isConnected={!!session.user?.stravaToken} onSync={handleStravaSync} />
          <NutritionDashboard
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            stravaCaloriesBurned={stravaCalories}
          />
        </>
      )}
    </div>
  );
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}
```

**Checkpoint:** Dashboard displays all nutrition data, Strava alignment.

---

## Phase 7: Polish & Error Handling

**Timeline:** Flexible (3-4 hours)
**Goal:** Validation, error messages, UX refinement

### Step 7.1: Input Validation

Add validation to all API routes:
- Check required fields
- Validate data types
- Return 400 Bad Request with error messages

### Step 7.2: Error Handling

Add try/catch to all components:
- Show user-friendly error messages
- Toast notifications for success/failure
- Fallback UI when data loads

### Step 7.3: UX Polish

- Add loading states (spinners, skeleton screens)
- Add confirmation dialogs for destructive actions
- Responsive design (test on mobile/tablet)
- Keyboard accessibility

---

## Phase 8: Testing & Deployment

**Timeline:** Flexible (2-3 hours)
**Goal:** Live PWA

### Step 8.1: Manual Testing Checklist

- [ ] Guest mode: add/edit/delete groceries
- [ ] Guest → Login: data migrates
- [ ] Authenticated: all CRUD operations
- [ ] Receipt upload: parses items
- [ ] USDA search: finds foods
- [ ] Strava OAuth: connects and fetches activities
- [ ] Dashboard: shows correct macros and Strava burn
- [ ] Week navigation: switches weeks correctly
- [ ] Error cases: handled gracefully
- [ ] Mobile: responsive and usable
- [ ] PWA: installable on home screen

### Step 8.2: Deploy to Vercel

```bash
git push origin main
# Vercel auto-deploys
# Verify at https://trail-mix.vercel.app
```

### Step 8.3: Use & Gather Feedback

- Use the app for 1-2 weeks
- Track whether it changes your grocery shopping
- Note bugs/friction points
- Plan Phase 2 improvements

---

## File Structure Checklist

```
trail-mix/
✅ app/
  ✅ layout.tsx
  ✅ page.tsx (splash)
  ✅ auth/signin/page.tsx
  ✅ auth/register/page.tsx
  ✅ groceries/layout.tsx
  ✅ groceries/page.tsx (Camera tab)
  ✅ groceries/dashboard/page.tsx (Dashboard tab)
  ✅ groceries/settings/page.tsx (Settings tab)
  ✅ api/
    ✅ auth/[...nextauth]/route.ts
    ✅ auth/signin/route.ts (manual auth handler)
    ✅ auth/register/route.ts
    ✅ groceries/route.ts
    ✅ groceries/[id]/route.ts
    ✅ nutrition/route.ts
    ✅ vision/parse/route.ts
    ✅ strava/authorize/route.ts
    ✅ strava/callback/route.ts
    ✅ strava/activities/route.ts
    ✅ usda/search/route.ts
✅ lib/
  ✅ db.ts
  ✅ auth.ts
  ✅ weekBoundary.ts (if needed)
✅ hooks/
  ✅ useGuestGroceries.ts
✅ components/
  ✅ TabNavigation.tsx
  ✅ ReceiptUploader.tsx
  ✅ GroceryForm.tsx
  ✅ GroceryInventory.tsx
  ✅ NutritionSearch.tsx
  ✅ NutritionDashboard.tsx
  ✅ StravaConnect.tsx
  ✅ WeekNavigator.tsx
✅ schema/
  ✅ db.ts
✅ .env.local (NOT in git)
```

---

## Key Implementation Rules

1. **Commit after each phase** — Don't wait until the end
2. **Test as you go** — Use real data from day 1
3. **Guest mode first** — Get it working locally before auth
4. **APIs before UI** — Build backend endpoints, test with Postman, then wire UI
5. **Error handling everywhere** — Every API call can fail
6. **Keep it simple** — No complex patterns, just working code

---

## Success Metrics

After Phase 8, you should have:
- ✅ PWA deployed to Vercel
- ✅ Can log in (or use as guest)
- ✅ Can upload receipts, parse with Claude Vision
- ✅ Can search USDA, attach nutrition
- ✅ Can connect Strava, see weekly burn
- ✅ Can see weekly macro summary + Strava comparison
- ✅ Can change macro goals in settings
- ✅ All data persists (guest → login migration works)
- ✅ Responsive design (works on phone)
- ✅ Error handling (graceful failures)

If you have all of these by day 10, you've shipped an MVP.

---

## Post-Launch Phase 2 Ideas

Once MVP is live and you've used it for 2 weeks:
- Macro trends (weekly/monthly charts)
- Manual food logging (without receipt)
- Barcode scanning
- Better USDA search UX (show top 5 with details)
- Lifting macro tracking (separate from running)
- Export data (CSV)
- Dark mode

But first: **Ship the MVP.**

---

**Ready to start implementing?**