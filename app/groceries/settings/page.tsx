export default function SettingsTab() {
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '3px',
          width: '36px',
          background: 'linear-gradient(to right, #8B7FB8, #D67BB8, #5B7FD4)',
          marginBottom: '12px'
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2A', marginBottom: '8px', letterSpacing: '-0.3px' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#999999', lineHeight: '1.5' }}>Manage your account, preferences, and integrations.</p>
      </div>

      <div style={{
        backgroundColor: '#F5F8FF',
        border: '1px solid #E8E4DC',
        borderRadius: '10px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '13px', color: '#999999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px' }}>Coming Soon</p>
        <p style={{ fontSize: '14px', color: '#2C2C2A' }}>Strava integration, macro goals, and account management will be available soon.</p>
      </div>
    </div>
  );
}
