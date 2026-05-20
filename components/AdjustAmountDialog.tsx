'use client';

import { useState, useEffect } from 'react';

interface AdjustAmountDialogProps {
  isOpen: boolean;
  itemName: string;
  quantityBought: number;
  unit: string;
  currentPercentConsumed: number;
  isLoading: boolean;
  onConfirm: (newQuantity: number, percentConsumed: number) => void;
  onCancel: () => void;
}

export function AdjustAmountDialog({
  isOpen,
  itemName,
  quantityBought,
  unit,
  currentPercentConsumed,
  isLoading,
  onConfirm,
  onCancel,
}: AdjustAmountDialogProps) {
  const [actualQuantity, setActualQuantity] = useState(quantityBought.toString());
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActualQuantity(quantityBought.toString());
      setError('');
    }
  }, [isOpen, quantityBought]);

  if (!isOpen) return null;

  const handleChange = (val: string) => {
    setActualQuantity(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num <= 0) {
      setError('Quantity must be greater than 0');
    } else if (isNaN(num)) {
      setError('');
    } else {
      setError('');
    }
  };

  const canConfirm = !error && !isNaN(parseFloat(actualQuantity)) && parseFloat(actualQuantity) > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2C2C2A', marginBottom: '6px' }}>
          Adjust Quantity
        </h2>
        <p style={{ fontSize: '13px', color: '#999999', marginBottom: '20px' }}>
          How much <strong style={{ color: '#2C2C2A' }}>{itemName}</strong> do you actually have?
          <br />
          <span style={{ fontSize: '12px' }}>Originally: {quantityBought} {unit}</span>
        </p>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={actualQuantity}
              onChange={(e) => handleChange(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${error ? '#D67BB8' : '#E8E4DC'}`,
                fontSize: '16px',
                fontWeight: 600,
                color: '#2C2C2A',
                outline: 'none',
                minHeight: '44px',
              }}
            />
            <span style={{ fontSize: '14px', color: '#666666', minWidth: '32px' }}>{unit}</span>
          </div>
          {error && (
            <p style={{ fontSize: '12px', color: '#D67BB8', marginTop: '6px' }}>{error}</p>
          )}
        </div>

        <p style={{ fontSize: '13px', color: '#5B7FD4', fontWeight: 600, marginBottom: '24px' }}>
          {(() => {
            const actual = parseFloat(actualQuantity);
            const percentRemaining = isNaN(actual) ? 0 : Math.round((actual / quantityBought) * 100);
            return `${percentRemaining}% remaining`;
          })()}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #E8E4DC',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2A',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (canConfirm) {
                onConfirm(parseFloat(actualQuantity), currentPercentConsumed);
              }
            }}
            disabled={isLoading || !canConfirm}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #5B7FD4',
              backgroundColor: '#5B7FD4',
              color: '#FFFFFF',
              cursor: isLoading || !canConfirm ? 'not-allowed' : 'pointer',
              opacity: isLoading || !canConfirm ? 0.6 : 1,
              transition: 'all 0.2s',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
