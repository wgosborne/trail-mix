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
}

export function StravaConnect({ isConnected, onSync }: StravaConnectProps) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [weekTotal, setWeekTotal] = useState({ caloriesBurned: 0, distance: 0 });
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const response = await fetch(`/api/strava/activities?week=${getCurrentWeekStart()}`);
      const data = await response.json();
      setActivities(data.activities);
      setWeekTotal(data.weekTotal);
      onSync?.();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync activities');
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
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="mb-3">Connect your Strava to see your training data.</p>
        <a
          href="/api/strava/authorize"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Connect Strava
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Your Training This Week</h3>
        <button
          onClick={handleSync}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <p className="text-2xl font-bold text-blue-600">
          {Math.round(weekTotal.caloriesBurned)} cal
        </p>
        <p className="text-sm text-gray-600">burned this week</p>
      </div>

      {activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.stravaId} className="bg-gray-50 p-2 rounded text-sm">
              <p className="font-medium">{activity.type} • {activity.durationMinutes} min</p>
              <p className="text-gray-600">{activity.caloriesBurned} cal</p>
            </div>
          ))}
        </div>
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
