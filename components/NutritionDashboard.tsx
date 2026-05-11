'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { WeekNavigator } from './WeekNavigator';
import { getCached, setCached } from '@/lib/cache';

interface NutritionData {
  week: { start: string; end: string };
  totals: {
    caloriesBought: number;
    caloriesConsumed: number;
    proteinBought: number;
    proteinConsumed: number;
    carbsBought: number;
    carbsConsumed: number;
    fatBought: number;
    fatConsumed: number;
  };
  goals: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
  };
}

interface WeeklyChartData {
  week: string;
  label: string;
  consumed: number;
  burned: number;
}

interface NutritionDashboardProps {
  weekStart: string;
  onWeekChange: (week: string) => void;
  stravaCaloriesBurned?: number;
  isStravaConnected?: boolean;
  onStravaSync?: () => Promise<void>;
}

function getPriorWeeks(weekStart: string, count = 4): string[] {
  const weeks: string[] = [];
  const start = new Date(weekStart);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    weeks.push(d.toISOString().split('T')[0]);
  }
  return weeks;
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}/${day}`;
}

async function fetchWeekNutrition(weekStart: string): Promise<NutritionData | null> {
  const cached = getCached<NutritionData>(`nutrition_${weekStart}`);
  if (cached) return cached;

  try {
    const response = await fetch(`/api/nutrition?week=${weekStart}`);
    if (!response.ok) return null;
    const data = await response.json();
    setCached(`nutrition_${weekStart}`, data);
    return data;
  } catch {
    return null;
  }
}

async function fetchStravaWeek(weekStart: string): Promise<{ caloriesBurned: number } | null> {
  const cached = getCached<{ weekTotal: { caloriesBurned: number } }>(`strava_${weekStart}`);
  if (cached) return { caloriesBurned: cached.weekTotal.caloriesBurned };

  try {
    const response = await fetch(`/api/strava/activities?week=${weekStart}`);
    if (!response.ok) return null;
    const data = await response.json();
    return { caloriesBurned: data.weekTotal.caloriesBurned };
  } catch {
    return null;
  }
}

export function NutritionDashboard({
  weekStart,
  onWeekChange,
  stravaCaloriesBurned = 0,
  isStravaConnected = false,
  onStravaSync,
}: NutritionDashboardProps) {
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyChartData[]>([]);
  const [syncingStrava, setSyncingStrava] = useState(false);

  useEffect(() => {
    async function fetchNutrition() {
      const cached = getCached<NutritionData>(`nutrition_${weekStart}`);
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(`/api/nutrition?week=${weekStart}`);
        if (!response.ok) {
          if (!cached) {
            setError(response.status === 401 ? 'Please sign in to view nutrition data' : 'Failed to load nutrition data');
            setData(null);
          }
          return;
        }
        const result = await response.json();
        setData(result);
        setCached(`nutrition_${weekStart}`, result);
      } catch (err) {
        console.error('Nutrition fetch error:', err);
        if (!cached) {
          setError('Failed to load nutrition data');
        }
      } finally {
        setLoading(false);
      }
    }

    async function fetchWeeklyChartData() {
      const weeks = getPriorWeeks(weekStart, 4);
      try {
        const nutritionResults = await Promise.all(weeks.map(fetchWeekNutrition));
        const stravaResults = isStravaConnected ? await Promise.all(weeks.map(fetchStravaWeek)) : weeks.map(() => null);

        const chartData: WeeklyChartData[] = weeks.map((week, i) => ({
          week,
          label: formatWeekLabel(week),
          consumed: Math.round(nutritionResults[i]?.totals.caloriesConsumed ?? 0),
          burned: stravaResults[i]?.caloriesBurned ?? 0,
        }));

        setWeeklyChartData(chartData);
      } catch (err) {
        console.error('Weekly chart fetch error:', err);
      }
    }

    fetchNutrition();
    fetchWeeklyChartData();
  }, [weekStart, isStravaConnected]);

  if (error) {
    return (
      <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF9A9A', borderRadius: '10px', padding: '16px', textAlign: 'center', color: '#C62828', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <div style={{ backgroundColor: '#F0EFE8', border: '1px solid #E8E4DC', borderRadius: '10px', padding: '16px', textAlign: 'center', fontSize: '14px', color: '#999999' }}>
        No nutrition data available for this week
      </div>
    );
  }

  // Days elapsed this week (1–7), used for daily averages
  const today = new Date();
  const start = new Date(weekStart);
  const days = Math.min(7, Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));

  const totals = data?.totals;
  const goals = data?.goals;

  // Macro calories for donut chart
  const proteinCal = Math.round((totals?.proteinConsumed ?? 0) * 4);
  const carbsCal = Math.round((totals?.carbsConsumed ?? 0) * 4);
  const fatCal = Math.round((totals?.fatConsumed ?? 0) * 9);
  const totalConsumed = Math.round(totals?.caloriesConsumed ?? 0);
  const hasData = totalConsumed > 0;

  const donutData = [
    { name: 'Protein', value: proteinCal, color: '#8B7FB8' },
    { name: 'Carbs', value: carbsCal, color: '#D67BB8' },
    { name: 'Fat', value: fatCal, color: '#C9845F' },
  ];

  // Daily averages
  const avgConsumed = Math.round(totalConsumed / days);
  const avgBurned = Math.round(stravaCaloriesBurned / days);
  const dailyGoal = goals?.dailyCalories ?? 2000;
  const netPerDay = avgBurned - avgConsumed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <WeekNavigator onWeekChange={onWeekChange} />

      {/* Macro Breakdown */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: '10px', padding: '16px' }}>
        <div style={{ height: '3px', width: '24px', background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)', marginBottom: '12px' }} />
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 16px 0' }}>
          Macro Breakdown
        </p>

        {!hasData ? (
          <p style={{ fontSize: '13px', color: '#999999', textAlign: 'center', padding: '24px 0' }}>No groceries logged this week</p>
        ) : (
          <>
            <div style={{ position: 'relative', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#FFFFFF"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} cal`, '']}
                    contentStyle={{ fontSize: '12px', border: '1px solid #E8E4DC', borderRadius: '6px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#2C2C2A', margin: 0, lineHeight: 1.1 }}>{totalConsumed}</p>
                <p style={{ fontSize: '10px', color: '#999999', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>cal</p>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
              {[
                { label: 'Protein', value: Math.round(totals?.proteinConsumed ?? 0), color: '#8B7FB8' },
                { label: 'Carbs', value: Math.round(totals?.carbsConsumed ?? 0), color: '#D67BB8' },
                { label: 'Fat', value: Math.round(totals?.fatConsumed ?? 0), color: '#C9845F' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#2C2C2A' }}>{label} <span style={{ color: '#999999' }}>{value}g</span></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Key Metrics (2×2 Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ backgroundColor: '#F8F5FF', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px 0' }}>
              TOTAL CONSUMED
            </p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#2C2C2A', margin: '0 0 8px 0', lineHeight: 1 }}>
              {Math.round(totalConsumed).toLocaleString()}
            </p>
          </div>
          <p style={{ fontSize: '11px', color: '#999999', margin: 0 }}>cal</p>
        </div>
        <div style={{ backgroundColor: '#FFF5F8', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px 0' }}>
              DAILY AVERAGE vs GOAL
            </p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#2C2C2A', margin: '0 0 4px 0', lineHeight: 1 }}>
              {avgConsumed} / {dailyGoal}
            </p>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#F0E8F5', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
              <div style={{ height: '100%', backgroundColor: '#D67BB8', width: `${Math.min(100, (avgConsumed / dailyGoal) * 100)}%`, borderRadius: '2px' }} />
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#999999', margin: '4px 0 0 0' }}>cal/day</p>
        </div>
        {isStravaConnected && stravaCaloriesBurned > 0 && (
          <div style={{ backgroundColor: '#F5F8FF', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px 0' }}>
                BURNED (STRAVA)
              </p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#2C2C2A', margin: '0 0 4px 0', lineHeight: 1 }}>
                {Math.round(stravaCaloriesBurned).toLocaleString()}
              </p>
            </div>
            <p style={{ fontSize: '11px', color: '#999999', margin: 0 }}>cal</p>
          </div>
        )}
        {isStravaConnected && stravaCaloriesBurned > 0 && (
          <div style={{ backgroundColor: '#FFF8F5', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 4px 0' }}>
                NET
              </p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: netPerDay >= 0 ? '#155724' : '#856404', margin: '0 0 4px 0', lineHeight: 1 }}>
                {netPerDay >= 0 ? '+' : ''}{netPerDay.toLocaleString()}
              </p>
            </div>
            <p style={{ fontSize: '11px', color: '#999999', margin: 0 }}>cal</p>
          </div>
        )}
      </div>

      {/* Consumed vs Burned Chart */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: '10px', padding: '16px' }}>
        <div style={{ height: '3px', width: '24px', background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)', marginBottom: '12px' }} />
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 16px 0' }}>
          Consumed vs Burned
        </p>

        {weeklyChartData.length > 0 ? (
          <div style={{ position: 'relative', height: '280px', marginBottom: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
                <XAxis dataKey="label" stroke="#999999" fontSize={12} />
                <YAxis stroke="#999999" fontSize={12} />
                <Legend wrapperStyle={{ paddingTop: '12px' }} />
                <Bar dataKey="consumed" fill="#D67BB8" name="Consumed" />
                {isStravaConnected && <Bar dataKey="burned" fill="#5B7FD4" name="Burned" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#999999', textAlign: 'center', padding: '24px 0' }}>Loading chart data...</p>
        )}

        {isStravaConnected && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={async () => {
                if (onStravaSync) {
                  setSyncingStrava(true);
                  try {
                    await onStravaSync();
                  } finally {
                    setSyncingStrava(false);
                  }
                }
              }}
              disabled={syncingStrava}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F8F5FF',
                border: '1px solid #8B7FB8',
                borderRadius: '6px',
                color: '#8B7FB8',
                cursor: syncingStrava ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                opacity: syncingStrava ? 0.6 : 1,
              }}
            >
              {syncingStrava ? 'Syncing...' : 'Sync from Strava'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

