import { useState, useEffect } from 'react'
import { gameApi } from '../lib/supabase'
import ScenarioCard from './ScenarioCard'
import LiveScenario from './LiveScenario'
import './PlayerDashboard.css'

export default function PlayerDashboard({ user, onLogout }) {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list', 'live'

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    setLoading(true)
    const { data, error } = await gameApi.getScenarios()
    if (error) {
      console.error('Error loading scenarios:', error)
    } else {
      // Filter to show only live or closed scenarios for players
      const playerScenarios = data?.filter(s => 
        s.status === 'live' || s.status === 'closed' || s.status === 'scheduled'
      ) || []
      setScenarios(playerScenarios)
    }
    setLoading(false)
  }

  const handleJoinScenario = async (scenario) => {
    // Go to live view immediately; initialize in background
    setSelectedScenario(scenario)
    setViewMode('live')
    // Fire-and-forget init (place_order also ensures init if needed)
    try {
      await gameApi.initializePlayerScenario(scenario.id)
    } catch (e) {
      // Non-blocking
      console.warn('Initialize ignored:', e)
    }
  }

  if (viewMode === 'live' && selectedScenario) {
    return (
      <LiveScenario
        scenario={selectedScenario}
        user={user}
        onBack={() => setViewMode('list')}
        isAdmin={false}
      />
    )
  }

  return (
    <div className="player-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Investomania</h1>
        <div className="user-info">
          <span className="username">
            Welcome, {user.profile?.username}
          </span>
          <button onClick={onLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="actions-bar">
          <button onClick={loadScenarios} className="btn-secondary">
            Refresh Scenarios
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading scenarios...</div>
        ) : (
          <div className="scenarios-grid">
            {scenarios.length === 0 ? (
              <div className="empty-state">
                <h3>No active scenarios</h3>
                <p>Wait for an admin to create trading scenarios.</p>
              </div>
            ) : (
              scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onJoin={() => handleJoinScenario(scenario)}
                  isAdmin={false}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
