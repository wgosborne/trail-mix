'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Splash() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/groceries');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#FFFFFF'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '20px' }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 700,
          color: '#2C2C2A',
          marginBottom: '16px',
          letterSpacing: '-0.5px'
        }}>
          TrailMix
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#999999',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Track your grocery intake versus your training burn. Designed for athletes who care about macronutrients.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => router.push('/groceries?mode=guest')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#F0EFE8',
              color: '#2C2C2A',
              border: '1px solid #E8E4DC',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8E4DC';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F0EFE8';
            }}
          >
            Try as Guest
          </button>
          <button
            onClick={() => router.push('/auth/signin')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#8B7FB8',
              color: '#FFFFFF',
              border: '1px solid #8B7FB8',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => router.push('/auth/register')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#FFFFFF',
              color: '#8B7FB8',
              border: '2px solid #8B7FB8',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F8F5FF';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF';
            }}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
