'use client';

import { useEffect, useState } from 'react';

interface StravaActivity {
  stravaId: number;
  date: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number;
}

interface StravaConnectProps {
  isConnected: boolean;
  onSync?: () => void;
  onDisconnect?: () => void;
}

export function StravaConnect({ isConnected, onSync, onDisconnect }: StravaConnectProps) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [weekTotal, setWeekTotal] = useState({ caloriesBurned: 0, distance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/strava/activities?week=${getCurrentWeekStart()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities);
      setWeekTotal(data.weekTotal);
      onSync?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync activities';
      console.error('Sync error:', err);
      setError(errorMsg);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isConnected) {
      handleSync();
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div style={{
        backgroundColor: '#E3F2FD',
        border: '1px solid #90CAF9',
        borderRadius: '6px',
        padding: '16px'
      }}>
        <p style={{ fontSize: '14px', color: '#1976D2', marginBottom: '12px' }}>
          Connect your Strava to see your training data and compare with nutrition.
        </p>
        <a
          href="/api/strava/authorize"
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            backgroundColor: '#1976D2',
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
            padding: '6px 12px',
            fontSize: '13px',
            backgroundColor: loading ? '#CCCCCC' : '#1976D2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 500
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
        backgroundColor: '#F5F5F5',
        padding: '16px',
        borderRadius: '6px',
        marginBottom: '12px'
      }}>
        <p style={{ fontSize: '28px', fontWeight: 700, color: '#FF6B35', margin: '0 0 4px 0' }}>
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
                  backgroundColor: '#FAFAFA',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  borderLeft: '3px solid #FF6B35'
                }}
              >
                <p style={{ fontWeight: 600, color: '#2C2C2A', margin: '0 0 4px 0' }}>
                  {activity.type} • {activity.durationMinutes} min
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
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split('T')[0];
}
