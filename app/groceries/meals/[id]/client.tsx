'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { showSuccess, showError } from '@/lib/toast';
import { MealBuilder } from '@/components/MealBuilder';

interface FetchedMeal {
  id: string;
  mealName: string;
  description: string | null;
  ingredients: Array<{
    groceryId: string;
    quantityUsed: number;
    grocery: {
      id: string;
      foodName: string;
      unit: string;
      quantityBought: number;
      totalCalories: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
    };
  }>;
}

export default function MealDetailsClient({ weekStart }: { weekStart: string }) {
  const router = useRouter();
  const params = useParams();
  const mealId = params.id as string;
  const [meal, setMeal] = useState<FetchedMeal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeal = async () => {
      try {
        const response = await fetch(`/api/meals/${mealId}`);
        if (!response.ok) throw new Error('Failed to fetch meal');
        const data = await response.json();
        setMeal(data);
      } catch (error) {
        console.error('Error fetching meal:', error);
        showError('Failed to load meal details');
        router.push('/groceries?tab=meals');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMeal();
  }, [mealId, router]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!meal) {
    return <div>Meal not found</div>;
  }

  return <MealEditor meal={meal} weekStart={weekStart} />;
}

function MealEditor({ meal, weekStart }: { meal: FetchedMeal; weekStart: string }) {
  const router = useRouter();
  const [mealName, setMealName] = useState(meal.mealName);
  const [notes, setNotes] = useState(meal.description || '');
  const [ingredients, setIngredients] = useState(meal.ingredients);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState<any[]>([]);
  const [apiSearchLoading, setApiSearchLoading] = useState(false);
  const [showApiSearch, setShowApiSearch] = useState(false);
  const [allGroceries, setAllGroceries] = useState<any[]>([]);

  useEffect(() => {
    const fetchGroceries = async () => {
      try {
        const response = await fetch(`/api/groceries?weekStart=${weekStart}`);
        if (!response.ok) throw new Error('Failed to fetch groceries');
        const data = await response.json();
        setAllGroceries(Array.isArray(data) ? data : data.groceries || []);
      } catch (error) {
        console.error('Error fetching groceries:', error);
      }
    };
    fetchGroceries();
  }, [weekStart]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allGroceries
      .filter(g => g.foodName.toLowerCase().includes(query) && !ingredients.some(i => i.groceryId === g.id))
      .slice(0, 6);
  }, [searchQuery, allGroceries, ingredients]);

  const totals = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
      const perUnit = {
        calories: (ing.grocery.totalCalories || 0) / (ing.grocery.quantityBought || 1),
        protein: (ing.grocery.proteinG || 0) / (ing.grocery.quantityBought || 1),
        carbs: (ing.grocery.carbsG || 0) / (ing.grocery.quantityBought || 1),
        fat: (ing.grocery.fatG || 0) / (ing.grocery.quantityBought || 1),
      };
      return {
        calories: acc.calories + perUnit.calories * ing.quantityUsed,
        protein: acc.protein + perUnit.protein * ing.quantityUsed,
        carbs: acc.carbs + perUnit.carbs * ing.quantityUsed,
        fat: acc.fat + perUnit.fat * ing.quantityUsed,
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [ingredients]);

  const addIngredient = useCallback(async (grocery: any) => {
    if (ingredients.some(i => i.groceryId === grocery.id)) {
      showError('Ingredient already added');
      return;
    }

    let groceryId = grocery.id;

    // If this is from API search (not a real grocery), create it in DB
    const isRealGrocery = allGroceries.some((g) => g.id === grocery.id);
    if (!isRealGrocery) {
      try {
        const response = await fetch('/api/groceries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodName: grocery.foodName,
            quantityBought: grocery.quantityBought,
            unit: grocery.unit,
            totalCalories: grocery.totalCalories || 0,
            proteinG: grocery.proteinG || 0,
            carbsG: grocery.carbsG || 0,
            fatG: grocery.fatG || 0,
            isTemporary: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          showError(errorData.error || 'Failed to add ingredient');
          return;
        }

        const created = await response.json();
        groceryId = created.id;
        setAllGroceries((prev) => [...prev, created]);
      } catch (error) {
        console.error('Error creating grocery:', error);
        showError('Failed to add ingredient');
        return;
      }
    }

    setIngredients(prev => [...prev, {
      groceryId: groceryId,
      quantityUsed: 1,
      grocery: {
        id: groceryId,
        foodName: grocery.foodName,
        unit: grocery.unit,
        quantityBought: grocery.quantityBought,
        totalCalories: grocery.totalCalories,
        proteinG: grocery.proteinG,
        carbsG: grocery.carbsG,
        fatG: grocery.fatG,
      }
    }]);
    setSearchQuery('');
    setApiSearchQuery('');
    setApiSearchResults([]);
    setShowApiSearch(false);
  }, [ingredients, allGroceries]);

  const searchNutritionAPI = useCallback(async () => {
    if (!apiSearchQuery.trim()) {
      showError('Please enter a food name to search');
      return;
    }
    setApiSearchLoading(true);
    try {
      const response = await fetch('/api/usda/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: apiSearchQuery.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        showError(data.message || 'No results found');
        setApiSearchResults([]);
        return;
      }
      const results = (data.results || []).map((item: any) => ({
        id: item.id || uuidv4(),
        foodName: item.name || item.foodName,
        unit: item.servingSizeUnit || 'g',
        quantityBought: item.servingSize || 1,
        totalCalories: item.nutrition?.calories || 0,
        proteinG: item.nutrition?.protein || 0,
        carbsG: item.nutrition?.carbs || 0,
        fatG: item.nutrition?.fat || 0,
      }));
      setApiSearchResults(results);
      if (results.length === 0) showError('No results found');
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to search nutrition database');
    } finally {
      setApiSearchLoading(false);
    }
  }, [apiSearchQuery]);

  const handleSave = async () => {
    if (!mealName.trim()) {
      showError('Please enter a meal name');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/meals/${meal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealName: mealName.trim(),
          description: notes.trim() || null,
          ingredients: ingredients.map(ing => ({
            groceryId: ing.groceryId,
            quantityUsed: ing.quantityUsed,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      showSuccess('Meal updated!');
      router.push('/groceries?tab=meals');
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to save meal');
    } finally {
      setSaving(false);
    }
  };

  const removeIngredient = (groceryId: string) => {
    setIngredients(prev => prev.filter(ing => ing.groceryId !== groceryId));
  };

  const updateQuantity = (groceryId: string, newQuantity: number) => {
    setIngredients(prev => prev.map(ing =>
      ing.groceryId === groceryId ? {...ing, quantityUsed: Math.max(0.1, newQuantity)} : ing
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #E8E4DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#2C2C2A' }}>Edit Meal</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: '0.5rem 1rem', backgroundColor: '#8B7FB8', color: '#FFFFFF', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, minHeight: '44px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => router.push('/groceries?tab=meals')} style={{ padding: '0.5rem 1rem', backgroundColor: '#FFFFFF', color: '#2C2C2A', border: '1px solid #E8E4DC', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, minHeight: '44px' }}>
            Cancel
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Meal Name</label>
          <input
            type='text'
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder='e.g., Breakfast Bowl'
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #E8E4DC', borderRadius: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Recipe Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Optional: Add cooking instructions, prep notes, or tips...'
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #E8E4DC', borderRadius: '0.5rem', minHeight: '100px', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Search Inventory</label>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search ingredients...'
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #E8E4DC', borderRadius: '0.5rem', boxSizing: 'border-box', marginBottom: '0.75rem' }}
          />

          {searchQuery.trim() && searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {searchResults.map((result) => (
                <div key={result.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#F8F5FF', border: '1px solid #E8E4DC', borderRadius: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2C2C2A', fontSize: '0.9rem' }}>{result.foodName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#999999' }}>{Math.round(result.totalCalories || 0)} cal | {result.quantityBought} {result.unit}</div>
                  </div>
                  <button onClick={() => addIngredient(result)} style={{ background: '#8B7FB8', color: '#FFFFFF', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600, minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.875rem', marginBottom: '1rem' }}>
              No results in your inventory
            </div>
          )}

          {searchQuery.trim() && !showApiSearch && (
            <div onClick={() => { setApiSearchQuery(searchQuery); setShowApiSearch(true); }} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#FFF8F5', border: '2px dashed #C9845F', borderRadius: '0.5rem', cursor: 'pointer' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#C9845F', textAlign: 'center' }}>Search nutrition database</div>
              <div style={{ fontSize: '0.75rem', color: '#999999', textAlign: 'center', marginTop: '0.25rem' }}>Find ingredients beyond your inventory</div>
            </div>
          )}

          {showApiSearch && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#FFF8F5', border: '1px solid #C9845F', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#C9845F' }}>Search Nutrition Database</div>
                <button onClick={() => setShowApiSearch(false)} style={{ background: 'none', border: 'none', color: '#C9845F', cursor: 'pointer', fontSize: '1.25rem', padding: '0', fontWeight: 700 }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type='text' value={apiSearchQuery} onChange={(e) => setApiSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchNutritionAPI()} placeholder='e.g., Greek yogurt, salmon...' style={{ flex: 1, padding: '0.75rem', border: '1px solid #C9845F', borderRadius: '0.5rem', boxSizing: 'border-box' }} />
                <button onClick={searchNutritionAPI} disabled={apiSearchLoading} style={{ background: '#C9845F', color: '#FFFFFF', border: 'none', borderRadius: '0.375rem', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600, minHeight: '44px', opacity: apiSearchLoading ? 0.7 : 1 }}>
                  {apiSearchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {apiSearchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {apiSearchResults.map((result) => (
                    <div key={result.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#2C2C2A', fontSize: '0.9rem' }}>{result.foodName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#999999' }}>{Math.round(result.totalCalories || 0)} cal | P: {result.proteinG || 0}g | C: {result.carbsG || 0}g | F: {result.fatG || 0}g</div>
                      </div>
                      <button onClick={() => addIngredient(result)} style={{ background: '#8B7FB8', color: '#FFFFFF', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600, minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#F8F5FF', borderRadius: '0.75rem', border: '1px solid #E8E4DC' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#999999', marginBottom: '0.75rem' }}>Macro Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', border: '1px solid #E8E4DC' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#5B7FD4' }}>{Math.round(totals.calories)}</div>
              <div style={{ fontSize: '0.6rem', color: '#999999' }}>cal</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', border: '1px solid #E8E4DC' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8B7FB8' }}>{totals.protein.toFixed(0)}g</div>
              <div style={{ fontSize: '0.6rem', color: '#999999' }}>P</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', border: '1px solid #E8E4DC' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#D67BB8' }}>{totals.carbs.toFixed(0)}g</div>
              <div style={{ fontSize: '0.6rem', color: '#999999' }}>C</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', border: '1px solid #E8E4DC' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C9845F' }}>{totals.fat.toFixed(0)}g</div>
              <div style={{ fontSize: '0.6rem', color: '#999999' }}>F</div>
            </div>
          </div>
        </div>

        {ingredients.length > 0 && (
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: '#2C2C2A' }}>Ingredients ({ingredients.length})</h2>
            {ingredients.map((ing) => (
              <div key={ing.groceryId} style={{ padding: '0.75rem', backgroundColor: '#F8F5FF', border: '1px solid #E8E4DC', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2C2C2A' }}>{ing.grocery.foodName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#999999' }}>{Math.round((ing.grocery.totalCalories || 0) / (ing.grocery.quantityBought || 1))} cal per {ing.grocery.unit}</div>
                  </div>
                  <button onClick={() => removeIngredient(ing.groceryId)} style={{ background: '#D67BB8', color: '#FFFFFF', border: 'none', borderRadius: '0.375rem', width: '32px', height: '32px', cursor: 'pointer', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#999999', marginBottom: '0.375rem' }}>Quantity</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type='text'
                    inputMode='decimal'
                    value={ing.quantityUsed}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        updateQuantity(ing.groceryId, 0);
                      } else {
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 0) {
                          updateQuantity(ing.groceryId, num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val) || val < 0.1) {
                        updateQuantity(ing.groceryId, 1);
                      }
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #E8E4DC', borderRadius: '0.375rem', minHeight: '44px' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#999999', minWidth: '3rem' }}>{ing.grocery.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
