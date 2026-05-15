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
    caloriesConsumed: number;
  };
  goals: {
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
  };
}

interface Grocery {
  id: string;
  foodName: string;
  quantityBought: number;
  unit: string;
  percentConsumed: number;
  totalCalories: number | null;
  weekStart: string;
}

export default function MacrosDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<NutritionData | null>(null);
  const [groceries, setGroceries] = useState<Grocery[]>([]);
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

    // Fetch from API if not cached
    Promise.all([
      fetch(`/api/nutrition?week=${weekStart}`).then((res) => res.json()),
      fetch(`/api/groceries`).then((res) => res.json()),
    ])
      .then(([nutritionResult, groceriesResult]) => {
        setData(nutritionResult);
        setGroceries(groceriesResult);
        setLoading(false);
      })
      .catch(() => {
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
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {macros.map((macro) => {
          const percentage = Math.min(100, (macro.value / macro.goal) * 100);
          const calories = macro.value * macro.caloriesPerUnit;

          const bgColors = {
            'Protein': '#FFE8F5',
            'Carbs': '#F0E8FF',
            'Fat': '#FFFEF0'
          };

          return (
            <div
              key={macro.label}
              style={{
                backgroundColor: bgColors[macro.label as keyof typeof bgColors] || '#FFFFFF',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                border: `1px solid ${macro.color}30`
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#2C2C2A', margin: 0, marginBottom: '4px' }}>
                  {macro.label}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: macro.color, lineHeight: 1 }}>
                    {macro.value}
                  </span>
                  <span style={{ fontSize: '10px', color: '#999999' }}>
                    / {Math.round(macro.goal)} {macro.unit}
                  </span>
                </div>
              </div>

              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#E8E4DC',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '6px'
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: macro.color,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', color: '#999999' }}>
                  {percentage.toFixed(0)}%
                </span>
                <span style={{ fontSize: '9px', color: '#999999' }}>
                  {calories} kcal
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Food Intake Breakdown */}
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2A', margin: '0 0 12px 0' }}>
          Food Intake ({Math.round(data.totals.caloriesConsumed)} cal)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {groceries.filter(g => {
            const weekStart = new Date();
            const dayOfWeek = weekStart.getUTCDay();
            const diff = weekStart.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(weekStart.setUTCDate(diff));
            const currentWeekStart = monday.toISOString().split('T')[0];
            return g.weekStart === currentWeekStart && g.percentConsumed > 0;
          })
            .sort((a, b) => {
              const calA = (a.totalCalories || 0) * (a.percentConsumed / 100);
              const calB = (b.totalCalories || 0) * (b.percentConsumed / 100);
              return calB - calA;
            })
            .map((g) => {
              const consumedCals = (g.totalCalories || 0) * (g.percentConsumed / 100);
              return (
                <div
                  key={g.id}
                  style={{
                    backgroundColor: '#F8F5FF',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    borderLeft: '3px solid #8B7FB8'
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#2C2C2A', margin: '0 0 4px 0' }}>
                    {g.foodName} • {g.percentConsumed.toFixed(0)}%
                  </p>
                  <p style={{ color: '#999999', margin: 0 }}>
                    {consumedCals.toFixed(0)} cal • {g.quantityBought} {g.unit}
                  </p>
                </div>
              );
            })
            .slice(0, 10)}

          {groceries.filter(g => {
            const weekStart = new Date();
            const dayOfWeek = weekStart.getUTCDay();
            const diff = weekStart.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(weekStart.setUTCDate(diff));
            const currentWeekStart = monday.toISOString().split('T')[0];
            return g.weekStart === currentWeekStart && g.percentConsumed > 0;
          }).length === 0 && (
            <p style={{ fontSize: '13px', color: '#999999', textAlign: 'center', marginTop: '12px' }}>
              No foods consumed this week
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
