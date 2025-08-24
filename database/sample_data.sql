-- Sample Data for Investo Trading Game
-- Run this after schema.sql and functions.sql

-- Insert admin user (you'll need to update the UUID with your actual user ID from auth.users)
-- Replace 'your-admin-user-id-here' with your actual user ID
INSERT INTO profiles (id, username, role) VALUES 
('3c2e4406-da68-494a-96a3-2ee7986b3189', 'admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Insert sample scenario
INSERT INTO scenarios (
    id,
    title,
    prompt,
    initial_cash,
    status,
    start_at,
    end_at,
    created_by
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Tech Stock Challenge',
    'The year is 2024, and major tech companies are announcing their quarterly earnings. AI developments are driving market sentiment. Trade wisely during this volatile period.',
    10000.00,
    'draft',
    NOW() + INTERVAL '1 minute',
    NOW() + INTERVAL '1 hour',
    '3c2e4406-da68-494a-96a3-2ee7986b3189'
) ON CONFLICT (id) DO NOTHING;

-- Insert sample stocks for the scenario
INSERT INTO scenario_stocks (scenario_id, symbol, display_name, starting_price) VALUES 
('11111111-1111-1111-1111-111111111111', 'AAPL', 'Apple Inc.', 175.50),
('11111111-1111-1111-1111-111111111111', 'GOOGL', 'Alphabet Inc.', 140.25),
('11111111-1111-1111-1111-111111111111', 'MSFT', 'Microsoft Corp.', 380.75),
('11111111-1111-1111-1111-111111111111', 'NVDA', 'NVIDIA Corp.', 450.00),
('11111111-1111-1111-1111-111111111111', 'TSLA', 'Tesla Inc.', 220.30)
ON CONFLICT (scenario_id, symbol) DO NOTHING;

-- Insert initial price ticks
INSERT INTO price_ticks (scenario_stock_id, price, source) 
SELECT 
    ss.id,
    ss.starting_price,
    'initial'
FROM scenario_stocks ss 
WHERE ss.scenario_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- Function to create a test scenario that starts immediately (for testing)
CREATE OR REPLACE FUNCTION create_test_scenario()
RETURNS UUID AS $$
DECLARE
    scenario_id UUID;
    admin_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found';
    END IF;
    
    -- Create test scenario
    INSERT INTO scenarios (
        title,
        prompt,
        initial_cash,
        status,
        start_at,
        end_at,
        created_by
    ) VALUES (
        'Quick Test Scenario',
        'This is a test scenario for immediate trading. Buy low, sell high!',
        5000.00,
        'live',
        NOW(),
        NOW() + INTERVAL '30 minutes',
        admin_id
    ) RETURNING id INTO scenario_id;
    
    -- Add sample stocks
    INSERT INTO scenario_stocks (scenario_id, symbol, display_name, starting_price) VALUES 
    (scenario_id, 'TEST1', 'Test Stock Alpha', 100.00),
    (scenario_id, 'TEST2', 'Test Stock Beta', 50.00),
    (scenario_id, 'TEST3', 'Test Stock Gamma', 25.00);
    
    -- Add initial price ticks
    INSERT INTO price_ticks (scenario_stock_id, price, source) 
    SELECT 
        ss.id,
        ss.starting_price,
        'initial'
    FROM scenario_stocks ss 
    WHERE ss.scenario_id = scenario_id;
    
    RETURN scenario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
