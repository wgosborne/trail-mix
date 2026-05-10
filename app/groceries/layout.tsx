import { TabNavigation } from '@/components/TabNavigation';

export default function GroceriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TabNavigation />
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
