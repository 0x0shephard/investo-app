import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import './OrderBook.css'

export default function OrderBook({ orders, trades }) {
  const [activeTab, setActiveTab] = useState('orders')

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      filled: '#10b981',
      partial: '#3b82f6',
      canceled: '#6b7280',
      rejected: '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  return (
    <div className="order-book">
      <div className="order-book-header">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders ({orders.length})
          </button>
          <button
            className={`tab ${activeTab === 'trades' ? 'active' : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            Trades ({trades.length})
          </button>
        </div>
      </div>

      <div className="order-book-content">
        {activeTab === 'orders' ? (
          <div className="orders-list">
            {orders.length === 0 ? (
              <div className="empty-state">
                <p>No orders yet</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="order-item">
                  <div className="order-header">
                    <div className="order-side">
                      <span className={`side-badge ${order.side}`}>
                        {order.side.toUpperCase()}
                      </span>
                      <span className="symbol">
                        {order.scenario_stocks?.symbol || 'N/A'}
                      </span>
                    </div>
                    
                    <div 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </div>
                  </div>
                  
                  <div className="order-details">
                    <div className="detail-row">
                      <span>Type:</span>
                      <span>{order.type}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span>Quantity:</span>
                      <span>{order.quantity}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span>Price:</span>
                      <span>
                        {order.type === 'market' 
                          ? `Market` 
                          : `$${order.limit_price?.toFixed(2) || '0.00'}`
                        }
                      </span>
                    </div>
                    
                    {order.filled_qty > 0 && (
                      <div className="detail-row">
                        <span>Filled:</span>
                        <span>
                          {order.filled_qty} @ ${order.avg_fill_price?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    )}
                    
                    <div className="detail-row">
                      <span>Time:</span>
                      <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="trades-list">
            {trades.length === 0 ? (
              <div className="empty-state">
                <p>No trades yet</p>
              </div>
            ) : (
              trades.map((trade) => (
                <div key={trade.id} className="trade-item">
                  <div className="trade-header">
                    <div className="trade-info">
                      <span className="symbol">
                        {trade.scenario_stocks?.symbol || 'N/A'}
                      </span>
                      <span className="quantity">{trade.qty}</span>
                    </div>
                    
                    <div className="trade-price">
                      ${trade.price.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="trade-details">
                    <div className="detail-row">
                      <span>Value:</span>
                      <span>${(trade.qty * trade.price).toFixed(2)}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span>Time:</span>
                      <span>{formatDistanceToNow(new Date(trade.ts), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
