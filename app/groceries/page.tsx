'use client';

import { useSession } from 'next-auth/react';
import { GroceryForm } from '@/components/GroceryForm';
import { GroceryInventory } from '@/components/GroceryInventory';
import { WeekNavigator } from '@/components/WeekNavigator';
import { ReceiptUploader } from '@/components/ReceiptUploader';
import { useGuestGroceries } from '@/hooks/useGuestGroceries';
import { showSuccess, showError } from '@/lib/toast';
import { useState, useEffect } from 'react';

interface AuthGrocery {
  id: string;
  foodName: string;
  quantityBought: number;
  unit: string;
  percentConsumed: number;
  totalCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  dateAdded: string;
  weekStart: string;
}

interface DisplayGrocery {
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

export default function CameraTab() {
  const { data: session } = useSession();
  const guestGroceries = useGuestGroceries();
  const [loading, setLoading] = useState(false);
  const [authGroceries, setAuthGroceries] = useState<AuthGrocery[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ParsedItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    const dayOfWeek = d.getUTCDay();
    const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d.setUTCDate(diff));
    return monday.toISOString().split('T')[0];
  });

  // Fetch groceries for authenticated users
  useEffect(() => {
    if (session?.user) {
      fetchAuthGroceries(weekStart);
    }
  }, [session, weekStart]);

  const fetchAuthGroceries = async (week: string) => {
    setAuthLoading(true);
    try {
      const response = await fetch(`/api/groceries?weekStart=${week}`);
      if (response.ok) {
        const groceries = await response.json();
        setAuthGroceries(groceries);
      } else if (response.status !== 401) {
        console.error('Failed to fetch groceries:', response.status);
      }
    } catch (error) {
      console.error('Error fetching groceries:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddGrocery = async (grocery: any) => {
    setLoading(true);
    try {
      if (session?.user) {
        // For authenticated users, use API
        const response = await fetch('/api/groceries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodName: grocery.foodName,
            quantityBought: grocery.quantityBought,
            unit: grocery.unit,
            totalCalories: grocery.nutrition?.calories,
            proteinG: grocery.nutrition?.protein,
            carbsG: grocery.nutrition?.carbs,
            fatG: grocery.nutrition?.fat,
            fiberG: grocery.nutrition?.fiber,
            dateAdded: new Date().toISOString().split('T')[0],
          }),
        });

        if (response.ok) {
          const newGrocery = await response.json();
          // Only add if it's for the current week being viewed
          if (newGrocery.weekStart === weekStart) {
            setAuthGroceries([...authGroceries, newGrocery]);
          }
          showSuccess(`Added ${grocery.quantityBought} ${grocery.unit} ${grocery.foodName}`);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to add grocery' }));
          showError(errorData.error || 'Failed to add grocery');
        }
      } else {
        // For guest users, add to localStorage
        guestGroceries.addGrocery(grocery);
        showSuccess(`Added ${grocery.quantityBought} ${grocery.unit} ${grocery.foodName}`);
      }
    } catch (error) {
      showError('Network error. Please try again.');
      console.error('Error adding grocery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGrocery = async (id: string, percentConsumed: number) => {
    if (session?.user) {
      // For authenticated users, use API
      try {
        const response = await fetch(`/api/groceries/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ percentConsumed }),
        });

        if (response.ok) {
          const updated = await response.json();
          setAuthGroceries(authGroceries.map((g) => (g.id === id ? updated : g)));
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to update' }));
          showError(errorData.error || 'Failed to update grocery');
        }
      } catch (error) {
        showError('Network error. Please try again.');
        console.error('Error updating grocery:', error);
      }
    } else {
      // For guest users, update localStorage
      guestGroceries.updateGrocery(id, { percentConsumed });
    }
  };

  const handleDeleteGrocery = async (id: string) => {
    if (session?.user) {
      // For authenticated users, use API
      try {
        const response = await fetch(`/api/groceries/${id}`, {
          method: 'DELETE',
        });

        if (response.ok || response.status === 204) {
          setAuthGroceries(authGroceries.filter((g) => g.id !== id));
          showSuccess('Grocery deleted');
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }));
          showError(errorData.error || 'Failed to delete grocery');
        }
      } catch (error) {
        showError('Network error. Please try again.');
        console.error('Error deleting grocery:', error);
      }
    } else {
      // For guest users, use localStorage
      guestGroceries.deleteGrocery(id);
      showSuccess('Grocery deleted');
    }
  };

  const handleWeekChange = (newWeekStart: string) => {
    setWeekStart(newWeekStart);
  };

  const handleItemsExtracted = (items: ParsedItem[]) => {
    setExtractedItems(items);
    setSelectedItemIndex(items.length > 0 ? 0 : null);
  };

  const handleAddExtractedItem = async (grocery: any) => {
    // Add the grocery
    await handleAddGrocery(grocery);

    // Move to next extracted item
    if (selectedItemIndex !== null && selectedItemIndex < extractedItems.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1);
    } else {
      // All items processed, clear the list
      setExtractedItems([]);
      setSelectedItemIndex(null);
    }
  };

  const handleSkipExtractedItem = () => {
    if (selectedItemIndex !== null && selectedItemIndex < extractedItems.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1);
    } else {
      setExtractedItems([]);
      setSelectedItemIndex(null);
    }
  };

  const currentExtractedItem = selectedItemIndex !== null ? extractedItems[selectedItemIndex] : null;

  // Transform auth groceries to display format
  const transformAuthGrocery = (g: AuthGrocery): DisplayGrocery => ({
    id: g.id,
    foodName: g.foodName,
    quantityBought: g.quantityBought,
    unit: g.unit,
    percentConsumed: g.percentConsumed,
    nutrition: {
      calories: g.totalCalories || 0,
      protein: g.proteinG || 0,
      carbs: g.carbsG || 0,
      fat: g.fatG || 0,
    },
  });

  // Use appropriate groceries based on auth status
  const groceriesToDisplay: DisplayGrocery[] = session?.user
    ? authGroceries.map(transformAuthGrocery)
    : guestGroceries.groceries
      .filter((g) => g.weekStart === weekStart)
      .map((g) => ({
        id: g.id,
        foodName: g.foodName,
        quantityBought: g.quantityBought,
        unit: g.unit,
        percentConsumed: g.percentConsumed,
        nutrition: g.nutrition,
      }));
  const isLoadingGroceries = session?.user ? authLoading : false;

  return (
    <div style={{ padding: '16px 20px', maxWidth: '100%' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '3px',
          width: '36px',
          background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
          marginBottom: '12px'
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Grocery Inventory</h1>
        <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>
          {session ? `Welcome, ${session.user?.name}` : 'Using guest mode'} — Add groceries and track your weekly nutrition.
        </p>
      </div>

      {session?.user && <WeekNavigator onWeekChange={handleWeekChange} />}

      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <ReceiptUploader onItemsExtracted={handleItemsExtracted} />
      </div>

      {extractedItems.length > 0 && currentExtractedItem && (
        <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', backgroundColor: '#F5F8FF', border: '1px solid #D67BB8', borderRadius: '10px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px' }}>
              Extracted Item {selectedItemIndex! + 1} of {extractedItems.length}
            </h3>
            <p style={{ fontSize: '13px', color: '#666666' }}>
              {currentExtractedItem.name} - {currentExtractedItem.quantity} {currentExtractedItem.unit}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSkipExtractedItem}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid #E8E4DC',
                backgroundColor: '#FFFFFF',
                color: '#2C2C2A',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={() => {
                // Trigger the form with this item's data
                const formElement = document.getElementById('grocery-form') as HTMLFormElement;
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid #8B7FB8',
                backgroundColor: '#8B7FB8',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              Add with Nutrition
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', marginBottom: '20px' }} id="grocery-form">
        <GroceryForm
          onSubmit={extractedItems.length > 0 ? handleAddExtractedItem : handleAddGrocery}
          loading={loading}
          initialFoodName={currentExtractedItem?.name}
          initialQuantity={currentExtractedItem?.quantity}
          initialUnit={currentExtractedItem?.unit}
          initialNutrition={currentExtractedItem?.nutrition}
        />
      </div>

      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div
            style={{
              height: '3px',
              width: '24px',
              background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)'
            }}
          />
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#2C2C2A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            This Week
          </h2>
        </div>
        {isLoadingGroceries ? (
          <div style={{ textAlign: 'center', color: '#999999', padding: '32px 0', fontSize: '13px' }}>Loading groceries...</div>
        ) : (
          <GroceryInventory
            groceries={groceriesToDisplay}
            onUpdate={handleUpdateGrocery}
            onDelete={handleDeleteGrocery}
          />
        )}
      </div>
    </div>
  );
}
