'use client';

interface MealIngredient {
  groceryId: string;
  groceryName: string;
  quantity: number;
  unit: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface Meal {
  id: string;
  name: string;
  ingredients: MealIngredient[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface EatMealDialogProps {
  isOpen: boolean;
  meal: Meal | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EatMealDialog({
  isOpen,
  meal,
  isLoading,
  onConfirm,
  onCancel,
}: EatMealDialogProps) {
  if (!isOpen || !meal) return null;

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
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#2C2C2A',
            marginBottom: '12px',
          }}
        >
          Log Meal: {meal.name}
        </h2>

        <p
          style={{
            fontSize: '14px',
            color: '#666666',
            marginBottom: '20px',
            lineHeight: '1.5',
          }}
        >
          This will add all ingredients to your consumed nutrition for the day.
        </p>

        {/* Nutrition Summary */}
        <div
          style={{
            backgroundColor: '#F8F5FF',
            border: '1px solid #E8E4DC',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
            gap: '12px',
          }}
        >
          {/* Calories */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#5B7FD4',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: '6px',
              }}
            >
              Calories
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#2C2C2A',
                margin: 0,
              }}
            >
              {Math.round(meal.nutrition.calories)}
            </p>
          </div>

          {/* Protein */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#8B7FB8',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: '6px',
              }}
            >
              Protein
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#2C2C2A',
                margin: 0,
              }}
            >
              {meal.nutrition.protein.toFixed(1)}g
            </p>
          </div>

          {/* Carbs */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#D67BB8',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: '6px',
              }}
            >
              Carbs
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#2C2C2A',
                margin: 0,
              }}
            >
              {meal.nutrition.carbs.toFixed(1)}g
            </p>
          </div>

          {/* Fat */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#C9845F',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: '6px',
              }}
            >
              Fat
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#2C2C2A',
                margin: 0,
              }}
            >
              {meal.nutrition.fat.toFixed(1)}g
            </p>
          </div>
        </div>

        {/* Ingredients Breakdown */}
        <div style={{ marginBottom: '20px' }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#999999',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              marginBottom: '8px',
            }}
          >
            Ingredients ({meal.ingredients.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {meal.ingredients.map((ing, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#F5F5F5',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  color: '#666666',
                }}
              >
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#2C2C2A' }}>
                  {ing.quantity} {ing.unit} {ing.groceryName}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#999999' }}>
                  {ing.nutrition.calories.toFixed(0)} cal | {ing.nutrition.protein.toFixed(1)}g P
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
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
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #155724',
              backgroundColor: '#155724',
              color: '#FFFFFF',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#0D3D1E';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#155724';
              }
            }}
          >
            {isLoading ? 'Logging...' : 'Log Meal'}
          </button>
        </div>
      </div>
    </div>
  );
}
