import { createClient } from 'redis';
import 'dotenv/config';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

async function clearCaches() {
  try {
    // Clear caches for this week, last 4 weeks, and next week
    const now = new Date();
    const weeks = [];
    
    // Get 5 weeks of caches to clear
    for (let i = -2; i <= 2; i++) {
      const d = new Date(now);
      const dayOfWeek = d.getUTCDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      d.setUTCDate(d.getUTCDate() - daysFromMonday + (i * 7));
      weeks.push(d.toISOString().split('T')[0]);
    }
    
    console.log('Clearing caches for weeks:', weeks);
    
    // Delete from localStorage would be client-side, but we can inform
    console.log('✅ Caches to clear (client-side):');
    weeks.forEach(week => {
      console.log(`  - nutrition_${week}`);
      console.log(`  - groceries_${week}`);
    });
    
    console.log('\nNote: These are client-side caches. They will be cleared when you refresh the app.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearCaches();
