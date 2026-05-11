'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      router.push('/auth/signin?registered=true');
    } catch (err) {
      setError('An error occurred during registration');
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      padding: '16px'
    }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 36px)',
          fontWeight: 800,
          fontFamily: 'var(--font-syne), sans-serif',
          color: '#2C2C2A',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Create Account
        </h1>
        <p style={{
          fontSize: 'clamp(13px, 3vw, 14px)',
          color: '#999999',
          marginBottom: 'clamp(24px, 5vw, 32px)',
          textAlign: 'center'
        }}>
          Join TrailMix to track your nutrition
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FEE8E8',
            color: '#DC3545',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            border: '1px solid #F5D5D5'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2C2C2A',
              marginBottom: '8px'
            }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E8E4DC',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#2C2C2A',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#8B7FB8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E4DC'}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2C2C2A',
              marginBottom: '8px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E8E4DC',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#2C2C2A',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#8B7FB8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E4DC'}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2C2C2A',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E8E4DC',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#2C2C2A',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#8B7FB8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E4DC'}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2C2C2A',
              marginBottom: '8px'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E8E4DC',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#2C2C2A',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#8B7FB8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E8E4DC'}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
              backgroundColor: loading ? '#D0D0D0' : '#8B7FB8',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: 'clamp(13px, 3vw, 14px)',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s ease',
              minHeight: '44px',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: '#999999',
          marginTop: 'clamp(20px, 4vw, 24px)',
          textAlign: 'center'
        }}>
          Already have an account?{' '}
          <Link href="/auth/signin" style={{
            color: '#8B7FB8',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'opacity 0.2s'
          }} onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8'} onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
