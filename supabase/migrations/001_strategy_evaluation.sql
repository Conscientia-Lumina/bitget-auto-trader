-- Strategy Evaluation Tracking Migration
-- Extends bot_state with detailed evaluation tracking for real-time visibility

-- Add evaluation tracking columns to bot_state
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS last_evaluation_at TIMESTAMPTZ;
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS evaluation_conditions JSONB DEFAULT '{}';
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS risk_status JSONB DEFAULT '{}';
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS pilot_conditions JSONB DEFAULT '{}';
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS market_data JSONB DEFAULT '{}';
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS connection_status JSONB DEFAULT '{"api": false, "websocket": false, "database": true}';

-- Create strategy_evaluations table for historical tracking
CREATE TABLE IF NOT EXISTS strategy_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_type VARCHAR(50) NOT NULL, -- 'signal_check', 'risk_check', 'pilot_trigger', 'price_update'
    symbol VARCHAR(20),
    conditions_met JSONB NOT NULL DEFAULT '{}',
    conditions_failed JSONB DEFAULT '{}',
    decision VARCHAR(50), -- 'execute', 'skip', 'block', 'wait'
    decision_reason TEXT,
    signal_id UUID REFERENCES trade_signals(id),
    position_id UUID REFERENCES positions(id),
    market_price DECIMAL(20, 8),
    evaluation_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_strategy_evaluations_type ON strategy_evaluations(evaluation_type, created_at DESC);
CREATE INDEX idx_strategy_evaluations_symbol ON strategy_evaluations(symbol, created_at DESC);

-- Function to update bot evaluation state
CREATE OR REPLACE FUNCTION update_evaluation_state(
    p_conditions JSONB DEFAULT NULL,
    p_risk_status JSONB DEFAULT NULL,
    p_pilot_conditions JSONB DEFAULT NULL,
    p_market_data JSONB DEFAULT NULL,
    p_connection_status JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE bot_state SET
        last_evaluation_at = NOW(),
        evaluation_conditions = COALESCE(p_conditions, evaluation_conditions),
        risk_status = COALESCE(p_risk_status, risk_status),
        pilot_conditions = COALESCE(p_pilot_conditions, pilot_conditions),
        market_data = COALESCE(p_market_data, market_data),
        connection_status = COALESCE(p_connection_status, connection_status)
    WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Function to log strategy evaluation
CREATE OR REPLACE FUNCTION log_strategy_evaluation(
    p_evaluation_type VARCHAR(50),
    p_symbol VARCHAR(20),
    p_conditions_met JSONB,
    p_conditions_failed JSONB DEFAULT '{}',
    p_decision VARCHAR(50) DEFAULT NULL,
    p_decision_reason TEXT DEFAULT NULL,
    p_signal_id UUID DEFAULT NULL,
    p_position_id UUID DEFAULT NULL,
    p_market_price DECIMAL(20, 8) DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO strategy_evaluations (
        evaluation_type,
        symbol,
        conditions_met,
        conditions_failed,
        decision,
        decision_reason,
        signal_id,
        position_id,
        market_price,
        evaluation_duration_ms
    ) VALUES (
        p_evaluation_type,
        p_symbol,
        p_conditions_met,
        p_conditions_failed,
        p_decision,
        p_decision_reason,
        p_signal_id,
        p_position_id,
        p_market_price,
        p_duration_ms
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for strategy_evaluations
ALTER PUBLICATION supabase_realtime ADD TABLE strategy_evaluations;

-- Update default bot_state with new columns
UPDATE bot_state SET
    evaluation_conditions = '{
        "signal_armed": false,
        "market_hours": true,
        "cooldown_clear": true,
        "last_signal_action": null
    }',
    risk_status = '{
        "daily_loss_ok": true,
        "daily_loss_current": 0,
        "daily_loss_limit": 5,
        "max_position_ok": true,
        "position_size_current": 0,
        "position_size_limit": 25,
        "drawdown_ok": true,
        "drawdown_current": 0,
        "drawdown_limit": 15,
        "leverage_current": 10
    }',
    pilot_conditions = '{
        "p1": {"state": "inactive", "trigger": "signal", "threshold": null, "ready": true},
        "p2": {"state": "inactive", "trigger": "profit_percent", "threshold": 0.3, "ready": false, "current": 0},
        "p3": {"state": "inactive", "trigger": "profit_percent", "threshold": 0.5, "ready": false, "current": 0},
        "p4": {"state": "inactive", "trigger": "profit_percent", "threshold": 0.8, "ready": false, "current": 0}
    }',
    market_data = '{
        "symbol": "BTCUSDT",
        "price": null,
        "price_change_24h": null,
        "last_update": null
    }',
    connection_status = '{
        "api": false,
        "websocket": false,
        "database": true
    }'
WHERE id = 1;
