import { pgTable, uuid, varchar, text, timestamp, decimal, date, index, boolean, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  stravaToken: text('strava_token'),
  stravaUserId: varchar('strava_user_id', { length: 255 }),
  stravaRefreshToken: text('strava_refresh_token'),
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

export const groceryLookup = pgTable(
  'grocery_lookup',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    normalizedName: varchar('normalized_name', { length: 255 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    calories: decimal('calories', { precision: 8, scale: 2 }),
    proteinG: decimal('protein_g', { precision: 7, scale: 2 }),
    carbsG: decimal('carbs_g', { precision: 7, scale: 2 }),
    fatG: decimal('fat_g', { precision: 7, scale: 2 }),
    fiberG: decimal('fiber_g', { precision: 7, scale: 2 }),
    source: varchar('source', { length: 50 }).notNull().default('claude'),
    timesUsed: integer('times_used').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    nameUnitIdx: uniqueIndex('idx_grocery_lookup_name_unit').on(table.normalizedName, table.unit),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  groceries: many(userGroceryInventory),
  sessions: many(sessions),
}));

export const groceryRelations = relations(userGroceryInventory, ({ one }) => ({
  user: one(users, { fields: [userGroceryInventory.userId], references: [users.id] }),
}));
