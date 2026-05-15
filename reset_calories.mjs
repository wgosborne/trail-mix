import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function resetCalories() {
  try {
    // Get current week start
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysFromMonday);
    const weekStart = monday.toISOString().split('T')[0];
    
    console.log('Current week starts:', weekStart);

    // Find user by email
    const users = await sql`SELECT id FROM public.users WHERE email = ${'wgosborne@outlook.com'}`;
    
    if (users.length === 0) {
      console.log('User not found');
      process.exit(1);
    }

    const userId = users[0].id;
    console.log('User found:', userId);

    // Get count of groceries for this week
    const groceries = await sql`
      SELECT id, food_name FROM public.user_grocery_inventory 
      WHERE user_id = ${userId} AND week_start = ${weekStart}
    `;

    console.log(`Found ${groceries.length} groceries for this week`);
    
    if (groceries.length === 0) {
      console.log('No groceries to reset');
      await sql.end();
      process.exit(0);
    }

    // Reset percentConsumed to 0
    const result = await sql`
      UPDATE public.user_grocery_inventory
      SET percent_consumed = '0'
      WHERE user_id = ${userId} AND week_start = ${weekStart}
      RETURNING id, food_name
    `;

    console.log('✅ Reset complete!');
    console.log(`Reset ${result.length} items for this week`);
    result.forEach(item => {
      console.log(`  - ${item.food_name}`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetCalories();
