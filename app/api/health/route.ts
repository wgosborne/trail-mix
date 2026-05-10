import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test database connection
    await db.query.users.findFirst();
    return NextResponse.json({ status: 'healthy' }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  }
}
