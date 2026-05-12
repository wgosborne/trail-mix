'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StravaConnect } from '@/components/StravaConnect';
import { getCached, setCached } from '@/lib/cache';

function SettingsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from cache to prevent flash of loading state
  const cachedStatus = getCached<{ isConnected: boolean }>('strava_status');
  const [isConnected, setIsConnected] = useState(cachedStatus?.isConnected ?? false);
  const [loading, setLoading] = useState(!cachedStatus);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize goals from cache
  const cachedProfile2 = getCached<any>('user_profile');
  const [goals, setGoals] = useState({
    dailyCalGoal: cachedProfile2?.dailyCalGoal ?? 2000,
    dailyProteinG: cachedProfile2?.dailyProteinG ?? 150,
    dailyCarbsG: cachedProfile2?.dailyCarbsG ?? 200,
    dailyFatG: cachedProfile2?.dailyFatG ?? 65,
  });
  const [goalsLoading, setGoalsLoading] = useState(false);

  // Check Strava connection status and load goals on mount (only if not cached)
  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    // Only fetch if cache is missing
    const cachedStatus = getCached<{ isConnected: boolean }>('strava_status');
    if (!cachedStatus) {
      (async () => {
        try {
          const response = await fetch('/api/user/strava-status');
          if (response.ok) {
            const data = await response.json();
            setIsConnected(data.isConnected);
            setCached('strava_status', { isConnected: data.isConnected });
          }
        } catch (error) {
          console.error('Failed to check Strava status:', error);
        } finally {
          setLoading(false);
        }
      })();
    }

    const cachedProfile = getCached<any>('user_profile');
    if (!cachedProfile) {
      (async () => {
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            setGoals({
              dailyCalGoal: data.dailyCalGoal || 2000,
              dailyProteinG: data.dailyProteinG || 150,
              dailyCarbsG: data.dailyCarbsG || 200,
              dailyFatG: data.dailyFatG || 65,
            });
            setCached('user_profile', data);
          }
        } catch (error) {
          console.error('Failed to load goals:', error);
        }
      })();
    }
  }, [session]);

  // Handle query params for success/error messages
  useEffect(() => {
    const stravaConnected = searchParams.get('strava_connected');
    const error = searchParams.get('error');
    const disconnected = searchParams.get('disconnected');

    if (stravaConnected === 'true') {
      setSuccessMessage('Strava connected successfully!');
      setIsConnected(true);
      // Clear URL param
      router.replace('/groceries/settings');
    }

    if (disconnected === 'true') {
      setSuccessMessage('Strava disconnected successfully!');
      setIsConnected(false);
      // Clear URL param
      router.replace('/groceries/settings');
    }

    if (error === 'no_code') {
      setErrorMessage('Strava authorization was cancelled.');
      router.replace('/groceries/settings');
    }

    if (error === 'strava_error') {
      setErrorMessage('Failed to connect Strava. Please try again.');
      router.replace('/groceries/settings');
    }

    // Auto-hide messages after 5 seconds
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router, successMessage, errorMessage]);

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Strava?')) {
      return;
    }

    try {
      const response = await fetch('/api/user/strava-disconnect', {
        method: 'PUT',
      });

      if (response.ok) {
        setSuccessMessage('Strava disconnected successfully!');
        setIsConnected(false);
      } else {
        setErrorMessage('Failed to disconnect Strava.');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      setErrorMessage('Failed to disconnect Strava.');
    }
  }

  async function handleSaveGoals() {
    setGoalsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/user/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goals),
      });

      if (response.ok) {
        setSuccessMessage('Nutrition goals saved successfully!');
      } else {
        setErrorMessage('Failed to save nutrition goals.');
      }
    } catch (error) {
      console.error('Save goals error:', error);
      setErrorMessage('Failed to save nutrition goals.');
    } finally {
      setGoalsLoading(false);
    }
  }

  if (!session?.user) {
    return (
      <div style={{ padding: '16px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            height: '3px',
            width: '36px',
            background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
            marginBottom: '12px'
          }} />
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Settings</h1>
          <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Manage your account, preferences, and integrations.</p>
        </div>
        <p style={{ fontSize: '14px', color: '#999999' }}>Sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '3px',
          width: '36px',
          background: '#8B7FB8',
          marginBottom: '12px'
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Manage your account, preferences, and integrations.</p>
      </div>

      {successMessage && (
        <div style={{
          backgroundColor: '#F0EFE8',
          border: '1px solid #D4C5E2',
          color: '#8B7FB8',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          backgroundColor: '#F8D7DA',
          border: '1px solid #F5C6CB',
          color: '#721C24',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {errorMessage}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px' }}>Strava Integration</h2>
        {!loading && (
          <>
            {isConnected ? (
              <div style={{
                backgroundColor: '#F0EFE8',
                border: '1px solid #D4C5E2',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <p style={{ fontSize: '14px', color: '#8B7FB8', marginBottom: '12px' }}>✓ Strava Connected</p>
                <button
                  onClick={handleDisconnect}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#DC3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Disconnect Strava
                </button>
              </div>
            ) : (
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
            )}
          </>
        )}
      </div>

      {isConnected && (
        <div style={{ marginBottom: '24px' }}>
          <StravaConnect
            isConnected={isConnected}
          />
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px' }}>Nutrition Goals</h2>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E4DC',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Daily Calories
              </label>
              <input
                type="number"
                value={goals.dailyCalGoal}
                onChange={(e) => setGoals({ ...goals, dailyCalGoal: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Daily Protein (g)
              </label>
              <input
                type="number"
                step="0.1"
                value={goals.dailyProteinG}
                onChange={(e) => setGoals({ ...goals, dailyProteinG: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Daily Carbs (g)
              </label>
              <input
                type="number"
                step="0.1"
                value={goals.dailyCarbsG}
                onChange={(e) => setGoals({ ...goals, dailyCarbsG: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Daily Fat (g)
              </label>
              <input
                type="number"
                step="0.1"
                value={goals.dailyFatG}
                onChange={(e) => setGoals({ ...goals, dailyFatG: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
          <button
            onClick={handleSaveGoals}
            disabled={goalsLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: goalsLoading ? '#CCCCCC' : '#8B7FB8',
              color: 'white',
              border: '1px solid #8B7FB8',
              borderRadius: '8px',
              cursor: goalsLoading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {goalsLoading ? 'Saving...' : 'Save Goals'}
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#F8F5FF',
        border: '1px solid #E8E4DC',
        borderRadius: '10px',
        padding: '24px'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px' }}>Account</h2>
        <p style={{ fontSize: '14px', color: '#999999', marginBottom: '8px' }}>Email: {session.user.email}</p>
        {session.user.name && (
          <p style={{ fontSize: '14px', color: '#999999' }}>Name: {session.user.name}</p>
        )}
      </div>
    </div>
  );
}

export default function SettingsTab() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: '14px', color: '#999999' }}>Loading...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
