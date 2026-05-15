'use client';

import { useEffect, useState } from 'react';
import { getCached, setCached } from '@/lib/cache';

interface StravaActivity {
  stravaId: number;
  date: string;
  type: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
}

interface StravaConnectProps {
  isConnected: boolean;
  onSync?: (caloriesBurned: number) => void;
  onCaloriesUpdate?: (caloriesBurned: number) => void;
  onDisconnect?: () => void;
  weekStart?: string;
}

export function StravaConnect({ isConnected, onSync, onCaloriesUpdate, onDisconnect, weekStart }: StravaConnectProps) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [weekTotal, setWeekTotal] = useState({ caloriesBurned: 0, distance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    const week = weekStart || getCurrentWeekStart();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/strava/activities?week=${week}&sync=true`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities);
      setWeekTotal(data.weekTotal);
      setCached(`strava_${week}`, { activities: data.activities, weekTotal: data.weekTotal });

      onCaloriesUpdate?.(data.weekTotal.caloriesBurned);
      onSync?.(data.weekTotal.caloriesBurned);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync activities';
      console.error('Sync error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isConnected) {
      // Load from cache on mount, but don't fetch from Strava
      const week = weekStart || getCurrentWeekStart();
      const cached = getCached<{ activities: StravaActivity[]; weekTotal: any }>(`strava_${week}`);
      if (cached) {
        setActivities(cached.activities);
        setWeekTotal(cached.weekTotal);
      }
      setLoading(false);
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div style={{
        backgroundColor: '#F0EFE8',
        border: '1px solid #D4C5E2',
        borderRadius: '6px',
        padding: '16px'
      }}>
        <p style={{ fontSize: '14px', color: '#8B7FB8', marginBottom: '12px' }}>
          Connect your Strava to see your training data and compare with nutrition.
        </p>
        <a
          href="/api/strava/authorize"
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            backgroundColor: '#8B7FB8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none'
          }}
        >
          Connect Strava
        </a>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2C2C2A', margin: 0 }}>
          Your Training This Week
        </h3>
        <button
          onClick={handleSync}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            backgroundColor: loading ? '#CCCCCC' : '#8B7FB8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loading ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FFEBEE',
          border: '1px solid #EF9A9A',
          color: '#C62828',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      <div style={{
        backgroundColor: '#F8F5FF',
        padding: '16px',
        borderRadius: '6px',
        marginBottom: '12px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)'
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-6px)';
        el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.15), 0 20px 44px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)';
      }}
      >
        <p style={{ fontSize: '28px', fontWeight: 700, color: '#8B7FB8', margin: '0 0 4px 0' }}>
          {Math.round(weekTotal.caloriesBurned)} cal
        </p>
        <p style={{ fontSize: '13px', color: '#999999', margin: 0 }}>burned this week</p>
      </div>

      {activities.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#2C2C2A', marginBottom: '8px' }}>
            Activities
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activities.map((activity) => (
              <div
                key={activity.stravaId}
                style={{
                  backgroundColor: '#F8F5FF',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  borderLeft: '3px solid #8B7FB8'
                }}
              >
                <p style={{ fontWeight: 600, color: '#2C2C2A', margin: '0 0 4px 0' }}>
                  {activity.name} • {activity.durationMinutes} min
                </p>
                <p style={{ color: '#999999', margin: 0 }}>
                  {activity.caloriesBurned} cal • {activity.date}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 && !loading && !error && (
        <p style={{ fontSize: '13px', color: '#999999', textAlign: 'center', marginTop: '12px' }}>
          No activities this week
        </p>
      )}
    </div>
  );
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}
