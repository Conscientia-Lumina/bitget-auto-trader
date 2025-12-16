// Strategy evaluation types for real-time monitoring

export interface RiskStatus {
  daily_loss_ok: boolean;
  daily_loss_current: number;
  daily_loss_limit: number;
  max_position_ok: boolean;
  position_size_current: number;
  position_size_limit: number;
  drawdown_ok: boolean;
  drawdown_current: number;
  drawdown_limit: number;
  leverage_current: number;
}

export interface PilotCondition {
  state: 'inactive' | 'pending' | 'active' | 'closing' | 'closed';
  trigger: 'signal' | 'profit_percent' | 'price_level';
  threshold: number | null;
  ready: boolean;
  current?: number;
  entry_price?: number | null;
  quantity?: number | null;
  pnl?: number | null;
}

export interface PilotConditions {
  p1: PilotCondition;
  p2: PilotCondition;
  p3: PilotCondition;
  p4: PilotCondition;
}

export interface EvaluationConditions {
  signal_armed: boolean;
  market_hours: boolean;
  cooldown_clear: boolean;
  last_signal_action: string | null;
  last_signal_time?: string | null;
}

export interface MarketData {
  symbol: string;
  price: number | null;
  price_change_24h: number | null;
  last_update: string | null;
}

export interface ConnectionStatus {
  api: boolean;
  websocket: boolean;
  database: boolean;
}

export interface StrategyState {
  // Bot state
  is_running: boolean;
  is_paused: boolean;
  is_killed: boolean;
  current_symbol: string | null;
  current_direction: 'long' | 'short' | null;
  active_pilots: number;
  daily_pnl: number;
  started_at: string | null;
  
  // Evaluation state
  last_evaluation_at: string | null;
  evaluation_conditions: EvaluationConditions;
  risk_status: RiskStatus;
  pilot_conditions: PilotConditions;
  market_data: MarketData;
  connection_status: ConnectionStatus;
  
  // Recent activity
  last_signal_at: string | null;
  last_trade_at: string | null;
  last_error: string | null;
}

export interface StrategyEvaluation {
  id: string;
  evaluation_type: 'signal_check' | 'risk_check' | 'pilot_trigger' | 'price_update';
  symbol: string | null;
  conditions_met: Record<string, boolean>;
  conditions_failed: Record<string, string>;
  decision: 'execute' | 'skip' | 'block' | 'wait' | null;
  decision_reason: string | null;
  signal_id: string | null;
  position_id: string | null;
  market_price: number | null;
  evaluation_duration_ms: number | null;
  created_at: string;
}

export type ConditionBadgeStatus = 'success' | 'warning' | 'error' | 'inactive' | 'pending';

export interface ConditionBadge {
  label: string;
  status: ConditionBadgeStatus;
  value?: string | number;
  tooltip?: string;
}
