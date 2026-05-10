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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">🥗 TrailMix</h1>
        <p className="text-xl text-gray-600 mb-8">Track your grocery intake vs. your training burn</p>

        <div className="space-y-4">
          <button
            onClick={() => router.push('/groceries?mode=guest')}
            className="block w-48 mx-auto bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium"
          >
            👤 Use as Guest
          </button>
          <button
            onClick={() => router.push('/auth/signin')}
            className="block w-48 mx-auto bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            🔐 Sign In
          </button>
          <button
            onClick={() => router.push('/auth/register')}
            className="block w-48 mx-auto bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
          >
            ✨ Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
