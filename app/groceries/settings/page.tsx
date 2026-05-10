'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StravaConnect } from '@/components/StravaConnect';

function SettingsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Check Strava connection status on mount
  useEffect(() => {
    async function checkStravaStatus() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/strava-status');
        if (response.ok) {
          const data = await response.json();
          setIsConnected(data.isConnected);
        }
      } catch (error) {
        console.error('Failed to check Strava status:', error);
      } finally {
        setLoading(false);
      }
    }

    checkStravaStatus();
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
          background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
          marginBottom: '12px'
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Manage your account, preferences, and integrations.</p>
      </div>

      {successMessage && (
        <div style={{
          backgroundColor: '#D4EDDA',
          border: '1px solid #C3E6CB',
          color: '#155724',
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
        {loading ? (
          <p style={{ fontSize: '14px', color: '#999999' }}>Loading...</p>
        ) : (
          <>
            {isConnected ? (
              <div style={{
                backgroundColor: '#D4EDDA',
                border: '1px solid #C3E6CB',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <p style={{ fontSize: '14px', color: '#155724', marginBottom: '12px' }}>✓ Strava Connected</p>
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
                  backgroundColor: '#FF6B35',
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
            onSync={() => setSuccessMessage('Activities synced!')}
          />
        </div>
      )}

      <div style={{
        backgroundColor: '#F5F8FF',
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
