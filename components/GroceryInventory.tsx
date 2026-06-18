'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { ConfirmDialog } from './ConfirmDialog';
import { AdjustAmountDialog } from './AdjustAmountDialog';
import { EditNutritionDialog } from './EditNutritionDialog';
import { showSuccess, showError } from '@/lib/toast';
import { getMacroTags, getTagColor } from '@/lib/macro-tags';
import { clearCache } from '@/lib/cache';
import { useSession } from 'next-auth/react';

function renderPieLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, percent, name, color } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={color || "#2C2C2A"}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="500"
    >
      {name} {((percent || 0) * 100).toFixed(0)}%
    </text>
  );
}

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

interface MacroGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

interface GroceryInventoryProps {
  groceries: Grocery[];
  onUpdate: (id: string, percentConsumed: number) => void;
  onDelete: (id: string) => void;
  weekStart?: string;
}

export function GroceryInventory({ groceries, onUpdate, onDelete, weekStart }: GroceryInventoryProps) {
  const { data: session } = useSession();
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });
  const [macroGoals, setMacroGoals] = useState<MacroGoals | null>(null);
  const [adjustDialog, setAdjustDialog] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    quantityBought: number;
    unit: string;
    percentConsumed: number;
    isLoading: boolean;
  }>({ isOpen: false, id: '', name: '', quantityBought: 0, unit: '', percentConsumed: 0, isLoading: false });

  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    nutrition: {
      totalCalories: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
      fiberG: number | null;
    };
    isLoading: boolean;
  }>({
    isOpen: false,
    id: '',
    name: '',
    nutrition: { totalCalories: null, proteinG: null, carbsG: null, fatG: null, fiberG: null },
    isLoading: false,
  });

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

  const handleConfirmAdjust = async (newQuantity: number, percentConsumed: number) => {
    setAdjustDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/groceries/${adjustDialog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityBought: newQuantity,
          percentConsumed,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        showError(error.error || 'Failed to adjust quantity');
        setAdjustDialog((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      onUpdate(adjustDialog.id, percentConsumed);
      showSuccess(`Updated ${adjustDialog.name} to ${newQuantity} ${adjustDialog.unit}`);
      setAdjustDialog({ isOpen: false, id: '', name: '', quantityBought: 0, unit: '', percentConsumed: 0, isLoading: false });
    } catch (error) {
      showError('Failed to adjust quantity');
      setAdjustDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelAdjust = () => {
    setAdjustDialog({ isOpen: false, id: '', name: '', quantityBought: 0, unit: '', percentConsumed: 0, isLoading: false });
  };

  const handleEditClick = (
    id: string,
    name: string,
    nutrition: { totalCalories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null }
  ) => {
    setEditDialog({ isOpen: true, id, name, nutrition, isLoading: false });
  };

  const handleConfirmEdit = async (nutrition: {
    totalCalories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  }) => {
    setEditDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/groceries/${editDialog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutrition),
      });

      if (!response.ok) {
        const error = await response.json();
        showError(error.error || 'Failed to update nutrition');
        setEditDialog((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      onUpdate(editDialog.id, 0); // Trigger re-fetch of groceries
      // Clear nutrition cache for all weeks since nutrition data affects calculations
      if (typeof window !== 'undefined') {
        const keys = Object.keys(sessionStorage);
        keys.forEach((key) => {
          if (key.startsWith('nutrition_')) {
            clearCache(key);
          }
        });
      }
      showSuccess(`Updated ${editDialog.name} nutrition info`);
      setEditDialog({
        isOpen: false,
        id: '',
        name: '',
        nutrition: { totalCalories: null, proteinG: null, carbsG: null, fatG: null, fiberG: null },
        isLoading: false,
      });
    } catch (error) {
      showError('Failed to update nutrition');
      setEditDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelEdit = () => {
    setEditDialog({
      isOpen: false,
      id: '',
      name: '',
      nutrition: { totalCalories: null, proteinG: null, carbsG: null, fatG: null, fiberG: null },
      isLoading: false,
    });
  };

  // Fetch macro goals for authenticated users
  useEffect(() => {
    if (session?.user && weekStart) {
      const fetchGoals = async () => {
        try {
          const response = await fetch(`/api/nutrition?week=${weekStart}`);
          if (response.ok) {
            const data = await response.json();
            setMacroGoals(data.goals);
          }
        } catch (error) {
          console.error('Error fetching macro goals:', error);
        }
      };
      fetchGoals();
    }
  }, [session, weekStart]);

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

  const sortedGroceries = [...groceries].sort((a, b) => a.foodName.localeCompare(b.foodName));

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

  // Calculate macro breakdown for consumed pie chart (calories from each macro)
  const proteinCals = inventoryMacros.protein * 4;
  const carbsCals = inventoryMacros.carbs * 4;
  const fatCals = inventoryMacros.fat * 9;
  const macroBreakdownData = [
    { name: 'Protein', value: Math.round(proteinCals), color: '#8B7FB8' },
    { name: 'Carbs', value: Math.round(carbsCals), color: '#D67BB8' },
    { name: 'Fat', value: Math.round(fatCals), color: '#C9845F' },
  ];

  // Calculate goal macro breakdown (calories from each macro goal)
  let goalMacroBreakdownData = [
    { name: 'Protein', value: 0, color: '#8B7FB8' },
    { name: 'Carbs', value: 0, color: '#D67BB8' },
    { name: 'Fat', value: 0, color: '#C9845F' },
  ];

  if (macroGoals) {
    const goalProteinCals = macroGoals.dailyProtein * 4;
    const goalCarbsCals = macroGoals.dailyCarbs * 4;
    const goalFatCals = macroGoals.dailyFat * 9;
    goalMacroBreakdownData = [
      { name: 'Protein', value: Math.round(goalProteinCals), color: '#8B7FB8' },
      { name: 'Carbs', value: Math.round(goalCarbsCals), color: '#D67BB8' },
      { name: 'Fat', value: Math.round(goalFatCals), color: '#C9845F' },
    ];
  }

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
      <EditNutritionDialog
        isOpen={editDialog.isOpen}
        itemName={editDialog.name}
        currentNutrition={editDialog.nutrition}
        isLoading={editDialog.isLoading}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Inventory Total - Moved to Top */}
        <div
          style={{
            backgroundColor: '#F5F8FF',
            border: '1px solid #E8E4DC',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
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
          {/* Header - Clickable to toggle expand/collapse */}
          <button
            onClick={() => setIsInventoryExpanded(!isInventoryExpanded)}
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              cursor: 'pointer',
              padding: '0',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.opacity = '1';
            }}
          >
            <div
              style={{
                height: '3px',
                width: '24px',
                background: '#8B7FB8'
              }}
            />
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A', flex: 1, textAlign: 'left' }}>INVENTORY TOTAL</p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                transition: 'transform 0.3s ease',
                transform: isInventoryExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="#8B7FB8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 10 13 14 9"></polyline>
              </svg>
            </div>
          </button>

          {/* Summary Stats - Always visible */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', marginBottom: isInventoryExpanded ? '16px' : '0px', transition: 'margin-bottom 0.3s ease' }}>
            <div>
              <p data-macro-label="" style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Calories</p>
              <p data-macro-value="" style={{ fontSize: '18px', fontWeight: 700, color: '#5B7FD4' }}>{Math.round(inventoryMacros.calories)}</p>
            </div>
            <div>
              <p data-macro-label="" style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Protein</p>
              <p data-macro-value="" style={{ fontSize: '18px', fontWeight: 700, color: '#8B7FB8' }}>{inventoryMacros.protein.toFixed(1)}g</p>
            </div>
            <div>
              <p data-macro-label="" style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Carbs</p>
              <p data-macro-value="" style={{ fontSize: '18px', fontWeight: 700, color: '#D67BB8' }}>{inventoryMacros.carbs.toFixed(1)}g</p>
            </div>
            <div>
              <p data-macro-label="" style={{ fontSize: '11px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Fat</p>
              <p data-macro-value="" style={{ fontSize: '18px', fontWeight: 700, color: '#C9845F' }}>{inventoryMacros.fat.toFixed(1)}g</p>
            </div>
          </div>

          {/* Pie Charts - Collapse/Expand */}
          {isInventoryExpanded && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px', animation: 'fadeIn 0.3s ease' }}>
              <style>{`
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    max-height: 0;
                  }
                  to {
                    opacity: 1;
                    max-height: 300px;
                  }
                }
              `}</style>
              {/* Inventory Macros Pie Chart */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px', textAlign: 'center' }}>Inventory Macros</p>
                <div style={{ width: '100%', height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ left: 30, right: 30, top: 30, bottom: 30 }}>
                      <Pie
                        data={macroBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderPieLabel}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {macroBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${value} cal`}
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Goal Macros Pie Chart (only show if authenticated and goals available) */}
              {session?.user && macroGoals && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#999999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px', textAlign: 'center' }}>Goal Macros</p>
                  <div style={{ width: '100%', height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ left: 30, right: 30, top: 30, bottom: 30 }}>
                        <Pie
                          data={goalMacroBreakdownData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderPieLabel}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {goalMacroBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => `${value} cal`}
                          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grocery Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedGroceries.map((grocery) => (
          <div
            key={grocery.id}
            style={{
              backgroundColor: '#F8F5FF',
              border: '1px solid #E8E4DC',
              borderRadius: '10px',
              padding: '16px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: '4px', wordBreak: 'break-word' }}>{grocery.foodName}</p>
                <p style={{ fontSize: '12px', color: '#999999', marginBottom: '8px' }}>
                  {grocery.quantityBought} {grocery.unit}
                </p>

                {/* Macro Category Tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {getMacroTags(grocery.nutrition).map((tag) => {
                    const colors = getTagColor(tag);
                    return (
                      <span
                        key={tag}
                        style={{
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '2px' }}>
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
                    alignItems: 'center',
                    whiteSpace: 'nowrap'
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
                    alignItems: 'center',
                    whiteSpace: 'nowrap'
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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                flex: 1
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
              <button
                onClick={() => handleEditClick(grocery.id, grocery.foodName, {
                  totalCalories: grocery.nutrition.calories,
                  proteinG: grocery.nutrition.protein,
                  carbsG: grocery.nutrition.carbs,
                  fatG: grocery.nutrition.fat,
                  fiberG: null,
                })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5B7FD4',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  padding: '4px 6px',
                  marginLeft: '8px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#4A6FBE')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5B7FD4')}
              >
                Edit
              </button>
            </div>

            {/* Consumed Slider - Mobile Friendly */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValues[grocery.id] ?? grocery.percentConsumed}
                onChange={(e) => setSliderValues((prev) => ({ ...prev, [grocery.id]: parseFloat(e.target.value) }))}
                onTouchEnd={(e) => onUpdate(grocery.id, parseFloat((e.target as HTMLInputElement).value))}
                onPointerUp={(e) => onUpdate(grocery.id, parseFloat((e.target as HTMLInputElement).value))}
                style={{
                  flex: 1,
                  height: '12px',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  outline: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: `linear-gradient(to right, #8B7FB8 0%, #8B7FB8 ${sliderValues[grocery.id] ?? grocery.percentConsumed}%, #E8E4DC ${sliderValues[grocery.id] ?? grocery.percentConsumed}%, #E8E4DC 100%)`
                } as any}
              />
              <style>{`
                input[type='range'] {
                  -webkit-appearance: none;
                  -webkit-touch-callout: none;
                  -webkit-user-select: none;
                  -moz-user-select: none;
                }

                input[type='range']::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 32px;
                  height: 32px;
                  background-color: #8B7FB8;
                  border-radius: 8px;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(139, 127, 184, 0.3);
                }

                input[type='range']::-moz-range-thumb {
                  width: 32px;
                  height: 32px;
                  background-color: #8B7FB8;
                  border-radius: 8px;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 4px 12px rgba(139, 127, 184, 0.3);
                }

                input[type='range']::-moz-range-track {
                  background: transparent;
                  border: none;
                }
              `}</style>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#2C2C2A', minWidth: '50px', textAlign: 'right' }}>
                {Math.round(sliderValues[grocery.id] ?? grocery.percentConsumed)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      </div>
      <style>{`
        @media (max-width: 400px) {
          [data-macro-label] {
            font-size: 10px !important;
          }
          [data-macro-value] {
            font-size: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
