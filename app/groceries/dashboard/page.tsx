export default function DashboardTab() {
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '3px',
          width: '36px',
          background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
          marginBottom: '12px'
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Weekly Summary</h1>
        <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Your nutrition breakdown and training metrics.</p>
      </div>

      <div style={{
        backgroundColor: '#F8F5FF',
        border: '1px solid #E8E4DC',
        borderRadius: '10px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '13px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px' }}>Coming Soon</p>
        <p style={{ fontSize: '14px', color: '#2C2C2A' }}>Dashboard visualization and Strava integration will be available in the next phase.</p>
      </div>
    </div>
  );
}
