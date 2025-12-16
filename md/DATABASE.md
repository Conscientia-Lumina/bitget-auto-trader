# 🗄️ DATABASE - Supabase Schema

## Overview

This file contains the complete database schema. **Run these SQL statements in order** in the Supabase SQL Editor.

---

## Initial Setup

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
```

---

## Tables

### 1. Trade Signals (from TradingView)

```sql
CREATE TABLE trade_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Signal data from TradingView
  ticker TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'close_long', 'close_short')),
  price DECIMAL(18, 8) NOT NULL,
  quantity DECIMAL(18, 8),
  
  -- Strategy info
  strategy_name TEXT,
  pilot_number INTEGER CHECK (pilot_number BETWEEN 1 AND 4),
  timeframe TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'tradingview',
  raw_payload JSONB,
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  process_result TEXT,
  error_message TEXT,
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unprocessed signals
CREATE INDEX idx_trade_signals_unprocessed ON trade_signals (processed, received_at) 
WHERE processed = FALSE;

-- Index for signal lookup
CREATE INDEX idx_trade_signals_ticker ON trade_signals (ticker, received_at DESC);
```

### 2. Orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Exchange order info
  exchange_order_id TEXT,
  client_order_id TEXT UNIQUE,
  
  -- Order details
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop_market', 'stop_limit')),
  quantity DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8),
  stop_price DECIMAL(18, 8),
  
  -- Execution
  filled_quantity DECIMAL(18, 8) DEFAULT 0,
  avg_fill_price DECIMAL(18, 8),
  commission DECIMAL(18, 8) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'submitted', 'open', 'partially_filled', 'filled', 
    'cancelled', 'rejected', 'expired', 'failed'
  )),
  
  -- Linking
  signal_id UUID REFERENCES trade_signals(id),
  position_id UUID,
  pilot_number INTEGER CHECK (pilot_number BETWEEN 1 AND 4),
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_status ON orders (status) WHERE status NOT IN ('filled', 'cancelled', 'rejected');
CREATE INDEX idx_orders_symbol ON orders (symbol, created_at DESC);
CREATE INDEX idx_orders_position ON orders (position_id) WHERE position_id IS NOT NULL;
```

### 3. Trades (Filled Orders)

```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Links
  order_id UUID REFERENCES orders(id),
  position_id UUID,
  
  -- Trade details
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  commission DECIMAL(18, 8) DEFAULT 0,
  commission_asset TEXT DEFAULT 'USDT',
  
  -- P&L (for closing trades)
  realized_pnl DECIMAL(18, 8),
  realized_pnl_percent DECIMAL(8, 4),
  
  -- Context
  is_entry BOOLEAN DEFAULT TRUE,
  pilot_number INTEGER CHECK (pilot_number BETWEEN 1 AND 4),
  
  -- Timestamps
  executed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trades_symbol ON trades (symbol, executed_at DESC);
CREATE INDEX idx_trades_position ON trades (position_id);
CREATE INDEX idx_trades_executed ON trades (executed_at DESC);
```

### 4. Positions

```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Position info
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
  
  -- Size and pricing
  quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
  avg_entry_price DECIMAL(18, 8) NOT NULL DEFAULT 0,
  current_price DECIMAL(18, 8),
  
  -- P&L
  unrealized_pnl DECIMAL(18, 8) DEFAULT 0,
  unrealized_pnl_percent DECIMAL(8, 4) DEFAULT 0,
  realized_pnl DECIMAL(18, 8) DEFAULT 0,
  
  -- Risk management
  stop_loss DECIMAL(18, 8),
  take_profit DECIMAL(18, 8),
  trailing_stop_percent DECIMAL(5, 2),
  
  -- Pilot tracking
  pilot_count INTEGER DEFAULT 0 CHECK (pilot_count BETWEEN 0 AND 4),
  pilot_1_entry DECIMAL(18, 8),
  pilot_1_qty DECIMAL(18, 8),
  pilot_1_pnl DECIMAL(18, 8),
  pilot_2_entry DECIMAL(18, 8),
  pilot_2_qty DECIMAL(18, 8),
  pilot_2_pnl DECIMAL(18, 8),
  pilot_3_entry DECIMAL(18, 8),
  pilot_3_qty DECIMAL(18, 8),
  pilot_3_pnl DECIMAL(18, 8),
  pilot_4_entry DECIMAL(18, 8),
  pilot_4_qty DECIMAL(18, 8),
  pilot_4_pnl DECIMAL(18, 8),
  
  -- Timestamps
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(symbol, status) -- Only one open position per symbol
);

-- Partial unique index for open positions
CREATE UNIQUE INDEX idx_positions_open_unique ON positions (symbol) WHERE status = 'open';

-- Index for active positions
CREATE INDEX idx_positions_open ON positions (status, symbol) WHERE status = 'open';
```

### 5. Performance Snapshots (Daily)

```sql
CREATE TABLE performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Period
  snapshot_date DATE NOT NULL UNIQUE,
  
  -- Account state
  account_balance DECIMAL(18, 8) NOT NULL,
  available_balance DECIMAL(18, 8),
  
  -- Daily metrics
  daily_pnl DECIMAL(18, 8) DEFAULT 0,
  daily_pnl_percent DECIMAL(8, 4) DEFAULT 0,
  daily_trades INTEGER DEFAULT 0,
  daily_wins INTEGER DEFAULT 0,
  daily_losses INTEGER DEFAULT 0,
  
  -- Cumulative metrics
  total_pnl DECIMAL(18, 8) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2),
  profit_factor DECIMAL(8, 4),
  
  -- Drawdown
  peak_balance DECIMAL(18, 8),
  current_drawdown DECIMAL(8, 4),
  max_drawdown DECIMAL(8, 4),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX idx_performance_date ON performance_snapshots (snapshot_date DESC);
```

