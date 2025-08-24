import { useState, useEffect } from 'react'
import { supabase, auth } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simple initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Initial session check:', session?.user?.id)
        
        if (session?.user) {
          // Set immediate user from session so UI can proceed
          setUser({ 
            user: session.user, 
            profile: { 
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
              role: 'player'
            }
          })

          // Proactively ensure the profile row exists (avoids 406/FK issues)
          auth.ensureProfile().catch(() => {})

          // Fetch full profile in background without blocking loading
          ;(async () => {
            try {
              const { user, profile } = await auth.getCurrentUser()
              if (user && profile) {
                setUser({ user, profile })
              }
            } catch (e) {
              console.warn('Background profile fetch failed:', e)
            }
          })()
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Session check failed:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Also listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.id)
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      } else if (session?.user) {
        // Immediately set session user so UI proceeds
        setUser({ 
          user: session.user, 
          profile: { 
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
            role: 'player' 
          } 
        })
  // Ensure profile exists as soon as we sign in
  auth.ensureProfile().catch(() => {})
        // Fetch full profile in background
        ;(async () => {
          try {
            const { user, profile } = await auth.getCurrentUser()
            if (user && profile) {
              setUser({ user, profile })
            }
          } catch (error) {
            console.warn('Auth change background profile fetch failed:', error)
          }
        })()
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App
