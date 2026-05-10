'use client';

import { SessionProvider } from 'next-auth/react';
import { GuestGroceriesProvider } from '@/hooks/useGuestGroceries';
import { ToastContainer } from '@/components/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GuestGroceriesProvider>
        <ToastContainer />
        {children}
      </GuestGroceriesProvider>
    </SessionProvider>
  );
}