### 6. Bot State

```sql
CREATE TABLE bot_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton row
  
  -- Status
  is_running BOOLEAN DEFAULT FALSE,
  is_paused BOOLEAN DEFAULT FALSE,
  is_killed BOOLEAN DEFAULT FALSE,
  
  -- Current state
  current_symbol TEXT,
  current_direction TEXT CHECK (current_direction IN ('long', 'short')),
  active_pilots INTEGER DEFAULT 0,
  
  -- Risk state
  daily_pnl DECIMAL(18, 8) DEFAULT 0,
  daily_loss_limit_hit BOOLEAN DEFAULT FALSE,
  drawdown_limit_hit BOOLEAN DEFAULT FALSE,
  
  -- Last activity
  last_signal_at TIMESTAMPTZ,
  last_trade_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert singleton row
INSERT INTO bot_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

### 7. Audit Log

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event info
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN (
    'signal', 'order', 'trade', 'position', 'risk', 'bot', 'system', 'error'
  )),
  
  -- Related entities
  order_id UUID,
  trade_id UUID,
  position_id UUID,
  signal_id UUID,
  
  -- Event data
  message TEXT NOT NULL,
  details JSONB,
  
  -- Context
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent logs
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_category ON audit_logs (event_category, created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs (severity, created_at DESC) 
WHERE severity IN ('error', 'critical');
```

### 8. Settings

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('risk_per_pilot', '2.0', 'Risk percentage per pilot entry'),
  ('max_position_size', '25.0', 'Maximum position size as % of account'),
  ('daily_loss_limit', '5.0', 'Daily loss limit as % of account'),
  ('max_drawdown', '15.0', 'Maximum drawdown limit as %'),
  ('default_leverage', '10', 'Default leverage for futures'),
  ('atr_sl_multiplier', '1.2', 'ATR multiplier for stop loss'),
  ('atr_tp_multiplier', '3.5', 'ATR multiplier for take profit'),
  ('pilot_gates', '{"p1_to_p2": 0.3, "p2_to_p3": 0.5, "p3_to_p4": 0.8}', 'Profit gates for adding pilots'),
  ('enabled_symbols', '["BTCUSDT", "ETHUSDT"]', 'Symbols allowed for trading'),
  ('trading_enabled', 'true', 'Master switch for trading')
ON CONFLICT (key) DO NOTHING;
```

---

## Functions

### Update Timestamps Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bot_state_updated_at
  BEFORE UPDATE ON bot_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Calculate Position P&L

```sql
CREATE OR REPLACE FUNCTION calculate_position_pnl(
  p_side TEXT,
  p_entry_price DECIMAL,
  p_current_price DECIMAL,
  p_quantity DECIMAL
)
RETURNS TABLE (pnl DECIMAL, pnl_percent DECIMAL) AS $$
BEGIN
  IF p_side = 'long' THEN
    pnl := (p_current_price - p_entry_price) * p_quantity;
    pnl_percent := ((p_current_price - p_entry_price) / p_entry_price) * 100;
  ELSE
    pnl := (p_entry_price - p_current_price) * p_quantity;
    pnl_percent := ((p_entry_price - p_current_price) / p_entry_price) * 100;
  END IF;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

### Log Audit Event

```sql
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_category TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_order_id UUID DEFAULT NULL,
  p_trade_id UUID DEFAULT NULL,
  p_position_id UUID DEFAULT NULL,
  p_signal_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (
    event_type, event_category, message, details, severity,
    order_id, trade_id, position_id, signal_id
  ) VALUES (
    p_event_type, p_category, p_message, p_details, p_severity,
    p_order_id, p_trade_id, p_position_id, p_signal_id
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Real-time Subscriptions

```sql
-- Enable real-time for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE bot_state;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_signals;
```

---

## Row Level Security (RLS)

For single-user app, we use a simple policy that allows all operations:

```sql
-- Enable RLS on all tables
ALTER TABLE trade_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for single user - secured by API key)
CREATE POLICY "Allow all" ON trade_signals FOR ALL USING (true);
CREATE POLICY "Allow all" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all" ON trades FOR ALL USING (true);
CREATE POLICY "Allow all" ON positions FOR ALL USING (true);
CREATE POLICY "Allow all" ON performance_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all" ON bot_state FOR ALL USING (true);
CREATE POLICY "Allow all" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON settings FOR ALL USING (true);
```

---

## TypeScript Types Generation

After creating tables, generate types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

This generates types like:

```typescript
export type Database = {
  public: {
    Tables: {
      positions: {
        Row: {
          id: string;
          symbol: string;
          side: 'long' | 'short';
          status: 'open' | 'closing' | 'closed';
          quantity: number;
          avg_entry_price: number;
          // ... etc
        };
        Insert: { ... };
        Update: { ... };
      };
      // ... other tables
    };
  };
};
```

---

## Migrations

Save each schema change as a migration file:

```
supabase/migrations/
├── 20240101000000_initial_schema.sql
├── 20240102000000_add_pilot_tracking.sql
└── 20240103000000_add_audit_logs.sql
```
