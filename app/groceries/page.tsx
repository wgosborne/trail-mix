'use client';

import { useSession } from 'next-auth/react';
import { GroceryForm } from '@/components/GroceryForm';
import { GroceryInventory } from '@/components/GroceryInventory';
import { WeekNavigator } from '@/components/WeekNavigator';
import { ReceiptUploader } from '@/components/ReceiptUploader';
import { RestaurantLookup } from '@/components/RestaurantLookup';
import { MealsTab } from '@/components/MealsTab';
import { useGuestGroceries } from '@/hooks/useGuestGroceries';
import { showSuccess, showError } from '@/lib/toast';
import { clearCache } from '@/lib/cache';
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
  const [activeTab, setActiveTab] = useState<'add' | 'inventory' | 'meals'>('inventory');

  // Fetch groceries for authenticated users
  useEffect(() => {
    if (session?.user) {
      fetchAuthGroceries(guestGroceries.weekStart);
    }
  }, [session, guestGroceries.weekStart]);

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

  const handleMealLogged = () => {
    // Clear caches and refresh inventory and nutrition data
    clearCache(`nutrition_${guestGroceries.weekStart}`);
    clearCache(`groceries_${guestGroceries.weekStart}`);
    fetchAuthGroceries(guestGroceries.weekStart);
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
          if (newGrocery.weekStart === guestGroceries.weekStart) {
            setAuthGroceries([...authGroceries, newGrocery]);
            // Clear nutrition cache so dashboard fetches fresh data
            clearCache(`nutrition_${guestGroceries.weekStart}`);
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
          body: JSON.stringify({ percentConsumed, weekStart: guestGroceries.weekStart }),
        });

        if (response.ok) {
          const updated = await response.json();
          setAuthGroceries(authGroceries.map((g) => (g.id === id ? updated : g)));
          // Clear nutrition cache for current week AND previous week (carryover items)
          const prevWeekStart = getPreviousWeekStart(guestGroceries.weekStart);
          clearCache(`nutrition_${guestGroceries.weekStart}`);
          clearCache(`nutrition_${prevWeekStart}`);
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

  const getPreviousWeekStart = (weekStart: string): string => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() - 7);
    return date.toISOString().split('T')[0];
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
          // Clear nutrition cache so dashboard fetches fresh data
          clearCache(`nutrition_${guestGroceries.weekStart}`);
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


  const handleItemsExtracted = (items: ParsedItem[]) => {
    setExtractedItems(items);
    setSelectedItemIndex(items.length > 0 ? 0 : null);

    // Scroll to grocery form
    setTimeout(() => {
      const formElement = document.getElementById('grocery-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
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
      .filter((g) => g.weekStart === guestGroceries.weekStart)
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
          background: '#8B7FB8',
          marginBottom: '12px'
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Grocery Inventory</h1>
        <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>
          {session ? `Welcome, ${session.user?.name}` : 'Using guest mode'} — Add groceries and track your weekly nutrition.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('add')}
          style={{
            flex: 1,
            minWidth: '140px',
            padding: '12px 20px',
            borderRadius: '24px',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: activeTab === 'add'
              ? '#8B7FB8'
              : '#F5F5F5',
            color: activeTab === 'add' ? '#FFFFFF' : '#666666',
            boxShadow: activeTab === 'add' ? '0 4px 12px rgba(139, 127, 184, 0.3)' : 'none'
          }}
        >
          Add+
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            flex: 1,
            minWidth: '140px',
            padding: '12px 20px',
            borderRadius: '24px',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: activeTab === 'inventory'
              ? '#8B7FB8'
              : '#F5F5F5',
            color: activeTab === 'inventory' ? '#FFFFFF' : '#666666',
            boxShadow: activeTab === 'inventory' ? '0 4px 12px rgba(139, 127, 184, 0.3)' : 'none'
          }}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('meals')}
          style={{
            flex: 1,
            minWidth: '140px',
            padding: '12px 20px',
            borderRadius: '24px',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: activeTab === 'meals'
              ? '#8B7FB8'
              : '#F5F5F5',
            color: activeTab === 'meals' ? '#FFFFFF' : '#666666',
            boxShadow: activeTab === 'meals' ? '0 4px 12px rgba(139, 127, 184, 0.3)' : 'none'
          }}
        >
          Meals
        </button>
      </div>

      {/* Add Tab Content */}
      {activeTab === 'add' && (
        <div>
          {session?.user && <WeekNavigator value={guestGroceries.weekStart} onWeekChange={guestGroceries.setWeekStart} />}

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <ReceiptUploader onItemsExtracted={handleItemsExtracted} />
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <RestaurantLookup onAddItem={handleAddGrocery} />
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }} id="grocery-form">
            <GroceryForm
              onSubmit={extractedItems.length > 0 ? handleAddExtractedItem : handleAddGrocery}
              loading={loading}
              initialFoodName={currentExtractedItem?.name}
              initialQuantity={currentExtractedItem?.quantity}
              initialUnit={currentExtractedItem?.unit}
              initialNutrition={currentExtractedItem?.nutrition}
              extractedItemsCount={extractedItems.length}
              currentItemIndex={selectedItemIndex}
              onSkip={handleSkipExtractedItem}
            />
          </div>
        </div>
      )}

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <div style={{ marginTop: '24px' }}>
          {session?.user && <WeekNavigator value={guestGroceries.weekStart} onWeekChange={guestGroceries.setWeekStart} />}

          {isLoadingGroceries ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ backgroundColor: '#F8F5FF', border: '1px solid #E8E4DC', borderRadius: '10px', padding: '16px', minHeight: '100px', animation: 'pulse 2s infinite' }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            </div>
          ) : (
            <GroceryInventory
              groceries={groceriesToDisplay}
              onUpdate={handleUpdateGrocery}
              onDelete={handleDeleteGrocery}
              weekStart={guestGroceries.weekStart}
            />
          )}
        </div>
      )}

      {/* Meals Tab Content */}
      {activeTab === 'meals' && (
        <div style={{ marginTop: '24px' }}>
          {session?.user && <WeekNavigator value={guestGroceries.weekStart} onWeekChange={guestGroceries.setWeekStart} />}
          <MealsTab weekStart={guestGroceries.weekStart} onMealLogged={handleMealLogged} />
        </div>
      )}
    </div>
  );
}
