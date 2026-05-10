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
    <>
      <style>{`
        @media (max-width: 640px) {
          .splash-hero {
            font-size: 48px;
          }
          .splash-container {
            padding: 16px;
          }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .splash-hero {
            font-size: 80px;
          }
          .splash-container {
            padding: 24px;
          }
        }
        @media (min-width: 1025px) {
          .splash-hero {
            font-size: 120px;
          }
          .splash-container {
            padding: 32px;
          }
        }
      `}</style>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        padding: '16px'
      }}>
        <div className="splash-container" style={{ textAlign: 'center', maxWidth: '600px' }}>
          <h1 className="splash-hero" style={{
            fontWeight: 800,
            fontFamily: 'var(--font-syne), sans-serif',
            color: '#2C2C2A',
            marginBottom: 'clamp(24px, 5vw, 40px)',
            letterSpacing: '-2px',
            lineHeight: '1.1',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: '0',
            flexWrap: 'wrap',
            margin: '0 0 clamp(24px, 5vw, 40px) 0'
          }}>
            <span style={{ color: '#2C2C2A' }}>Trail</span>
            <span style={{ color: '#8B7FB8', marginLeft: 'clamp(4px, 2vw, 8px)' }}>Mix</span>
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 4vw, 16px)',
            color: '#999999',
            marginBottom: 'clamp(24px, 5vw, 40px)',
            lineHeight: '1.6',
            margin: '0 0 clamp(24px, 5vw, 40px) 0'
          }}>
            Track your grocery intake versus your training burn. Designed for athletes who care about macronutrients.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 12px)' }}>
            <button
              onClick={() => router.push('/groceries?mode=guest')}
              style={{
                padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
                backgroundColor: '#F0EFE8',
                color: '#2C2C2A',
                border: '1px solid #E8E4DC',
                borderRadius: '8px',
                fontSize: 'clamp(13px, 3vw, 14px)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
                padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
                backgroundColor: '#8B7FB8',
                color: '#FFFFFF',
                border: '1px solid #8B7FB8',
                borderRadius: '8px',
                fontSize: 'clamp(13px, 3vw, 14px)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
                padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
                backgroundColor: '#FFFFFF',
                color: '#8B7FB8',
                border: '2px solid #8B7FB8',
                borderRadius: '8px',
                fontSize: 'clamp(13px, 3vw, 14px)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
    </>
  );
}
