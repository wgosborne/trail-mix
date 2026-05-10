'use client';

interface WeekNavigatorProps {
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
}

export function WeekNavigator({ weekStart, onWeekChange }: WeekNavigatorProps) {
  function changeWeek(days: number) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + days);
    const newWeek = date.toISOString().split('T')[0];
    onWeekChange(newWeek);
  }

  function formatWeek(week: string): string {
    const date = new Date(week);
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={() => changeWeek(-7)} className="px-3 py-1 border rounded">
        ← Prev
      </button>
      <span className="font-medium">{formatWeek(weekStart)}</span>
      <button onClick={() => changeWeek(7)} className="px-3 py-1 border rounded">
        Next →
      </button>
    </div>
  );
}
