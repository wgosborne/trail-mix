'use client';

import { useEffect, useState } from 'react';
import { WeekNavigator } from './WeekNavigator';

interface NutritionData {
  totals: {
    caloriesBought: number;
    caloriesConsumed: number;
    proteinConsumed: number;
    carbsConsumed: number;
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

  useEffect(() => {
    async function fetchNutrition() {
      try {
        const response = await fetch(`/api/nutrition?week=${weekStart}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Fetch error:', error);
      }
      setLoading(false);
    }

    fetchNutrition();
  }, [weekStart]);

  if (loading) return <p>Loading...</p>;
  if (!data) return <p>Failed to load nutrition data</p>;

  const weeklyGoal = data.goals.dailyCalories * 7;
  const calorieDeficit = stravaCaloriesBurned - data.totals.caloriesConsumed;

  return (
    <div>
      <WeekNavigator onWeekChange={onWeekChange} />

      {/* Strava Calories */}
      <div className="bg-blue-50 p-4 rounded-lg shadow mb-4 border border-blue-200">
        <p className="text-sm text-gray-600">Calories Burned (Strava)</p>
        <p className="text-3xl font-bold text-blue-600">{Math.round(stravaCaloriesBurned)}</p>
        <p className="text-xs text-gray-500 mt-1">±25-50% margin of error</p>
      </div>

      {/* Consumed Macros */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <p className="font-medium mb-3">Macros Consumed This Week</p>

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

      {/* Alignment */}
      <div className={`p-4 rounded-lg shadow ${calorieDeficit > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <p className="text-sm text-gray-600">Weekly Alignment</p>
        <p className={`text-2xl font-bold ${calorieDeficit > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
          {calorieDeficit > 0 ? '+' : ''}{Math.round(calorieDeficit)} cal
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {calorieDeficit > 0 ? 'Surplus' : 'Deficit'} (you {calorieDeficit > 0 ? 'ate less than' : 'burned more than'} you burned)
        </p>
      </div>
    </div>
  );
}

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
  const percent = Math.min((value / goal) * 100, 100);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{value}/{Math.round(goal)} {unit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percent >= 100 ? 'bg-green-600' : percent >= 80 ? 'bg-blue-600' : 'bg-yellow-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
