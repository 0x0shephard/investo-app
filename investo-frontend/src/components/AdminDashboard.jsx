import { useState, useEffect } from 'react'
import { gameApi } from '../lib/supabase'
import ScenarioCard from './ScenarioCard'
import ScenarioEditor from './ScenarioEditor'
import LiveScenario from './LiveScenario'
import './AdminDashboard.css'

export default function AdminDashboard({ user, onLogout }) {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list', 'edit', 'live'

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    setLoading(true)
    const { data, error } = await gameApi.getScenarios()
    if (error) {
      console.error('Error loading scenarios:', error)
    } else {
      setScenarios(data || [])
    }
    setLoading(false)
  }

  const handleCreateScenario = () => {
    setSelectedScenario(null)
    setViewMode('edit')
  }

  const handleEditScenario = (scenario) => {
    setSelectedScenario(scenario)
    setViewMode('edit')
  }

  const handleViewScenario = (scenario) => {
    setSelectedScenario(scenario)
    setViewMode('live')
  }

  const handleScenarioSaved = () => {
    setViewMode('list')
    loadScenarios()
  }

  const handleCreateTestScenario = async () => {
    const { data, error } = await gameApi.createTestScenario()
    if (error) {
      console.error('Error creating test scenario:', error)
    } else {
      console.log('Test scenario created:', data)
      loadScenarios()
    }
  }

  const handleStatusChange = async (scenarioId, newStatus) => {
    const { error } = await gameApi.updateScenario(scenarioId, { status: newStatus })
    if (error) {
      console.error('Error updating scenario status:', error)
    } else {
      loadScenarios()
    }
  }

  if (viewMode === 'edit') {
    return (
      <ScenarioEditor
        scenario={selectedScenario}
        onSave={handleScenarioSaved}
        onCancel={() => setViewMode('list')}
        user={user}
      />
    )
  }

  if (viewMode === 'live' && selectedScenario) {
    return (
      <LiveScenario
        scenario={selectedScenario}
        user={user}
        onBack={() => setViewMode('list')}
        isAdmin={true}
      />
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <div className="user-info">
          <span className="username">
            Welcome, {user.profile?.username} (Admin)
          </span>
          <button onClick={onLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="actions-bar">
          <button onClick={handleCreateScenario} className="btn-primary">
            Create New Scenario
          </button>
          <button onClick={handleCreateTestScenario} className="btn-secondary">
            Create Test Scenario
          </button>
          <button onClick={loadScenarios} className="btn-secondary">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading scenarios...</div>
        ) : (
          <div className="scenarios-grid">
            {scenarios.length === 0 ? (
              <div className="empty-state">
                <h3>No scenarios yet</h3>
                <p>Create your first trading scenario to get started.</p>
              </div>
            ) : (
              scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onEdit={() => handleEditScenario(scenario)}
                  onView={() => handleViewScenario(scenario)}
                  onStatusChange={handleStatusChange}
                  isAdmin={true}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
