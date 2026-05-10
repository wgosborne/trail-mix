import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { groceryUpdateSchema, formatValidationError } from '@/lib/validation';

// PUT /api/groceries/[id] - Update existing grocery
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Validate with Zod
    const validationResult = groceryUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult.error);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Build updates object
    const updates: any = {};
    if (updateData.percentConsumed !== undefined) {
      updates.percentConsumed = updateData.percentConsumed;
    }
    if (updateData.foodName !== undefined) {
      updates.foodName = updateData.foodName;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const result = await db
      .update(userGroceryInventory)
      .set(updates)
      .where(and(eq(userGroceryInventory.id, id), eq(userGroceryInventory.userId, userId)))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: 'Grocery not found or unauthorized' }, { status: 404 });
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
    });
  } catch (error) {
    console.error('Error updating grocery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groceries/[id] - Delete grocery
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const result = await db
      .delete(userGroceryInventory)
      .where(and(eq(userGroceryInventory.id, id), eq(userGroceryInventory.userId, userId)))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: 'Grocery not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting grocery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
