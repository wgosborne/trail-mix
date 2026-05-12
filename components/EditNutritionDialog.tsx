'use client';

import { useState, useEffect } from 'react';

interface EditNutritionDialogProps {
  isOpen: boolean;
  itemName: string;
  currentNutrition: {
    totalCalories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  };
  isLoading: boolean;
  onConfirm: (nutrition: {
    totalCalories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  }) => void;
  onCancel: () => void;
}

export function EditNutritionDialog({
  isOpen,
  itemName,
  currentNutrition,
  isLoading,
  onConfirm,
  onCancel,
}: EditNutritionDialogProps) {
  const [nutrition, setNutrition] = useState(currentNutrition);

  useEffect(() => {
    if (isOpen) {
      setNutrition(currentNutrition);
    }
  }, [isOpen, currentNutrition]);

  const handleChange = (field: keyof typeof nutrition, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setNutrition((prev) => ({
      ...prev,
      [field]: numValue !== null && !isNaN(numValue) ? numValue : null,
    }));
  };

  if (!isOpen) return null;

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
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2C2C2A', marginBottom: '6px' }}>
          Edit Nutrition
        </h2>
        <p style={{ fontSize: '13px', color: '#999999', marginBottom: '20px' }}>
          Update nutrition info for <strong style={{ color: '#2C2C2A' }}>{itemName}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {/* Calories */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: '6px' }}>
              Calories
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={nutrition.totalCalories ?? ''}
              onChange={(e) => handleChange('totalCalories', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E8E4DC',
                fontSize: '14px',
                fontWeight: 500,
                color: '#2C2C2A',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: '44px',
              }}
            />
          </div>

          {/* Protein */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: '6px' }}>
              Protein (g)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={nutrition.proteinG ?? ''}
              onChange={(e) => handleChange('proteinG', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E8E4DC',
                fontSize: '14px',
                fontWeight: 500,
                color: '#2C2C2A',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: '44px',
              }}
            />
          </div>

          {/* Carbs */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: '6px' }}>
              Carbs (g)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={nutrition.carbsG ?? ''}
              onChange={(e) => handleChange('carbsG', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E8E4DC',
                fontSize: '14px',
                fontWeight: 500,
                color: '#2C2C2A',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: '44px',
              }}
            />
          </div>

          {/* Fat */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: '6px' }}>
              Fat (g)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={nutrition.fatG ?? ''}
              onChange={(e) => handleChange('fatG', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E8E4DC',
                fontSize: '14px',
                fontWeight: 500,
                color: '#2C2C2A',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: '44px',
              }}
            />
          </div>

          {/* Fiber */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', display: 'block', marginBottom: '6px' }}>
              Fiber (g) <span style={{ color: '#999999' }}>optional</span>
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={nutrition.fiberG ?? ''}
              onChange={(e) => handleChange('fiberG', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E8E4DC',
                fontSize: '14px',
                fontWeight: 500,
                color: '#2C2C2A',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: '44px',
              }}
            />
          </div>
        </div>

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
            onClick={() => onConfirm(nutrition)}
            disabled={isLoading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #5B7FD4',
              backgroundColor: '#5B7FD4',
              color: '#FFFFFF',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
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
