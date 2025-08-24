import './Portfolio.css'

export default function Portfolio({ portfolio, positions, prices }) {
  if (!portfolio) {
    return (
      <div className="portfolio">
        <h3>Portfolio</h3>
        <div className="loading">Loading portfolio...</div>
      </div>
    )
  }

  const calculateUnrealizedPnL = (position) => {
    const priceData = prices[position.symbol]
    if (!priceData) return 0
    
    const currentValue = position.quantity * priceData.price
    const costBasis = position.quantity * position.avg_cost
    return currentValue - costBasis
  }

  const totalUnrealizedPnL = positions.reduce((sum, position) => {
    return sum + calculateUnrealizedPnL(position)
  }, 0)

  return (
    <div className="portfolio">
      <h3>Portfolio</h3>
      
      {/* Portfolio Summary */}
      <div className="portfolio-summary">
        <div className="summary-item">
          <span className="label">Total Equity</span>
          <span className="value">${portfolio.equity?.toFixed(2) || '0.00'}</span>
        </div>
        
        <div className="summary-item">
          <span className="label">Cash</span>
          <span className="value">${portfolio.cash?.toFixed(2) || '0.00'}</span>
        </div>
        
        <div className="summary-item">
          <span className="label">Market Value</span>
          <span className="value">${portfolio.market_value?.toFixed(2) || '0.00'}</span>
        </div>
        
        <div className="summary-item">
          <span className="label">Total P&L</span>
          <span className={`value ${(portfolio.realized_pnl + totalUnrealizedPnL) >= 0 ? 'positive' : 'negative'}`}>
            ${(portfolio.realized_pnl + totalUnrealizedPnL).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Positions */}
      <div className="positions">
        <h4>Positions</h4>
        
        {positions.length === 0 ? (
          <div className="no-positions">
            No positions yet. Start trading to build your portfolio.
          </div>
        ) : (
          <div className="positions-list">
            {positions.map((position, index) => {
              const priceData = prices[position.symbol]
              const currentPrice = priceData?.price || 0
              const marketValue = position.quantity * currentPrice
              const unrealizedPnL = calculateUnrealizedPnL(position)
              const unrealizedPnLPercent = (unrealizedPnL / (position.quantity * position.avg_cost)) * 100

              return (
                <div key={index} className="position-item">
                  <div className="position-header">
                    <span className="symbol">{position.symbol}</span>
                    <span className="quantity">{position.quantity}</span>
                  </div>
                  
                  <div className="position-details">
                    <div className="detail-row">
                      <span>Avg Cost:</span>
                      <span>${position.avg_cost?.toFixed(2) || '0.00'}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span>Current:</span>
                      <span>${currentPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span>Market Value:</span>
                      <span>${marketValue.toFixed(2)}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span>Unrealized P&L:</span>
                      <span className={unrealizedPnL >= 0 ? 'positive' : 'negative'}>
                        ${unrealizedPnL.toFixed(2)} ({unrealizedPnLPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* P&L Breakdown */}
      <div className="pnl-breakdown">
        <h4>P&L Breakdown</h4>
        
        <div className="pnl-item">
          <span className="label">Realized P&L</span>
          <span className={`value ${portfolio.realized_pnl >= 0 ? 'positive' : 'negative'}`}>
            ${portfolio.realized_pnl?.toFixed(2) || '0.00'}
          </span>
        </div>
        
        <div className="pnl-item">
          <span className="label">Unrealized P&L</span>
          <span className={`value ${totalUnrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
            ${totalUnrealizedPnL.toFixed(2)}
          </span>
        </div>
        
        <div className="pnl-item total">
          <span className="label">Total P&L</span>
          <span className={`value ${(portfolio.realized_pnl + totalUnrealizedPnL) >= 0 ? 'positive' : 'negative'}`}>
            ${(portfolio.realized_pnl + totalUnrealizedPnL).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
