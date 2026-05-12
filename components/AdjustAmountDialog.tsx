'use client';

import { useState, useEffect } from 'react';

interface AdjustAmountDialogProps {
  isOpen: boolean;
  itemName: string;
  quantityBought: number;
  unit: string;
  currentPercentConsumed: number;
  isLoading: boolean;
  onConfirm: (newPercent: number) => void;
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
  const initialRemaining = parseFloat((quantityBought * (1 - currentPercentConsumed / 100)).toFixed(2));
  const [remaining, setRemaining] = useState(initialRemaining);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRemaining(parseFloat((quantityBought * (1 - currentPercentConsumed / 100)).toFixed(2)));
      setError('');
    }
  }, [isOpen, quantityBought, currentPercentConsumed]);

  if (!isOpen) return null;

  const computedPercent = Math.min(100, Math.max(0, Math.round(((quantityBought - remaining) / quantityBought) * 100)));

  const handleChange = (val: string) => {
    const num = parseFloat(val);
    setRemaining(isNaN(num) ? 0 : num);
    if (!isNaN(num) && num > quantityBought) {
      setError(`Can't exceed purchased amount (${quantityBought} ${unit})`);
    } else if (!isNaN(num) && num < 0) {
      setError('Amount cannot be negative');
    } else {
      setError('');
    }
  };

  const canConfirm = !error && !isNaN(remaining);

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
          Adjust Amount
        </h2>
        <p style={{ fontSize: '13px', color: '#999999', marginBottom: '20px' }}>
          How much <strong style={{ color: '#2C2C2A' }}>{itemName}</strong> do you have left?
          <br />
          <span style={{ fontSize: '12px' }}>Purchased: {quantityBought} {unit}</span>
        </p>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min={0}
              max={quantityBought}
              step={0.01}
              value={remaining}
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
          ~ {computedPercent}% consumed
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
            onClick={() => canConfirm && onConfirm(computedPercent)}
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
            {isLoading ? 'Saving...' : 'Set Amount'}
          </button>
        </div>
      </div>
    </div>
  );
}
