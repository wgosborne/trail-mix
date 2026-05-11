'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCached } from '@/lib/cache';

interface NutritionData {
  week: { start: string; end: string };
  totals: {
    proteinConsumed: number;
    carbsConsumed: number;
    fatConsumed: number;
  };
  goals: {
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
  };
}

export default function MacrosDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current week
    const date = new Date();
    const dayOfWeek = date.getUTCDay();
    const diff = date.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setUTCDate(diff));
    const weekStart = monday.toISOString().split('T')[0];

    const cached = getCached<NutritionData>(`nutrition_${weekStart}`);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Macro Details</h1>
        </div>
        <div style={{ textAlign: 'center', color: '#999999', paddingTop: '40px' }}>
          Loading...
        </div>
      </div>
    );
  }

  const { totals, goals } = data;
  const macros = [
    {
      label: 'Protein',
      value: Math.round(totals.proteinConsumed),
      goal: (goals.dailyProtein || 150) * 7,
      color: '#D67BB8',
      unit: 'g',
      caloriesPerUnit: 4
    },
    {
      label: 'Carbs',
      value: Math.round(totals.carbsConsumed),
      goal: (goals.dailyCarbs || 300) * 7,
      color: '#8B7FB8',
      unit: 'g',
      caloriesPerUnit: 4
    },
    {
      label: 'Fat',
      value: Math.round(totals.fatConsumed),
      goal: (goals.dailyFat || 80) * 7,
      color: '#FFD700',
      unit: 'g',
      caloriesPerUnit: 9
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Macro Details</h1>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {macros.map((macro) => {
          const percentage = Math.min(100, (macro.value / macro.goal) * 100);
          const calories = macro.value * macro.caloriesPerUnit;

          return (
            <div
              key={macro.label}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                border: `2px solid ${macro.color}30`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    backgroundColor: macro.color
                  }}
                />
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2C2C2A', margin: 0 }}>
                  {macro.label}
                </h2>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 700, color: macro.color, lineHeight: 1 }}>
                    {macro.value}
                  </span>
                  <span style={{ fontSize: '14px', color: '#999999', alignSelf: 'flex-end' }}>
                    / {Math.round(macro.goal)} {macro.unit}
                  </span>
                </div>

                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#E8E4DC',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: macro.color,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#999999' }}>
                    {percentage.toFixed(0)}% of goal
                  </span>
                  <span style={{ fontSize: '12px', color: '#999999' }}>
                    {calories} kcal
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div
        style={{
          marginTop: '24px',
          backgroundColor: '#8B7FB8',
          borderRadius: '16px',
          padding: '20px',
          color: '#FFFFFF'
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0' }}>Weekly Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {macros.map((macro) => {
            const calories = macro.value * macro.caloriesPerUnit;
            const totalCalories = totals.proteinConsumed * 4 + totals.carbsConsumed * 4 + totals.fatConsumed * 9;
            const percentage = totalCalories > 0 ? ((calories / totalCalories) * 100) : 0;

            return (
              <div key={macro.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 4px 0' }}>
                  {macro.label}
                </p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>
                  {percentage.toFixed(0)}%
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                  {calories} kcal
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
