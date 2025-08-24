import { formatDistanceToNow } from 'date-fns'
import './ScenarioCard.css'

export default function ScenarioCard({ scenario, onEdit, onView, onJoin, onStatusChange, isAdmin }) {
  const getStatusColor = (status) => {
    const colors = {
      draft: '#6b7280',
      scheduled: '#f59e0b',
      live: '#10b981',
      closed: '#ef4444',
      archived: '#9ca3af'
    }
    return colors[status] || '#6b7280'
  }

  const getTimeDisplay = () => {
    const now = new Date()
    const startAt = new Date(scenario.start_at)
    const endAt = new Date(scenario.end_at)

    if (scenario.status === 'live' && now < endAt) {
      return `Ends ${formatDistanceToNow(endAt, { addSuffix: true })}`
    } else if (scenario.status === 'scheduled' && now < startAt) {
      return `Starts ${formatDistanceToNow(startAt, { addSuffix: true })}`
    } else if (scenario.status === 'closed') {
      return `Ended ${formatDistanceToNow(endAt, { addSuffix: true })}`
    }
    return ''
  }

  const canJoin = scenario.status === 'live' || scenario.status === 'closed'
  const canEdit = isAdmin && (scenario.status === 'draft' || scenario.status === 'scheduled')

  return (
    <div className="scenario-card">
      <div className="scenario-header">
        <h3 className="scenario-title">{scenario.title}</h3>
        <div 
          className="scenario-status"
          style={{ backgroundColor: getStatusColor(scenario.status) }}
        >
          {scenario.status}
        </div>
      </div>

      <div className="scenario-body">
        <p className="scenario-prompt">{scenario.prompt}</p>
        
        <div className="scenario-details">
          <div className="detail-item">
            <span className="detail-label">Initial Cash:</span>
            <span className="detail-value">${scenario.initial_cash?.toLocaleString()}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Stocks:</span>
            <span className="detail-value">{scenario.scenario_stocks?.length || 0}</span>
          </div>
          
          {scenario.start_at && (
            <div className="detail-item">
              <span className="detail-label">Start:</span>
              <span className="detail-value">
                {new Date(scenario.start_at).toLocaleString()}
              </span>
            </div>
          )}
          
          {getTimeDisplay() && (
            <div className="time-display">
              {getTimeDisplay()}
            </div>
          )}
        </div>
      </div>

      <div className="scenario-actions">
        {isAdmin ? (
          <>
            {canEdit && (
              <button onClick={onEdit} className="btn-primary btn-sm">
                Edit
              </button>
            )}
            
            <button onClick={onView} className="btn-secondary btn-sm">
              View
            </button>
            
            {scenario.status === 'draft' && (
              <button 
                onClick={() => onStatusChange(scenario.id, 'scheduled')}
                className="btn-success btn-sm"
              >
                Schedule
              </button>
            )}
            
            {scenario.status === 'scheduled' && (
              <button 
                onClick={() => onStatusChange(scenario.id, 'live')}
                className="btn-success btn-sm"
              >
                Start Now
              </button>
            )}
            
            {scenario.status === 'live' && (
              <button 
                onClick={() => onStatusChange(scenario.id, 'closed')}
                className="btn-danger btn-sm"
              >
                Close
              </button>
            )}
          </>
        ) : (
          <>
            {canJoin && (
              <button onClick={onJoin} className="btn-primary">
                {scenario.status === 'live' ? 'Join Trading' : 'View Results'}
              </button>
            )}
            {scenario.status === 'scheduled' && (
              <div className="status-message">
                Starts {formatDistanceToNow(new Date(scenario.start_at), { addSuffix: true })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
