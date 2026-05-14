'use client';

import { useState, useEffect } from 'react';

interface WeekNavigatorProps {
  onWeekChange: (weekStart: string) => void;
}

// Helper function to calculate week start from a date
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}

// Helper function to get the Monday and Sunday dates for display
function getWeekDates(weekStart: string): { monday: Date; sunday: Date } {
  const monday = new Date(weekStart);
  const sunday = new Date(weekStart);
  sunday.setDate(sunday.getDate() + 6);
  return { monday, sunday };
}

// Format date for display (e.g., "May 5")
function formatDate(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

export function WeekNavigator({ onWeekChange }: WeekNavigatorProps) {
  const [weekStart, setWeekStart] = useState<string>(getWeekStart());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [weekStart]);

  const { monday, sunday } = getWeekDates(weekStart);
  const currentWeekStart = getWeekStart();
  const isCurrentWeek = weekStart === currentWeekStart;

  // Calculate if next week button should be disabled
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekStartStr = nextWeekStart.toISOString().split('T')[0];
  const isNextWeekInFuture = nextWeekStartStr > currentWeekStart;

  const handlePrevWeek = () => {
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];
    setIsLoading(true);
    setWeekStart(prevWeekStartStr);
    onWeekChange(prevWeekStartStr);
  };

  const handleNextWeek = () => {
    if (!isNextWeekInFuture) {
      const nextWeekStart = new Date(weekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekStartStr = nextWeekStart.toISOString().split('T')[0];
      setIsLoading(true);
      setWeekStart(nextWeekStartStr);
      onWeekChange(nextWeekStartStr);
    }
  };

  const handleCurrentWeek = () => {
    setIsLoading(true);
    setWeekStart(currentWeekStart);
    onWeekChange(currentWeekStart);
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E8E4DC',
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <button
          onClick={handlePrevWeek}
          disabled={isLoading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#F0EFE8',
            border: '1px solid #E8E4DC',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            fontSize: '18px',
            color: '#8B7FB8'
          }}
          aria-label="Previous week"
        >
          ←
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
            {isCurrentWeek ? 'This Week' : 'Week Of'}
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px' }}>
            {formatDate(monday)} – {formatDate(sunday)}
          </p>
          {!isCurrentWeek && (
            <button
              onClick={handleCurrentWeek}
              disabled={isLoading}
              style={{
                fontSize: '11px',
                backgroundColor: '#8B7FB8',
                color: '#FFFFFF',
                border: '1px solid #8B7FB8',
                borderRadius: '6px',
                padding: '6px 10px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              Jump to Today
            </button>
          )}
        </div>

        <button
          onClick={handleNextWeek}
          disabled={isLoading || isNextWeekInFuture}
          style={{
            padding: '8px 12px',
            backgroundColor: '#F0EFE8',
            border: '1px solid #E8E4DC',
            borderRadius: '6px',
            cursor: isLoading || isNextWeekInFuture ? 'not-allowed' : 'pointer',
            opacity: isLoading || isNextWeekInFuture ? 0.5 : 1,
            fontSize: '18px',
            color: '#8B7FB8'
          }}
          aria-label="Next week"
        >
          →
        </button>
      </div>
    </div>
  );
}
