-- Database Functions for Investo Trading Game
-- Run this after schema.sql

-- Ensure a profile exists for the current user
CREATE OR REPLACE FUNCTION ensure_profile()
RETURNS profiles AS $$
DECLARE
    uid UUID;
    user_email TEXT;
    uname TEXT;
    prof profiles%ROWTYPE;
BEGIN
    uid := auth.uid();
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT u.email INTO user_email FROM auth.users u WHERE u.id = uid;
    uname := COALESCE(split_part(user_email, '@', 1), 'user');

    INSERT INTO profiles (id, username)
    VALUES (uid, uname)
    ON CONFLICT (id) DO UPDATE
      SET username = COALESCE(EXCLUDED.username, profiles.username)
    RETURNING * INTO prof;

    RETURN prof;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to initialize player state for a scenario
CREATE OR REPLACE FUNCTION initialize_player_scenario(p_scenario_id UUID, p_user_id UUID)
RETURNS player_scenario_state AS $$
DECLARE
    scenario_record scenarios%ROWTYPE;
    player_state player_scenario_state%ROWTYPE;
BEGIN
    -- Get scenario details
    SELECT * INTO scenario_record FROM scenarios WHERE id = p_scenario_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scenario not found';
    END IF;
    
    -- Insert or get existing player state
    INSERT INTO player_scenario_state (scenario_id, user_id, cash_available)
    VALUES (p_scenario_id, p_user_id, scenario_record.initial_cash)
    ON CONFLICT (scenario_id, user_id) DO NOTHING
    RETURNING * INTO player_state;
    
    -- If already exists, get the existing record
    IF player_state IS NULL THEN
        SELECT * INTO player_state 
        FROM player_scenario_state 
        WHERE scenario_id = p_scenario_id AND user_id = p_user_id;
    END IF;
    
    RETURN player_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to place an order
