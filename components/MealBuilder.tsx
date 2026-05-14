'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { showSuccess, showError } from '@/lib/toast';

interface GroceryItem {
  id: string;
  foodName: string;
  unit: string;
  quantityBought: number;
  totalCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

interface IngredientRow {
  rowId: string;
  groceryId: string;
  foodName: string;
  unit: string;
  quantityUsed: number;
  perUnit: { calories: number; protein: number; carbs: number; fat: number };
}

interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Inline SVG pie chart component
function MacroPieChart({ totals }: { totals: MealTotals }) {
  const total = totals.protein + totals.carbs + totals.fat;
  if (total === 0) {
    return (
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          backgroundColor: '#E8E4DC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999999',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        Add ingredients
      </div>
    );
  }

  const proteinPercent = (totals.protein / total) * 100;
  const carbsPercent = (totals.carbs / total) * 100;
  const fatPercent = (totals.fat / total) * 100;

  const proteinAngle = (proteinPercent / 100) * 360;
  const carbsAngle = (carbsPercent / 100) * 360;

  return (
    <div
      style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: `conic-gradient(
          #8B7FB8 0deg ${proteinAngle}deg,
          #D67BB8 ${proteinAngle}deg ${proteinAngle + carbsAngle}deg,
          #C9845F ${proteinAngle + carbsAngle}deg 360deg
        )`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2C2C2A' }}>
          {Math.round(totals.calories)}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#999999' }}>calories</div>
      </div>
    </div>
  );
}

export function MealBuilder({ weekStart }: { weekStart: string }) {
  const router = useRouter();

  const [mealName, setMealName] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState<GroceryItem[]>([]);
  const [apiSearchLoading, setApiSearchLoading] = useState(false);
  const [allGroceries, setAllGroceries] = useState<GroceryItem[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all groceries on mount
  useEffect(() => {
    const fetchGroceries = async () => {
      try {
        const response = await fetch(`/api/groceries?weekStart=${weekStart}`);
        if (!response.ok) throw new Error('Failed to fetch groceries');
        const data = await response.json();
        setAllGroceries(Array.isArray(data) ? data : data.groceries || []);
      } catch (error) {
        console.error('Error fetching groceries:', error);
        showError('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };

    fetchGroceries();
  }, [weekStart]);

  // Compute totals
  const totals: MealTotals = useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + ing.perUnit.calories * ing.quantityUsed,
        protein: acc.protein + ing.perUnit.protein * ing.quantityUsed,
        carbs: acc.carbs + ing.perUnit.carbs * ing.quantityUsed,
        fat: acc.fat + ing.perUnit.fat * ing.quantityUsed,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [ingredients]);

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allGroceries
      .filter(g => g.foodName.toLowerCase().includes(query) && !ingredients.some(i => i.groceryId === g.id))
      .slice(0, 6);
  }, [searchQuery, allGroceries, ingredients]);

  const addIngredient = useCallback(
    (grocery: GroceryItem) => {
      if (ingredients.some(i => i.groceryId === grocery.id)) {
        showError('Ingredient already added');
        return;
      }

      const perUnit = {
        calories: (grocery.totalCalories || 0) / (grocery.quantityBought || 1),
        protein: (grocery.proteinG || 0) / (grocery.quantityBought || 1),
        carbs: (grocery.carbsG || 0) / (grocery.quantityBought || 1),
        fat: (grocery.fatG || 0) / (grocery.quantityBought || 1),
      };

      // Add to beginning of array (newest first)
      setIngredients(prev => [
        {
          rowId: uuidv4(),
          groceryId: grocery.id,
          foodName: grocery.foodName,
          unit: grocery.unit,
          quantityUsed: 1,
          perUnit,
        },
        ...prev,
      ]);

      setSearchQuery('');
      setApiSearchQuery('');
      setApiSearchResults([]);
    },
    [ingredients]
  );

  // Search nutrition API when local results empty
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
      if (results.length === 0) {
        showError('No results found');
      }
    } catch (error) {
      console.error('Error searching nutrition API:', error);
      showError('Failed to search nutrition database');
    } finally {
      setApiSearchLoading(false);
    }
  }, [apiSearchQuery]);

  const updateQuantity = useCallback((rowId: string, newQuantity: number) => {
    setIngredients(prev =>
      prev.map(ing => (ing.rowId === rowId ? { ...ing, quantityUsed: Math.max(0.1, newQuantity) } : ing))
    );
  }, []);

  const removeIngredient = useCallback((rowId: string) => {
    setIngredients(prev => prev.filter(ing => ing.rowId !== rowId));
  }, []);

  const handleSave = async () => {
    if (!mealName.trim()) {
      showError('Please enter a meal name');
      return;
    }

    if (ingredients.length === 0) {
      showError('Please add at least one ingredient');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save meal');
      }

      showSuccess('Meal saved successfully!');
      router.push('/groceries?tab=meals');
    } catch (error) {
      console.error('Error saving meal:', error);
      showError(error instanceof Error ? error.message : 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/groceries?tab=meals');
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#2C2C2A',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid #E8E4DC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '0.5rem',
            }}
            aria-label="Go back"
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#2C2C2A' }}>Build Your Meal</h1>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8B7FB8',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: '44px',
              minWidth: 'fit-content',
              transition: 'all 0.2s',
              opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!saving) (e.currentTarget as HTMLElement).style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              if (!saving) (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2A',
              border: '1px solid #E8E4DC',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: '44px',
              minWidth: 'fit-content',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#F0E8FF';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Macro Summary Bar - Fixed at Bottom (Above Nav) */}
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: 0,
          right: 0,
          backgroundColor: '#F8F5FF',
          borderTop: '1px solid #E8E4DC',
          padding: '1rem',
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              paddingBottom: '0.75rem',
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
              paddingTop: '0.25rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              border: '1px solid #E8E4DC',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#5B7FD4', fontWeight: 700, margin: 0 }}>
              {Math.round(totals.calories)}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#999999', margin: 0 }}>cal</div>
          </div>

          <div
            style={{
              paddingBottom: '0.75rem',
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
              paddingTop: '0.25rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              border: '1px solid #E8E4DC',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#8B7FB8', fontWeight: 700 }}>
              {totals.protein.toFixed(0)}g
            </div>
            <div style={{ fontSize: '0.6rem', color: '#999999' }}>P</div>
          </div>

          <div
            style={{
              paddingBottom: '0.75rem',
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
              paddingTop: '0.25rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              border: '1px solid #E8E4DC',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#D67BB8', fontWeight: 700 }}>
              {totals.carbs.toFixed(0)}g
            </div>
            <div style={{ fontSize: '0.6rem', color: '#999999' }}>C</div>
          </div>

          <div
            style={{
              paddingBottom: '0.75rem',
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
              paddingTop: '0.25rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              border: '1px solid #E8E4DC',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#C9845F', fontWeight: 700 }}>
              {totals.fat.toFixed(0)}g
            </div>
            <div style={{ fontSize: '0.6rem', color: '#999999' }}>F</div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          paddingBottom: '120px',
        }}
      >
        {/* Top Macro Chart Section */}
        <div
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#F8F5FF',
            borderRadius: '0.75rem',
            border: '1px solid #E8E4DC',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MacroPieChart totals={totals} />
          <div style={{ marginLeft: '1.5rem', flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#999999', marginBottom: '0.75rem' }}>
              Macro Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#8B7FB8', fontWeight: 600 }}>Protein</span>
                <span style={{ color: '#2C2C2A', fontWeight: 700 }}>{totals.protein.toFixed(1)}g</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#D67BB8', fontWeight: 600 }}>Carbs</span>
                <span style={{ color: '#2C2C2A', fontWeight: 700 }}>{totals.carbs.toFixed(1)}g</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#C9845F', fontWeight: 600 }}>Fat</span>
                <span style={{ color: '#2C2C2A', fontWeight: 700 }}>{totals.fat.toFixed(1)}g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Meal Name Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#2C2C2A' }}>
            Meal Name
          </label>
          <input
            type="text"
            value={mealName}
            onChange={e => setMealName(e.target.value)}
            placeholder="e.g., Breakfast Bowl"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #E8E4DC',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              backgroundColor: '#FAFAF8',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Notes/Recipe Field */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#2C2C2A' }}>
            Recipe Notes or Steps
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional: Add cooking instructions, prep notes, or tips..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #E8E4DC',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              backgroundColor: '#FAFAF8',
              boxSizing: 'border-box',
              minHeight: '100px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#2C2C2A' }}>
            Search Inventory
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ingredients..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #E8E4DC',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              backgroundColor: '#FAFAF8',
              boxSizing: 'border-box',
            }}
          />

          {/* Search Results from Inventory */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {searchResults.map(result => (
                <div
                  key={result.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: '#F8F5FF',
                    border: '1px solid #E8E4DC',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#F0E8FF';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#F8F5FF';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#2C2C2A', fontSize: '0.9rem' }}>{result.foodName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#999999' }}>
                      {result.totalCalories ? Math.round(result.totalCalories) : 0} cal | {result.quantityBought} {result.unit}
                    </div>
                  </div>
                  <button
                    onClick={() => addIngredient(result)}
                    style={{
                      background: '#8B7FB8',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      minHeight: '44px',
                      minWidth: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {searchQuery.trim() && searchResults.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.875rem', marginTop: '0.75rem' }}>
              No results in your inventory
            </div>
          )}

          {/* Nutrition API Search Card - Always Available when searching */}
          {searchQuery.trim() && !apiSearchQuery && (
            <div
              onClick={() => setApiSearchQuery(searchQuery)}
              style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#FFF8F5',
                border: '2px dashed #C9845F',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#FFE8DC';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#FFF8F5';
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#C9845F', textAlign: 'center' }}>
                Search nutrition database
              </div>
              <div style={{ fontSize: '0.75rem', color: '#999999', textAlign: 'center', marginTop: '0.25rem' }}>
                Find ingredients beyond your inventory
              </div>
            </div>
          )}

          {/* Nutrition API Search Section - Active Search */}
          {apiSearchQuery && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#FFF8F5', border: '1px solid #C9845F', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#C9845F', marginBottom: '0.75rem' }}>
                Search Nutrition Database
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={apiSearchQuery}
                  onChange={e => setApiSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchNutritionAPI()}
                  placeholder="e.g., Greek yogurt, salmon fillet..."
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #C9845F',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={searchNutritionAPI}
                  disabled={apiSearchLoading}
                  style={{
                    background: '#C9845F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: '44px',
                    opacity: apiSearchLoading ? 0.7 : 1,
                  }}
                >
                  {apiSearchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {apiSearchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {apiSearchResults.map(result => (
                    <div
                      key={result.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E8E4DC',
                        borderRadius: '0.5rem',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAF8';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#2C2C2A', fontSize: '0.9rem' }}>{result.foodName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#999999' }}>
                          {result.totalCalories ? Math.round(result.totalCalories) : 0} cal | P: {result.proteinG || 0}g | C: {result.carbsG || 0}g | F: {result.fatG || 0}g
                        </div>
                      </div>
                      <button
                        onClick={() => addIngredient(result)}
                        style={{
                          background: '#8B7FB8',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '0.375rem',
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          minHeight: '44px',
                          minWidth: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ingredients Section - Newest First */}
        {ingredients.length > 0 && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '3px',
                  height: '24px',
                  backgroundColor: '#8B7FB8',
                  borderRadius: '2px',
                }}
              />
              <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#2C2C2A' }}>
                Ingredients ({ingredients.length})
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {ingredients.map(ing => (
                <div
                  key={ing.rowId}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#F8F5FF',
                    border: '1px solid #E8E4DC',
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2C2C2A', fontSize: '0.9rem' }}>{ing.foodName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#999999' }}>
                        {Math.round(ing.perUnit.calories)} cal per {ing.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => removeIngredient(ing.rowId)}
                      style={{
                        background: '#D67BB8',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '0.375rem',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '44px',
                        minWidth: '44px',
                      }}
                      aria-label="Remove ingredient"
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#999999', marginBottom: '0.375rem' }}>
                      Quantity
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ing.quantityUsed}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            updateQuantity(ing.rowId, 0);
                          } else {
                            const num = parseFloat(val);
                            if (!isNaN(num) && num >= 0) {
                              updateQuantity(ing.rowId, num);
                            }
                          }
                        }}
                        onBlur={e => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val < 0.1) {
                            updateQuantity(ing.rowId, 1);
                          }
                        }}
                        onFocus={e => e.currentTarget.select()}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          border: '1px solid #E8E4DC',
                          borderRadius: '0.375rem',
                          fontSize: '1rem',
                          minHeight: '44px',
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#999999', minWidth: '3rem' }}>{ing.unit}</span>
                    </div>
                  </div>

                  {/* Per-ingredient macros */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.5rem',
                      marginTop: '0.75rem',
                    }}
                  >
                    <div style={{ padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', textAlign: 'center', border: '1px solid #E8E4DC' }}>
                      <div style={{ fontSize: '0.7rem', color: '#5B7FD4', fontWeight: 700 }}>
                        {Math.round(ing.perUnit.calories * ing.quantityUsed)}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#999999' }}>cal</div>
                    </div>
                    <div style={{ padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', textAlign: 'center', border: '1px solid #E8E4DC' }}>
                      <div style={{ fontSize: '0.7rem', color: '#8B7FB8', fontWeight: 700 }}>
                        {(ing.perUnit.protein * ing.quantityUsed).toFixed(1)}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#999999' }}>P</div>
                    </div>
                    <div style={{ padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', textAlign: 'center', border: '1px solid #E8E4DC' }}>
                      <div style={{ fontSize: '0.7rem', color: '#D67BB8', fontWeight: 700 }}>
                        {(ing.perUnit.carbs * ing.quantityUsed).toFixed(1)}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#999999' }}>C</div>
                    </div>
                    <div style={{ padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.375rem', textAlign: 'center', border: '1px solid #E8E4DC' }}>
                      <div style={{ fontSize: '0.7rem', color: '#C9845F', fontWeight: 700 }}>
                        {(ing.perUnit.fat * ing.quantityUsed).toFixed(1)}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#999999' }}>F</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ingredients.length === 0 && !loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999999', fontSize: '0.875rem' }}>
            Search and add ingredients to get started
          </div>
        )}
      </div>

    </div>
  );
}
