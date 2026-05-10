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
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

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

        const data = await response.json();
        onItemsExtracted(data.items || []);
      } catch (error) {
        console.error('Parse error:', error);
        alert('Failed to parse receipt');
      }

      setLoading(false);
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="font-medium mb-3">📸 Upload Receipt</h3>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full py-8 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 disabled:bg-gray-100"
      >
        {loading ? 'Processing...' : 'Click to upload or take photo'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      {preview && (
        <div className="mt-3">
          <img src={preview} alt="Receipt preview" className="max-w-full h-32 object-cover rounded" />
        </div>
      )}
    </div>
  );
}
