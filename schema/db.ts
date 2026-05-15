import { pgTable, uuid, varchar, text, timestamp, decimal, date, index, boolean, integer, uniqueIndex, json } from 'drizzle-orm/pg-core';
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
    consumedByWeek: json('consumed_by_week').$type<Record<string, number>>().default({}),
    caloriesPerUnit: decimal('calories_per_unit', { precision: 8, scale: 2 }),
    totalCalories: decimal('total_calories', { precision: 8, scale: 2 }),
    proteinG: decimal('protein_g', { precision: 7, scale: 2 }),
    carbsG: decimal('carbs_g', { precision: 7, scale: 2 }),
    fatG: decimal('fat_g', { precision: 7, scale: 2 }),
    fiberG: decimal('fiber_g', { precision: 7, scale: 2 }),
    dateAdded: date('date_added').notNull(),
    weekStart: date('week_start').notNull(),
    isTemporary: boolean('is_temporary').default(false),
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

export const userMeals = pgTable(
  'user_meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    mealName: varchar('meal_name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => ({
    userIdx: index('idx_meals_user').on(table.userId),
  })
);

export const mealIngredients = pgTable(
  'meal_ingredients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mealId: uuid('meal_id').notNull().references(() => userMeals.id, { onDelete: 'cascade' }),
    groceryId: uuid('grocery_id').notNull().references(() => userGroceryInventory.id, { onDelete: 'cascade' }),
    quantityUsed: decimal('quantity_used', { precision: 8, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => ({
    mealIdx: index('idx_meal_ingredients_meal').on(table.mealId),
    groceryIdx: index('idx_meal_ingredients_grocery').on(table.groceryId),
  })
);

export const stravaActivitiesCache = pgTable(
  'strava_activities_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    weekStart: date('week_start').notNull(),
    activities: json('activities').$type<any[]>().notNull(),
    weekTotal: json('week_total').$type<any>().notNull(),
    cachedAt: timestamp('cached_at').defaultNow(),
  },
  table => ({
    userWeekIdx: uniqueIndex('idx_strava_cache_user_week').on(table.userId, table.weekStart),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  groceries: many(userGroceryInventory),
  sessions: many(sessions),
  meals: many(userMeals),
  stravaCache: many(stravaActivitiesCache),
}));

export const groceryRelations = relations(userGroceryInventory, ({ one, many }) => ({
  user: one(users, { fields: [userGroceryInventory.userId], references: [users.id] }),
  mealIngredients: many(mealIngredients),
}));

export const mealRelations = relations(userMeals, ({ one, many }) => ({
  user: one(users, { fields: [userMeals.userId], references: [users.id] }),
  ingredients: many(mealIngredients),
}));

export const mealIngredientsRelations = relations(mealIngredients, ({ one }) => ({
  meal: one(userMeals, { fields: [mealIngredients.mealId], references: [userMeals.id] }),
  grocery: one(userGroceryInventory, { fields: [mealIngredients.groceryId], references: [userGroceryInventory.id] }),
}));
