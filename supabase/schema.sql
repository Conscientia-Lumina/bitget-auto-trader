-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trade Signals Table
CREATE TABLE trade_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('buy', 'sell', 'close_long', 'close_short')),
    price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8),
    strategy_name VARCHAR(100),
    pilot_number INTEGER CHECK (pilot_number BETWEEN 1 AND 4),
    timeframe VARCHAR(10),
    source VARCHAR(50) DEFAULT 'tradingview',
    raw_payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    process_result VARCHAR(50),
    error_message TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_processed ON trade_signals(processed, received_at);
CREATE INDEX idx_signals_ticker ON trade_signals(ticker);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_order_id VARCHAR(100),
    client_order_id VARCHAR(100),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop_market', 'stop_limit')),
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8),
    stop_price DECIMAL(20, 8),
    filled_quantity DECIMAL(20, 8) DEFAULT 0,
    avg_fill_price DECIMAL(20, 8),
    commission DECIMAL(20, 8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired', 'failed')),
    signal_id UUID REFERENCES trade_signals(id),
    position_id UUID,
    pilot_number INTEGER CHECK (pilot_number BETWEEN 1 AND 4),
    submitted_at TIMESTAMPTZ,
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_symbol ON orders(symbol);

-- Trades Table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    position_id UUID,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    commission DECIMAL(20, 8) DEFAULT 0,
    commission_asset VARCHAR(10) DEFAULT 'USDT',
    realized_pnl DECIMAL(20, 8),
    realized_pnl_percent DECIMAL(10, 4),
    is_entry BOOLEAN DEFAULT TRUE,
    pilot_number INTEGER CHECK (pilot_number BETWEEN 1 AND 4),
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_executed ON trades(executed_at DESC);
CREATE INDEX idx_trades_symbol ON trades(symbol);

-- Positions Table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
    quantity DECIMAL(20, 8) DEFAULT 0,
    avg_entry_price DECIMAL(20, 8) DEFAULT 0,
    current_price DECIMAL(20, 8),
    unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
    unrealized_pnl_percent DECIMAL(10, 4) DEFAULT 0,
    realized_pnl DECIMAL(20, 8) DEFAULT 0,
    stop_loss DECIMAL(20, 8),
    take_profit DECIMAL(20, 8),
    trailing_stop_percent DECIMAL(10, 4),
    pilot_count INTEGER DEFAULT 1 CHECK (pilot_count BETWEEN 1 AND 4),
    pilot_1_entry DECIMAL(20, 8),
    pilot_1_qty DECIMAL(20, 8),
    pilot_1_pnl DECIMAL(20, 8),
    pilot_2_entry DECIMAL(20, 8),
    pilot_2_qty DECIMAL(20, 8),
    pilot_2_pnl DECIMAL(20, 8),
    pilot_3_entry DECIMAL(20, 8),
    pilot_3_qty DECIMAL(20, 8),
    pilot_3_pnl DECIMAL(20, 8),
    pilot_4_entry DECIMAL(20, 8),
    pilot_4_qty DECIMAL(20, 8),
    pilot_4_pnl DECIMAL(20, 8),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_symbol ON positions(symbol);

-- Add position_id foreign key to orders and trades
ALTER TABLE orders ADD CONSTRAINT fk_orders_position FOREIGN KEY (position_id) REFERENCES positions(id);
ALTER TABLE trades ADD CONSTRAINT fk_trades_position FOREIGN KEY (position_id) REFERENCES positions(id);

-- Performance Snapshots Table
CREATE TABLE performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL UNIQUE,
    account_balance DECIMAL(20, 8) NOT NULL,
    available_balance DECIMAL(20, 8),
    daily_pnl DECIMAL(20, 8) DEFAULT 0,
    daily_pnl_percent DECIMAL(10, 4) DEFAULT 0,
    daily_trades INTEGER DEFAULT 0,
    daily_wins INTEGER DEFAULT 0,
    daily_losses INTEGER DEFAULT 0,
    total_pnl DECIMAL(20, 8) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(10, 4),
    profit_factor DECIMAL(10, 4),
    peak_balance DECIMAL(20, 8),
    current_drawdown DECIMAL(10, 4),
    max_drawdown DECIMAL(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_date ON performance_snapshots(snapshot_date DESC);

-- Bot State Table (singleton)
CREATE TABLE bot_state (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_running BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,
    is_killed BOOLEAN DEFAULT FALSE,
    current_symbol VARCHAR(20),
    current_direction VARCHAR(10) CHECK (current_direction IN ('long', 'short')),
    active_pilots INTEGER DEFAULT 0 CHECK (active_pilots BETWEEN 0 AND 4),
    daily_pnl DECIMAL(20, 8) DEFAULT 0,
    daily_loss_limit_hit BOOLEAN DEFAULT FALSE,
    drawdown_limit_hit BOOLEAN DEFAULT FALSE,
    last_signal_at TIMESTAMPTZ,
    last_trade_at TIMESTAMPTZ,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default bot state
INSERT INTO bot_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(20) NOT NULL CHECK (event_category IN ('signal', 'order', 'trade', 'position', 'risk', 'bot', 'system', 'error')),
    order_id UUID REFERENCES orders(id),
    trade_id UUID REFERENCES trades(id),
    position_id UUID REFERENCES positions(id),
    signal_id UUID REFERENCES trade_signals(id),
    message TEXT NOT NULL,
    details JSONB,
    severity VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_category ON audit_logs(event_category, created_at DESC);
CREATE INDEX idx_audit_severity ON audit_logs(severity, created_at DESC);

-- Settings Table
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
    ('trading_enabled', 'true', 'Global trading enable/disable'),
    ('risk_per_pilot', '2', 'Risk percentage per pilot'),
    ('max_position_size', '25', 'Maximum position size as percent of account'),
    ('daily_loss_limit', '5', 'Daily loss limit percentage'),
    ('max_drawdown', '15', 'Maximum drawdown percentage'),
    ('default_leverage', '10', 'Default leverage for positions'),
    ('default_symbol', '"BTCUSDT"', 'Default trading symbol')
ON CONFLICT (key) DO NOTHING;

-- Helper function for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_type VARCHAR(50),
    p_category VARCHAR(20),
    p_message TEXT,
    p_details JSONB DEFAULT NULL,
    p_severity VARCHAR(10) DEFAULT 'info',
    p_order_id UUID DEFAULT NULL,
    p_trade_id UUID DEFAULT NULL,
    p_position_id UUID DEFAULT NULL,
    p_signal_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_logs (
        event_type,
        event_category,
        message,
        details,
        severity,
        order_id,
        trade_id,
        position_id,
        signal_id
    ) VALUES (
        p_event_type,
        p_category,
        p_message,
        p_details,
        p_severity,
        p_order_id,
        p_trade_id,
        p_position_id,
        p_signal_id
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_bot_state_updated_at
    BEFORE UPDATE ON bot_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE bot_state;
