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

export default function CaloriesDetailPage() {
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

  if (loading) {
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Calories</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#999999', paddingTop: '40px' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!data) {
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Calories</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#999999', paddingTop: '40px' }}>
          No data available
        </div>
      </div>
    );
  }

  const consumed = Math.round(data.totals.caloriesConsumed);
  const burned = stravaData?.weekTotal.caloriesBurned ?? 0;
  const deficit = burned - consumed;
  const goal = data.goals.dailyCalories * 7;

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
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Calorie Breakdown</h1>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Consumed Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '2px solid #D67BB8'
          }}
        >
          <p style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#999999',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 12px 0'
          }}>
            Consumed This Week
          </p>
          <p style={{
            fontSize: '40px',
            fontWeight: 700,
            color: '#D67BB8',
            margin: '0 0 8px 0',
            lineHeight: 1
          }}>
            {consumed}
          </p>
          <p style={{
            fontSize: '13px',
            color: '#999999',
            margin: 0
          }}>
            {Math.round(consumed / 7)} kcal/day average
          </p>
        </div>

        {/* Burned Card */}
        {burned > 0 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              border: '2px solid #5B7FD4'
            }}
          >
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#999999',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: '0 0 12px 0'
            }}>
              Burned This Week (Strava)
            </p>
            <p style={{
              fontSize: '40px',
              fontWeight: 700,
              color: '#5B7FD4',
              margin: '0 0 8px 0',
              lineHeight: 1
            }}>
              {burned}
            </p>
            <p style={{
              fontSize: '13px',
              color: '#999999',
              margin: 0
            }}>
              {Math.round(burned / 7)} kcal/day average
            </p>
          </div>
        )}
      </div>

      {/* Comparison */}
      {burned > 0 && (
        <div
          style={{
            backgroundColor: '#8B7FB8',
            borderRadius: '16px',
            padding: '24px',
            color: '#FFFFFF'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0' }}>Weekly Balance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: '0 0 8px 0'
              }}>
                Deficit
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: 700,
                margin: '0',
                color: deficit >= -500 ? '#90EE90' : '#FFB6C6'
              }}>
                {deficit > 0 ? '+' : ''}{(deficit / 1000).toFixed(1)}K
              </p>
            </div>
            <div>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: '0 0 8px 0'
              }}>
                Status
              </p>
              <p style={{
                fontSize: '14px',
                fontWeight: 600,
                margin: '0',
                color: deficit >= -500 ? '#90EE90' : '#FFB6C6'
              }}>
                {deficit >= -500 ? 'On track' : 'Needs work'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
