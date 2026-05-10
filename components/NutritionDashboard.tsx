'use client';

import { useEffect, useState } from 'react';
import { WeekNavigator } from './WeekNavigator';

interface NutritionData {
  week: {
    start: string;
    end: string;
  };
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

interface NutritionDashboardProps {
  weekStart: string;
  onWeekChange: (week: string) => void;
  stravaCaloriesBurned?: number;
}

export function NutritionDashboard({
  weekStart,
  onWeekChange,
  stravaCaloriesBurned = 0,
}: NutritionDashboardProps) {
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNutrition() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/nutrition?week=${weekStart}`);

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please sign in to view nutrition data');
          } else {
            setError('Failed to load nutrition data');
          }
          setData(null);
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Nutrition fetch error:', err);
        setError('Failed to load nutrition data');
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchNutrition();
  }, [weekStart]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading nutrition data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-600">No nutrition data available for this week</p>
      </div>
    );
  }

  const weeklyGoal = data.goals.dailyCalories * 7;
  const calorieDeficit = stravaCaloriesBurned - data.totals.caloriesConsumed;

  return (
    <div className="space-y-4">
      <WeekNavigator onWeekChange={onWeekChange} />

      {/* Strava Calories */}
      <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
        <p className="text-sm text-gray-600">Calories Burned (Strava)</p>
        <p className="text-3xl font-bold text-blue-600">{Math.round(stravaCaloriesBurned)}</p>
        <p className="text-xs text-gray-500 mt-1">±25-50% margin of error</p>
      </div>

      {/* Consumed Macros */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <p className="font-medium mb-4 text-gray-900">Macros Consumed This Week</p>

        <div className="space-y-3">
          <MacroBar
            label="Protein"
            value={Math.round(data.totals.proteinConsumed)}
            goal={data.goals.dailyProtein * 7}
            unit="g"
          />
          <MacroBar
            label="Carbs"
            value={Math.round(data.totals.carbsConsumed)}
            goal={data.goals.dailyCarbs * 7}
            unit="g"
          />
          <MacroBar
            label="Fat"
            value={Math.round(data.totals.fatConsumed)}
            goal={data.goals.dailyFat * 7}
            unit="g"
          />
          <MacroBar
            label="Calories"
            value={Math.round(data.totals.caloriesConsumed)}
            goal={weeklyGoal}
            unit="cal"
          />
        </div>
      </div>

      {/* Weekly Alignment */}
      <div
        className={`p-4 rounded-lg shadow border ${
          calorieDeficit > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-orange-50 border-orange-200'
        }`}
      >
        <p className="text-sm text-gray-600">Weekly Alignment</p>
        <p
          className={`text-2xl font-bold mt-1 ${
            calorieDeficit > 0 ? 'text-green-600' : 'text-orange-600'
          }`}
        >
          {calorieDeficit > 0 ? '+' : ''}{Math.round(calorieDeficit)} cal
        </p>
        <p className="text-sm text-gray-600 mt-2">
          {calorieDeficit > 0
            ? 'You ate less than you burned'
            : 'You burned more than you ate'}
        </p>
      </div>
    </div>
  );
}

/**
 * MacroBar component - displays individual macro progress with color coding
 * Green: >= 100% of goal
 * Blue: >= 80% of goal
 * Yellow: < 80% of goal
 */
function MacroBar({
  label,
  value,
  goal,
  unit,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
}) {
  const percent = (value / goal) * 100;
  const displayPercent = Math.min(percent, 100);

  let barColor = 'bg-yellow-500';
  if (percent >= 100) {
    barColor = 'bg-green-500';
  } else if (percent >= 80) {
    barColor = 'bg-blue-500';
  }

  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-600">
          {value}/{Math.round(goal)} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      {percent > 100 && (
        <p className="text-xs text-green-600 mt-1 font-medium">
          +{Math.round(percent - 100)}% above goal
        </p>
      )}
    </div>
  );
}
