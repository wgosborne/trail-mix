import { db } from '@/lib/db';
import { userGroceryInventory } from '@/schema/db';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { percentConsumed } = body;

  const result = await db
    .update(userGroceryInventory)
    .set({ percentConsumed: percentConsumed?.toString() })
    .where(
      and(
        eq(userGroceryInventory.id, id),
        eq(userGroceryInventory.userId, session.user.id as string)
      )
    )
    .returning();

  if (!result.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db
    .delete(userGroceryInventory)
    .where(
      and(
        eq(userGroceryInventory.id, id),
        eq(userGroceryInventory.userId, session.user.id as string)
      )
    );

  return NextResponse.json({ ok: true }, { status: 204 });
}
