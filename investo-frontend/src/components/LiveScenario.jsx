import { useState, useEffect, useRef } from 'react'
import { gameApi, subscriptions } from '../lib/supabase'
import TradingInterface from './TradingInterface'
import Portfolio from './Portfolio'
import OrderBook from './OrderBook'
import './LiveScenario.css'

export default function LiveScenario({ scenario, user, onBack, isAdmin }) {
  const [stocks, setStocks] = useState([])
  const [prices, setPrices] = useState({})
  const [portfolio, setPortfolio] = useState(null)
  const [positions, setPositions] = useState([])
  const [orders, setOrders] = useState([])
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStock, setSelectedStock] = useState(null)
  const [priceHistory, setPriceHistory] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  
  const priceSubscriptionRef = useRef(null)
  const priceChannelsRef = useRef([])
  const tradesSubscriptionRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    initializeScenario()
    setupRealTimeSubscriptions()
    startCountdown()
    
    return () => {
      cleanup()
    }
  }, [scenario.id])

  // After stocks load, subscribe per-stock for reliable price updates
  useEffect(() => {
    // Clean up old channels
    if (priceChannelsRef.current.length) {
      priceChannelsRef.current.forEach((ch) => ch.unsubscribe())
      priceChannelsRef.current = []
    }
    if (!stocks.length) return

    const ids = stocks.map(s => s.id)
    priceChannelsRef.current = subscriptions.subscribeToPricesForStocks(
      ids,
      (payload) => {
        const { new: newTick } = payload
        // Update local history for the specific stock quickly
        setPriceHistory(prev => {
          const stockId = newTick.scenario_stock_id
          const history = prev[stockId] || []
          return {
            ...prev,
            [stockId]: [...history.slice(-99), { timestamp: newTick.ts, price: newTick.price }]
          }
        })
        // Refresh price map
        loadPrices()
      }
    )
    
    return () => {
      if (priceChannelsRef.current.length) {
        priceChannelsRef.current.forEach((ch) => ch.unsubscribe())
        priceChannelsRef.current = []
      }
    }
  }, [stocks])

  useEffect(() => {
    if (stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0])
    }
  }, [stocks])

  const initializeScenario = async () => {
    try {
      setLoading(true)
      
      // Initialize player state if not admin
      if (!isAdmin) {
        await gameApi.initializePlayerScenario(scenario.id)
      }
      
      // Load scenario data
      const { data: scenarioData } = await gameApi.getScenario(scenario.id)
      setStocks(scenarioData.scenario_stocks || [])
      
      // Load current prices
      await loadPrices()
      
      // Load portfolio data
      if (!isAdmin) {
        await loadPortfolioData()
      }
      
    } catch (error) {
      console.error('Error initializing scenario:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPrices = async () => {
    try {
      const { data: pricesData } = await gameApi.getLatestPrices(scenario.id)
      const pricesMap = {}
      
      pricesData?.forEach(priceData => {
        if (priceData.scenario_stocks) {
          pricesMap[priceData.scenario_stocks.symbol] = {
            price: priceData.price,
            timestamp: priceData.ts,
            scenario_stock_id: priceData.scenario_stock_id
          }
        }
      })
      
      setPrices(pricesMap)
    } catch (error) {
      console.error('Error loading prices:', error)
    }
  }

  const loadPortfolioData = async () => {
    try {
      const [portfolioResult, positionsResult, ordersResult, tradesResult, rawPositions, playerState] = await Promise.all([
        gameApi.getPortfolioValue(scenario.id),
        gameApi.getPositions(scenario.id),
        gameApi.getOrders(scenario.id),
        gameApi.getTrades(scenario.id),
        gameApi.getPositionsRaw(scenario.id),
        gameApi.getPlayerState(scenario.id)
      ])
      
      // Fallback portfolio if backend returns null or zeros
      let pf = portfolioResult?.data
      if (!pf || (pf.cash === 0 && pf.market_value === 0 && positionsResult.data?.length)) {
        const freeCash = playerState.data?.cash_available ?? 0
        // Build a symbol->price map
        const priceMap = {}
        Object.entries(prices).forEach(([sym, p]) => { priceMap[sym] = p?.price ?? 0 })
        // Compute market value from live_portfolio_view or from raw positions if needed
        const mv = positionsResult.data?.reduce((sum, pos) => sum + (pos.quantity * (priceMap[pos.symbol] || 0)), 0) || 0
        const realized = rawPositions.data?.reduce((sum, rp) => sum + (rp.realized_pnl || 0), 0) || 0
        const unrealized = positionsResult.data?.reduce((sum, pos) => {
          const p = priceMap[pos.symbol] || 0
          return sum + ((p - pos.avg_cost) * pos.quantity)
        }, 0) || 0
        pf = {
          cash: freeCash,
          cash_locked: playerState.data?.cash_locked ?? 0,
          market_value: mv,
          equity: freeCash + mv,
          unrealized_pnl: unrealized,
          realized_pnl: realized,
        }
      }
      setPortfolio(pf)
      setPositions(positionsResult.data || [])
      setOrders(ordersResult.data || [])
      setTrades(tradesResult.data || [])
    } catch (error) {
      console.error('Error loading portfolio data:', error)
  // Show an empty portfolio instead of keeping the UI stuck on loading
  setPortfolio({ cash: 0, market_value: 0, equity: 0, unrealized_pnl: 0, realized_pnl: 0 })
    }
  }

  const setupRealTimeSubscriptions = () => {
    // Subscribe to price updates
    priceSubscriptionRef.current = subscriptions.subscribeToPrices(
      scenario.id,
      (payload) => {
        const { new: newTick } = payload
        console.log('New price tick:', newTick)
        
        // Update prices
        loadPrices()
        
        // Update price history for charts
        setPriceHistory(prev => {
          const stockId = newTick.scenario_stock_id
          const history = prev[stockId] || []
          
          return {
            ...prev,
            [stockId]: [...history.slice(-99), {
              timestamp: newTick.ts,
              price: newTick.price
            }]
          }
        })
      }
    )

    // Subscribe to trades (for portfolio updates)
    tradesSubscriptionRef.current = subscriptions.subscribeToTrades(
      scenario.id,
      user.user.id,
      (payload) => {
        console.log('New trade:', payload)
        loadPortfolioData()
      }
    )
  }

  const startCountdown = () => {
    const updateCountdown = () => {
      const now = new Date()
      const endTime = new Date(scenario.end_at)
      const timeDiff = endTime.getTime() - now.getTime()
      
      if (timeDiff > 0) {
        setTimeLeft(timeDiff)
      } else {
        setTimeLeft(0)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }

    updateCountdown()
    intervalRef.current = setInterval(updateCountdown, 1000)
  }

  const cleanup = () => {
    if (priceSubscriptionRef.current) {
      priceSubscriptionRef.current.unsubscribe()
    }
    if (priceChannelsRef.current.length) {
      priceChannelsRef.current.forEach((ch) => ch.unsubscribe())
      priceChannelsRef.current = []
    }
    if (tradesSubscriptionRef.current) {
      tradesSubscriptionRef.current.unsubscribe()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const handleOrderPlaced = () => {
    // Refresh portfolio data when order is placed
    loadPortfolioData()
  }

  const simulatePrice = async (stockSymbol) => {
    if (!isAdmin) return
    
    const stock = stocks.find(s => s.symbol === stockSymbol)
    if (stock) {
      try {
        await gameApi.simulatePriceTick(stock.id)
      } catch (error) {
        console.error('Error simulating price:', error)
      }
    }
  }

  const formatTimeLeft = (milliseconds) => {
    if (milliseconds <= 0) return 'Ended'
    
    const minutes = Math.floor(milliseconds / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getStatusColor = () => {
    if (scenario.status === 'live') return '#10b981'
    if (scenario.status === 'closed') return '#ef4444'
    return '#6b7280'
  }

  if (loading) {
    return <div className="loading">Loading scenario...</div>
  }

  const isLive = scenario.status === 'live' && timeLeft > 0
  const canTrade = !isAdmin && isLive

  return (
    <div className="live-scenario">
      <div className="scenario-header">
        <div className="header-left">
          <button onClick={onBack} className="btn-secondary btn-sm">
            ← Back
          </button>
          <div className="scenario-info">
            <h1>{scenario.title}</h1>
            <p className="scenario-prompt">{scenario.prompt}</p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="scenario-status">
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStatusColor() }}
            >
              {scenario.status}
            </div>
            {timeLeft !== null && (
              <div className="time-left">
                {timeLeft > 0 ? `Time: ${formatTimeLeft(timeLeft)}` : 'Ended'}
              </div>
            )}
          </div>
          
          {!isAdmin && portfolio && (
            <div className="portfolio-summary">
              <div className="equity">
                Equity: ${portfolio.equity?.toFixed(2) || '0.00'}
              </div>
              <div className="cash">
                Cash: ${portfolio.cash?.toFixed(2) || '0.00'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="scenario-content">
        <div className="left-panel">
          {/* Stock List */}
          <div className="stocks-panel">
            <h3>Stocks</h3>
            <div className="stocks-list">
              {stocks.map((stock) => {
                const priceData = prices[stock.symbol]
                const isSelected = selectedStock?.id === stock.id
                
                return (
                  <div
                    key={stock.id}
                    className={`stock-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedStock(stock)}
                  >
                    <div className="stock-header">
                      <span className="symbol">{stock.symbol}</span>
                      <span className="price">
                        ${priceData?.price?.toFixed(2) || stock.starting_price.toFixed(2)}
                      </span>
                    </div>
                    <div className="stock-name">{stock.display_name}</div>
                    
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          simulatePrice(stock.symbol)
                        }}
                        className="btn-simulate"
                      >
                        Simulate Price
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Trading Interface */}
          {canTrade && selectedStock && (
            <TradingInterface
              scenario={scenario}
              stock={selectedStock}
              currentPrice={prices[selectedStock.symbol]?.price || selectedStock.starting_price}
              onOrderPlaced={handleOrderPlaced}
            />
          )}
        </div>

  {/* Removed center panel (Price Chart) as requested */}

        <div className="right-panel">
          {!isAdmin && (
            <>
              {/* Portfolio */}
              <Portfolio
                portfolio={portfolio}
                positions={positions}
                prices={prices}
              />
              
              {/* Orders & Trades */}
              <OrderBook
                orders={orders}
                trades={trades}
              />
            </>
          )}
          
          {isAdmin && (
            <div className="admin-controls">
              <h3>Admin Controls</h3>
              <button
                onClick={() => gameApi.updateScenario(scenario.id, { status: 'closed' })}
                className="btn-danger"
                disabled={scenario.status !== 'live'}
              >
                Close Scenario
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
