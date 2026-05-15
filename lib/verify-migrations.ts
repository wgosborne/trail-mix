import { db } from './db';

export async function verifyMigrations() {
  try {
    // Check if is_temporary column exists
    const result = await db.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_grocery_inventory'
      AND column_name = 'is_temporary'
    `);

    if ((result as any[]).length === 0) {
      console.error(
        '❌ MIGRATION ERROR: is_temporary column missing from user_grocery_inventory table\n' +
        'Run this SQL in your Neon database:\n' +
        'ALTER TABLE "user_grocery_inventory" ADD COLUMN "is_temporary" boolean DEFAULT false;'
      );
      return false;
    }

    console.log('✅ All migrations verified successfully');
    return true;
  } catch (error) {
    console.error('Migration verification failed:', error);
    return false;
  }
}
