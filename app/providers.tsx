'use client';

import { SessionProvider } from 'next-auth/react';
import { GuestGroceriesProvider } from '@/hooks/useGuestGroceries';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GuestGroceriesProvider>
        {children}
      </GuestGroceriesProvider>
    </SessionProvider>
  );
}
