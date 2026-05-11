import { NextRequest, NextResponse } from 'next/server';
import { findInLookup } from '@/lib/grocery-lookup';

/**
 * GET /api/grocery-lookup?name=X&unit=Y
 * Returns cached nutrition data for a given food name and unit, or 404 if not found.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const name = searchParams.get('name');
    const unit = searchParams.get('unit');

    if (!name || !unit) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Both name and unit query parameters are required' },
        { status: 400 }
      );
    }

    const row = await findInLookup(name, unit);

    if (!row) {
      return NextResponse.json(
        { error: 'not_found', message: 'No cached nutrition data found for this item' },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('[GROCERY-LOOKUP] Error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to query grocery lookup' },
      { status: 500 }
    );
  }
}
