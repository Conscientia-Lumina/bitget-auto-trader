# 🔗 BITGET INTEGRATION - Exchange API Guide

## Overview

This file covers complete Bitget Futures (USDT-M) integration using the `bitget-api` npm package.

---

## Installation

```bash
npm install bitget-api
```

---

## Client Setup

### REST Client (`lib/bitget/client.ts`)

```typescript
import { RestClientV2 } from 'bitget-api';

let client: RestClientV2 | null = null;

export function getBitgetClient(): RestClientV2 {
  if (!client) {
    const apiKey = process.env.BITGET_API_KEY;
    const apiSecret = process.env.BITGET_API_SECRET;
    const apiPassphrase = process.env.BITGET_API_PASSPHRASE;

    if (!apiKey || !apiSecret || !apiPassphrase) {
      throw new Error('Bitget API credentials not configured');
    }

    client = new RestClientV2({
      apiKey,
      apiSecret,
      apiPass: apiPassphrase,
    });
  }

  return client;
}

// For testing connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = getBitgetClient();
    const result = await client.getFuturesAccountAsset({
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    });
    return !!result.data;
  } catch (error) {
    console.error('Bitget connection test failed:', error);
    return false;
  }
}
```

### WebSocket Client (`lib/bitget/websocket.ts`)

```typescript
import { WebsocketClientV2 } from 'bitget-api';

let wsClient: WebsocketClientV2 | null = null;

export function getBitgetWebsocket(): WebsocketClientV2 {
  if (!wsClient) {
    const apiKey = process.env.BITGET_API_KEY;
    const apiSecret = process.env.BITGET_API_SECRET;
    const apiPassphrase = process.env.BITGET_API_PASSPHRASE;

    if (!apiKey || !apiSecret || !apiPassphrase) {
      throw new Error('Bitget API credentials not configured');
    }

    wsClient = new WebsocketClientV2({
      apiKey,
      apiSecret,
      apiPass: apiPassphrase,
    });

    // Event handlers
    wsClient.on('open', () => {
      console.log('[Bitget WS] Connected');
    });

    wsClient.on('close', () => {
      console.log('[Bitget WS] Disconnected');
    });

    wsClient.on('error', (error) => {
      console.error('[Bitget WS] Error:', error);
    });

    wsClient.on('reconnect', () => {
      console.log('[Bitget WS] Reconnecting...');
    });

    wsClient.on('reconnected', () => {
      console.log('[Bitget WS] Reconnected');
    });
  }

  return wsClient;
}

// Subscribe to position updates
export function subscribeToPositions(
  callback: (data: any) => void
): () => void {
  const ws = getBitgetWebsocket();

  ws.on('update', (data) => {
    if (data.arg?.channel === 'positions') {
      callback(data.data);
    }
  });

  ws.subscribeTopic('USDT-FUTURES', 'positions', 'default');

  return () => {
    ws.unsubscribeTopic('USDT-FUTURES', 'positions', 'default');
  };
}

// Subscribe to order updates
export function subscribeToOrders(callback: (data: any) => void): () => void {
  const ws = getBitgetWebsocket();

  ws.on('update', (data) => {
    if (data.arg?.channel === 'orders') {
      callback(data.data);
    }
  });

  ws.subscribeTopic('USDT-FUTURES', 'orders', 'default');

  return () => {
    ws.unsubscribeTopic('USDT-FUTURES', 'orders', 'default');
  };
}

// Subscribe to ticker for price updates
export function subscribeToTicker(
  symbol: string,
  callback: (data: any) => void
): () => void {
  const ws = getBitgetWebsocket();

  ws.on('update', (data) => {
    if (data.arg?.channel === 'ticker' && data.arg?.instId === symbol) {
      callback(data.data);
    }
  });

  ws.subscribeTopic('USDT-FUTURES', 'ticker', symbol);

  return () => {
    ws.unsubscribeTopic('USDT-FUTURES', 'ticker', symbol);
  };
}
```

---

## Order Functions (`lib/bitget/orders.ts`)

