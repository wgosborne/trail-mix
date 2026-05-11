'use client';

import { useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
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

// SVG Donut Chart Component - Simplified with drop-shadow only
function DonutChart({ data, size = 100 }: { data: Array<{ name: string; value: number; color: string }>; size?: number }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <svg width={size} height={size} style={{ display: 'block', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="none" stroke="#E8E4DC" strokeWidth="12" />
      </svg>
    );
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = size / 2 - 20;

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
    <svg width={size} height={size} style={{ display: 'block', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>
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

// Card Wrapper with 3D Depth
const DashboardCard = memo(function DashboardCard({
  children,
  onClick
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '18px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-6px)';
        el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.15), 0 20px 44px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)';
      }}
    >
      {children}
    </div>
  );
});

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
  const router = useRouter();
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
    { name: 'Protein', value: proteinCal, color: '#D67BB8' },
    { name: 'Carbs', value: carbsCal, color: '#8B7FB8' },
    { name: 'Fat', value: fatCal, color: '#FFD700' },
  ];

  const avgConsumed = Math.round(totalConsumed / days);
  const avgBurned = Math.round(stravaCaloriesBurned / days);
  const dailyGoal = goals?.dailyCalories ?? 2000;
  const netPerDay = avgBurned - avgConsumed;

  // Helper to format date range
  const formatDateRange = (weekStart: string) => {
    const start = new Date(weekStart + 'T00:00:00Z');
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);

    const monthStart = start.getUTCMonth() + 1;
    const dayStart = start.getUTCDate();
    const monthEnd = end.getUTCMonth() + 1;
    const dayEnd = end.getUTCDate();

    if (monthStart === monthEnd) {
      return `${monthStart}/${dayStart} - ${dayEnd}`;
    }
    return `${monthStart}/${dayStart} - ${monthEnd}/${dayEnd}`;
  };

  // Calculate deficit/surplus
  const deficit = Math.round(stravaCaloriesBurned - totalConsumed);
  const isOnTrack = deficit >= -500; // within reasonable range

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      backgroundColor: '#8B7FB8',
      borderRadius: '24px',
      padding: '20px',
      minHeight: 'calc(100vh - 200px)',
      position: 'relative',
      maxWidth: '340px',
      margin: '0 auto'
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

      {/* Header with title and date range */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '4px' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#FFFFFF',
          margin: '0 0 4px 0',
          letterSpacing: '-0.3px'
        }}>
          Trail Mix
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.9)',
          margin: 0,
          lineHeight: '1.5'
        }}>
          {formatDateRange(weekStart)}
        </p>
      </div>

      {/* Week Navigator */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '4px' }}>
        <WeekNavigator onWeekChange={onWeekChange} />
      </div>

      {/* Main Layout: Donut + Stacked Cards */}
      {hasData && (
        <>
          {/* Macro Circle Card - Floating Element */}
          <DashboardCard onClick={() => router.push('/metrics/macros')}>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#999999',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: '0 0 12px 0',
              textAlign: 'center'
            }}>
              Macro Split
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                <DonutChart data={donutData} size={100} />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <p style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#2C2C2A',
                    margin: 0,
                    lineHeight: 1
                  }}>
                    P:C:F
                  </p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {[
                { label: 'Protein', color: '#FFB6C1' },
                { label: 'Carbs', color: '#DDA0DD' },
                { label: 'Fat', color: '#FFD700' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#999999' }}>{label}</span>
                </div>
              ))}
            </div>
          </DashboardCard>

          {/* Card: Avg Calories */}
          <DashboardCard onClick={() => router.push('/metrics/calories')}>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#999999',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: '0 0 8px 0'
            }}>
              Avg. Calories
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#2C2C2A',
              margin: '0 0 8px 0',
              lineHeight: 1
            }}>
              {avgConsumed}
            </p>
            <p style={{
              fontSize: '12px',
              color: '#999999',
              margin: '0 0 12px 0'
            }}>
              kcal per day
            </p>
            <div style={{ height: '40px' }}>
              <MiniBarChart
                data={weeklyChartData.slice(0, 7).map((week) => ({
                  label: week.label,
                  value: week.consumed,
                  color: '#8B7FB8'
                }))}
                height={40}
              />
            </div>
          </DashboardCard>

          {/* Card: Weekly Deficit */}
          <DashboardCard onClick={() => router.push('/metrics/deficit')}>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#999999',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: '0 0 8px 0'
            }}>
              Weekly Deficit
            </p>
            <p style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#2C2C2A',
              margin: '0 0 8px 0',
              lineHeight: 1
            }}>
              {deficit > 0 ? '+' : ''}{(deficit / 1000).toFixed(1)}K
            </p>
            <p style={{
              fontSize: '12px',
              color: '#999999',
              margin: '0 0 12px 0'
            }}>
              calories on pace
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isOnTrack ? '#D4F1E4' : '#FFE5E5',
              borderRadius: '6px',
              padding: '6px 12px'
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isOnTrack ? '#0F6E56' : '#FF6B6B'
              }}>
                {isOnTrack ? '✓ On track' : '⚠ Needs work'}
              </span>
            </div>
          </DashboardCard>

          {/* Card: Macros vs Goal - Grid Layout */}
          <DashboardCard onClick={() => router.push('/metrics/macros')}>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#999999',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: '0 0 12px 0'
            }}>
              Macros vs Goal
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px'
            }}>
              {[
                { label: 'Protein', value: Math.round(totals?.proteinConsumed ?? 0), goal: (goals?.dailyProtein ?? 150) * days, color: '#FFB6C1', unit: 'g' },
                { label: 'Carbs', value: Math.round(totals?.carbsConsumed ?? 0), goal: (goals?.dailyCarbs ?? 300) * days, color: '#DDA0DD', unit: 'g' },
                { label: 'Fat', value: Math.round(totals?.fatConsumed ?? 0), goal: (goals?.dailyFat ?? 80) * days, color: '#FFD700', unit: 'g' },
              ].map(({ label, value, goal, color, unit }) => (
                <div key={label} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'center',
                  padding: '10px',
                  backgroundColor: '#F8F7FB',
                  borderRadius: '8px'
                }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#2C2C2A', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: color, margin: 0 }}>{value}{unit}</p>
                  <p style={{ fontSize: '10px', color: '#999999', margin: 0 }}>of {Math.round(goal)}{unit}</p>
                </div>
              ))}
            </div>

            {/* Calorie Comparison Section */}
            <div style={{
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '1px solid #E8E4DC'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#999999' }}>Consumed</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A' }}>{totalConsumed} cal</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#999999' }}>Daily Goal</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A' }}>{dailyGoal} cal</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                backgroundColor: 'linear-gradient(90deg, #F0EFE8 0%, #D4F1E4 100%)',
                borderRadius: '6px',
                padding: '8px 10px',
                marginTop: '4px'
              }}>
                <span style={{ fontSize: '11px', color: '#999999' }}>Remaining</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F6E56' }}>{Math.max(0, dailyGoal - (totalConsumed / days))} cal</span>
              </div>
            </div>
          </DashboardCard>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 640px) {
          [data-container] {
            max-width: 100vw !important;
          }
        }

        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        [data-interactive]:focus-visible {
          outline: 2px solid #8B7FB8;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
