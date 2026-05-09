'use client';

import { useSession } from 'next-auth/react';
import { GroceryForm } from '@/components/GroceryForm';
import { GroceryInventory } from '@/components/GroceryInventory';
import { useGuestGroceries } from '@/hooks/useGuestGroceries';
import { useState } from 'react';

export default function CameraTab() {
  const { data: session } = useSession();
  const guestGroceries = useGuestGroceries();
  const [loading, setLoading] = useState(false);

  const handleAddGrocery = async (grocery: any) => {
    setLoading(true);
    try {
      if (session) {
        // For authenticated users, we'll wire the API in Day 2
        console.log('Auth user - API call not yet implemented:', grocery);
      } else {
        // For guest users, add to localStorage via the hook
        guestGroceries.addGrocery(grocery);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGrocery = (id: string, percentConsumed: number) => {
    guestGroceries.updateGrocery(id, { percentConsumed });
  };

  const handleDeleteGrocery = (id: string) => {
    guestGroceries.deleteGrocery(id);
  };

  // Filter groceries for current week
  const currentWeekGroceries = guestGroceries.groceries.filter(
    (g) => g.weekStart === guestGroceries.weekStart
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📷 Grocery Inventory</h1>
        <p className="text-gray-600">
          {session ? `Welcome, ${session.user?.name}!` : 'Using guest mode'} - Add groceries and track your nutrition.
        </p>
      </div>

      <GroceryForm onSubmit={handleAddGrocery} loading={loading} />

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">This Week's Groceries</h2>
        <GroceryInventory
          groceries={currentWeekGroceries}
          onUpdate={handleUpdateGrocery}
          onDelete={handleDeleteGrocery}
        />
      </div>
    </div>
  );
}