```typescript
import { getBitgetClient } from './client';
import Decimal from 'decimal.js';

// Types
export interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  price?: number;
  clientOrderId?: string;
  reduceOnly?: boolean;
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  clientOrderId?: string;
  error?: string;
}

// Symbol formatting
function formatSymbol(symbol: string): string {
  // Ensure correct format: BTCUSDT -> BTCUSDT
  return symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
}

// Round quantity to valid precision
function roundQuantity(symbol: string, quantity: number): string {
  // BTC: 3 decimals, most alts: 1-2 decimals
  const precision = symbol.includes('BTC') ? 3 : 2;
  return new Decimal(quantity).toFixed(precision);
}

// Place order
export async function placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
  try {
    const client = getBitgetClient();
    const symbol = formatSymbol(params.symbol);
    const size = roundQuantity(symbol, params.quantity);

    console.log(`[Bitget] Placing ${params.orderType} ${params.side} order:`, {
      symbol,
      size,
      price: params.price,
    });

    // Build order request
    const orderRequest: any = {
      symbol,
      productType: 'USDT-FUTURES',
      marginMode: 'crossed',
      marginCoin: 'USDT',
      size,
      side: params.side,
      orderType: params.orderType,
      force: params.orderType === 'market' ? 'ioc' : 'gtc',
    };

    // Add price for limit orders
    if (params.orderType === 'limit' && params.price) {
      orderRequest.price = params.price.toString();
    }

    // Add client order ID if provided
    if (params.clientOrderId) {
      orderRequest.clientOid = params.clientOrderId;
    }

    // Add reduce only flag
    if (params.reduceOnly) {
      orderRequest.reduceOnly = 'YES';
    }

    // Submit order
    const result = await client.submitFuturesOrder(orderRequest);

    if (result.code !== '00000') {
      console.error('[Bitget] Order failed:', result);
      return {
        success: false,
        error: result.msg || 'Order failed',
      };
    }

    console.log('[Bitget] Order placed successfully:', result.data);

    // Place stop loss if specified
    if (params.stopLoss) {
      await placeStopLoss(symbol, params.side, size, params.stopLoss);
    }

    // Place take profit if specified
    if (params.takeProfit) {
      await placeTakeProfit(symbol, params.side, size, params.takeProfit);
    }

    return {
      success: true,
      orderId: result.data?.orderId,
      clientOrderId: result.data?.clientOid,
    };
  } catch (error) {
    console.error('[Bitget] Order error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Place stop loss order
async function placeStopLoss(
  symbol: string,
  side: 'buy' | 'sell',
  size: string,
  stopPrice: number
): Promise<void> {
  try {
    const client = getBitgetClient();

    // Stop loss is opposite side
    const slSide = side === 'buy' ? 'sell' : 'buy';

    await client.submitFuturesPlanOrder({
      symbol,
      productType: 'USDT-FUTURES',
      marginMode: 'crossed',
      marginCoin: 'USDT',
      size,
      side: slSide,
      orderType: 'market',
      triggerPrice: stopPrice.toString(),
      triggerType: 'mark_price',
      planType: 'loss_plan',
      reduceOnly: 'YES',
    });

    console.log(`[Bitget] Stop loss placed at ${stopPrice}`);
  } catch (error) {
    console.error('[Bitget] Stop loss error:', error);
  }
}

// Place take profit order
async function placeTakeProfit(
  symbol: string,
  side: 'buy' | 'sell',
  size: string,
  tpPrice: number
): Promise<void> {
  try {
    const client = getBitgetClient();

    // Take profit is opposite side
    const tpSide = side === 'buy' ? 'sell' : 'buy';

    await client.submitFuturesPlanOrder({
      symbol,
      productType: 'USDT-FUTURES',
      marginMode: 'crossed',
      marginCoin: 'USDT',
      size,
      side: tpSide,
      orderType: 'market',
      triggerPrice: tpPrice.toString(),
      triggerType: 'mark_price',
      planType: 'profit_plan',
      reduceOnly: 'YES',
    });

    console.log(`[Bitget] Take profit placed at ${tpPrice}`);
  } catch (error) {
    console.error('[Bitget] Take profit error:', error);
  }
}

// Cancel order
export async function cancelOrder(
  symbol: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getBitgetClient();

    const result = await client.cancelFuturesOrder({
      symbol: formatSymbol(symbol),
      productType: 'USDT-FUTURES',
      orderId,
    });

    if (result.code !== '00000') {
      return { success: false, error: result.msg };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Cancel all orders
export async function cancelAllOrders(): Promise<{
  success: boolean;
  cancelled: number;
  error?: string;
}> {
  try {
    const client = getBitgetClient();

    // Get all open orders first
    const openOrders = await client.getFuturesOpenOrders({
      productType: 'USDT-FUTURES',
    });

    if (!openOrders.data?.entrustedList?.length) {
      return { success: true, cancelled: 0 };
    }

    // Cancel each order
    let cancelled = 0;
    for (const order of openOrders.data.entrustedList) {
      const result = await cancelOrder(order.symbol, order.orderId);
      if (result.success) cancelled++;
    }

    // Also cancel plan orders (SL/TP)
    const planOrders = await client.getFuturesPlanOrders({
      productType: 'USDT-FUTURES',
    });

    if (planOrders.data?.entrustedList?.length) {
      for (const order of planOrders.data.entrustedList) {
        try {
          await client.cancelFuturesPlanOrder({
            symbol: order.symbol,
            productType: 'USDT-FUTURES',
            orderId: order.orderId,
          });
          cancelled++;
        } catch (e) {
          // Ignore errors for individual cancellations
        }
      }
    }

    return { success: true, cancelled };
  } catch (error) {
    return {
      success: false,
      cancelled: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get open orders
export async function getOpenOrders(symbol?: string): Promise<any[]> {
  try {
    const client = getBitgetClient();

    const params: any = { productType: 'USDT-FUTURES' };
    if (symbol) params.symbol = formatSymbol(symbol);

    const result = await client.getFuturesOpenOrders(params);
    return result.data?.entrustedList || [];
  } catch (error) {
    console.error('[Bitget] Get open orders error:', error);
    return [];
  }
}

// Get order by ID
export async function getOrder(
  symbol: string,
  orderId: string
): Promise<any | null> {
  try {
    const client = getBitgetClient();

    const result = await client.getFuturesOrder({
      symbol: formatSymbol(symbol),
      productType: 'USDT-FUTURES',
      orderId,
    });

    return result.data || null;
  } catch (error) {
    console.error('[Bitget] Get order error:', error);
    return null;
  }
}
```

