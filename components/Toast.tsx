'use client';

import { useState, useEffect } from 'react';
import { subscribeToToasts, subscribeToToastRemoval } from '@/lib/toast';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const typeStyles = {
  success: {
    bg: '#DFF2BF',
    text: '#4C7031',
    border: '#90EE90',
    icon: '✓'
  },
  error: {
    bg: '#FFD4D4',
    text: '#9B2C2C',
    border: '#FF6B6B',
    icon: '✕'
  },
  info: {
    bg: '#D1ECF1',
    text: '#0C5460',
    border: '#74C0FC',
    icon: 'ℹ'
  },
  warning: {
    bg: '#FFF3CD',
    text: '#856404',
    border: '#FFE69C',
    icon: '⚠'
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts(prev => [...prev, {
        id: toast.id,
        message: toast.message,
        type: toast.type
      }]);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToToastRemoval((id) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '400px',
      }}
    >
      {toasts.map(toast => {
        const style = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              backgroundColor: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '12px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              fontSize: '13px',
              fontWeight: 500,
              animation: 'slideIn 0.3s ease-out',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '20px' }}>
              {style.icon}
            </span>
            <span style={{ flex: 1, wordBreak: 'break-word' }}>
              {toast.message}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
