import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { groceryUpdateSchema, formatValidationError } from '@/lib/validation';

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

    const { percentConsumed, foodName } = validationResult.data;

    // Build update object
    const updates: any = {};
    if (percentConsumed !== undefined) updates.percentConsumed = percentConsumed.toString();
    if (foodName !== undefined) updates.foodName = foodName.trim();

    // Update grocery (verify user owns it)
    const result = await db
      .update(userGroceryInventory)
      .set(updates)
      .where(and(eq(userGroceryInventory.id, id as any), eq(userGroceryInventory.userId, userId as any)))
      .returning();

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
