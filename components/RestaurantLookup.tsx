'use client';

import { useState } from 'react';
import { showSuccess, showError } from '@/lib/toast';

interface RestaurantNutrition {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface RestaurantLookupProps {
  onAddItem: (item: any) => void;
}

export function RestaurantLookup({ onAddItem }: RestaurantLookupProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RestaurantNutrition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('count');

  // Editable nutrition values
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');

    if (!query.trim()) {
      setError('Please enter a restaurant meal');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/nutrition/restaurant-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Search failed. Please try again.');
        return;
      }

      const data = await response.json();
      if (data.result) {
        setResult(data.result);
        setCalories(data.result.calories.toString());
        setProtein(data.result.protein.toString());
        setCarbs(data.result.carbs.toString());
        setFat(data.result.fat.toString());
      } else {
        setError('No nutrition data found. Try a different meal.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function getWeekStart(): string {
    const d = new Date();
    const dayOfWeek = d.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - daysFromMonday);
    return monday.toISOString().split('T')[0];
  }

  function handleAddItem() {
    if (!result) return;

    const cal = parseFloat(calories) || 0;
    const prot = parseFloat(protein) || 0;
    const carb = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;

    onAddItem({
      foodName: result.name,
      quantityBought: quantity,
      unit,
      nutrition: {
        calories: cal,
        protein: prot,
        carbs: carb,
        fat: f,
      },
      percentConsumed: 0,
      dateAdded: new Date().toISOString().split('T')[0],
      weekStart: getWeekStart(),
      isTemporary: true,
    });

    showSuccess(`Added ${result.name}`);
    setQuery('');
    setResult(null);
    setQuantity(1);
    setUnit('count');
  }

  return (
    <div
      style={{
        backgroundColor: '#F8F5FF',
        border: '1px solid #E8E4DC',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
        cursor: 'default',
      }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div
          style={{
            height: '3px',
            width: '24px',
            background: '#8B7FB8',
          }}
        />
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>
          Dining Out
        </h2>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="e.g., McDonald's Big Mac, Chipotle bowl..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #E8E4DC',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#2C2C2A',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              minHeight: '44px',
            }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              padding: '12px 16px',
              backgroundColor: loading || !query.trim() ? '#F0EFE8' : '#8B7FB8',
              color: loading || !query.trim() ? '#999999' : '#FFFFFF',
              border: `1px solid ${loading || !query.trim() ? '#E8E4DC' : '#8B7FB8'}`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              minHeight: '44px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading && query.trim()) {
                e.currentTarget.style.backgroundColor = '#D67BB8';
                e.currentTarget.style.borderColor = '#D67BB8';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && query.trim()) {
                e.currentTarget.style.backgroundColor = '#8B7FB8';
                e.currentTarget.style.borderColor = '#8B7FB8';
              }
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#FFE8E8', border: '1px solid #D67BB8', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#D67BB8', fontWeight: 600, margin: '0 0 4px 0' }}>Error</p>
          <p style={{ fontSize: '12px', color: '#D67BB8', margin: 0 }}>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#2C2C2A', marginBottom: '12px' }}>{result.name}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Calories
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '4px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Protein (g)
              </label>
              <input
                type="number"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '4px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Carbs (g)
              </label>
              <input
                type="number"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '4px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Fat (g)
              </label>
              <input
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '4px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Quantity
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '4px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #E8E4DC',
                  borderRadius: '4px',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="count">meal (count)</option>
                <option value="oz">oz</option>
                <option value="g">g</option>
                <option value="lbs">lbs</option>
                <option value="cups">cups</option>
                <option value="ml">ml</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAddItem}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#8B7FB8',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: '44px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D67BB8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8B7FB8';
            }}
          >
            Add to Inventory
          </button>
        </div>
      )}
    </div>
  );
}
