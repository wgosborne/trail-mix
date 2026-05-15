require('dotenv').config({ path: '.env.local' });

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, userGroceryInventory } = require('./schema/db');
const { eq, and } = require('drizzle-orm');

async function resetCalories() {
  try {
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client);

    // Get current week start
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysFromMonday);
    const weekStart = monday.toISOString().split('T')[0];
    
    console.log('Current week starts:', weekStart);

    // Find user by email
    const userResult = await db.select().from(users).where(eq(users.email, 'wgosborne@outlook.com'));
    
    if (userResult.length === 0) {
      console.log('User not found');
      process.exit(1);
    }

    const user = userResult[0];
    console.log('User found:', user.id);

    // Get groceries for this week
    const groceries = await db.select().from(userGroceryInventory).where(
      and(
        eq(userGroceryInventory.userId, user.id),
        eq(userGroceryInventory.weekStart, weekStart)
      )
    );

    console.log(`Found ${groceries.length} groceries for this week`);
    
    if (groceries.length === 0) {
      console.log('No groceries to reset');
      await client.end();
      process.exit(0);
    }

    // Reset percentConsumed to 0
    await db
      .update(userGroceryInventory)
      .set({ percentConsumed: '0' })
      .where(
        and(
          eq(userGroceryInventory.userId, user.id),
          eq(userGroceryInventory.weekStart, weekStart)
        )
      );

    console.log('✅ Reset complete!');
    console.log('All ' + groceries.length + ' groceries for this week now have 0% consumed');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetCalories();
