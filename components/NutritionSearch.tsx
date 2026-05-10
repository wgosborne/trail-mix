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
  };
}

interface NutritionSearchProps {
  onSelect: (nutrition: NutritionResult['nutrition']) => void;
}

export function NutritionSearch({ onSelect }: NutritionSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NutritionResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/usda/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
    setLoading(false);
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <form onSubmit={handleSearch} className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search (e.g., Chicken Breast)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <button
              key={result.fdcId}
              onClick={() => onSelect(result.nutrition)}
              className="w-full text-left p-2 border rounded hover:bg-gray-50"
            >
              <p className="font-medium text-sm">{result.name}</p>
              <p className="text-xs text-gray-600">
                {Math.round(result.nutrition.calories)} cal | {Math.round(result.nutrition.protein)}g protein
              </p>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <p className="text-sm text-gray-500">No results found.</p>
      )}
    </div>
  );
}
