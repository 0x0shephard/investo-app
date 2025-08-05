import { auth } from '../lib/supabase'

export default function Dashboard({ user, onLogout }) {
  const handleLogout = async () => {
    await auth.signOut()
    onLogout()
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Investomania</h1>
        <div className="user-info">
          <span className="username">
            Welcome, {user.profile?.username || user.user?.email}
          </span>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h3>Welcome to Investomania!</h3>
          <p>The ultimate trading challenge awaits.</p>
          <p style={{ fontSize: '0.875rem', color: '#b0bec5', marginTop: '1rem' }}>
            User ID: {user.user?.id}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#b0bec5' }}>
            Username: {user.profile?.username || 'Not set'}
          </p>
        </div>
      </div>
    </div>
  )
}
