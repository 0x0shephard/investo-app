import { useState } from 'react'
import { auth } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await auth.signIn(username, password)
      
      if (error) {
        setError('Invalid username or password')
        return
      }

      if (data.user) {
        // The auth state change listener in App.jsx will handle setting the user
        // No need to call onLogin here, just let the auth state change
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <div>
          <h2>Investomania</h2>
          <p>Sign in with your assigned credentials</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              id="username"
              name="username"
              type="text"
              required
              className="form-input"
              placeholder="Username (e.g., YLES-001)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <input
              id="password"
              name="password"
              type="password"
              required
              className="form-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="form-group">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
