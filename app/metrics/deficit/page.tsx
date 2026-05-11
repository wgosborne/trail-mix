'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCached } from '@/lib/cache';

interface NutritionData {
  week: { start: string; end: string };
  totals: {
    caloriesConsumed: number;
  };
  goals: {
    dailyCalories: number;
  };
}

interface StravaData {
  weekTotal: {
    caloriesBurned: number;
  };
}

export default function DeficitDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<NutritionData | null>(null);
  const [stravaData, setStravaData] = useState<StravaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current week
    const date = new Date();
    const dayOfWeek = date.getUTCDay();
    const diff = date.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setUTCDate(diff));
    const weekStart = monday.toISOString().split('T')[0];

    const cached = getCached<NutritionData>(`nutrition_${weekStart}`);
    const stravaCached = getCached<StravaData>(`strava_${weekStart}`);

    if (cached) {
      setData(cached);
    }
    if (stravaCached) {
      setStravaData(stravaCached);
    }
    setLoading(false);
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => router.back()}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #E8E4DC',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Back
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Deficit</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#999999', paddingTop: '40px' }}>
          {loading ? 'Loading...' : 'No data available'}
        </div>
      </div>
    );
  }

  const consumed = Math.round(data.totals.caloriesConsumed);
  const burned = stravaData?.weekTotal.caloriesBurned ?? 0;
  const deficit = burned - consumed;
  const isOnTrack = deficit >= -500;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => router.back()}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #E8E4DC',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#2C2C2A'
          }}
        >
          Back
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Weekly Deficit</h1>
      </div>

      {/* Main Deficit Card */}
      <div
        style={{
          backgroundColor: isOnTrack ? '#D1F2D6' : '#FFE5E5',
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${isOnTrack ? '#34A853' : '#FF6B6B'}`,
          marginBottom: '24px'
        }}
      >
        <p style={{
          fontSize: '12px',
          fontWeight: 700,
          color: isOnTrack ? '#34A853' : '#FF6B6B',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          margin: '0 0 12px 0'
        }}>
          {isOnTrack ? 'On Track' : 'Needs Work'}
        </p>
        <p style={{
          fontSize: '48px',
          fontWeight: 700,
          color: isOnTrack ? '#34A853' : '#FF6B6B',
          margin: '0 0 8px 0',
          lineHeight: 1
        }}>
          {deficit > 0 ? '+' : ''}{(deficit / 1000).toFixed(1)}K
        </p>
        <p style={{
          fontSize: '14px',
          color: isOnTrack ? '#34A853' : '#FF6B6B',
          margin: 0
        }}>
          calories on pace this week
        </p>
      </div>

      {/* Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#999999',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 8px 0'
          }}>
            Burned (Strava)
          </p>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#5B7FD4',
            margin: '0 0 4px 0',
            lineHeight: 1
          }}>
            {burned}
          </p>
          <p style={{
            fontSize: '11px',
            color: '#999999',
            margin: 0
          }}>
            kcal this week
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#999999',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 8px 0'
          }}>
            Consumed
          </p>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#D67BB8',
            margin: '0 0 4px 0',
            lineHeight: 1
          }}>
            {consumed}
          </p>
          <p style={{
            fontSize: '11px',
            color: '#999999',
            margin: 0
          }}>
            kcal this week
          </p>
        </div>
      </div>

      {/* Interpretation */}
      <div
        style={{
          backgroundColor: '#F5F1E8',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #E8E4DC'
        }}
      >
        <h2 style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#2C2C2A',
          margin: '0 0 12px 0'
        }}>
          What This Means
        </h2>
        <p style={{
          fontSize: '13px',
          color: '#666666',
          margin: '0 0 8px 0',
          lineHeight: '1.5'
        }}>
          {deficit > 0
            ? `You're in a calorie surplus of ${(deficit / 1000).toFixed(1)}K calories this week. You've eaten more than you burned, which is great for building muscle and energy levels.`
            : `You're in a calorie deficit of ${Math.abs(deficit / 1000).toFixed(1)}K calories this week. You've burned more than you consumed, which supports fat loss goals.`}
        </p>
        <p style={{
          fontSize: '12px',
          color: '#999999',
          margin: 0,
          fontStyle: 'italic'
        }}>
          The optimal range is typically -500 to +500 calories per week for balanced progress.
        </p>
      </div>
    </div>
  );
}
