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

interface StravaActivity {
  stravaId: number;
  date: string;
  type: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
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
  activities: StravaActivity[];
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

    if (cached && stravaCached) {
      setData(cached);
      setStravaData(stravaCached);
      setLoading(false);
      return;
    }

    // Fetch nutrition data (always needed), but only use cached Strava data
    fetch(`/api/nutrition?week=${weekStart}`)
      .then((res) => res.json())
      .then((nutritionResult) => {
        setData(nutritionResult);
        if (stravaCached) {
          setStravaData(stravaCached);
        } else {
          setStravaData({ weekTotal: { caloriesBurned: 0 }, activities: [] });
        }
      })
      .catch(() => {
        if (cached) setData(cached);
        if (stravaCached) setStravaData(stravaCached);
        else setStravaData({ weekTotal: { caloriesBurned: 0 }, activities: [] });
      })
      .finally(() => {
        setLoading(false);
      });
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
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => router.back()}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #E8E4DC',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#2C2C2A'
          }}
        >
          Back
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Weekly Deficit</h1>
      </div>

      {/* Main Deficit Card */}
      <div
        style={{
          backgroundColor: statusBgColor,
          borderRadius: '12px',
          padding: '16px',
          border: `2px solid ${statusColor}`,
          marginBottom: '16px'
        }}
      >
        <p style={{
          fontSize: '11px',
          fontWeight: 700,
          color: statusColor,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          margin: '0 0 8px 0'
        }}>
          {statusLabel}
        </p>
        <p style={{
          fontSize: '40px',
          fontWeight: 700,
          color: statusColor,
          margin: '0 0 4px 0',
          lineHeight: 1
        }}>
          {Math.abs(deficit).toLocaleString()}
        </p>
        <p style={{
          fontSize: '12px',
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
        gap: '10px',
        marginBottom: '16px'
      }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#999999',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            margin: '0 0 6px 0'
          }}>
            Consumed
          </p>
          <p style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#D67BB8',
            margin: '0 0 2px 0',
            lineHeight: 1
          }}>
            {consumed}
          </p>
          <p style={{
            fontSize: '10px',
            color: '#999999',
            margin: 0
          }}>
            kcal
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#999999',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            margin: '0 0 6px 0'
          }}>
            Burned
          </p>
          <p style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#8B7FB8',
            margin: '0 0 2px 0',
            lineHeight: 1
          }}>
            {burned}
          </p>
          <p style={{
            fontSize: '10px',
            color: '#999999',
            margin: 0
          }}>
            kcal
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#999999',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            margin: '0 0 6px 0'
          }}>
            Goal
          </p>
          <p style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#5B7FD4',
            margin: '0 0 2px 0',
            lineHeight: 1
          }}>
            {expectedConsumed}
          </p>
          <p style={{
            fontSize: '10px',
            color: '#999999',
            margin: 0
          }}>
            kcal
          </p>
        </div>
      </div>

      {/* Strava Activities Section */}
      {stravaData && stravaData.activities && stravaData.activities.length > 0 && (
        <div style={{ marginBottom: '16px', marginTop: '12px' }}>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#2C2C2A',
            margin: '0 0 10px 0'
          }}>
            Strava Activities this Week
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stravaData.activities.map((activity) => (
              <div
                key={activity.stravaId}
                style={{
                  backgroundColor: '#F8F5FF',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  borderLeft: '3px solid #8B7FB8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, color: '#2C2C2A', margin: '0 0 2px 0' }}>
                    {activity.name}
                  </p>
                  <p style={{ color: '#999999', margin: 0, fontSize: '11px' }}>
                    {activity.durationMinutes} min • {activity.date}
                  </p>
                </div>
                <p style={{ color: '#5B7FD4', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {activity.caloriesBurned} cal
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Interpretation */}
      <div
        style={{
          backgroundColor: '#F5F1E8',
          borderRadius: '10px',
          padding: '12px',
          border: '1px solid #E8E4DC',
          fontSize: '12px',
          color: '#666666',
          lineHeight: '1.4'
        }}
      >
        {deficit <= 0
          ? `✓ Deficit of ${Math.abs(deficit).toLocaleString()} cal. Net intake (consumed - burned) is under your target for ${days} days.`
          : `Surplus of ${Math.abs(deficit).toLocaleString()} cal. Net intake (consumed - burned) exceeds your target for ${days} days.`}
      </div>
    </div>
  );
}
