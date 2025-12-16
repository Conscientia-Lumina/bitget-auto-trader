export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit';
export type OrderStatus =
  | 'pending'
  | 'submitted'
  | 'open'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'failed';

export type PositionSide = 'long' | 'short';
export type PositionStatus = 'open' | 'closing' | 'closed';

export type PilotNumber = 1 | 2 | 3 | 4;
export type PilotState = 'inactive' | 'pending' | 'active' | 'closing' | 'closed';

export interface Pilot {
  number: PilotNumber;
  state: PilotState;
  entryPrice: number | null;
  quantity: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  pnlPercent: number;
}

export interface PilotManagerState {
  symbol: string;
  direction: PositionSide | null;
  pilots: [Pilot, Pilot, Pilot, Pilot];
  totalQuantity: number;
  avgEntryPrice: number;
  masterStopLoss: number | null;
  masterTakeProfit: number | null;
}

export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  clientOrderId?: string;
  reduceOnly?: boolean;
  stopLoss?: number;
  takeProfit?: number;
  pilotNumber?: PilotNumber;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  clientOrderId?: string;
  error?: string;
}

export interface Position {
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgEntryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  marginMode: string;
  liquidationPrice: number;
}

export interface AccountBalance {
  equity: number;
  available: number;
  unrealizedPnl: number;
  marginUsed: number;
  marginRatio: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;
  avgTradeDuration: number;
}
