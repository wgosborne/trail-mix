'use client';

interface SkeletonLoaderProps {
  type?: 'bar' | 'card' | 'text' | 'circle';
  width?: string;
  height?: string;
  count?: number;
}

export function SkeletonLoader({
  type = 'bar',
  width = '100%',
  height = '20px',
  count = 1,
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          style={{
            backgroundColor: '#E8E4DC',
            borderRadius: '6px',
            width,
            height,
            marginBottom: i < count - 1 ? '12px' : '0',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E8E4DC',
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <SkeletonLoader height="18px" width="60%" />
      <SkeletonLoader height="14px" width="100%" count={2} />
    </div>
  );
}
