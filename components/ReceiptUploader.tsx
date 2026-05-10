'use client';

import { useState, useRef } from 'react';

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
}

interface ReceiptUploaderProps {
  onItemsExtracted: (items: ParsedItem[]) => void;
}

export function ReceiptUploader({ onItemsExtracted }: ReceiptUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ParsedItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

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
        const items = data.items || [];
        setExtractedItems(items);
        onItemsExtracted(items);

        if (items.length === 0) {
          setError('No grocery items were detected on the receipt. Try a clearer photo.');
        }
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
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
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
        {loading ? '⏳ Processing receipt...' : '📷 Click to upload or take photo'}
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
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <img src={preview} alt="Receipt preview" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px' }} />
          </div>
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#2C2C2A', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              EXTRACTED ITEMS ({extractedItems.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {extractedItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#F5F8FF',
                    border: '1px solid #E8E4DC',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#2C2C2A',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#666666', marginTop: '4px' }}>
                    {item.quantity} {item.unit}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleReset}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid #E8E4DC',
                backgroundColor: '#FFFFFF',
                color: '#2C2C2A',
                cursor: 'pointer',
              }}
            >
              Upload Different Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
