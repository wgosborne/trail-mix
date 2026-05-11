'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';
import { showSuccess } from '@/lib/toast';

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      // Sign out with NextAuth
      const result = await signOut({ redirect: false, callbackUrl: '/' });

      // Clear any guest data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('trail_mix_guest_groceries');
        localStorage.removeItem('trail_mix_macro_goals');
      }

      showSuccess('Signed out successfully');

      // Redirect to splash page
      if (result?.url) {
        router.push(result.url);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  // Only show header if user is authenticated
  if (!session?.user) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: 0,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8E4DC',
          paddingRight: '20px',
          paddingLeft: '20px',
          paddingTop: '12px',
          paddingBottom: '12px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          zIndex: 41,
          minHeight: '52px'
        }}
      >
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#5B7FD4',
            backgroundColor: 'transparent',
            border: '1px solid #5B7FD4',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F5F8FF';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          Sign Out
        </button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="You will be logged out. Guest data and current week inventory will be cleared. You can always sign back in to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        isLoading={isLoggingOut}
      />
    </>
  );
}
