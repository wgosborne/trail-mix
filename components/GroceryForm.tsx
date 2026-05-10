'use client';

import { useState } from 'react';
import { NutritionSearch } from './NutritionSearch';

interface GroceryFormProps {
  onSubmit: (grocery: any) => void;
  loading?: boolean;
}

interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function GroceryForm({ onSubmit, loading }: GroceryFormProps) {
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [showNutritionSearch, setShowNutritionSearch] = useState(false);
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

  function handleNutritionSelected(nutrition: Nutrition) {
    setCalories(nutrition.calories.toString());
    setProtein(nutrition.protein.toString());
    setCarbs(nutrition.carbs.toString());
    setFat(nutrition.fat.toString());
    setShowNutritionSearch(false);
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Nutrition Search Component */}
      {showNutritionSearch && (
        <div style={{
          backgroundColor: '#F5F8FF',
          border: '1px solid #E8E4DC',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#2C2C2A' }}>SEARCH NUTRITION DATABASE</h3>
            <button
              type="button"
              onClick={() => setShowNutritionSearch(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#5B7FD4',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Close
            </button>
          </div>
          <NutritionSearch onSelect={handleNutritionSelected} />
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: '10px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div
            style={{
              height: '3px',
              width: '24px',
              background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)'
            }}
          />
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Add Grocery</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Food Name */}
          <div>
            <input
              type="text"
              placeholder="Food name"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.foodName ? '#D67BB8' : '#E8E4DC'}`,
                borderRadius: '8px',
                fontSize: '13px',
                color: '#2C2C2A',
                backgroundColor: '#FFFFFF'
              }}
            />
            {errors.foodName && <p style={{ color: '#D67BB8', fontSize: '11px', marginTop: '4px' }}>{errors.foodName}</p>}
          </div>

          {/* Quantity */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${errors.quantity ? '#D67BB8' : '#E8E4DC'}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#2C2C2A',
                  backgroundColor: '#FFFFFF'
                }}
                step="0.1"
              />
              {errors.quantity && <p style={{ color: '#D67BB8', fontSize: '11px', marginTop: '4px' }}>{errors.quantity}</p>}
            </div>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #E8E4DC',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#2C2C2A',
                backgroundColor: '#FFFFFF',
                minWidth: '100px',
                cursor: 'pointer'
              }}
            >
              <option>lbs</option>
              <option>oz</option>
              <option>g</option>
              <option>count</option>
              <option>cups</option>
            </select>
          </div>

          {/* Nutrition Fields */}
          <div style={{
            backgroundColor: '#F0EFE8',
            border: '1px solid #E8E4DC',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Nutrition per item</p>
              <button
                type="button"
                onClick={() => setShowNutritionSearch(!showNutritionSearch)}
                style={{
                  fontSize: '11px',
                  padding: '6px 10px',
                  backgroundColor: '#5B7FD4',
                  color: '#FFFFFF',
                  border: '1px solid #5B7FD4',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {showNutritionSearch ? 'Hide' : 'Search'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <div>
                <input
                  type="number"
                  placeholder="Calories"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: `1px solid ${errors.calories ? '#D67BB8' : '#E8E4DC'}`,
                    borderRadius: '6px',
                    color: '#2C2C2A',
                    backgroundColor: '#FFFFFF'
                  }}
                  step="0.1"
                />
                {errors.calories && <p style={{ color: '#D67BB8', fontSize: '10px', marginTop: '2px' }}>{errors.calories}</p>}
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Protein (g)"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: `1px solid ${errors.protein ? '#D67BB8' : '#E8E4DC'}`,
                    borderRadius: '6px',
                    color: '#2C2C2A',
                    backgroundColor: '#FFFFFF'
                  }}
                  step="0.1"
                />
                {errors.protein && <p style={{ color: '#D67BB8', fontSize: '10px', marginTop: '2px' }}>{errors.protein}</p>}
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Carbs (g)"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: `1px solid ${errors.carbs ? '#D67BB8' : '#E8E4DC'}`,
                    borderRadius: '6px',
                    color: '#2C2C2A',
                    backgroundColor: '#FFFFFF'
                  }}
                  step="0.1"
                />
                {errors.carbs && <p style={{ color: '#D67BB8', fontSize: '10px', marginTop: '2px' }}>{errors.carbs}</p>}
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Fat (g)"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: `1px solid ${errors.fat ? '#D67BB8' : '#E8E4DC'}`,
                    borderRadius: '6px',
                    color: '#2C2C2A',
                    backgroundColor: '#FFFFFF'
                  }}
                  step="0.1"
                />
                {errors.fat && <p style={{ color: '#D67BB8', fontSize: '10px', marginTop: '2px' }}>{errors.fat}</p>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: '1px solid #8B7FB8',
              backgroundColor: hasErrors ? '#F0EFE8' : '#8B7FB8',
              color: hasErrors ? '#999999' : '#FFFFFF',
              cursor: hasErrors ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Adding...' : 'Add Grocery'}
          </button>
        </div>
      </form>
    </div>
  );
}
