import { db } from '@/lib/db';
import { groceryLookup } from '@/schema/db';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Normalize a food name for consistent lookup: lowercase, trim, collapse whitespace.
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Find an existing lookup entry by normalized name and unit.
 * Returns the first matching row or null if not found.
 */
export async function findInLookup(name: string, unit: string) {
  const rows = await db
    .select()
    .from(groceryLookup)
    .where(
      and(
        eq(groceryLookup.normalizedName, normalizeName(name)),
        eq(groceryLookup.unit, unit)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Insert or update a grocery lookup entry.
 * If a row with the same (normalizedName, unit) already exists:
 *  - Preserves 'user' source over 'claude'
 *  - Increments timesUsed
 *  - Updates nutrition values and updatedAt
 */
export async function upsertLookup(
  name: string,
  unit: string,
  nutrition: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  },
  source: 'claude' | 'user'
) {
  const normalizedName = normalizeName(name);

  console.log('[UPSERT-LOOKUP] Inserting/updating:', { name, normalizedName, unit, source, nutrition });

  try {
    const insertValues = {
      normalizedName: normalizedName as string,
      unit: unit as string,
      calories: nutrition.calories as any,
      proteinG: nutrition.proteinG as any,
      carbsG: nutrition.carbsG as any,
      fatG: nutrition.fatG as any,
      fiberG: nutrition.fiberG as any,
      source: source as 'claude' | 'user',
      timesUsed: 1 as number,
    };

    await db
      .insert(groceryLookup)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [groceryLookup.normalizedName, groceryLookup.unit],
        set: {
          calories: nutrition.calories as any,
          proteinG: nutrition.proteinG as any,
          carbsG: nutrition.carbsG as any,
          fatG: nutrition.fatG as any,
          fiberG: nutrition.fiberG as any,
          source: sql`CASE WHEN ${groceryLookup.source} = 'user' THEN 'user' ELSE ${source} END`,
          timesUsed: sql`${groceryLookup.timesUsed} + 1`,
          updatedAt: new Date(),
        },
      });
    console.log('[UPSERT-LOOKUP] Successfully upserted');
  } catch (error) {
    console.error('[UPSERT-LOOKUP] Error:', error);
    throw error;
  }
}
