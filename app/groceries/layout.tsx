import { TabNavigation } from '@/components/TabNavigation';

export default function GroceriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF'
    }}>
      <TabNavigation />
      <div style={{
        padding: '0',
        maxWidth: '100%'
      }}>
        {children}
      </div>
    </div>
  );
}
