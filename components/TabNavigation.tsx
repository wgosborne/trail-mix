'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TabNavigation() {
  const pathname = usePathname();

  const tabs = [
    { label: '📷 Camera', href: '/groceries' },
    { label: '📊 Dashboard', href: '/groceries/dashboard' },
    { label: '⚙️ Settings', href: '/groceries/settings' },
  ];

  return (
    <div className="flex border-b sticky top-0 bg-white z-10">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition ${
            pathname === tab.href
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
