import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MealBuilder } from '@/components/MealBuilder';

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}

export const metadata = {
  title: 'Build a Meal | TrailMix',
};

export default async function MealBuilderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const weekStart = getWeekStart();

  return <MealBuilder weekStart={weekStart} />;
}
