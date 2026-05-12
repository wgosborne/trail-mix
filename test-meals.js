const { db } = require('./lib/db.ts');
const { users, userGroceryInventory, userMeals, mealIngredients } = require('./schema/db.ts');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcrypt');

async function testMeals() {
  try {
    console.log('Testing meal API endpoints...');
    
    // Create or get test user
    let user = await db.query.users.findFirst({
      where: eq(users.email, 'meals-test@test.com'),
    });
    
    if (!user) {
      console.log('Creating test user...');
      const passwordHash = await bcrypt.hash('test123', 10);
      const created = await db
        .insert(users)
        .values({
          email: 'meals-test@test.com',
          passwordHash,
          name: 'Meals Tester',
        })
        .returning();
      user = created[0];
    }
    
    console.log('Test user ID:', user.id);
    console.log('Test user email:', user.email);
    
    // Create test groceries
    console.log('\nCreating test groceries...');
    const groceries = await db
      .insert(userGroceryInventory)
      .values([
        {
          userId: user.id,
          foodName: 'Chicken Breast',
          quantityBought: '2',
          unit: 'lbs',
          totalCalories: '660',
          proteinG: '140',
          carbsG: '0',
          fatG: '14',
          percentConsumed: '0',
          dateAdded: new Date().toISOString().split('T')[0],
          weekStart: getWeekStart(new Date()),
        },
        {
          userId: user.id,
          foodName: 'Brown Rice',
          quantityBought: '5',
          unit: 'cups',
          totalCalories: '1150',
          proteinG: '25',
          carbsG: '240',
          fatG: '10',
          percentConsumed: '0',
          dateAdded: new Date().toISOString().split('T')[0],
          weekStart: getWeekStart(new Date()),
        },
        {
          userId: user.id,
          foodName: 'Broccoli',
          quantityBought: '3',
          unit: 'lbs',
          totalCalories: '300',
          proteinG: '30',
          carbsG: '60',
          fatG: '3',
          percentConsumed: '0',
          dateAdded: new Date().toISOString().split('T')[0],
          weekStart: getWeekStart(new Date()),
        },
      ])
      .returning();
    
    console.log('Created groceries:', groceries.map(g => ({ id: g.id, foodName: g.foodName })));
    
    // Create a test meal
    console.log('\nCreating test meal...');
    const meal = await db
      .insert(userMeals)
      .values({
        userId: user.id,
        mealName: 'Chicken & Rice Bowl',
        description: 'Grilled chicken with brown rice and broccoli',
      })
      .returning();
    
    console.log('Created meal:', { id: meal[0].id, mealName: meal[0].mealName });
    
    // Create meal ingredients
    console.log('\nCreating meal ingredients...');
    const ingredients = await db
      .insert(mealIngredients)
      .values([
        {
          mealId: meal[0].id,
          groceryId: groceries[0].id,
          quantityUsed: '0.5',
        },
        {
          mealId: meal[0].id,
          groceryId: groceries[1].id,
          quantityUsed: '1',
        },
        {
          mealId: meal[0].id,
          groceryId: groceries[2].id,
          quantityUsed: '0.5',
        },
      ])
      .returning();
    
    console.log('Created ingredients:', ingredients.map(i => ({ groceryId: i.groceryId, quantityUsed: i.quantityUsed })));
    
    console.log('\n✓ Test data created successfully!');
    console.log('\nTest credentials:');
    console.log('Email: meals-test@test.com');
    console.log('Password: test123');
    console.log('\nCURL test example:');
    console.log('1. Sign in at http://localhost:3001/auth/signin');
    console.log('2. Visit http://localhost:3001/api/meals (should see the created meal)');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}

testMeals();
