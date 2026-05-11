'use client';

import { useEffect, useState } from 'react';
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

interface NutritionDashboardProProps {
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

// SVG Donut Chart Component
function DonutChart({ data, size = 200 }: { data: Array<{ name: string; value: number; color: string }>; size?: number }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 20} fill="none" stroke="#E8E4DC" strokeWidth="30" />
      </svg>
    );
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2 - 10;
  const innerRadius = size / 2 - 50;

  let currentAngle = -Math.PI / 2;
  const paths = data.map((item) => {
    const percentage = item.value / total;
    const sliceAngle = percentage * 2 * Math.PI;

    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = centerX + outerRadius * Math.cos(startAngle);
    const y1 = centerY + outerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);

    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ');

    return (
      <path key={item.name} d={d} fill={item.color} style={{ transition: 'opacity 0.2s ease' }} />
    );
  });

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {paths}
    </svg>
  );
}

// Mini Bar Chart Component
function MiniBarChart({ data, height = 80 }: { data: Array<{ label: string; value: number; color: string }>; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: `${height}px`, gap: '4px', width: '100%' }}>
      {data.map((item) => (
        <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '100%',
              height: `${(item.value / max) * height}px`,
              backgroundColor: item.color,
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = item.color;
              (e.currentTarget as HTMLDivElement).style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = item.color;
              (e.currentTarget as HTMLDivElement).style.opacity = '1';
            }}
          />
          <span style={{ fontSize: '10px', color: '#999999', marginTop: '4px' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Advanced Progress Bar Component
function AdvancedProgressBar({
  value,
  max,
  color = '#8B7FB8',
  height = 6,
  label = ''
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  label?: string;
}) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {label}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#999999' }}>
            {Math.round(value)} / {Math.round(max)}
          </span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: '#E8E4DC',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: '4px',
            transition: 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
        {percentage > 0 && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: '2px',
              backgroundColor: color,
              opacity: 0.6,
            }}
          />
        )}
      </div>
    </div>
  );
}

