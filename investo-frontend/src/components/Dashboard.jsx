import { auth } from '../lib/supabase'
import AdminDashboard from './AdminDashboard'
import PlayerDashboard from './PlayerDashboard'

export default function Dashboard({ user, onLogout }) {
  const handleLogout = async () => {
    await auth.signOut()
    onLogout()
  }

  // Route to appropriate dashboard based on user role
  if (user.profile?.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  } else {
    return <PlayerDashboard user={user} onLogout={handleLogout} />
  }
}
