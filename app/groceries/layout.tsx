import { TabNavigation } from '@/components/TabNavigation';
import { Header } from '@/components/Header';

export default function GroceriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Header />
      <div style={{
        flex: 1,
        paddingBottom: '80px',
        paddingTop: '52px',
        maxWidth: '100%',
        overflow: 'auto'
      }}>
        {children}
      </div>
      <TabNavigation />
    </div>
  );
}