---

## Position Functions (`lib/bitget/positions.ts`)

```typescript
import { getBitgetClient } from './client';

// Types
export interface Position {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  avgEntryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  marginMode: string;
  liquidationPrice: number;
}

// Get all positions
export async function getPositions(): Promise<Position[]> {
  try {
    const client = getBitgetClient();

    const result = await client.getFuturesPositions({
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    });

    if (!result.data) return [];

    return result.data
      .filter((p) => parseFloat(p.total) > 0)
      .map((p) => ({
        symbol: p.symbol,
        side: p.holdSide as 'long' | 'short',
        quantity: parseFloat(p.total),
        avgEntryPrice: parseFloat(p.averageOpenPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unrealizedPL),
        leverage: parseInt(p.leverage),
        marginMode: p.marginMode,
        liquidationPrice: parseFloat(p.liquidationPrice || '0'),
      }));
  } catch (error) {
    console.error('[Bitget] Get positions error:', error);
    return [];
  }
}

// Get position for specific symbol
export async function getPosition(symbol: string): Promise<Position | null> {
  const positions = await getPositions();
  return positions.find((p) => p.symbol === symbol) || null;
}

// Close position
export async function closePosition(
  symbol: string,
  side: 'long' | 'short',
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getBitgetClient();

    // Close is opposite direction
    const closeSide = side === 'long' ? 'sell' : 'buy';

    // Round quantity
    const precision = symbol.includes('BTC') ? 3 : 2;
    const size = quantity.toFixed(precision);

    const result = await client.submitFuturesOrder({
      symbol,
      productType: 'USDT-FUTURES',
      marginMode: 'crossed',
      marginCoin: 'USDT',
      size,
      side: closeSide,
      orderType: 'market',
      force: 'ioc',
      reduceOnly: 'YES',
    });

    if (result.code !== '00000') {
      return { success: false, error: result.msg };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Close all positions
export async function closeAllPositions(): Promise<{
  success: boolean;
  closed: number;
  error?: string;
}> {
  try {
    const positions = await getPositions();

    if (positions.length === 0) {
      return { success: true, closed: 0 };
    }

    let closed = 0;
    for (const position of positions) {
      const result = await closePosition(
        position.symbol,
        position.side,
        position.quantity
      );
      if (result.success) closed++;
    }

    return { success: true, closed };
  } catch (error) {
    return {
      success: false,
      closed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Set leverage for symbol
export async function setLeverage(
  symbol: string,
  leverage: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getBitgetClient();

    await client.setFuturesLeverage({
      symbol,
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
      leverage: leverage.toString(),
      holdSide: 'long',
    });

    await client.setFuturesLeverage({
      symbol,
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
      leverage: leverage.toString(),
      holdSide: 'short',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## Account Functions (`lib/bitget/account.ts`)

```typescript
import { getBitgetClient } from './client';

