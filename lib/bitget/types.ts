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

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  clientOrderId?: string;
  reduceOnly?: boolean;
}

export interface OrderResponse {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  status: OrderStatus;
  filledQuantity: number;
  avgFillPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PositionResponse {
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice?: number;
}

export interface BalanceResponse {
  equity: number;
  available: number;
  unrealizedPnl: number;
  marginUsed: number;
}

export interface WSPositionUpdate {
  symbol: string;
  holdSide: string;
  total: string;
  available: string;
  averageOpenPrice: string;
  unrealizedPL: string;
  marginSize: string;
}

export interface WSOrderUpdate {
  orderId: string;
  clientOid: string;
  symbol: string;
  side: string;
  orderType: string;
  size: string;
  filledQty: string;
  priceAvg: string;
  status: string;
  cTime: string;
  uTime: string;
}
