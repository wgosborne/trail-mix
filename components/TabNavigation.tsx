'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TabNavigation() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Camera', href: '/groceries', icon: '⊕', color: '#8B7FB8' },
    { label: 'Dashboard', href: '/groceries/dashboard', icon: '◆', color: '#D67BB8' },
    { label: 'Settings', href: '/groceries/settings', icon: '⚙', color: '#5B7FD4' },
  ];

  return (
    <div
      className="flex border-b sticky top-0 z-10"
      style={{
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#E8E4DC'
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 py-4 px-4 text-center font-semibold text-sm transition border-b-2"
            style={{
              color: isActive ? tab.color : '#999999',
              borderBottomColor: isActive ? tab.color : 'transparent',
            }}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