// Types
export interface AccountBalance {
  equity: number;
  available: number;
  unrealizedPnl: number;
  marginUsed: number;
  marginRatio: number;
}

// Get account balance
export async function getAccountBalance(): Promise<AccountBalance | null> {
  try {
    const client = getBitgetClient();

    const result = await client.getFuturesAccountAsset({
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    });

    if (!result.data) return null;

    const data = result.data;

    return {
      equity: parseFloat(data.accountEquity || '0'),
      available: parseFloat(data.crossedMaxAvailable || '0'),
      unrealizedPnl: parseFloat(data.unrealizedPL || '0'),
      marginUsed: parseFloat(data.locked || '0'),
      marginRatio: parseFloat(data.crossedRiskRate || '0'),
    };
  } catch (error) {
    console.error('[Bitget] Get account balance error:', error);
    return null;
  }
}

// Get trade history
export async function getTradeHistory(
  symbol?: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const client = getBitgetClient();

    const params: any = {
      productType: 'USDT-FUTURES',
      limit: limit.toString(),
    };
    if (symbol) params.symbol = symbol;

    const result = await client.getFuturesFills(params);
    return result.data?.fillList || [];
  } catch (error) {
    console.error('[Bitget] Get trade history error:', error);
    return [];
  }
}
```

---

## TypeScript Types (`lib/bitget/types.ts`)

```typescript
// Order types
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

// Request/Response types
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

// WebSocket types
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
```

---

## Error Handling

```typescript
// lib/bitget/errors.ts

export class BitgetError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'BitgetError';
  }
}

export function handleBitgetError(error: unknown): BitgetError {
  if (error instanceof BitgetError) {
    return error;
  }

  if (error instanceof Error) {
    // Parse Bitget API errors
    if (error.message.includes('insufficient')) {
      return new BitgetError('INSUFFICIENT_BALANCE', 'Insufficient balance', error);
    }
    if (error.message.includes('position')) {
      return new BitgetError('POSITION_ERROR', 'Position error', error);
    }
    if (error.message.includes('order')) {
      return new BitgetError('ORDER_ERROR', 'Order error', error);
    }
    return new BitgetError('UNKNOWN', error.message, error);
  }

  return new BitgetError('UNKNOWN', 'Unknown error occurred', error);
}

// Common error codes from Bitget
export const BITGET_ERROR_CODES = {
  '40001': 'Invalid API key',
  '40002': 'Invalid signature',
  '40003': 'Invalid timestamp',
  '40004': 'Invalid passphrase',
  '40005': 'IP not whitelisted',
  '40006': 'Rate limit exceeded',
  '40007': 'Insufficient permissions',
  '43001': 'Insufficient balance',
  '43002': 'Position does not exist',
  '43003': 'Order does not exist',
  '43004': 'Invalid order quantity',
  '43005': 'Invalid order price',
  '43006': 'Position would exceed limit',
} as const;
```

---

## Rate Limiting

```typescript
// lib/bitget/rate-limiter.ts

class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old requests
    this.requests = this.requests.filter(
      (time) => now - time < this.windowMs
    );

    if (this.requests.length >= this.maxRequests) {
      // Wait for oldest request to expire
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.requests.push(now);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter(10, 1000); // 10 requests per second

// Wrapper function
export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  await rateLimiter.acquire();
  return fn();
}
```

---

## Testing Connection

```typescript
// Test script to verify Bitget connection
// Run with: npx ts-node scripts/test-bitget.ts

import { getBitgetClient, testConnection } from '@/lib/bitget/client';
import { getAccountBalance } from '@/lib/bitget/account';
import { getPositions } from '@/lib/bitget/positions';

async function main() {
  console.log('Testing Bitget connection...\n');

  // Test connection
  const connected = await testConnection();
  console.log('Connected:', connected);

  if (!connected) {
    console.error('Failed to connect to Bitget');
    process.exit(1);
  }

  // Get balance
  const balance = await getAccountBalance();
  console.log('\nAccount Balance:', balance);

  // Get positions
  const positions = await getPositions();
  console.log('\nOpen Positions:', positions);

  console.log('\n✅ Bitget integration test complete!');
}

main().catch(console.error);
```
