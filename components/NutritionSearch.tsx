'use client';

import { useState } from 'react';

interface NutritionResult {
  fdcId: string;
  name: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
}

interface NutritionSearchProps {
  onSelect: (nutrition: NutritionResult['nutrition']) => void;
}

interface APIResponse {
  results?: NutritionResult[];
  error?: string;
  message?: string;
  suggestion?: string;
}

export function NutritionSearch({ onSelect }: NutritionSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NutritionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuggestion(null);
    setResults([]);

    if (!query.trim()) {
      setError('Please enter a food to search');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/usda/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data: APIResponse = await response.json();

      if (!response.ok) {
        setError(data.message || 'Search failed. Please try again.');
        return;
      }

      if (data.error) {
        setError(data.message || 'No foods found');
        setSuggestion(data.suggestion || null);
        setResults([]);
      } else if (data.results && data.results.length > 0) {
        setResults(data.results);
        setError(null);
      } else {
        setError('No foods found');
        setSuggestion(data.suggestion || 'Try a different search term');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Network error. Please check your connection and try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #E8E4DC'
    }}>
      <form onSubmit={handleSearch} style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search (e.g., Chicken, Apple, Salmon)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #E8E4DC',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#2C2C2A',
              backgroundColor: '#FFFFFF',
              outline: 'none'
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              padding: '10px 16px',
              backgroundColor: loading || !query.trim() ? '#F0EFE8' : '#5B7FD4',
              color: loading || !query.trim() ? '#999999' : '#FFFFFF',
              border: `1px solid ${loading || !query.trim() ? '#E8E4DC' : '#5B7FD4'}`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          marginBottom: '12px',
          padding: '10px 12px',
          backgroundColor: '#FFF5F8',
          border: '1px solid #D67BB8',
          borderRadius: '6px'
        }}>
          <p style={{ color: '#D67BB8', fontSize: '13px', fontWeight: 500 }}>{error}</p>
          {suggestion && <p style={{ color: '#D67BB8', fontSize: '11px', marginTop: '4px' }}>{suggestion}</p>}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', color: '#999999', fontWeight: 600 }}>
            Found {results.length} result{results.length !== 1 ? 's' : ''} — Click to select
          </p>
          {results.map((result) => (
            <button
              key={result.fdcId}
              onClick={() => onSelect(result.nutrition)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: '1px solid #E8E4DC',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F8F5FF';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#8B7FB8';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8E4DC';
              }}
            >
              <p style={{ fontWeight: 600, fontSize: '13px', color: '#2C2C2A' }}>{result.name}</p>
              <p style={{ fontSize: '11px', color: '#999999', marginTop: '4px' }}>
                {Math.round(result.nutrition.calories)} cal | {Math.round(result.nutrition.protein)}g protein |{' '}
                {Math.round(result.nutrition.carbs)}g carbs | {Math.round(result.nutrition.fat)}g fat
              </p>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && !error && (
        <p style={{ fontSize: '13px', color: '#999999' }}>No results found for "{query}".</p>
      )}

      {!query && !loading && results.length === 0 && !error && (
        <p style={{ fontSize: '12px', color: '#999999' }}>Enter a food name to search the USDA nutrition database</p>
      )}
    </div>
  );
}
