import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const auth = {
  signIn: async (username, password) => {
    // Convert username to email format for Supabase auth
    const email = `${username.toLowerCase()}@investo.local`
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Ensures a profile row exists for the current user via RPC
  ensureProfile: async () => {
    try {
      const { data, error } = await supabase.rpc('ensure_profile')
      if (error) return { data: null, error }
      return { data, error: null }
    } catch (e) {
      return { data: null, error: e }
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        return { user: null, profile: null }
      }
      
      if (user) {
        // Get profile data
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          // If no profile exists yet (406), try to create it and re-fetch
          if (profileError.status === 406) {
            const { error: ensureErr } = await auth.ensureProfile()
            if (!ensureErr) {
              // Retry select once
              const retry = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
              profile = retry.data
              profileError = retry.error
            }
          }
          if (profileError) {
            console.error('Error getting profile:', profileError)
            // Return user with default profile fallback
            return { 
              user, 
              profile: { 
                username: user.email?.split('@')[0] || 'user',
                role: 'player' 
              } 
            }
          }
        }
        
        return { user, profile }
      }
      
      return { user: null, profile: null }
    } catch (error) {
      console.error('Error in getCurrentUser:', error)
      return { user: null, profile: null }
    }
  }
}

// Game API functions
export const gameApi = {
  // Scenarios
  getScenarios: async () => {
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        *,
        scenario_stocks(*)
      `)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  getScenario: async (id) => {
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        *,
        scenario_stocks(*)
      `)
      .eq('id', id)
      .single()
    
    return { data, error }
  },

  createScenario: async (scenario) => {
    const { data, error } = await supabase
      .from('scenarios')
      .insert(scenario)
      .select()
      .single()
    
    return { data, error }
  },

  updateScenario: async (id, updates) => {
    const { data, error } = await supabase
      .from('scenarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  },

  // Scenario Stocks
  addStockToScenario: async (scenarioId, stock) => {
    const { data, error } = await supabase
      .from('scenario_stocks')
      .insert({ scenario_id: scenarioId, ...stock })
      .select()
      .single()
    
    return { data, error }
  },

  removeStockFromScenario: async (stockId) => {
    const { data, error } = await supabase
      .from('scenario_stocks')
      .delete()
      .eq('id', stockId)
    
    return { data, error }
  },

  // Trading
  placeOrder: async (scenarioId, scenarioStockId, order) => {
  // Make sure profile exists before any write
  await auth.ensureProfile().catch(() => {})
    const { data, error } = await supabase.rpc('place_order', {
      p_scenario_id: scenarioId,
      p_scenario_stock_id: scenarioStockId,
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_side: order.side,
      p_type: order.type,
      p_quantity: order.quantity,
      p_limit_price: order.limit_price
    })
    
    return { data, error }
  },

  // Portfolio
  getPortfolioValue: async (scenarioId) => {
  await auth.ensureProfile().catch(() => {})
    const { data, error } = await supabase.rpc('calculate_portfolio_value', {
      p_scenario_id: scenarioId,
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    })
    
    return { data, error }
  },

  getPositions: async (scenarioId) => {
    const { data, error } = await supabase
      .from('live_portfolio_view')
      .select('*')
      .eq('scenario_id', scenarioId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    
    return { data, error }
  },

  // Raw positions for realized P&L and quantities per stock
  getPositionsRaw: async (scenarioId) => {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    return { data, error }
  },

  getOrders: async (scenarioId) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        scenario_stocks(symbol, display_name)
      `)
      .eq('scenario_id', scenarioId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  getTrades: async (scenarioId) => {
    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        scenario_stocks(symbol, display_name)
      `)
      .eq('scenario_id', scenarioId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('ts', { ascending: false })
    
    return { data, error }
  },

  // Price data
  getLatestPrices: async (scenarioId) => {
    const { data, error } = await supabase
      .from('latest_prices')
      .select(`
        *,
        scenario_stocks!inner(scenario_id, symbol, display_name)
      `)
      .eq('scenario_stocks.scenario_id', scenarioId)
    
    return { data, error }
  },

  getPriceHistory: async (scenarioStockId, limit = 100) => {
    const { data, error } = await supabase
      .from('price_ticks')
      .select('*')
      .eq('scenario_stock_id', scenarioStockId)
      .order('ts', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },

  // Player state
  initializePlayerScenario: async (scenarioId) => {
  await auth.ensureProfile().catch(() => {})
    const { data, error } = await supabase.rpc('initialize_player_scenario_rpc', {
      p_scenario_id: scenarioId
    })
    
    return { data, error }
  },

  getPlayerState: async (scenarioId) => {
    const { data, error } = await supabase
      .from('player_scenario_state')
      .select('*')
      .eq('scenario_id', scenarioId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()
    return { data, error }
  },

  // Admin functions
  createTestScenario: async () => {
    const { data, error } = await supabase.rpc('create_test_scenario')
    return { data, error }
  },

  simulatePriceTick: async (scenarioStockId) => {
    const { data, error } = await supabase.rpc('simulate_price_tick', {
      p_scenario_stock_id: scenarioStockId
    })
    return { data, error }
  }
}

// Real-time subscriptions
export const subscriptions = {
  subscribeToPrices: (scenarioId, callback) => {
    return supabase
      .channel(`price_ticks_${scenarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'price_ticks',
          filter: `scenario_stock_id=in.(select id from scenario_stocks where scenario_id=eq.${scenarioId})`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to price ticks for a set of scenario_stock_ids
  subscribeToPricesForStocks: (stockIds, callback) => {
    const channels = []
    stockIds.forEach((id) => {
      const ch = supabase
        .channel(`price_ticks_${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'price_ticks',
            filter: `scenario_stock_id=eq.${id}`,
          },
          callback
        )
        .subscribe()
      channels.push(ch)
    })
    return channels
  },

  subscribeToTrades: (scenarioId, userId, callback) => {
    return supabase
      .channel(`trades_${scenarioId}_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `scenario_id=eq.${scenarioId}`
        },
        callback
      )
      .subscribe()
  },

  subscribeToScenarios: (callback) => {
    return supabase
      .channel('scenarios')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenarios'
        },
        callback
      )
      .subscribe()
  }
}
