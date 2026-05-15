'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiSettings } from 'react-icons/fi';

export function TabNavigation() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Intake', href: '/groceries', icon: '◉', color: '#8B7FB8' },
    { label: 'Dashboard', href: '/groceries/dashboard', icon: '▦', color: '#D67BB8' },
    { label: 'Settings', href: '/groceries/settings', color: '#5B7FD4' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t"
      style={{
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E8E4DC',
        zIndex: 40,
        height: '80px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '100%',
          padding: '0 8px'
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center transition-colors duration-200"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
                minHeight: '80px',
                color: isActive ? tab.color : '#999999'
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                style={{
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '32px',
                  width: '32px',
                  transition: 'color 0.2s ease',
                  color: isActive ? tab.color : '#999999'
                }}
              >
                {tab.label === 'Settings' ? <FiSettings size={24} color={isActive ? tab.color : '#999999'} /> : tab.icon}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  lineHeight: 1,
                  transition: 'color 0.2s ease'
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