export function NutritionDashboardPro({
  weekStart,
  onWeekChange,
  stravaCaloriesBurned = 0,
  isStravaConnected = false,
  onStravaSync,
}: NutritionDashboardProProps) {
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

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <WeekNavigator onWeekChange={onWeekChange} />
        {/* Skeleton loaders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{
              backgroundColor: '#F0EFE8',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '180px',
              animation: 'pulse 2s infinite'
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <WeekNavigator onWeekChange={onWeekChange} />
        <div style={{
          backgroundColor: '#FFEBEE',
          border: '1px solid #EF9A9A',
          borderRadius: '10px',
          padding: '16px',
          textAlign: 'center',
          color: '#C62828',
          fontSize: '14px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{error}</p>
          <p style={{ margin: '0', fontSize: '12px' }}>Please try refreshing or check your connection</p>
        </div>
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <WeekNavigator onWeekChange={onWeekChange} />
        <div style={{
          backgroundColor: '#F0EFE8',
          border: '1px solid #E8E4DC',
          borderRadius: '10px',
          padding: '16px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#999999'
        }}>
          <p style={{ margin: 0 }}>No nutrition data available for this week</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const today = new Date();
  const start = new Date(weekStart);
  const days = Math.min(7, Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));

  const totals = data?.totals;
  const goals = data?.goals;

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

  const avgConsumed = Math.round(totalConsumed / days);
  const avgBurned = Math.round(stravaCaloriesBurned / days);
  const dailyGoal = goals?.dailyCalories ?? 2000;
  const netPerDay = avgBurned - avgConsumed;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backgroundColor: '#8B7FB8',
      borderRadius: '24px',
      padding: '20px',
      minHeight: 'calc(100vh - 200px)',
      position: 'relative'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '200px',
        height: '200px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '150px',
        height: '150px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#FFFFFF',
            margin: '0 0 4px 0',
            letterSpacing: '-0.3px'
          }}>
            Weekly Summary
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: 0,
            lineHeight: '1.5'
          }}>
            Your nutrition breakdown and training metrics
          </p>
        </div>
      </div>

      {/* Week Navigator */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <WeekNavigator onWeekChange={onWeekChange} />
      </div>

      {/* 2-Column Grid for 6 Components */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Component 1: Macro Donut Chart */}
        {hasData && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = 'translateY(-4px) scale(1.02)';
              el.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.18)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = 'translateY(0) scale(1)';
              el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            }}
          >
            <p style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#2C2C2A',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: '0 0 12px 0'
            }}>
              Macro Split
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '160px' }}>
              <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <DonutChart data={donutData} size={140} />
                <div style={{
                  position: 'absolute',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <p style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#2C2C2A',
                    margin: 0,
                    lineHeight: 1
                  }}>
                    {totalConsumed}
                  </p>
                  <p style={{
                    fontSize: '10px',
                    color: '#999999',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>
                    kcal
                  </p>
                </div>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
              marginTop: '12px'
            }}>
              {[
                { label: 'Protein', value: Math.round(totals?.proteinConsumed ?? 0), color: '#8B7FB8', unit: 'g' },
                { label: 'Carbs', value: Math.round(totals?.carbsConsumed ?? 0), color: '#D67BB8', unit: 'g' },
                { label: 'Fat', value: Math.round(totals?.fatConsumed ?? 0), color: '#C9845F', unit: 'g' },
              ].map(({ label, value, color, unit }) => (
                <div key={label} style={{
                  backgroundColor: `${color}15`,
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center',
                  border: `1px solid ${color}30`
                }}>
                  <p style={{ fontSize: '10px', color: '#999999', margin: '0 0 2px 0' }}>{label}</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color, margin: 0 }}>{value}{unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Component 2: Daily Average Progress */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(-4px) scale(1.02)';
            el.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.18)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(0) scale(1)';
            el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#2C2C2A',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 12px 0'
          }}>
            Daily Average
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', lineHeight: 1 }}>
                  {avgConsumed}
                </span>
                <span style={{ fontSize: '13px', color: '#999999' }}>/ {dailyGoal}</span>
              </div>
              <AdvancedProgressBar
                value={avgConsumed}
                max={dailyGoal}
                color="#D67BB8"
                height={6}
              />
              <p style={{ fontSize: '11px', color: '#999999', margin: '8px 0 0 0' }}>kcal/day</p>
            </div>
          </div>
        </div>

        {/* Component 3: Protein Progress */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(-4px) scale(1.02)';
            el.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.18)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(0) scale(1)';
            el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#2C2C2A',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 12px 0'
          }}>
            Protein Goal
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#8B7FB8', lineHeight: 1 }}>
                  {Math.round(totals?.proteinConsumed ?? 0)}
                </span>
                <span style={{ fontSize: '13px', color: '#999999' }}>g</span>
              </div>
              <AdvancedProgressBar
                value={Math.round(totals?.proteinConsumed ?? 0)}
                max={(goals?.dailyProtein ?? 150) * days}
                color="#8B7FB8"
                height={6}
              />
              <p style={{ fontSize: '11px', color: '#999999', margin: '8px 0 0 0' }}>
                Goal: {Math.round((goals?.dailyProtein ?? 150) * days)}g
              </p>
            </div>
          </div>
        </div>

        {/* Component 4: Carbs Progress */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(-4px) scale(1.02)';
            el.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.18)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(0) scale(1)';
            el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#2C2C2A',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 12px 0'
          }}>
            Carbs Goal
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#D67BB8', lineHeight: 1 }}>
                  {Math.round(totals?.carbsConsumed ?? 0)}
                </span>
                <span style={{ fontSize: '13px', color: '#999999' }}>g</span>
              </div>
              <AdvancedProgressBar
                value={Math.round(totals?.carbsConsumed ?? 0)}
                max={(goals?.dailyCarbs ?? 300) * days}
                color="#D67BB8"
                height={6}
              />
              <p style={{ fontSize: '11px', color: '#999999', margin: '8px 0 0 0' }}>
                Goal: {Math.round((goals?.dailyCarbs ?? 300) * days)}g
              </p>
            </div>
          </div>
        </div>

        {/* Component 5: Fat Progress */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(-4px) scale(1.02)';
            el.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.18)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(0) scale(1)';
            el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#2C2C2A',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 12px 0'
          }}>
            Fat Goal
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#C9845F', lineHeight: 1 }}>
                  {Math.round(totals?.fatConsumed ?? 0)}
                </span>
                <span style={{ fontSize: '13px', color: '#999999' }}>g</span>
              </div>
              <AdvancedProgressBar
                value={Math.round(totals?.fatConsumed ?? 0)}
                max={(goals?.dailyFat ?? 80) * days}
                color="#C9845F"
                height={6}
              />
              <p style={{ fontSize: '11px', color: '#999999', margin: '8px 0 0 0' }}>
                Goal: {Math.round((goals?.dailyFat ?? 80) * days)}g
              </p>
            </div>
          </div>
        </div>

        {/* Component 6: Strava Integration (if connected) */}
        {isStravaConnected && stravaCaloriesBurned > 0 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = 'translateY(-4px) scale(1.02)';
              el.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.18)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = 'translateY(0) scale(1)';
              el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            }}
          >
            <p style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#2C2C2A',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: '0 0 12px 0'
            }}>
              Burned (Strava)
            </p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#5B7FD4',
                  margin: '0 0 12px 0',
                  lineHeight: 1
                }}>
                  {Math.round(stravaCaloriesBurned).toLocaleString()}
                </p>
                <p style={{ fontSize: '11px', color: '#999999', margin: 0 }}>
                  {avgBurned} / day avg
                </p>
              </div>
              {onStravaSync && (
                <button
                  onClick={async () => {
                    setSyncingStrava(true);
                    try {
                      await onStravaSync();
                    } finally {
                      setSyncingStrava(false);
                    }
                  }}
                  disabled={syncingStrava}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#5B7FD4',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: syncingStrava ? 'not-allowed' : 'pointer',
                    opacity: syncingStrava ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    marginTop: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (!syncingStrava) {
                      (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  {syncingStrava ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weekly Comparison Chart */}
      {weeklyChartData.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(-4px)';
            el.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.18)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#2C2C2A',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            margin: '0 0 16px 0'
          }}>
            4-Week Trend
          </p>
          <div style={{ height: '120px', marginBottom: '12px' }}>
            <MiniBarChart
              data={weeklyChartData.map((week) => ({
                label: week.label,
                value: isStravaConnected ? Math.max(week.consumed, week.burned) : week.consumed,
                color: isStravaConnected && week.burned > week.consumed ? '#5B7FD4' : '#D67BB8'
              }))}
              height={120}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#D67BB8' }} />
              <span style={{ color: '#999999' }}>Consumed</span>
            </div>
            {isStravaConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#5B7FD4' }} />
                <span style={{ color: '#999999' }}>Burned</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          [data-grid] {
            grid-template-columns: 1fr !important;
          }
        }

        /* 3D transform support */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Keyboard accessibility */
        [data-interactive]:focus-visible {
          outline: 2px solid #8B7FB8;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
