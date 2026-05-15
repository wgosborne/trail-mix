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

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}

function getDaysElapsed(weekStart: string): number {
  const today = new Date();
  const start = new Date(weekStart);
  const days = Math.min(
    7,
    Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1),
  );
  return days;
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
    const weekStart = getCurrentWeekStart();

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

  const weekStart = getCurrentWeekStart();
  const days = getDaysElapsed(weekStart);
  const consumed = Math.round(data.totals.caloriesConsumed);
  const burned = stravaData?.weekTotal.caloriesBurned ?? 0;
  const expectedConsumed = Math.round(data.goals.dailyCalories * days);
  const netIntake = consumed - burned;
  const deficit = netIntake - expectedConsumed;

  let statusColor = "#34A853"; // green
  let statusBgColor = "#D1F2D6";
  let statusLabel = "✓ Deficit";

  if (deficit > 0 && deficit <= 200) {
    statusColor = "#E67E22"; // orange/yellow
    statusBgColor = "#FFF8DC";
    statusLabel = "⚠ Close";
  } else if (deficit > 200) {
    statusColor = "#FF6B6B"; // red
    statusBgColor = "#FFE5E5";
    statusLabel = "✗ Surplus";
  }

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
          backgroundColor: statusBgColor,
          borderRadius: '16px',
          padding: '24px',
          border: `2px solid ${statusColor}`,
          marginBottom: '24px'
        }}
      >
        <p style={{
          fontSize: '12px',
          fontWeight: 700,
          color: statusColor,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          margin: '0 0 12px 0'
        }}>
          {statusLabel}
        </p>
        <p style={{
          fontSize: '48px',
          fontWeight: 700,
          color: statusColor,
          margin: '0 0 8px 0',
          lineHeight: 1
        }}>
          {Math.abs(deficit).toLocaleString()}
        </p>
        <p style={{
          fontSize: '14px',
          color: statusColor,
          margin: 0
        }}>
          {deficit <= 0 ? 'Deficit' : 'Surplus'} vs goal • Day {days} of 7
        </p>
      </div>

      {/* Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
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
            Goal (Day {days})
          </p>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#8B7FB8',
            margin: '0 0 4px 0',
            lineHeight: 1
          }}>
            {expectedConsumed}
          </p>
          <p style={{
            fontSize: '11px',
            color: '#999999',
            margin: 0
          }}>
            kcal so far
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
          {deficit <= 0
            ? `You're in a deficit of ${Math.abs(deficit).toLocaleString()} calories relative to your goal for ${days} days. Your net intake (consumed - burned) is under your target, which supports fat loss goals.`
            : `You're in a surplus of ${Math.abs(deficit).toLocaleString()} calories relative to your goal for ${days} days. Your net intake (consumed - burned) exceeds your target for the days so far.`}
        </p>
        <p style={{
          fontSize: '12px',
          color: '#999999',
          margin: 0,
          fontStyle: 'italic'
        }}>
          Green: Deficit. Yellow: Within 200 cal of goal. Red: Over 200 cal surplus.
        </p>
      </div>
    </div>
  );
}