CREATE OR REPLACE FUNCTION place_order(
    p_scenario_id UUID,
    p_scenario_stock_id UUID,
    p_user_id UUID,
    p_side order_side,
    p_type order_type,
    p_quantity DECIMAL(10,4),
    p_limit_price DECIMAL(10,2) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    scenario_record scenarios%ROWTYPE;
    stock_record scenario_stocks%ROWTYPE;
    player_state player_scenario_state%ROWTYPE;
    current_price DECIMAL(10,2);
    order_cost DECIMAL(15,2);
    new_order_id UUID;
    result JSON;
BEGIN
    -- Ensure profile exists to satisfy FKs
    PERFORM ensure_profile();

    -- Check if scenario is live
    SELECT * INTO scenario_record FROM scenarios WHERE id = p_scenario_id;
    IF scenario_record.status != 'live' THEN
        RETURN json_build_object('success', false, 'error', 'Scenario is not live');
    END IF;
    
    -- Check if current time is within trading window
    IF NOW() < scenario_record.start_at OR NOW() > scenario_record.end_at THEN
        RETURN json_build_object('success', false, 'error', 'Trading window is closed');
    END IF;
    
    -- Get stock details
    SELECT * INTO stock_record FROM scenario_stocks WHERE id = p_scenario_stock_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Stock not found');
    END IF;
    
    -- Initialize player state if needed
    SELECT * INTO player_state FROM initialize_player_scenario(p_scenario_id, p_user_id);
    
    -- Get current price
    SELECT price INTO current_price 
    FROM latest_prices 
    WHERE scenario_stock_id = p_scenario_stock_id;
    
    IF current_price IS NULL THEN
        current_price := stock_record.starting_price;
    END IF;
    
    -- Calculate order cost and validate funds
    IF p_side = 'buy' THEN
        IF p_type = 'market' THEN
            order_cost := p_quantity * current_price;
        ELSE
            order_cost := p_quantity * p_limit_price;
        END IF;
        
        IF player_state.cash_available < order_cost THEN
            RETURN json_build_object('success', false, 'error', 'Insufficient funds');
        END IF;
        
        -- Lock cash for buy order
        UPDATE player_scenario_state 
        SET cash_available = cash_available - order_cost,
            cash_locked = cash_locked + order_cost,
            updated_at = NOW()
        WHERE scenario_id = p_scenario_id AND user_id = p_user_id;
    ELSE
        -- For sell orders, check if user has enough position
        DECLARE
            position_qty DECIMAL(10,4);
        BEGIN
            SELECT quantity INTO position_qty
            FROM positions 
            WHERE scenario_id = p_scenario_id 
              AND scenario_stock_id = p_scenario_stock_id 
              AND user_id = p_user_id;
            
            IF COALESCE(position_qty, 0) < p_quantity THEN
                RETURN json_build_object('success', false, 'error', 'Insufficient position');
            END IF;
        END;
    END IF;
    
    -- Create the order
    INSERT INTO orders (
        scenario_id, scenario_stock_id, user_id, side, type, 
        quantity, limit_price, status
    ) VALUES (
        p_scenario_id, p_scenario_stock_id, p_user_id, p_side, p_type,
        p_quantity, p_limit_price, 'pending'
    ) RETURNING id INTO new_order_id;
    
    -- For market orders, execute immediately
    IF p_type = 'market' THEN
        PERFORM execute_market_order(new_order_id, current_price);
    END IF;
    
    result := json_build_object(
        'success', true, 
        'order_id', new_order_id,
        'current_price', current_price
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to execute a market order
CREATE OR REPLACE FUNCTION execute_market_order(p_order_id UUID, p_execution_price DECIMAL(10,2))
RETURNS VOID AS $$
DECLARE
    order_record orders%ROWTYPE;
    trade_id UUID;
    position_record positions%ROWTYPE;
    new_quantity DECIMAL(10,4);
    new_avg_cost DECIMAL(10,2);
    trade_value DECIMAL(15,2);
BEGIN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = p_order_id;
    
    -- Create trade record
    INSERT INTO trades (
        order_id, scenario_id, scenario_stock_id, user_id, qty, price
    ) VALUES (
        p_order_id, order_record.scenario_id, order_record.scenario_stock_id,
        order_record.user_id, order_record.quantity, p_execution_price
    ) RETURNING id INTO trade_id;
    
    -- Update order status
    UPDATE orders 
    SET status = 'filled',
        filled_qty = quantity,
        avg_fill_price = p_execution_price,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Update position
    SELECT * INTO position_record 
    FROM positions 
    WHERE scenario_id = order_record.scenario_id 
      AND scenario_stock_id = order_record.scenario_stock_id 
      AND user_id = order_record.user_id;
    
    trade_value := order_record.quantity * p_execution_price;
    
    IF position_record IS NULL THEN
        -- Create new position
        IF order_record.side = 'buy' THEN
            INSERT INTO positions (
                scenario_id, scenario_stock_id, user_id, quantity, avg_cost
            ) VALUES (
                order_record.scenario_id, order_record.scenario_stock_id,
                order_record.user_id, order_record.quantity, p_execution_price
            );
        END IF;
    ELSE
        -- Update existing position
        IF order_record.side = 'buy' THEN
            new_quantity := position_record.quantity + order_record.quantity;
            new_avg_cost := (position_record.quantity * position_record.avg_cost + trade_value) / new_quantity;
            
            UPDATE positions 
            SET quantity = new_quantity,
                avg_cost = new_avg_cost,
                updated_at = NOW()
            WHERE id = position_record.id;
        ELSE
            -- Sell order
            new_quantity := position_record.quantity - order_record.quantity;
            
            -- Calculate realized P&L
            DECLARE
                v_realized_pnl DECIMAL(15,2);
            BEGIN
                v_realized_pnl := (p_execution_price - position_record.avg_cost) * order_record.quantity;
                
                UPDATE positions 
                SET quantity = new_quantity,
                    realized_pnl = position_record.realized_pnl + v_realized_pnl,
                    updated_at = NOW()
                WHERE id = position_record.id;
            END;
        END IF;
    END IF;
    
    -- Update cash for the trade
    IF order_record.side = 'buy' THEN
        -- Release locked cash (already deducted when order was placed)
        UPDATE player_scenario_state 
        SET cash_locked = cash_locked - trade_value
        WHERE scenario_id = order_record.scenario_id AND user_id = order_record.user_id;
    ELSE
        -- Add cash from sale
        UPDATE player_scenario_state 
        SET cash_available = cash_available + trade_value
        WHERE scenario_id = order_record.scenario_id AND user_id = order_record.user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to calculate portfolio value
CREATE OR REPLACE FUNCTION calculate_portfolio_value(p_scenario_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    free_cash DECIMAL(15,2) := 0;
    locked_cash DECIMAL(15,2) := 0;
        market_value DECIMAL(15,2) := 0;
        unrealized_pnl DECIMAL(15,2) := 0;
        realized_pnl DECIMAL(15,2) := 0;
        total_equity DECIMAL(15,2) := 0;
        result JSON;
BEGIN
        -- Ensure profile and player state exist (idempotent)
        PERFORM ensure_profile();
        PERFORM initialize_player_scenario(p_scenario_id, p_user_id);

            -- Cash breakdown
            SELECT COALESCE(cash_available, 0), COALESCE(cash_locked, 0)
                INTO free_cash, locked_cash
        FROM player_scenario_state
        WHERE scenario_id = p_scenario_id AND user_id = p_user_id;

        -- Market value and Unrealized PnL using fallback to starting_price when no latest price
        SELECT 
            COALESCE(SUM(pos.quantity * COALESCE(lp.price, ss.starting_price)), 0) AS mv,
            COALESCE(SUM((COALESCE(lp.price, ss.starting_price) - pos.avg_cost) * pos.quantity), 0) AS upnl
        INTO market_value, unrealized_pnl
        FROM positions pos
        JOIN scenario_stocks ss ON ss.id = pos.scenario_stock_id
        LEFT JOIN latest_prices lp ON lp.scenario_stock_id = pos.scenario_stock_id
        WHERE pos.scenario_id = p_scenario_id
            AND pos.user_id = p_user_id
            AND pos.quantity <> 0;

        -- Realized PnL from positions
        SELECT COALESCE(SUM(realized_pnl), 0)
        INTO realized_pnl
        FROM positions
        WHERE scenario_id = p_scenario_id AND user_id = p_user_id;

        total_equity := COALESCE(free_cash, 0) + COALESCE(market_value, 0);

        result := json_build_object(
            'cash', COALESCE(free_cash, 0),
            'cash_locked', COALESCE(locked_cash, 0),
                'market_value', COALESCE(market_value, 0),
                'equity', total_equity,
                'unrealized_pnl', COALESCE(unrealized_pnl, 0),
                'realized_pnl', COALESCE(realized_pnl, 0)
        );

        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to simulate price tick
CREATE OR REPLACE FUNCTION simulate_price_tick(p_scenario_stock_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    last_price DECIMAL(10,2);
    new_price DECIMAL(10,2);
    price_change DECIMAL(5,4);
BEGIN
    -- Get last price
    SELECT price INTO last_price 
    FROM latest_prices 
    WHERE scenario_stock_id = p_scenario_stock_id;
    
    -- If no price exists, get starting price
    IF last_price IS NULL THEN
        SELECT starting_price INTO last_price 
        FROM scenario_stocks 
        WHERE id = p_scenario_stock_id;
    END IF;
    
    -- Generate random price change (-2% to +2%)
    price_change := (random() - 0.5) * 0.04;
    new_price := last_price * (1 + price_change);
    
    -- Ensure price doesn't go below 0.01
    new_price := GREATEST(new_price, 0.01);
    
    -- Insert new price tick
    INSERT INTO price_ticks (scenario_stock_id, price)
    VALUES (p_scenario_stock_id, new_price);
    
    RETURN new_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update positions after trades
CREATE OR REPLACE FUNCTION update_positions_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger is called after trade insertion
    -- Position updates are handled in execute_market_order function
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update scenario timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'update_scenarios_updated_at' AND c.relname = 'scenarios'
    ) THEN
        CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'update_player_scenario_state_updated_at' AND c.relname = 'player_scenario_state'
    ) THEN
        CREATE TRIGGER update_player_scenario_state_updated_at BEFORE UPDATE ON player_scenario_state
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'update_orders_updated_at' AND c.relname = 'orders'
    ) THEN
        CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'update_positions_updated_at' AND c.relname = 'positions'
    ) THEN
        CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Wrapper RPC to init player state using current auth user and return JSON
CREATE OR REPLACE FUNCTION initialize_player_scenario_rpc(p_scenario_id UUID)
RETURNS JSON AS $$
DECLARE
    uid UUID := auth.uid();
    state player_scenario_state%ROWTYPE;
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure profile exists to satisfy FKs
    PERFORM ensure_profile();

    SELECT * INTO state FROM initialize_player_scenario(p_scenario_id, uid);

    RETURN json_build_object('status', 'ok', 'scenario_id', p_scenario_id, 'user_id', uid, 'state_id', state.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
