'use client';

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
  if (!groceries.length) {
    return <p className="text-gray-500 text-center py-8">No groceries added yet.</p>;
  }

  // Calculate total macros based on percentConsumed
  const totalMacros = groceries.reduce(
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

  return (
    <div className="space-y-4">
      {/* Grocery Items */}
      <div className="space-y-3">
        {groceries.map((grocery) => (
          <div key={grocery.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{grocery.foodName}</p>
                <p className="text-sm text-gray-500">
                  {grocery.quantityBought} {grocery.unit}
                </p>
              </div>
              <button
                onClick={() => onDelete(grocery.id)}
                className="text-red-500 hover:text-red-700 font-medium text-sm ml-2"
              >
                Delete
              </button>
            </div>

            {/* Nutrition Info */}
            <div className="bg-gray-50 p-2 rounded mb-3 text-xs grid grid-cols-4 gap-2">
              <div>
                <p className="text-gray-500">Cal</p>
                <p className="font-semibold">{Math.round(grocery.nutrition.calories)}</p>
              </div>
              <div>
                <p className="text-gray-500">Protein</p>
                <p className="font-semibold">{grocery.nutrition.protein.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-gray-500">Carbs</p>
                <p className="font-semibold">{grocery.nutrition.carbs.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-gray-500">Fat</p>
                <p className="font-semibold">{grocery.nutrition.fat.toFixed(1)}g</p>
              </div>
            </div>

            {/* Consumed Slider */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={grocery.percentConsumed}
                onChange={(e) => onUpdate(grocery.id, parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium w-14 text-right">
                {Math.round(grocery.percentConsumed)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Total Macros */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">Weekly Total Macros</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-gray-600 text-sm">Calories</p>
            <p className="text-xl font-bold text-blue-600">{Math.round(totalMacros.calories)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Protein</p>
            <p className="text-xl font-bold text-blue-600">{totalMacros.protein.toFixed(1)}g</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Carbs</p>
            <p className="text-xl font-bold text-blue-600">{totalMacros.carbs.toFixed(1)}g</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Fat</p>
            <p className="text-xl font-bold text-blue-600">{totalMacros.fat.toFixed(1)}g</p>
          </div>
        </div>
      </div>
    </div>
  );
}
