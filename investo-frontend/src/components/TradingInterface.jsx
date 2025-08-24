import { useState, useEffect } from 'react'
import { gameApi } from '../lib/supabase'
import './TradingInterface.css'

export default function TradingInterface({ scenario, stock, currentPrice, onOrderPlaced }) {
  const [orderForm, setOrderForm] = useState({
    side: 'buy',
    type: 'market',
    quantity: '',
    limit_price: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setOrderForm(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear messages when user types
    setError('')
    setSuccess('')
  }

  const calculateOrderValue = () => {
    const quantity = parseFloat(orderForm.quantity) || 0
    const price = orderForm.type === 'market' 
      ? currentPrice 
      : parseFloat(orderForm.limit_price) || 0
    
    return quantity * price
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!orderForm.quantity || parseFloat(orderForm.quantity) <= 0) {
      setError('Please enter a valid quantity')
      return
    }
    
    if (orderForm.type === 'limit' && (!orderForm.limit_price || parseFloat(orderForm.limit_price) <= 0)) {
      setError('Please enter a valid limit price')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const orderData = {
        side: orderForm.side,
        type: orderForm.type,
        quantity: parseFloat(orderForm.quantity),
        limit_price: orderForm.type === 'limit' ? parseFloat(orderForm.limit_price) : null
      }
      
      const { data, error: orderError } = await gameApi.placeOrder(
        scenario.id,
        stock.id,
        orderData
      )
      
      if (orderError) {
        throw orderError
      }
      
      if (data && !data.success) {
        setError(data.error || 'Order failed')
        return
      }
      
      setSuccess(`${orderForm.side.toUpperCase()} order placed successfully!`)
      setOrderForm({
        side: 'buy',
        type: 'market',
        quantity: '',
        limit_price: ''
      })
      
      onOrderPlaced()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (error) {
      console.error('Error placing order:', error)
      setError(error.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const [limits, setLimits] = useState({ maxBuyQty: 1000, maxSellQty: 0, freeCash: 0 })

  useEffect(() => {
    // Fetch latest player state and positions to compute limits
    const loadLimits = async () => {
      try {
        const [stateRes, positionsRes] = await Promise.all([
          gameApi.getPlayerState(scenario.id),
          gameApi.getPositionsRaw(scenario.id)
        ])
        const freeCash = stateRes.data?.cash_available || 0
        const maxBuyQty = currentPrice > 0 ? Math.floor((freeCash / currentPrice) * 10000) / 10000 : 0
        const posForStock = positionsRes.data?.find(p => p.scenario_stock_id === stock.id)
        const maxSellQty = posForStock?.quantity || 0
        setLimits({ maxBuyQty, maxSellQty, freeCash })
      } catch (_) {}
    }
    loadLimits()
  }, [scenario.id, stock.id, currentPrice])

  const getMaxQuantity = () => {
    if (orderForm.side === 'buy') return limits.maxBuyQty
    return limits.maxSellQty
  }

  return (
    <div className="trading-interface">
      <h3>Place Order - {stock.symbol}</h3>
      
      <div className="current-price">
        Current Price: ${currentPrice.toFixed(2)}
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        {/* Buy/Sell Toggle */}
        <div className="order-side">
          <button
            type="button"
            className={`side-btn ${orderForm.side === 'buy' ? 'active buy' : ''}`}
            onClick={() => handleInputChange({ target: { name: 'side', value: 'buy' } })}
          >
            BUY
          </button>
          <button
            type="button"
            className={`side-btn ${orderForm.side === 'sell' ? 'active sell' : ''}`}
            onClick={() => handleInputChange({ target: { name: 'side', value: 'sell' } })}
          >
            SELL
          </button>
        </div>

        {/* Order Type */}
        <div className="form-group">
          <label>Order Type</label>
          <select
            name="type"
            value={orderForm.type}
            onChange={handleInputChange}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            name="quantity"
            value={orderForm.quantity}
            onChange={handleInputChange}
            placeholder="Enter quantity"
            min="0.0001"
            step="0.0001"
            max={getMaxQuantity()}
          />
        </div>

        {/* Limit Price (only for limit orders) */}
        {orderForm.type === 'limit' && (
          <div className="form-group">
            <label>Limit Price</label>
            <input
              type="number"
              name="limit_price"
              value={orderForm.limit_price}
              onChange={handleInputChange}
              placeholder="Enter limit price"
              min="0.01"
              step="0.01"
            />
          </div>
        )}

        {/* Order Summary */}
        {orderForm.quantity && (
          <div className="order-summary">
            <div className="summary-row">
              <span>Quantity:</span>
              <span>{orderForm.quantity}</span>
            </div>
            <div className="summary-row">
              <span>Price:</span>
              <span>
                ${orderForm.type === 'market' 
                  ? currentPrice.toFixed(2) 
                  : (orderForm.limit_price || '0.00')}
              </span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${calculateOrderValue().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Free Cash:</span>
              <span>${limits.freeCash.toFixed(2)}</span>
            </div>
            {orderForm.side === 'buy' && (
              <div className="summary-row">
                <span>Max Buyable:</span>
                <span>{getMaxQuantity()}</span>
              </div>
            )}
            {orderForm.side === 'sell' && (
              <div className="summary-row">
                <span>Owned:</span>
                <span>{limits.maxSellQty}</span>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !orderForm.quantity}
          className={`btn-submit ${orderForm.side}`}
        >
          {loading ? 'Placing Order...' : `${orderForm.side.toUpperCase()} ${stock.symbol}`}
        </button>

        {/* Messages */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </form>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>Quick Actions</h4>
        <div className="quick-buttons">
          {[10, 25, 50, 100].map(qty => (
            <button
              key={qty}
              type="button"
              onClick={() => setOrderForm(prev => ({ ...prev, quantity: qty.toString() }))}
              className="btn-quick"
            >
              {qty}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
