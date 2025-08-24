import { useState } from 'react'
import { gameApi } from '../lib/supabase'
import './StockManager.css'

export default function StockManager({ stocks, onStocksChange, scenarioId }) {
  const [newStock, setNewStock] = useState({
    symbol: '',
    display_name: '',
    starting_price: ''
  })
  const [errors, setErrors] = useState({})

  const handleAddStock = () => {
    const trimmedSymbol = newStock.symbol.trim().toUpperCase()
    const trimmedName = newStock.display_name.trim()
    const price = parseFloat(newStock.starting_price)

    // Validation
    const newErrors = {}
    if (!trimmedSymbol) newErrors.symbol = 'Symbol is required'
    if (!trimmedName) newErrors.display_name = 'Display name is required'
    if (!price || price <= 0) newErrors.starting_price = 'Valid price is required'
    
    // Check for duplicate symbol
    if (stocks.some(stock => stock.symbol === trimmedSymbol)) {
      newErrors.symbol = 'Symbol already exists'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const stockToAdd = {
      symbol: trimmedSymbol,
      display_name: trimmedName,
      starting_price: price,
      price_mode: 'simulated'
    }

    onStocksChange([...stocks, stockToAdd])
    setNewStock({ symbol: '', display_name: '', starting_price: '' })
    setErrors({})
  }

  const handleRemoveStock = async (index) => {
    const stockToRemove = stocks[index]
    
    // If stock has an ID, it exists in database and needs to be removed
    if (stockToRemove.id && scenarioId) {
      try {
        await gameApi.removeStockFromScenario(stockToRemove.id)
      } catch (error) {
        console.error('Error removing stock from database:', error)
        return
      }
    }
    
    const updatedStocks = stocks.filter((_, i) => i !== index)
    onStocksChange(updatedStocks)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewStock(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddStock()
    }
  }

  // Predefined popular stocks for quick addition
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.25 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 380.75 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 450.00 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 220.30 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 145.80 },
    { symbol: 'META', name: 'Meta Platforms Inc.', price: 325.40 },
    { symbol: 'NFLX', name: 'Netflix Inc.', price: 485.20 }
  ]

  const handleQuickAdd = (stock) => {
    if (stocks.some(s => s.symbol === stock.symbol)) {
      return // Already exists
    }
    
    const stockToAdd = {
      symbol: stock.symbol,
      display_name: stock.name,
      starting_price: stock.price,
      price_mode: 'simulated'
    }
    
    onStocksChange([...stocks, stockToAdd])
  }

  return (
    <div className="stock-manager">
      {/* Current Stocks */}
      <div className="current-stocks">
        {stocks.length > 0 ? (
          <div className="stocks-list">
            {stocks.map((stock, index) => (
              <div key={index} className="stock-item">
                <div className="stock-info">
                  <span className="stock-symbol">{stock.symbol}</span>
                  <span className="stock-name">{stock.display_name}</span>
                  <span className="stock-price">${stock.starting_price}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStock(index)}
                  className="btn-remove"
                  title="Remove stock"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-stocks">
            <p>No stocks added yet. Add stocks below.</p>
          </div>
        )}
      </div>

      {/* Add New Stock */}
      <div className="add-stock-section">
        <h4>Add New Stock</h4>
        
        <div className="add-stock-form">
          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                name="symbol"
                value={newStock.symbol}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Symbol (e.g., AAPL)"
                className={errors.symbol ? 'error' : ''}
              />
              {errors.symbol && <span className="error-message">{errors.symbol}</span>}
            </div>
            
            <div className="form-group">
              <input
                type="text"
                name="display_name"
                value={newStock.display_name}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Display name (e.g., Apple Inc.)"
                className={errors.display_name ? 'error' : ''}
              />
              {errors.display_name && <span className="error-message">{errors.display_name}</span>}
            </div>
            
            <div className="form-group">
              <input
                type="number"
                name="starting_price"
                value={newStock.starting_price}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Starting price"
                min="0.01"
                step="0.01"
                className={errors.starting_price ? 'error' : ''}
              />
              {errors.starting_price && <span className="error-message">{errors.starting_price}</span>}
            </div>
            
            <button
              type="button"
              onClick={handleAddStock}
              className="btn-primary btn-sm"
            >
              Add Stock
            </button>
          </div>
        </div>

        {/* Quick Add Popular Stocks */}
        <div className="quick-add-section">
          <h5>Quick Add Popular Stocks</h5>
          <div className="popular-stocks">
            {popularStocks.map((stock) => {
              const alreadyAdded = stocks.some(s => s.symbol === stock.symbol)
              return (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => handleQuickAdd(stock)}
                  disabled={alreadyAdded}
                  className={`stock-quick-add ${alreadyAdded ? 'disabled' : ''}`}
                >
                  <span className="symbol">{stock.symbol}</span>
                  <span className="price">${stock.price}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
