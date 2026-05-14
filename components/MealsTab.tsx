'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from './ConfirmDialog';
import { EatMealDialog } from './EatMealDialog';
import { showSuccess, showError } from '@/lib/toast';

interface Meal {
  id: string;
  mealName: string;
  description?: string;
  ingredients: Array<{
    id: string;
    groceryId: string;
    quantityUsed: number;
    grocery: {
      foodName: string;
      unit: string;
      totalCalories: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
    };
  }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface MealsTabProps {
  weekStart: string;
}

export function MealsTab({ weekStart }: MealsTabProps) {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({ isOpen: false, id: '', name: '' });

  const [eatDialog, setEatDialog] = useState<{
    isOpen: boolean;
    meal: Meal | null;
    isLoading: boolean;
  }>({ isOpen: false, meal: null, isLoading: false });

  // Fetch meals for this week
  useEffect(() => {
    fetchMeals();
  }, [weekStart]);

  const fetchMeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/meals?week=${weekStart}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meals');
      }
      const data = await response.json();
      setMeals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching meals:', err);
      setError('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`/api/meals/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }

      setMeals(meals.filter((m) => m.id !== deleteConfirm.id));
      showSuccess(`Deleted "${deleteConfirm.name}"`);
      setDeleteConfirm({ isOpen: false, id: '', name: '' });
    } catch (err) {
      console.error('Error deleting meal:', err);
      showError('Failed to delete meal');
    }
  };

  const handleEatClick = (meal: Meal) => {
    const transformedMeal = {
      id: meal.id,
      name: meal.mealName,
      ingredients: meal.ingredients.map((ing) => {
        const quantityBought = ing.grocery.quantityBought || 1;
        const caloriesPerUnit = (ing.grocery.totalCalories || 0) / quantityBought;
        const proteinPerUnit = (ing.grocery.proteinG || 0) / quantityBought;
        const carbsPerUnit = (ing.grocery.carbsG || 0) / quantityBought;
        const fatPerUnit = (ing.grocery.fatG || 0) / quantityBought;

        return {
          groceryId: ing.groceryId,
          groceryName: ing.grocery.foodName,
          quantity: ing.quantityUsed,
          unit: ing.grocery.unit,
          nutrition: {
            calories: caloriesPerUnit * ing.quantityUsed,
            protein: proteinPerUnit * ing.quantityUsed,
            carbs: carbsPerUnit * ing.quantityUsed,
            fat: fatPerUnit * ing.quantityUsed,
          },
        };
      }),
      nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    };

    // Calculate total nutrition
    transformedMeal.ingredients.forEach((ing) => {
      transformedMeal.nutrition.calories += ing.nutrition.calories;
      transformedMeal.nutrition.protein += ing.nutrition.protein;
      transformedMeal.nutrition.carbs += ing.nutrition.carbs;
      transformedMeal.nutrition.fat += ing.nutrition.fat;
    });

    setEatDialog({ isOpen: true, meal: transformedMeal as any, isLoading: false });
  };

  const handleConfirmEat = async () => {
    if (!eatDialog.meal) return;

    setEatDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/meals/${eatDialog.meal.id}/eat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to log meal');
      }

      // Remove meal from list after eating
      setMeals(meals.filter((m) => m.id !== eatDialog.meal!.id));
      showSuccess(`Logged "${eatDialog.meal.name}" as eaten`);
      setEatDialog({ isOpen: false, meal: null, isLoading: false });
    } catch (err) {
      console.error('Error eating meal:', err);
      showError('Failed to log meal');
      setEatDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ height: '200px', backgroundColor: '#E8E4DC', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ height: '200px', backgroundColor: '#E8E4DC', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#FFEBEE',
        border: '1px solid #EF9A9A',
        borderRadius: '10px',
        padding: '16px',
        textAlign: 'center',
        color: '#C62828',
        fontSize: '14px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{error}</p>
        <button
          onClick={fetchMeals}
          style={{
            backgroundColor: '#C62828',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Meal?"
        message={`Remove "${deleteConfirm.name}" from your meal templates?`}
        confirmText="Delete"
        cancelText="Keep"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
      />

      <EatMealDialog
        isOpen={eatDialog.isOpen}
        meal={eatDialog.meal}
        isLoading={eatDialog.isLoading}
        onConfirm={handleConfirmEat}
        onCancel={() => setEatDialog({ isOpen: false, meal: null, isLoading: false })}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Create New Meal Button */}
        <button
          onClick={() => router.push('/groceries/meals/new')}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#8B7FB8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#7A6FA7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#8B7FB8';
          }}
        >
          + Create New Meal
        </button>

        {/* Meals List */}
        {meals.length === 0 ? (
          <p
            className="text-center py-12 font-medium"
            style={{ color: '#999999', padding: '24px' }}
          >
            No meals yet. Create one to get started!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {meals.map((meal) => (
              <div
                key={meal.id}
                onClick={() => router.push(`/groceries/meals/${meal.id}`)}
                style={{
                  backgroundColor: '#F8F5FF',
                  border: '1px solid #E8E4DC',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.1), 0 12px 30px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
                  cursor: 'pointer',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', fontSize: '15px' }}>
                      {meal.mealName}
                    </p>
                    <p style={{ fontSize: '12px', color: '#999999', marginBottom: '8px' }}>
                      {meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEatClick(meal);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#155724',
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
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#0D3D1E')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#155724')}
                    >
                      Eat
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(meal.id, meal.mealName);
                      }}
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

                {/* Nutrition Cards - Responsive Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                  gap: '8px'
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
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{Math.round(meal.nutrition.calories)}</p>
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
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{meal.nutrition.protein.toFixed(1)}g</p>
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
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{meal.nutrition.carbs.toFixed(1)}g</p>
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
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A' }}>{meal.nutrition.fat.toFixed(1)}g</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
