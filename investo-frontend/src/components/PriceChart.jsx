import { useEffect, useRef } from 'react'
import './PriceChart.css'

export default function PriceChart({ stock, priceHistory, currentPrice }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    drawChart()
  }, [priceHistory, currentPrice])

  const drawChart = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    const rect = container.getBoundingClientRect()
    
    // Set canvas size
    canvas.width = rect.width
    canvas.height = rect.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // Prepare data
    const data = [...priceHistory]
    if (data.length === 0) {
      // Show starting price if no history
      data.push({
        timestamp: new Date().toISOString(),
        price: currentPrice
      })
    }

  // With a single point, draw a simple baseline around the price
  const singlePointMode = data.length < 2

    // Calculate scales
    const prices = data.map(d => parseFloat(d.price))
    let minPrice = Math.min(...prices)
    let maxPrice = Math.max(...prices)
    if (singlePointMode) {
      // Create a small window around the single price for visual context
      const p = prices[0]
      minPrice = p * 0.98
      maxPrice = p * 1.02
    }
    const priceRange = maxPrice - minPrice || (maxPrice * 0.02) || 1
    
    const timeRange = new Date(data[data.length - 1].timestamp).getTime() - 
                     new Date(data[0].timestamp).getTime()

    // Helper functions
    const xScale = (index) => padding + (index / (data.length - 1)) * (width - 2 * padding)
    const yScale = (price) => height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding)

    // Draw grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    // Horizontal grid lines (price levels)
    const priceSteps = 5
    for (let i = 0; i <= priceSteps; i++) {
      const price = minPrice + (priceRange * i / priceSteps)
      const y = yScale(price)
      
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()

      // Price labels
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(`$${price.toFixed(2)}`, padding - 5, y + 4)
    }

    // Vertical grid lines (time)
    const timeSteps = 5
    for (let i = 0; i <= timeSteps; i++) {
      const x = padding + (i / timeSteps) * (width - 2 * padding)
      
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // Draw price line
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.beginPath()
    if (singlePointMode) {
      const x0 = xScale(0)
      const y0 = yScale(prices[0])
      ctx.moveTo(padding, y0)
      ctx.lineTo(width - padding, y0)
      ctx.stroke()
    } else {
      data.forEach((point, index) => {
        const x = xScale(index)
        const y = yScale(parseFloat(point.price))
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Draw data points
    ctx.fillStyle = '#10b981'
    data.forEach((point, index) => {
      const x = xScale(index)
      const y = yScale(parseFloat(point.price))
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Draw current price indicator
    if (data.length > 0) {
      const lastPrice = parseFloat(data[data.length - 1].price)
      const y = yScale(lastPrice)
      
      // Horizontal line
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      ctx.setLineDash([])

      // Price label
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(`$${lastPrice.toFixed(2)}`, width - padding + 5, y + 4)
    }

    // Chart title
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`${stock.symbol} - ${stock.display_name}`, padding, 25)

    // Chart info
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(`Range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`, width - padding, 25)
  }

  return (
    <div className="price-chart" ref={containerRef}>
      <canvas ref={canvasRef} />
      
      <div className="chart-controls">
        <div className="chart-info">
          <span className="current-price">
            Current: ${currentPrice.toFixed(2)}
          </span>
          {priceHistory.length > 1 && (
            <span className="price-change">
              {(() => {
                const prev = priceHistory[priceHistory.length - 2]?.price || currentPrice
                const change = currentPrice - prev
                const changePercent = (change / prev) * 100
                const isPositive = change >= 0
                
                return (
                  <span className={isPositive ? 'positive' : 'negative'}>
                    {isPositive ? '+' : ''}${change.toFixed(2)} ({changePercent.toFixed(2)}%)
                  </span>
                )
              })()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
