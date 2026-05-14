import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyMigrations } from '@/lib/verify-migrations';

export async function GET() {
  try {
    // Test database connection
    await db.query.users.findFirst();

    // Verify migrations
    const migrationsOk = await verifyMigrations();

    return NextResponse.json(
      {
        status: migrationsOk ? 'healthy' : 'migration_error',
        migrations: migrationsOk ? 'verified' : 'failed',
      },
      { status: migrationsOk ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'unhealthy', error: String(error) }, { status: 503 });
  }
}
