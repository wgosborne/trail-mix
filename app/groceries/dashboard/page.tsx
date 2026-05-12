'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { NutritionDashboardPro } from '@/components/NutritionDashboardPro';
import { getCached, setCached } from '@/lib/cache';

export default function DashboardTab() {
  const { data: session } = useSession();
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());

  // Initialize Strava connection state from cache
  const cachedStatus = getCached<{ isConnected: boolean }>('strava_status');
  const [isStravaConnected, setIsStravaConnected] = useState(cachedStatus?.isConnected ?? false);

  // Read Strava burned calories from cache (populated when user visits Settings)
  const stravaCache = getCached<{ weekTotal: { caloriesBurned: number } }>(`strava_${weekStart}`);
  const [stravaCaloriesBurned, setStravaCaloriesBurned] = useState(stravaCache?.weekTotal?.caloriesBurned ?? 0);

  async function handleStravaSync() {
    try {
      const response = await fetch(`/api/strava/activities?week=${weekStart}`);
      if (response.ok) {
        const data = await response.json();
        setStravaCaloriesBurned(data.weekTotal.caloriesBurned);
        setCached(`strava_${weekStart}`, { weekTotal: data.weekTotal });
      }
    } catch (error) {
      console.error('Failed to sync Strava:', error);
    }
  }

  if (!session) {
    return (
      <div style={{ padding: '16px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ height: '3px', width: '36px', background: '#8B7FB8', marginBottom: '12px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Weekly Summary</h1>
          <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Your nutrition breakdown and training metrics.</p>
        </div>
        <div style={{ backgroundColor: '#FFF3CD', border: '1px solid #FFC107', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#856404', marginBottom: '8px' }}>Sign in to view your training & nutrition alignment</p>
          <a href="/auth/signin" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#8B7FB8', color: 'white', borderRadius: '6px', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <NutritionDashboardPro
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        stravaCaloriesBurned={stravaCaloriesBurned}
        isStravaConnected={isStravaConnected}
        onStravaSync={handleStravaSync}
      />
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
