'use client';

import { useState } from 'react';

interface GroceryFormProps {
  onSubmit: (grocery: any) => void;
  loading?: boolean;
}

export function GroceryForm({ onSubmit, loading }: GroceryFormProps) {
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!foodName.trim()) {
      newErrors.foodName = 'Food name is required';
    }

    const qty = parseFloat(quantity);
    if (!quantity || qty <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (!calories || parseFloat(calories) < 0) {
      newErrors.calories = 'Calories is required';
    }

    if (!protein || parseFloat(protein) < 0) {
      newErrors.protein = 'Protein is required';
    }

    if (!carbs || parseFloat(carbs) < 0) {
      newErrors.carbs = 'Carbs is required';
    }

    if (!fat || parseFloat(fat) < 0) {
      newErrors.fat = 'Fat is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      foodName: foodName.trim(),
      quantityBought: parseFloat(quantity),
      unit,
      nutrition: {
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        carbs: parseFloat(carbs),
        fat: parseFloat(fat),
      },
      percentConsumed: 0,
      dateAdded: new Date().toISOString().split('T')[0],
      weekStart: getWeekStart(),
    });

    // Clear form
    setFoodName('');
    setQuantity('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setErrors({});
  }

  function getWeekStart(date: Date = new Date()): string {
    const d = new Date(date);
    const dayOfWeek = d.getUTCDay();
    const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d.setUTCDate(diff));
    return monday.toISOString().split('T')[0];
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-4">
      <h2 className="text-lg font-semibold mb-4">Add Grocery Item</h2>
      <div className="space-y-3">
        {/* Food Name */}
        <div>
          <input
            type="text"
            placeholder="Food name (e.g., Chicken Breast)"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.foodName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.foodName && <p className="text-red-500 text-sm mt-1">{errors.foodName}</p>}
        </div>

        {/* Quantity */}
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              step="0.1"
            />
            {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
          </div>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option>lbs</option>
            <option>oz</option>
            <option>g</option>
            <option>count</option>
            <option>cups</option>
          </select>
        </div>

        {/* Nutrition Fields */}
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Nutrition (per serving)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                placeholder="Calories"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded ${
                  errors.calories ? 'border-red-500' : 'border-gray-300'
                }`}
                step="0.1"
              />
              {errors.calories && <p className="text-red-500 text-xs mt-1">{errors.calories}</p>}
            </div>
            <div>
              <input
                type="number"
                placeholder="Protein (g)"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded ${
                  errors.protein ? 'border-red-500' : 'border-gray-300'
                }`}
                step="0.1"
              />
              {errors.protein && <p className="text-red-500 text-xs mt-1">{errors.protein}</p>}
            </div>
            <div>
              <input
                type="number"
                placeholder="Carbs (g)"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded ${
                  errors.carbs ? 'border-red-500' : 'border-gray-300'
                }`}
                step="0.1"
              />
              {errors.carbs && <p className="text-red-500 text-xs mt-1">{errors.carbs}</p>}
            </div>
            <div>
              <input
                type="number"
                placeholder="Fat (g)"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded ${
                  errors.fat ? 'border-red-500' : 'border-gray-300'
                }`}
                step="0.1"
              />
              {errors.fat && <p className="text-red-500 text-xs mt-1">{errors.fat}</p>}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg font-medium transition ${
            hasErrors
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
          }`}
        >
          {loading ? 'Adding...' : 'Add Grocery'}
        </button>
      </div>
    </form>
  );
}
