'use client';

import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { AdjustAmountDialog } from './AdjustAmountDialog';
import { showSuccess } from '@/lib/toast';

interface Grocery {
  id: string;
  foodName: string;
  quantityBought: number;
  unit: string;
  percentConsumed: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface GroceryInventoryProps {
  groceries: Grocery[];
  onUpdate: (id: string, percentConsumed: number) => void;
  onDelete: (id: string) => void;
}

export function GroceryInventory({ groceries, onUpdate, onDelete }: GroceryInventoryProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });
  const [adjustDialog, setAdjustDialog] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    quantityBought: number;
    unit: string;
    percentConsumed: number;
    isLoading: boolean;
  }>({ isOpen: false, id: '', name: '', quantityBought: 0, unit: '', percentConsumed: 0, isLoading: false });

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDelete = () => {
    onDelete(deleteConfirm.id);
    setDeleteConfirm({ isOpen: false, id: '', name: '' });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, id: '', name: '' });
  };

  const handleAdjustClick = (id: string, name: string, quantityBought: number, unit: string, percentConsumed: number) => {
    setAdjustDialog({
      isOpen: true,
      id,
      name,
      quantityBought,
      unit,
      percentConsumed,
      isLoading: false,
    });
  };

  const handleConfirmAdjust = (newPercent: number) => {
    setAdjustDialog((prev) => ({ ...prev, isLoading: true }));
    onUpdate(adjustDialog.id, newPercent);
    showSuccess(`Updated ${adjustDialog.name} to ${newPercent}% consumed`);
    setAdjustDialog({ isOpen: false, id: '', name: '', quantityBought: 0, unit: '', percentConsumed: 0, isLoading: false });
  };

  const handleCancelAdjust = () => {
    setAdjustDialog({ isOpen: false, id: '', name: '', quantityBought: 0, unit: '', percentConsumed: 0, isLoading: false });
  };
  if (!groceries.length) {
    return (
      <p
        className="text-center py-12 font-medium"
        style={{ color: '#999999' }}
      >
        No groceries added yet.
      </p>
    );
  }

  // Calculate consumed macros based on percentConsumed
  const consumedMacros = groceries.reduce(
    (acc, grocery) => {
      const consumedFactor = grocery.percentConsumed / 100;
      return {
        calories: acc.calories + grocery.nutrition.calories * consumedFactor,
        protein: acc.protein + grocery.nutrition.protein * consumedFactor,
        carbs: acc.carbs + grocery.nutrition.carbs * consumedFactor,
        fat: acc.fat + grocery.nutrition.fat * consumedFactor,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Calculate total macros from all purchased groceries (inventory total)
  const inventoryMacros = groceries.reduce(
    (acc, grocery) => ({
      calories: acc.calories + grocery.nutrition.calories,
      protein: acc.protein + grocery.nutrition.protein,
      carbs: acc.carbs + grocery.nutrition.carbs,
      fat: acc.fat + grocery.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Grocery?"
        message={`Remove "${deleteConfirm.name}" from your inventory?`}
        confirmText="Delete"
        cancelText="Keep"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      <AdjustAmountDialog
        isOpen={adjustDialog.isOpen}
        itemName={adjustDialog.name}
        quantityBought={adjustDialog.quantityBought}
        unit={adjustDialog.unit}
        currentPercentConsumed={adjustDialog.percentConsumed}
        isLoading={adjustDialog.isLoading}
        onConfirm={handleConfirmAdjust}
        onCancel={handleCancelAdjust}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Inventory Total - Moved to Top */}
        <div
          style={{
            backgroundColor: '#F5F8FF',
            border: '1px solid #E8E4DC',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div
              style={{
                height: '3px',
                width: '24px',
                background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)'
              }}
            />
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>INVENTORY TOTAL</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '12px', textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Calories</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#5B7FD4' }}>{Math.round(inventoryMacros.calories)}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Protein</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#8B7FB8' }}>{inventoryMacros.protein.toFixed(1)}g</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Carbs</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#D67BB8' }}>{inventoryMacros.carbs.toFixed(1)}g</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Fat</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#C9845F' }}>{inventoryMacros.fat.toFixed(1)}g</p>
            </div>
          </div>
        </div>

        {/* Grocery Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groceries.map((grocery) => (
          <div
            key={grocery.id}
            style={{
              backgroundColor: '#F8F5FF',
              border: '1px solid #E8E4DC',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: '4px' }}>{grocery.foodName}</p>
                <p style={{ fontSize: '12px', color: '#999999' }}>
                  {grocery.quantityBought} {grocery.unit}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginLeft: '12px' }}>
                <button
                  onClick={() => handleAdjustClick(grocery.id, grocery.foodName, grocery.quantityBought, grocery.unit, grocery.percentConsumed)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#5B7FD4',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    transition: 'color 0.2s',
                    padding: '6px 8px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#4A6FBE')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#5B7FD4')}
                >
                  Adjust
                </button>
                <button
                  onClick={() => handleDeleteClick(grocery.id, grocery.foodName)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#D67BB8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    transition: 'color 0.2s',
                    padding: '6px 8px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#B85A9A')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#D67BB8')}
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Nutrition Info - Color-coded cards - Responsive */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {/* Calories - Blue */}
              <div
                style={{
                  backgroundColor: '#F5F8FF',
                  border: '1px solid #5B7FD4',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center'
                }}
              >
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#5B7FD4', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Cal</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{Math.round(grocery.nutrition.calories)}</p>
              </div>

              {/* Protein - Purple */}
              <div
                style={{
                  backgroundColor: '#F8F5FF',
                  border: '1px solid #8B7FB8',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center'
                }}
              >
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#8B7FB8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Protein</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{grocery.nutrition.protein.toFixed(1)}g</p>
              </div>

              {/* Carbs - Pink */}
              <div
                style={{
                  backgroundColor: '#FFF5F8',
                  border: '1px solid #D67BB8',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center'
                }}
              >
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#D67BB8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Carbs</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{grocery.nutrition.carbs.toFixed(1)}g</p>
              </div>

              {/* Fat - Tan */}
              <div
                style={{
                  backgroundColor: '#FFF8F5',
                  border: '1px solid #C9845F',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center'
                }}
              >
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#C9845F', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Fat</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{grocery.nutrition.fat.toFixed(1)}g</p>
              </div>
            </div>

            {/* Consumed Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={grocery.percentConsumed}
                onChange={(e) => onUpdate(grocery.id, parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  height: '8px',
                  backgroundColor: '#E8E4DC',
                  borderRadius: '4px',
                  appearance: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  WebkitAppearance: 'slider-horizontal'
                } as any}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', minWidth: '50px', textAlign: 'right' }}>
                {Math.round(grocery.percentConsumed)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      </div>
    </>
  );
}
