'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Grocery {
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
  dateAdded: string; // YYYY-MM-DD
  weekStart: string; // YYYY-MM-DD
}

interface GuestGroceriesContextType {
  groceries: Grocery[];
  addGrocery: (grocery: Omit<Grocery, 'id'>) => void;
  updateGrocery: (id: string, updates: Partial<Grocery>) => void;
  deleteGrocery: (id: string) => void;
  weekStart: string;
  setWeekStart: (week: string) => void;
  excludedDays: number[];
  toggleExcludedDay: (dayIndex: number) => void;
}

const GuestGroceriesContext = createContext<GuestGroceriesContextType | undefined>(undefined);

export function GuestGroceriesProvider({ children }: { children: React.ReactNode }) {
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [weekStart, setWeekStartState] = useState<string>(getCurrentWeekStart());
  const [excludedDaysByWeek, setExcludedDaysByWeek] = useState<Record<string, number[]>>({});
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('trail_mix_guest_groceries');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setGroceries(data.groceries || []);
        setWeekStartState(data.weekStart || getCurrentWeekStart());
        setExcludedDaysByWeek(data.excludedDays || {});
      } catch (e) {
        console.error('Failed to load guest groceries', e);
      }
    }
    setMounted(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        'trail_mix_guest_groceries',
        JSON.stringify({ groceries, weekStart, excludedDays: excludedDaysByWeek })
      );
    }
  }, [groceries, weekStart, excludedDaysByWeek, mounted]);

  const addGrocery = (grocery: Omit<Grocery, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setGroceries([...groceries, { ...grocery, id }]);
  };

  const updateGrocery = (id: string, updates: Partial<Grocery>) => {
    setGroceries(groceries.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const deleteGrocery = (id: string) => {
    setGroceries(groceries.filter((g) => g.id !== id));
  };

  const setWeekStart = (week: string) => {
    setWeekStartState(week);
  };

  const toggleExcludedDay = (dayIndex: number) => {
    setExcludedDaysByWeek((prev) => {
      const current = prev[weekStart] || [];
      if (current.includes(dayIndex)) {
        return {
          ...prev,
          [weekStart]: current.filter((d) => d !== dayIndex),
        };
      } else {
        return {
          ...prev,
          [weekStart]: [...current, dayIndex],
        };
      }
    });
  };

  return (
    <GuestGroceriesContext.Provider
      value={{
        groceries,
        addGrocery,
        updateGrocery,
        deleteGrocery,
        weekStart,
        setWeekStart,
        excludedDays: excludedDaysByWeek[weekStart] || [],
        toggleExcludedDay,
      }}
    >
      {children}
    </GuestGroceriesContext.Provider>
  );
}

export function useGuestGroceries() {
  const context = useContext(GuestGroceriesContext);
  if (!context) {
    throw new Error('useGuestGroceries must be used within GuestGroceriesProvider');
  }
  return context;
}

function getCurrentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysFromMonday);
  return monday.toISOString().split('T')[0];
}
