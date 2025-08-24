import { useState, useEffect } from 'react'
import { gameApi } from '../lib/supabase'
import StockManager from './StockManager'
import './ScenarioEditor.css'

export default function ScenarioEditor({ scenario, onSave, onCancel, user }) {
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    initial_cash: 10000,
    start_at: '',
    end_at: '',
    allow_short: false
  })
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (scenario) {
      setFormData({
        title: scenario.title || '',
        prompt: scenario.prompt || '',
        initial_cash: scenario.initial_cash || 10000,
        start_at: scenario.start_at ? new Date(scenario.start_at).toISOString().slice(0, 16) : '',
        end_at: scenario.end_at ? new Date(scenario.end_at).toISOString().slice(0, 16) : '',
        allow_short: scenario.allow_short || false
      })
      setStocks(scenario.scenario_stocks || [])
    } else {
      // Set default start and end times for new scenarios
      const now = new Date()
      const start = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now
      const end = new Date(now.getTime() + 65 * 60 * 1000) // 65 minutes from now
      
      setFormData(prev => ({
        ...prev,
        start_at: start.toISOString().slice(0, 16),
        end_at: end.toISOString().slice(0, 16)
      }))
    }
  }, [scenario])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.prompt.trim()) {
      newErrors.prompt = 'Prompt is required'
    }
    
    if (formData.initial_cash <= 0) {
      newErrors.initial_cash = 'Initial cash must be greater than 0'
    }
    
    if (!formData.start_at) {
      newErrors.start_at = 'Start time is required'
    }
    
    if (!formData.end_at) {
      newErrors.end_at = 'End time is required'
    }
    
    if (formData.start_at && formData.end_at) {
      const start = new Date(formData.start_at)
      const end = new Date(formData.end_at)
      if (end <= start) {
        newErrors.end_at = 'End time must be after start time'
      }
    }
    
    if (stocks.length === 0) {
      newErrors.stocks = 'At least one stock is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const scenarioData = {
        ...formData,
        created_by: user.user.id,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString()
      }
      
      let scenarioResult
      if (scenario) {
        // Update existing scenario
        scenarioResult = await gameApi.updateScenario(scenario.id, scenarioData)
      } else {
        // Create new scenario
        scenarioResult = await gameApi.createScenario(scenarioData)
      }
      
      if (scenarioResult.error) {
        throw scenarioResult.error
      }
      
      const scenarioId = scenarioResult.data.id
      
      // Update stocks
      if (scenario) {
        // For existing scenario, we need to handle stock updates
        // This is simplified - in production you'd want more sophisticated sync
        for (const stock of stocks) {
          if (!stock.id) {
            await gameApi.addStockToScenario(scenarioId, stock)
          }
        }
      } else {
        // For new scenario, add all stocks
        for (const stock of stocks) {
          await gameApi.addStockToScenario(scenarioId, stock)
        }
      }
      
      onSave()
    } catch (error) {
      console.error('Error saving scenario:', error)
      setErrors({ submit: 'Failed to save scenario. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scenario-editor">
      <div className="editor-header">
        <h2>{scenario ? 'Edit Scenario' : 'Create New Scenario'}</h2>
        <div className="header-actions">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Scenario'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="editor-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter scenario title"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="prompt">Scenario Description *</label>
            <textarea
              id="prompt"
              name="prompt"
              value={formData.prompt}
              onChange={handleInputChange}
              placeholder="Describe the trading scenario context..."
              rows={4}
              className={errors.prompt ? 'error' : ''}
            />
            {errors.prompt && <span className="error-message">{errors.prompt}</span>}
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="initial_cash">Initial Cash *</label>
              <input
                type="number"
                id="initial_cash"
                name="initial_cash"
                value={formData.initial_cash}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={errors.initial_cash ? 'error' : ''}
              />
              {errors.initial_cash && <span className="error-message">{errors.initial_cash}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="allow_short"
                  checked={formData.allow_short}
                  onChange={handleInputChange}
                />
                Allow Short Selling
              </label>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Schedule</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_at">Start Time *</label>
              <input
                type="datetime-local"
                id="start_at"
                name="start_at"
                value={formData.start_at}
                onChange={handleInputChange}
                className={errors.start_at ? 'error' : ''}
              />
              {errors.start_at && <span className="error-message">{errors.start_at}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="end_at">End Time *</label>
              <input
                type="datetime-local"
                id="end_at"
                name="end_at"
                value={formData.end_at}
                onChange={handleInputChange}
                className={errors.end_at ? 'error' : ''}
              />
              {errors.end_at && <span className="error-message">{errors.end_at}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Stocks</h3>
          <StockManager 
            stocks={stocks} 
            onStocksChange={setStocks}
            scenarioId={scenario?.id}
          />
          {errors.stocks && <span className="error-message">{errors.stocks}</span>}
        </div>

        {errors.submit && (
          <div className="error-message submit-error">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  )
}
