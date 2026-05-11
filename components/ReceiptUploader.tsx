'use client';

import { useState, useRef } from 'react';
import { searchNutritionOptions } from '@/lib/usda-lookup';

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
}

interface USDAOption {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

interface ReceiptUploaderProps {
  onItemsExtracted: (items: ParsedItem[]) => void;
}

export function ReceiptUploader({ onItemsExtracted }: ReceiptUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ParsedItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [nutritionStatus, setNutritionStatus] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setNutritionStatus('');

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string)?.split(',')[1];
      setPreview(event.target?.result as string);

      try {
        const response = await fetch('/api/vision/parse', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (!response.ok) {
          throw new Error(`Failed to parse receipt: ${response.status}`);
        }

        const data = await response.json();
        let items = data.items || [];

        if (items.length === 0) {
          setError('No grocery items were detected on the receipt. Try a clearer photo.');
          setLoading(false);
          return;
        }

        // Lookup nutrition for each item
        setNutritionStatus('Loading nutrition data...');
        const itemsWithNutrition: ParsedItem[] = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          setNutritionStatus(`Getting macros for ${item.name}...`);

          const options = await searchNutritionOptions(item.name, item.quantity, item.unit);

          itemsWithNutrition.push({
            ...item,
            nutrition: options?.[0] || {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            },
          });
        }

        setExtractedItems(itemsWithNutrition);
        setCurrentItemIndex(0);
        setNutritionStatus('');

        // Pass all items to parent for navigation
        onItemsExtracted(itemsWithNutrition);
      } catch (error) {
        console.error('Parse error:', error);
        setError('Failed to parse receipt. Please try again.');
      }

      setLoading(false);
    };

    reader.readAsDataURL(file);
  }

  const handleReset = () => {
    setPreview(null);
    setExtractedItems([]);
    setCurrentItemIndex(0);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleAddItem = (item: ParsedItem) => {
    // Move to next item or finish
    if (currentItemIndex < extractedItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      // All items added
      onItemsExtracted(extractedItems);
      handleReset();
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: '10px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div
          style={{
            height: '3px',
            width: '24px',
            background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)'
          }}
        />
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          📸 Upload Receipt
        </h2>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        style={{
          width: '100%',
          padding: '32px 16px',
          border: '2px dashed #8B7FB8',
          borderRadius: '8px',
          backgroundColor: loading ? '#F0EFE8' : '#FFFFFF',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          color: loading ? '#999999' : '#2C2C2A',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.borderColor = '#D67BB8';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#8B7FB8';
        }}
      >
        {loading ? (
          nutritionStatus ? `⏳ ${nutritionStatus}` : '⏳ Processing receipt...'
        ) : (
          '📷 Click to upload or take photo'
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        capture="environment"
      />

      {error && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#FFE8E8', border: '1px solid #D67BB8', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#D67BB8' }}>{error}</p>
        </div>
      )}

      {preview && extractedItems.length > 0 && (
        <div style={{ marginTop: '16px', marginBottom: '12px' }}>
          <img src={preview} alt="Receipt preview" style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '6px' }} />
        </div>
      )}
    </div>
  );
}
