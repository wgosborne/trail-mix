import { TabNavigation } from '@/components/TabNavigation';

export default function GroceriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        flex: 1,
        paddingBottom: '80px',
        maxWidth: '100%',
        overflow: 'auto'
      }}>
        {children}
      </div>
      <TabNavigation />
    </div>
  );
}
