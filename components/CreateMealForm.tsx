'use client';

import { useState, useEffect } from 'react';
import { showSuccess, showError } from '@/lib/toast';

interface Grocery {
  id: string;
  foodName: string;
  unit: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MealIngredient {
  groceryId: string;
  groceryName: string;
  quantity: number;
  unit: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface CreateMealFormProps {
  weekStart: string;
  editingMealId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function CreateMealForm({
  weekStart,
  editingMealId,
  onSaved,
  onCancel,
}: CreateMealFormProps) {
  const [mealName, setMealName] = useState('');
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch groceries on mount and when weekStart changes
  useEffect(() => {
    fetchGroceries();
  }, [weekStart]);

  // If editing, load existing meal data
  useEffect(() => {
    if (editingMealId) {
      loadMealForEditing();
    }
  }, [editingMealId]);

  const fetchGroceries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/groceries?week=${weekStart}`);
      if (!response.ok) throw new Error('Failed to fetch groceries');
      const data = await response.json();
      setGroceries(data.groceries || []);
    } catch (err) {
      console.error('Error fetching groceries:', err);
      setError('Failed to load groceries');
    } finally {
      setLoading(false);
    }
  };

  const loadMealForEditing = async () => {
    if (!editingMealId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/meals/${editingMealId}`);
      if (!response.ok) throw new Error('Failed to fetch meal');
      const data = await response.json();
      const meal = data.meal;
      setMealName(meal.name);
      setIngredients(meal.ingredients || []);
    } catch (err) {
      console.error('Error loading meal:', err);
      showError('Failed to load meal for editing');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = (grocery: Grocery) => {
    // Check if already added
    if (ingredients.some((ing) => ing.groceryId === grocery.id)) {
      showError(`${grocery.foodName} already added`);
      return;
    }

    setIngredients([
      ...ingredients,
      {
        groceryId: grocery.id,
        groceryName: grocery.foodName,
        quantity: 1,
        unit: grocery.unit,
        nutrition: { ...grocery.nutrition },
      },
    ]);
    setSearchTerm('');
  };

  const removeIngredient = (groceryId: string) => {
    setIngredients(ingredients.filter((ing) => ing.groceryId !== groceryId));
  };

  const updateIngredientQuantity = (groceryId: string, newQuantity: number) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.groceryId === groceryId
          ? { ...ing, quantity: newQuantity }
          : ing
      )
    );
  };

  // Calculate total nutrition
  const totalNutrition = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.nutrition.calories * ing.quantity,
      protein: acc.protein + ing.nutrition.protein * ing.quantity,
      carbs: acc.carbs + ing.nutrition.carbs * ing.quantity,
      fat: acc.fat + ing.nutrition.fat * ing.quantity,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleSave = async () => {
    // Validation
    if (!mealName.trim()) {
      setError('Please enter a meal name');
      return;
    }

    if (ingredients.length === 0) {
      setError('Please add at least one ingredient');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const method = editingMealId ? 'PUT' : 'POST';
      const url = editingMealId
        ? `/api/meals/${editingMealId}`
        : `/api/meals`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mealName.trim(),
          ingredients: ingredients.map((ing) => ({
            groceryId: ing.groceryId,
            quantity: ing.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save meal');
      }

      showSuccess(
        editingMealId
          ? `Updated "${mealName}"`
          : `Created "${mealName}" meal`
      );
      onSaved();
    } catch (err) {
      console.error('Error saving meal:', err);
      setError(err instanceof Error ? err.message : 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  };

  const filteredGroceries = groceries.filter(
    (g) =>
      g.foodName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !ingredients.some((ing) => ing.groceryId === g.id)
  );

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#F8F5FF',
        border: '1px solid #E8E4DC',
        borderRadius: '10px',
        padding: '16px',
        textAlign: 'center',
        color: '#999999'
      }}>
        Loading groceries...
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#F8F5FF',
        border: '1px solid #E8E4DC',
        borderRadius: '10px',
        padding: '16px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ height: '3px', width: '24px', background: '#8B7FB8' }} />
        <h2 style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#2C2C2A',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          margin: 0
        }}>
          {editingMealId ? 'Edit Meal' : 'Create Meal'}
        </h2>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FFE8E8',
          border: '1px solid #D67BB8',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <p style={{ fontSize: '12px', color: '#D67BB8', fontWeight: 600, margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Meal Name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: '#2C2C2A',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.4px'
        }}>
          Meal Name
        </label>
        <input
          type="text"
          value={mealName}
          onChange={(e) => {
            setMealName(e.target.value);
            setError(null);
          }}
          placeholder="e.g., Protein Smoothie"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #E8E4DC',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2C2C2A',
            outline: 'none',
            boxSizing: 'border-box',
            minHeight: '44px',
          }}
        />
      </div>

      {/* Search and Add Groceries */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: '#2C2C2A',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.4px'
        }}>
          Add Ingredients
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search groceries..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #E8E4DC',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2C2C2A',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '8px',
            minHeight: '44px',
          }}
        />

        {/* Dropdown of matching groceries */}
        {searchTerm && filteredGroceries.length > 0 && (
          <div style={{
            border: '1px solid #E8E4DC',
            borderRadius: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF'
          }}>
            {filteredGroceries.slice(0, 8).map((grocery) => (
              <button
                key={grocery.id}
                onClick={() => addIngredient(grocery)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderBottom: '1px solid #E8E4DC',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#2C2C2A',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F8FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                {grocery.foodName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Ingredients */}
      {ingredients.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: '#2C2C2A',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px'
          }}>
            Selected Ingredients ({ingredients.length})
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ingredients.map((ing) => (
              <div
                key={ing.groceryId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8E4DC',
                  borderRadius: '6px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#2C2C2A', margin: '0 0 4px 0' }}>
                    {ing.groceryName}
                  </p>
                  <p style={{ fontSize: '11px', color: '#999999', margin: 0 }}>
                    {ing.nutrition.calories.toFixed(0)} cal | {ing.nutrition.protein.toFixed(1)}g P | {ing.nutrition.carbs.toFixed(1)}g C | {ing.nutrition.fat.toFixed(1)}g F
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={ing.quantity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        updateIngredientQuantity(ing.groceryId, val);
                      }
                    }}
                    style={{
                      width: '50px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #E8E4DC',
                      fontSize: '12px',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#999999', minWidth: '32px' }}>
                    {ing.unit}
                  </span>
                  <button
                    onClick={() => removeIngredient(ing.groceryId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D67BB8',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 6px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running Total Nutrition */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
        gap: '8px'
      }}>
        {/* Calories */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, color: '#5B7FD4', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Cal
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2A', margin: 0 }}>
            {Math.round(totalNutrition.calories)}
          </p>
        </div>

        {/* Protein */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, color: '#8B7FB8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Protein
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2A', margin: 0 }}>
            {totalNutrition.protein.toFixed(1)}g
          </p>
        </div>

        {/* Carbs */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, color: '#D67BB8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Carbs
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2A', margin: 0 }}>
            {totalNutrition.carbs.toFixed(1)}g
          </p>
        </div>

        {/* Fat */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, color: '#C9845F', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Fat
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2A', margin: 0 }}>
            {totalNutrition.fat.toFixed(1)}g
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            flex: 1,
            padding: '12px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E4DC',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#2C2C2A',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s',
            minHeight: '44px'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || ingredients.length === 0}
          style={{
            flex: 1,
            padding: '12px 16px',
            backgroundColor: '#8B7FB8',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: saving || ingredients.length === 0 ? 'not-allowed' : 'pointer',
            opacity: saving || ingredients.length === 0 ? 0.6 : 1,
            transition: 'all 0.2s',
            minHeight: '44px'
          }}
          onMouseEnter={(e) => {
            if (!saving && ingredients.length > 0) {
              e.currentTarget.style.backgroundColor = '#7A6FA7';
            }
          }}
          onMouseLeave={(e) => {
            if (!saving && ingredients.length > 0) {
              e.currentTarget.style.backgroundColor = '#8B7FB8';
            }
          }}
        >
          {saving ? 'Saving...' : editingMealId ? 'Update Meal' : 'Create Meal'}
        </button>
      </div>
    </div>
  );
}
