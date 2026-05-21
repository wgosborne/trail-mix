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
  const [storeName, setStoreName] = useState<string>('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [nutritionStatus, setNutritionStatus] = useState<string>('');
  const [reviewMode, setReviewMode] = useState(false);
  const [editingItem, setEditingItem] = useState<{ index: number; name: string; quantity: number; unit: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setNutritionStatus('');
    setReviewMode(false);

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
        const store = data.storeName || 'Unknown';

        if (items.length === 0) {
          setError('No grocery items detected. Try a clearer, straight-on photo with good lighting.');
          setLoading(false);
          return;
        }

        setExtractedItems(items);
        setStoreName(store);
        setReviewMode(true);
        setLoading(false);
      } catch (error) {
        console.error('Parse error:', error);
        setError('Failed to parse receipt. Try a different angle or better lighting.');
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  }

  const handleEditItem = (index: number) => {
    const item = extractedItems[index];
    setEditingItem({
      index,
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'count'
    });
  };

  const handleSaveEdit = () => {
    if (editingItem && editingItem.name.trim()) {
      const updated = [...extractedItems];
      updated[editingItem.index].name = editingItem.name.trim();
      updated[editingItem.index].quantity = editingItem.quantity || 1;
      updated[editingItem.index].unit = editingItem.unit || 'count';
      setExtractedItems(updated);
    }
    setEditingItem(null);
  };

  const handleRemoveItem = (index: number) => {
    const updated = extractedItems.filter((_, i) => i !== index);
    setExtractedItems(updated);
    setEditingItem(null);
  };

  const handleProceedToNutrition = async () => {
    setReviewMode(false);
    setLoading(true);
    setNutritionStatus('Loading nutrition data...');

    const itemsWithNutrition: ParsedItem[] = [];

    try {
      for (let i = 0; i < extractedItems.length; i++) {
        const item = extractedItems[i];
        setNutritionStatus(`Getting macros for ${item.name}...`);

        const itemNameWithStore = storeName && storeName !== 'Unknown' ? `${storeName} ${item.name}` : item.name;
        const options = await searchNutritionOptions(itemNameWithStore, item.quantity, item.unit);

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
      setLoading(false);
      onItemsExtracted(itemsWithNutrition);
    } catch (error) {
      console.error('Nutrition lookup error:', error);
      setError('Failed to load nutrition data. Please try again.');
      setLoading(false);
      setReviewMode(true);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setExtractedItems([]);
    setStoreName('');
    setCurrentItemIndex(0);
    setError(null);
    setReviewMode(false);
    setEditingItem(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  if (reviewMode && extractedItems.length > 0) {
    return (
      <div
        style={{
          backgroundColor: '#F8F5FF',
          border: '1px solid #E8E4DC',
          borderRadius: '10px',
          padding: '20px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ height: '3px', width: '24px', background: '#8B7FB8' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Review Receipt Items
          </h2>
        </div>

        {preview && (
          <div style={{ marginBottom: '16px' }}>
            <img
              src={preview}
              alt="Receipt preview"
              style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '6px' }}
            />
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
          Store: <strong>{storeName}</strong> • Found {extractedItems.length} items. Review and correct any misread names below, then continue.
        </p>

        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #E8E4DC', borderRadius: '6px', padding: '12px' }}>
          {extractedItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E4DC',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: editingItem?.index === idx ? 'column' : 'row',
                alignItems: editingItem?.index === idx ? 'stretch' : 'center',
                gap: '12px',
              }}
            >
              {editingItem?.index === idx ? (
                <>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', width: '100%' }}>
                    Item Name
                  </label>
                  <textarea
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #8B7FB8',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      minHeight: '60px',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: '4px' }}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingItem.quantity}
                        onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #8B7FB8',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: '4px' }}>
                        Unit
                      </label>
                      <input
                        type="text"
                        placeholder="count"
                        value={editingItem.unit}
                        onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #8B7FB8',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#8B7FB8',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#E8E4DC',
                        color: '#2C2C2A',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#2C2C2A', margin: 0, wordWrap: 'break-word' }}>
                      {item.name}
                    </p>
                    {(item.quantity || item.unit) && (
                      <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>
                        {item.quantity} {item.unit || 'count'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditItem(idx)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#F0EFE8',
                      color: '#2C2C2A',
                      border: '1px solid #E8E4DC',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#FFE8E8',
                      color: '#D67BB8',
                      border: '1px solid #D67BB8',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#E8E4DC',
              color: '#2C2C2A',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleProceedToNutrition}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#8B7FB8',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Continue to Nutrition
          </button>
        </div>
      </div>
    );
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
        <div style={{ height: '3px', width: '24px', background: '#8B7FB8' }} />
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Upload Receipt
        </h2>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        style={{
          width: '100%',
          padding: '40px 16px',
          border: '2px dashed #8B7FB8',
          borderRadius: '8px',
          backgroundColor: loading ? '#F0EFE8' : '#FFFFFF',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          color: loading ? '#999999' : '#2C2C2A',
          transition: 'all 0.2s',
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1.4,
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
          nutritionStatus ? `${nutritionStatus}` : 'Processing receipt...'
        ) : (
          'Upload Receipt'
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && (
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#FFE8E8', border: '1px solid #D67BB8', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#D67BB8', fontWeight: 600, margin: '0 0 4px 0' }}>Error</p>
          <p style={{ fontSize: '12px', color: '#D67BB8', margin: 0 }}>{error}</p>
          <p style={{ fontSize: '11px', color: '#D67BB8', margin: '4px 0 0 0', opacity: 0.8 }}>Try a different image or add groceries manually</p>
        </div>
      )}
    </div>
  );
}
