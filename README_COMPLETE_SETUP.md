# Investo Trading Game - Complete Setup Guide

## 🎯 Overview

A complete multi-scenario trading game built with React + Supabase featuring:
- **Admin Dashboard**: Create, schedule, and manage trading scenarios
- **Player Dashboard**: Join scenarios, trade stocks, view portfolio
- **Real-time Trading**: Live price updates, order execution, portfolio tracking
- **Role-based Access**: Admin vs Player permissions
- **Scenario Management**: Time-bound trading sessions with custom stocks

## 🏗️ Architecture

### Database Schema
- **Scenarios**: Trading sessions with prompts, timing, and rules
- **Stocks**: Per-scenario stocks with simulated/real prices
- **Orders & Trades**: Complete order management system
- **Positions**: User holdings and P&L tracking
- **Real-time Price Feeds**: WebSocket price updates

### Frontend Components
- **AdminDashboard**: Scenario creation and management
- **PlayerDashboard**: Scenario browsing and joining
- **LiveScenario**: Real-time trading interface
- **TradingInterface**: Order placement and execution
- **Portfolio**: Holdings, cash, and P&L display
- **PriceChart**: Live price visualization

## 🚀 Setup Instructions

### 1. Database Setup

**Step 1**: Run the schema in Supabase SQL Editor
```sql
-- Copy and paste the entire content from database/schema.sql
-- This creates all tables, types, policies, and views
```

**Step 2**: Add the functions
```sql
-- Copy and paste the entire content from database/functions.sql
-- This adds all RPC functions for trading logic
```

**Step 3**: Add sample data (optional)
```sql
-- Copy and paste the entire content from database/sample_data.sql
-- This creates test scenarios and an admin user
```

**Step 4**: Update admin user ID
```sql
-- Replace the UUID in sample_data.sql with your actual user ID from auth.users
UPDATE profiles SET role = 'admin' WHERE id = 'your-actual-user-id-here';
```

### 2. Environment Setup

**Step 1**: Ensure you have the required environment variables in `.env`
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Step 2**: Install dependencies (already done)
```bash
cd investo-frontend
npm install date-fns
```

### 3. Testing the Application

**Step 1**: Start the development server
```bash
cd investo-frontend
npm run dev
```

**Step 2**: Login as admin
- Use credentials for a user with role = 'admin'
- You should see the Admin Dashboard

**Step 3**: Create a test scenario
- Click "Create Test Scenario" for immediate testing
- Or create a custom scenario with future timing

**Step 4**: Test as player
- Login with a different user (role = 'player')
- Join live scenarios and start trading

## 🎮 How to Use

### For Admins

1. **Create Scenarios**:
   - Add title and description prompt
   - Set start/end times
   - Configure initial cash amount
   - Add stocks with starting prices

2. **Manage Scenarios**:
   - Draft → Schedule → Live → Closed
   - Monitor live trading
   - Force close if needed

3. **Iterate**:
   - Clone successful scenarios
   - Modify parameters for new runs

### For Players

1. **Join Scenarios**:
   - Browse available scenarios
   - Join live or view closed ones
   - Get initialized with starting cash

2. **Trade Stocks**:
   - View real-time prices
   - Place market/limit orders
   - Monitor portfolio performance

3. **Track Performance**:
   - Real-time P&L updates
   - Position tracking
   - Order history

## 🔧 Key Features Implemented

### ✅ Multi-scenario Management
- Create, edit, schedule scenarios
- Time-bound trading windows
- Scenario status lifecycle

### ✅ Stock Trading System
- Real-time price simulation
- Market and limit orders
- Order execution and fills
- Position tracking

### ✅ Portfolio Management
- Cash and position tracking
- Realized/unrealized P&L
- Real-time equity calculation
- Transaction history

### ✅ Real-time Updates
- WebSocket price feeds
- Live portfolio updates
- Order status changes

### ✅ Role-based Access
- Admin scenario management
- Player trading interface
- Secure RLS policies

### ✅ Price Visualization
- Live price charts
- Historical price data
- Multi-stock price tracking

## 🚀 Next Steps for Production

### Performance Optimizations
1. **Price Tick Partitioning**: Partition price_ticks by scenario_id for large datasets
2. **Caching**: Add Redis for frequently accessed price data
3. **Background Jobs**: Use Supabase Edge Functions for price simulation

### Additional Features
1. **Leaderboards**: Global and per-scenario rankings
2. **Advanced Charts**: Candlestick charts, technical indicators
3. **Social Features**: User profiles, achievement system
4. **Mobile App**: React Native implementation

### Monitoring & Analytics
1. **Performance Metrics**: Track order latency, price update frequency
2. **User Analytics**: Trading patterns, scenario engagement
3. **Error Monitoring**: Comprehensive logging and alerting

## 🐛 Troubleshooting

### Common Issues

1. **RLS Policies**: Ensure user has correct role in profiles table
2. **Price Updates**: Check WebSocket connection and subscription
3. **Order Placement**: Verify cash availability and scenario status

### Debug Commands
```sql
-- Check user role
SELECT * FROM profiles WHERE id = auth.uid();

-- Check scenario status
SELECT * FROM scenarios WHERE status = 'live';

-- Check portfolio state
SELECT * FROM player_scenario_state WHERE user_id = auth.uid();
```

## 📚 API Reference

### Game API Functions
- `gameApi.getScenarios()`: List all scenarios
- `gameApi.placeOrder()`: Execute trades
- `gameApi.getPortfolioValue()`: Get portfolio summary
- `gameApi.getPositions()`: Get user positions
- `gameApi.simulatePriceTick()`: Admin price simulation

### Real-time Subscriptions
- `subscriptions.subscribeToPrices()`: Price updates
- `subscriptions.subscribeToTrades()`: Trade notifications
- `subscriptions.subscribeToScenarios()`: Scenario changes

## 🎯 Success Metrics

The system is ready for production when:
- [x] Admins can create and manage scenarios
- [x] Players can join and trade in real-time
- [x] Orders execute correctly with proper accounting
- [x] Portfolios update in real-time
- [x] Price data streams without interruption
- [x] All RLS policies enforce proper access control

Your trading game is now complete and ready for users! 🚀
