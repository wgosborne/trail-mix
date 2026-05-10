'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { StravaConnect } from '@/components/StravaConnect';
import { NutritionDashboard } from '@/components/NutritionDashboard';

export default function DashboardTab() {
  const { data: session, status } = useSession();
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [stravaCaloriesBurned, setStravaCaloriesBurned] = useState(0);
  const [isStravaConnected, setIsStravaConnected] = useState(false);

  useEffect(() => {
    // Check if user has Strava connected
    if (session?.user) {
      checkStravaConnection();
    }
  }, [session]);

  async function checkStravaConnection() {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setIsStravaConnected(!!data.stravaUserId);
      }
    } catch (error) {
      console.error('Failed to check Strava connection:', error);
    }
  }

  function handleStravaSync(caloriesBurned: number) {
    setStravaCaloriesBurned(caloriesBurned);
  }

  function handleWeekChange(newWeekStart: string) {
    setWeekStart(newWeekStart);
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div style={{ padding: '16px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            height: '3px',
            width: '36px',
            background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
            marginBottom: '12px'
          }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Weekly Summary</h1>
          <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Your nutrition breakdown and training metrics.</p>
        </div>
        <p style={{ fontSize: '14px', color: '#999999', textAlign: 'center' }}>Loading...</p>
      </div>
    );
  }

  // Guest mode message
  if (!session) {
    return (
      <div style={{ padding: '16px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            height: '3px',
            width: '36px',
            background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
            marginBottom: '12px'
          }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Weekly Summary</h1>
          <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Your nutrition breakdown and training metrics.</p>
        </div>

        <div style={{
          backgroundColor: '#FFF3CD',
          border: '1px solid #FFC107',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#856404', marginBottom: '8px' }}>Sign in to view your training & nutrition alignment</p>
          <p style={{ fontSize: '13px', color: '#856404', marginBottom: '16px', marginTop: '4px' }}>
            Get personalized insights by connecting your Strava account and tracking your groceries.
          </p>
          <a
            href="/auth/signin"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#1976D2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Authenticated user - show full dashboard
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '3px',
          width: '36px',
          background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
          marginBottom: '12px'
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Weekly Summary</h1>
        <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Your nutrition breakdown and training metrics.</p>
      </div>

      {/* Strava Section */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px' }}>Training Data</h2>
        <StravaConnect
          isConnected={isStravaConnected}
          weekStart={weekStart}
          onCaloriesUpdate={(calories) => setStravaCaloriesBurned(calories)}
        />
      </div>

      {/* Nutrition Dashboard Section */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px' }}>Nutrition Tracking</h2>
        <NutritionDashboard
          weekStart={weekStart}
          onWeekChange={handleWeekChange}
          stravaCaloriesBurned={stravaCaloriesBurned}
        />
      </div>
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
