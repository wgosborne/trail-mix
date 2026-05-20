import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { groceryUpdateSchema, formatValidationError } from '@/lib/validation';
import { upsertLookup } from '@/lib/grocery-lookup';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const id = (await params).id;
    const body = await req.json();

    // Validate with Zod
    const validationResult = groceryUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult.error);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { percentConsumed, quantityBought, foodName, totalCalories, proteinG, carbsG, fatG, fiberG, weekStart: updateWeekStart } = validationResult.data;

    // Get the grocery before updating to access foodName, unit, and current state
    const groceryBefore = await db
      .select()
      .from(userGroceryInventory)
      .where(and(eq(userGroceryInventory.id, id as any), eq(userGroceryInventory.userId, userId as any)))
      .limit(1);

    if (groceryBefore.length === 0) {
      return NextResponse.json({ error: 'Grocery not found' }, { status: 404 });
    }

    const groceryItem = groceryBefore[0];

    // Build update object
    const updates: any = {};
    if (percentConsumed !== undefined) {
      updates.percentConsumed = percentConsumed.toString();

      // Track consumption by week - sync consumedByWeek with the new percentConsumed value
      const trackingWeek = updateWeekStart || groceryItem.weekStart;
      const consumedByWeek = (groceryItem.consumedByWeek as any) || {};
      consumedByWeek[trackingWeek] = percentConsumed;
      updates.consumedByWeek = consumedByWeek;
    }

    if (quantityBought !== undefined) updates.quantityBought = quantityBought.toString();
    if (foodName !== undefined) updates.foodName = foodName.trim();
    if (totalCalories !== undefined) updates.totalCalories = totalCalories ? totalCalories.toString() : null;
    if (proteinG !== undefined) updates.proteinG = proteinG ? proteinG.toString() : null;
    if (carbsG !== undefined) updates.carbsG = carbsG ? carbsG.toString() : null;
    if (fatG !== undefined) updates.fatG = fatG ? fatG.toString() : null;
    if (fiberG !== undefined) updates.fiberG = fiberG ? fiberG.toString() : null;
    if (updateWeekStart !== undefined) updates.weekStart = updateWeekStart;

    // Update grocery (verify user owns it)
    const result = await db
      .update(userGroceryInventory)
      .set(updates)
      .where(and(eq(userGroceryInventory.id, id as any), eq(userGroceryInventory.userId, userId as any)))
      .returning();

    // If nutrition was updated, sync to lookup table with 'user' source
    if (result.length > 0 && (totalCalories !== undefined || proteinG !== undefined || carbsG !== undefined || fatG !== undefined || fiberG !== undefined)) {
      const grocery = result[0];
      await upsertLookup(
        grocery.foodName,
        grocery.unit,
        {
          calories: grocery.totalCalories ? Number(grocery.totalCalories) : null,
          proteinG: grocery.proteinG ? Number(grocery.proteinG) : null,
          carbsG: grocery.carbsG ? Number(grocery.carbsG) : null,
          fatG: grocery.fatG ? Number(grocery.fatG) : null,
          fiberG: grocery.fiberG ? Number(grocery.fiberG) : null,
        },
        'user'
      );
    }

    if (result.length === 0) {
      return NextResponse.json({ error: 'Grocery not found' }, { status: 404 });
    }

    const grocery = result[0];
    return NextResponse.json({
      id: grocery.id,
      foodName: grocery.foodName,
      quantityBought: Number(grocery.quantityBought),
      unit: grocery.unit,
      percentConsumed: Number(grocery.percentConsumed),
      totalCalories: grocery.totalCalories ? Number(grocery.totalCalories) : null,
      proteinG: grocery.proteinG ? Number(grocery.proteinG) : null,
      carbsG: grocery.carbsG ? Number(grocery.carbsG) : null,
      fatG: grocery.fatG ? Number(grocery.fatG) : null,
      fiberG: grocery.fiberG ? Number(grocery.fiberG) : null,
      dateAdded: grocery.dateAdded,
      weekStart: grocery.weekStart,
      consumedByWeek: grocery.consumedByWeek,
    });
  } catch (error) {
    console.error('Error updating grocery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const id = (await params).id;

    // Delete grocery (verify user owns it)
    await db
      .delete(userGroceryInventory)
      .where(and(eq(userGroceryInventory.id, id as any), eq(userGroceryInventory.userId, userId as any)));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete grocery:', error);
    return NextResponse.json({ error: 'Failed to delete grocery' }, { status: 500 });
  }
}
