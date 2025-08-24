-- Investo Trading Game Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE scenario_status AS ENUM ('draft', 'scheduled', 'live', 'closed', 'archived');
CREATE TYPE user_role AS ENUM ('admin', 'player');
CREATE TYPE order_side AS ENUM ('buy', 'sell');
CREATE TYPE order_type AS ENUM ('market', 'limit');
CREATE TYPE order_status AS ENUM ('pending', 'filled', 'partial', 'canceled', 'rejected');
CREATE TYPE price_mode AS ENUM ('live', 'simulated', 'static_curve');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'player',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenarios table
CREATE TABLE scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    initial_cash DECIMAL(15,2) DEFAULT 10000.00,
    status scenario_status DEFAULT 'draft',
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    allow_short BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    iteration_group UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_at > start_at)
);

-- Scenario stocks
CREATE TABLE scenario_stocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    display_name TEXT NOT NULL,
    starting_price DECIMAL(10,2) NOT NULL CHECK (starting_price > 0),
    price_mode price_mode DEFAULT 'simulated',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(scenario_id, symbol)
);

-- Price ticks for real-time price data
CREATE TABLE price_ticks (
    id BIGSERIAL PRIMARY KEY,
    scenario_stock_id UUID REFERENCES scenario_stocks(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ DEFAULT NOW(),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    source TEXT DEFAULT 'system'
);

-- Player scenario state (cash management per scenario)
CREATE TABLE player_scenario_state (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    cash_available DECIMAL(15,2) DEFAULT 0,
    cash_locked DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(scenario_id, user_id),
    CHECK (cash_available >= 0 AND cash_locked >= 0)
);

-- Orders table
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    scenario_stock_id UUID REFERENCES scenario_stocks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    side order_side NOT NULL,
    type order_type DEFAULT 'market',
    quantity DECIMAL(10,4) NOT NULL CHECK (quantity > 0),
    limit_price DECIMAL(10,2) CHECK (limit_price IS NULL OR limit_price > 0),
    status order_status DEFAULT 'pending',
    filled_qty DECIMAL(10,4) DEFAULT 0,
    avg_fill_price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE trades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    scenario_stock_id UUID REFERENCES scenario_stocks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    qty DECIMAL(10,4) NOT NULL CHECK (qty > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    ts TIMESTAMPTZ DEFAULT NOW()
);

-- Positions table (materialized for performance)
CREATE TABLE positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    scenario_stock_id UUID REFERENCES scenario_stocks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    quantity DECIMAL(10,4) DEFAULT 0,
    avg_cost DECIMAL(10,2) DEFAULT 0,
    realized_pnl DECIMAL(15,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(scenario_id, scenario_stock_id, user_id)
);

-- Portfolio snapshots for leaderboard and historical tracking
CREATE TABLE portfolio_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ DEFAULT NOW(),
    cash DECIMAL(15,2) NOT NULL,
    market_value DECIMAL(15,2) NOT NULL,
    equity DECIMAL(15,2) NOT NULL,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0,
    realized_pnl DECIMAL(15,2) DEFAULT 0
);

-- Scenario events for audit trail
CREATE TABLE scenario_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    ts TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for scenario events
CREATE INDEX idx_scenario_events_scenario_ts ON scenario_events (scenario_id, ts DESC);

-- Views for easier querying
CREATE VIEW latest_prices AS
SELECT DISTINCT ON (scenario_stock_id) 
    scenario_stock_id,
    price,
    ts
FROM price_ticks 
ORDER BY scenario_stock_id, ts DESC;

CREATE VIEW live_portfolio_view AS
SELECT 
    p.scenario_id,
    p.user_id,
    p.scenario_stock_id,
    ss.symbol,
    ss.display_name,
    p.quantity,
    p.avg_cost,
    lp.price as current_price,
    p.quantity * lp.price as market_value,
    (lp.price - p.avg_cost) * p.quantity as unrealized_pnl
FROM positions p
JOIN scenario_stocks ss ON p.scenario_stock_id = ss.id
LEFT JOIN latest_prices lp ON p.scenario_stock_id = lp.scenario_stock_id
WHERE p.quantity != 0;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scenario_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Scenarios
CREATE POLICY "Anyone can view scenarios" ON scenarios FOR SELECT USING (true);
CREATE POLICY "Admins can manage scenarios" ON scenarios FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Scenario stocks
CREATE POLICY "Anyone can view scenario stocks" ON scenario_stocks FOR SELECT USING (true);
CREATE POLICY "Admins can manage scenario stocks" ON scenario_stocks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Price ticks (public read-only for game data)
CREATE POLICY "Anyone can view price ticks" ON price_ticks FOR SELECT USING (true);
CREATE POLICY "System can insert price ticks" ON price_ticks FOR INSERT WITH CHECK (true);

-- Player scenario state
CREATE POLICY "Users can view their own state" ON player_scenario_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage player state" ON player_scenario_state FOR ALL USING (true);

-- Orders
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can place orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trades
CREATE POLICY "Users can view their own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create trades" ON trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all trades" ON trades FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Positions
CREATE POLICY "Users can view their own positions" ON positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage positions" ON positions FOR ALL USING (true);
CREATE POLICY "Admins can view all positions" ON positions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Portfolio snapshots
CREATE POLICY "Users can view their own snapshots" ON portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create snapshots" ON portfolio_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all snapshots" ON portfolio_snapshots FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Scenario events
CREATE POLICY "Admins can view scenario events" ON scenario_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can create events" ON scenario_events FOR INSERT WITH CHECK (true);

-- Functions and triggers will be added in separate files
