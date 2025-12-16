# 🛣️ API ROUTES - Complete Endpoint Reference

## Overview

All API routes live in `app/api/`. Each route handles specific functionality with consistent error handling and response formats.

---

## Response Format Standard

```typescript
// lib/types/api.ts

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// Helper function
export function createResponse<T>(
  data: T,
  status: number = 200
): NextResponse<APIResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    },
    { status }
  );
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse<APIResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    },
    { status }
  );
}
```

---

## 1. Webhook Endpoint

### POST `/api/webhook`

Receives TradingView alerts and stores them for processing.

```typescript
// app/api/webhook/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const WebhookSchema = z.object({
  passphrase: z.string(),
  ticker: z.string(),
  action: z.enum(['buy', 'sell', 'close_long', 'close_short']),
  price: z.string().transform((v) => parseFloat(v)),
  quantity: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  strategy: z.string().optional(),
  pilot: z.number().min(1).max(4).optional(),
  timeframe: z.string().optional(),
  position: z.string().optional(),
  time: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse body
    const body = await request.json();
    
    // Validate passphrase FIRST
    if (body.passphrase !== process.env.WEBHOOK_SECRET) {
      console.warn('Webhook unauthorized attempt:', { 
        ip: request.headers.get('x-forwarded-for'),
        timestamp: new Date().toISOString()
      });
      return createErrorResponse('UNAUTHORIZED', 'Invalid passphrase', 401);
    }
    
    // Validate payload
    const parsed = WebhookSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid webhook payload',
        400,
        { errors: parsed.error.flatten() }
      );
    }
    
    const signal = parsed.data;
    
    // Store signal in database
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('trade_signals')
      .insert({
        ticker: signal.ticker,
        action: signal.action,
        price: signal.price,
        quantity: signal.quantity,
        strategy_name: signal.strategy,
        pilot_number: signal.pilot,
        timeframe: signal.timeframe,
        raw_payload: body,
        processed: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to store signal:', error);
      return createErrorResponse('DATABASE_ERROR', 'Failed to store signal', 500);
    }
    
    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'signal_received',
      p_category: 'signal',
      p_message: `Received ${signal.action} signal for ${signal.ticker}`,
      p_details: { signal_id: data.id, price: signal.price },
      p_signal_id: data.id,
    });
    
    return createResponse({ signalId: data.id, status: 'received' });
    
  } catch (err) {
    console.error('Webhook error:', err);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to process webhook', 500);
  }
}
```

---

## 2. Trade Endpoints

### GET `/api/trades`

List trades with filtering and pagination.

```typescript
// app/api/trades/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query params
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('trades')
      .select('*, orders!inner(symbol)', { count: 'exact' })
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (symbol) query = query.eq('symbol', symbol);
    if (side) query = query.eq('side', side);
    if (startDate) query = query.gte('executed_at', startDate);
    if (endDate) query = query.lte('executed_at', endDate);
    
    const { data, error, count } = await query;
    
    if (error) {
      return createErrorResponse('DATABASE_ERROR', error.message, 500);
    }
    
    return createResponse({
      trades: data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
    
  } catch (err) {
    console.error('Trades fetch error:', err);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch trades', 500);
  }
}
```

### GET `/api/trades/[id]`

Get single trade details.

```typescript
// app/api/trades/[id]/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        order:orders(*),
        position:positions(*)
      `)
      .eq('id', params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('NOT_FOUND', 'Trade not found', 404);
      }
      return createErrorResponse('DATABASE_ERROR', error.message, 500);
    }
    
    return createResponse(data);
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch trade', 500);
  }
}
```

---

## 3. Position Endpoints

### GET `/api/positions`

List positions (defaults to open positions).

```typescript
// app/api/positions/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'open';
    const symbol = searchParams.get('symbol');
    
    const supabase = await createClient();
    
    let query = supabase
      .from('positions')
      .select('*')
      .order('opened_at', { ascending: false });
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return createErrorResponse('DATABASE_ERROR', error.message, 500);
    }
    
    return createResponse({ positions: data });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch positions', 500);
  }
}
```

### POST `/api/positions/close`

Close a position manually.

```typescript
// app/api/positions/close/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';
import { closePosition } from '@/lib/bitget/positions';
import { z } from 'zod';

const ClosePositionSchema = z.object({
  positionId: z.string().uuid(),
  percentage: z.number().min(0).max(100).default(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ClosePositionSchema.safeParse(body);
    
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid request', 400);
    }
    
    const { positionId, percentage } = parsed.data;
    const supabase = await createClient();
    
    // Get position
    const { data: position, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .eq('status', 'open')
      .single();
    
    if (fetchError || !position) {
      return createErrorResponse('NOT_FOUND', 'Position not found or already closed', 404);
    }
    
    // Close on exchange
    const closeQty = position.quantity * (percentage / 100);
    const result = await closePosition(position.symbol, position.side, closeQty);
    
    if (!result.success) {
      return createErrorResponse('EXCHANGE_ERROR', result.error || 'Failed to close position', 500);
    }
    
    // Update database
    const newStatus = percentage === 100 ? 'closed' : 'open';
    const newQty = position.quantity - closeQty;
    
    await supabase
      .from('positions')
      .update({
        status: newStatus,
        quantity: newQty,
        closed_at: percentage === 100 ? new Date().toISOString() : null,
      })
      .eq('id', positionId);
    
    return createResponse({
      message: `Position ${percentage === 100 ? 'closed' : 'partially closed'}`,
      closedQuantity: closeQty,
      remainingQuantity: newQty,
    });
    
  } catch (err) {
    console.error('Close position error:', err);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to close position', 500);
  }
}
```

---

## 4. Exchange Endpoints

### GET `/api/exchange/balance`

```typescript
// app/api/exchange/balance/route.ts

import { createResponse, createErrorResponse } from '@/lib/types/api';
import { getBitgetClient } from '@/lib/bitget/client';

export async function GET() {
  try {
    const client = getBitgetClient();
    
    const accountInfo = await client.getFuturesAccountAsset({
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    });
    
    if (!accountInfo.data) {
      return createErrorResponse('EXCHANGE_ERROR', 'Failed to fetch balance', 500);
    }
    
    const account = accountInfo.data;
    
    return createResponse({
      balance: parseFloat(account.accountEquity || '0'),
      available: parseFloat(account.crossedMaxAvailable || '0'),
      unrealizedPnl: parseFloat(account.unrealizedPL || '0'),
      marginUsed: parseFloat(account.locked || '0'),
      currency: 'USDT',
    });
    
  } catch (err) {
    console.error('Balance fetch error:', err);
    return createErrorResponse('EXCHANGE_ERROR', 'Failed to fetch balance', 500);
  }
}
```

### GET `/api/exchange/positions`

```typescript
// app/api/exchange/positions/route.ts

import { createResponse, createErrorResponse } from '@/lib/types/api';
import { getBitgetClient } from '@/lib/bitget/client';

export async function GET() {
  try {
    const client = getBitgetClient();
    
    const positions = await client.getFuturesPositions({
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    });
    
    if (!positions.data) {
      return createResponse({ positions: [] });
    }
    
    const formatted = positions.data
      .filter((p) => parseFloat(p.total) > 0)
      .map((p) => ({
        symbol: p.symbol,
        side: p.holdSide === 'long' ? 'long' : 'short',
        quantity: parseFloat(p.total),
        avgEntryPrice: parseFloat(p.averageOpenPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unrealizedPL),
        leverage: parseInt(p.leverage),
        marginMode: p.marginMode,
        liquidationPrice: parseFloat(p.liquidationPrice || '0'),
      }));
    
    return createResponse({ positions: formatted });
    
  } catch (err) {
    console.error('Exchange positions error:', err);
    return createErrorResponse('EXCHANGE_ERROR', 'Failed to fetch positions', 500);
  }
}
```

### POST `/api/exchange/orders`

```typescript
// app/api/exchange/orders/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';
import { placeOrder } from '@/lib/bitget/orders';
import { validateRisk } from '@/lib/trading/risk';
import { z } from 'zod';

const OrderSchema = z.object({
  symbol: z.string(),
  side: z.enum(['buy', 'sell']),
  orderType: z.enum(['market', 'limit']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  pilotNumber: z.number().min(1).max(4).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = OrderSchema.safeParse(body);
    
    if (!parsed.success) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid order', 400, {
        errors: parsed.error.flatten(),
      });
    }
    
    const order = parsed.data;
    const supabase = await createClient();
    
    // Validate risk rules
    const riskCheck = await validateRisk(order.symbol, order.quantity, order.side);
    if (!riskCheck.allowed) {
      await supabase.rpc('log_audit_event', {
        p_event_type: 'order_rejected',
        p_category: 'risk',
        p_message: `Order rejected: ${riskCheck.reason}`,
        p_details: order,
        p_severity: 'warning',
      });
      
      return createErrorResponse('RISK_VIOLATION', riskCheck.reason || 'Risk check failed', 400);
    }
    
    // Generate client order ID
    const clientOrderId = `pilot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Create order record first
    const { data: dbOrder, error: dbError } = await supabase
      .from('orders')
      .insert({
        client_order_id: clientOrderId,
        symbol: order.symbol,
        side: order.side,
        order_type: order.orderType,
        quantity: order.quantity,
        price: order.price,
        pilot_number: order.pilotNumber,
        status: 'pending',
      })
      .select()
      .single();
    
    if (dbError) {
      return createErrorResponse('DATABASE_ERROR', 'Failed to create order record', 500);
    }
    
    // Submit to exchange
    const result = await placeOrder({
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      quantity: order.quantity,
      price: order.price,
      clientOrderId,
    });
    
    // Update order with exchange response
    await supabase
      .from('orders')
      .update({
        exchange_order_id: result.orderId,
        status: result.success ? 'submitted' : 'failed',
        submitted_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', dbOrder.id);
    
    if (!result.success) {
      await supabase.rpc('log_audit_event', {
        p_event_type: 'order_failed',
        p_category: 'order',
        p_message: `Order failed: ${result.error}`,
        p_details: { order, exchangeError: result.error },
        p_order_id: dbOrder.id,
        p_severity: 'error',
      });
      
      return createErrorResponse('EXCHANGE_ERROR', result.error || 'Order failed', 500);
    }
    
    // Log success
    await supabase.rpc('log_audit_event', {
      p_event_type: 'order_submitted',
      p_category: 'order',
      p_message: `${order.side.toUpperCase()} ${order.quantity} ${order.symbol} @ ${order.orderType}`,
      p_details: { orderId: dbOrder.id, exchangeOrderId: result.orderId },
      p_order_id: dbOrder.id,
    });
    
    return createResponse({
      orderId: dbOrder.id,
      exchangeOrderId: result.orderId,
      status: 'submitted',
    });
    
  } catch (err) {
    console.error('Order submission error:', err);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to submit order', 500);
  }
}
```

---

## 5. Bot Control Endpoints

### GET `/api/bot/status`

```typescript
// app/api/bot/status/route.ts

import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('bot_state')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) {
      return createErrorResponse('DATABASE_ERROR', error.message, 500);
    }
    
    return createResponse({
      isRunning: data.is_running,
      isPaused: data.is_paused,
      isKilled: data.is_killed,
      activePilots: data.active_pilots,
      currentSymbol: data.current_symbol,
      currentDirection: data.current_direction,
      dailyPnl: data.daily_pnl,
      dailyLossLimitHit: data.daily_loss_limit_hit,
      lastSignalAt: data.last_signal_at,
      lastTradeAt: data.last_trade_at,
      lastError: data.last_error,
      startedAt: data.started_at,
    });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch bot status', 500);
  }
}
```

### POST `/api/bot/start`

```typescript
// app/api/bot/start/route.ts

import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Check if already running
    const { data: current } = await supabase
      .from('bot_state')
      .select('is_running, is_killed')
      .eq('id', 1)
      .single();
    
    if (current?.is_killed) {
      return createErrorResponse(
        'BOT_KILLED',
        'Bot is in killed state. Reset required.',
        400
      );
    }
    
    if (current?.is_running) {
      return createResponse({ message: 'Bot already running', status: 'running' });
    }
    
    // Start bot
    await supabase
      .from('bot_state')
      .update({
        is_running: true,
        is_paused: false,
        started_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', 1);
    
    await supabase.rpc('log_audit_event', {
      p_event_type: 'bot_started',
      p_category: 'bot',
      p_message: 'Trading bot started',
    });
    
    return createResponse({ message: 'Bot started', status: 'running' });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to start bot', 500);
  }
}
```

### POST `/api/bot/stop`

```typescript
// app/api/bot/stop/route.ts

import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    await supabase
      .from('bot_state')
      .update({
        is_running: false,
        stopped_at: new Date().toISOString(),
      })
      .eq('id', 1);
    
    await supabase.rpc('log_audit_event', {
      p_event_type: 'bot_stopped',
      p_category: 'bot',
      p_message: 'Trading bot stopped',
    });
    
    return createResponse({ message: 'Bot stopped', status: 'stopped' });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to stop bot', 500);
  }
}
```

### POST `/api/bot/kill`

Emergency kill switch - cancels all orders and optionally closes positions.

```typescript
// app/api/bot/kill/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';
import { cancelAllOrders, closeAllPositions } from '@/lib/bitget/orders';
import { z } from 'zod';

const KillSchema = z.object({
  closePositions: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { closePositions } = KillSchema.parse(body);
    
    const supabase = await createClient();
    
    // Set kill state immediately
    await supabase
      .from('bot_state')
      .update({
        is_running: false,
        is_paused: false,
        is_killed: true,
        stopped_at: new Date().toISOString(),
      })
      .eq('id', 1);
    
    // Cancel all open orders
    const cancelResult = await cancelAllOrders();
    
    let closeResult = { success: true, closed: 0 };
    if (closePositions) {
      closeResult = await closeAllPositions();
    }
    
    // Log critical event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'bot_killed',
      p_category: 'bot',
      p_message: 'EMERGENCY KILL SWITCH ACTIVATED',
      p_details: {
        closePositions,
        ordersCancelled: cancelResult.cancelled,
        positionsClosed: closeResult.closed,
      },
      p_severity: 'critical',
    });
    
    return createResponse({
      message: 'Kill switch activated',
      ordersCancelled: cancelResult.cancelled,
      positionsClosed: closeResult.closed,
    });
    
  } catch (err) {
    console.error('Kill switch error:', err);
    return createErrorResponse('INTERNAL_ERROR', 'Kill switch failed', 500);
  }
}
```

---

## 6. Analytics Endpoints

### GET `/api/analytics/performance`

```typescript
// app/api/analytics/performance/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';
import { calculateMetrics } from '@/lib/utils/calculations';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    
    const supabase = await createClient();
    
    // Get date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case 'all': startDate = new Date(0); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Fetch trades for period
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .gte('executed_at', startDate.toISOString())
      .order('executed_at', { ascending: true });
    
    if (error) {
      return createErrorResponse('DATABASE_ERROR', error.message, 500);
    }
    
    const metrics = calculateMetrics(trades || []);
    
    return createResponse({
      period,
      metrics: {
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: metrics.winRate,
        totalPnl: metrics.totalPnl,
        grossProfit: metrics.grossProfit,
        grossLoss: metrics.grossLoss,
        profitFactor: metrics.profitFactor,
        avgWin: metrics.avgWin,
        avgLoss: metrics.avgLoss,
        largestWin: metrics.largestWin,
        largestLoss: metrics.largestLoss,
        maxDrawdown: metrics.maxDrawdown,
        avgTradeDuration: metrics.avgTradeDuration,
      },
    });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to calculate metrics', 500);
  }
}
```

### GET `/api/analytics/equity-curve`

```typescript
// app/api/analytics/equity-curve/route.ts

import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    
    const supabase = await createClient();
    
    // Get performance snapshots
    const { data, error } = await supabase
      .from('performance_snapshots')
      .select('snapshot_date, account_balance, daily_pnl, current_drawdown')
      .order('snapshot_date', { ascending: true })
      .limit(period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365);
    
    if (error) {
      return createErrorResponse('DATABASE_ERROR', error.message, 500);
    }
    
    return createResponse({
      dataPoints: data?.map((d) => ({
        date: d.snapshot_date,
        equity: d.account_balance,
        dailyPnl: d.daily_pnl,
        drawdown: d.current_drawdown,
      })) || [],
    });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch equity curve', 500);
  }
}
```

---

## 7. Settings Endpoints

### GET `/api/settings`

```typescript
// app/api/settings/route.ts

import { createResponse, createErrorResponse } from '@/lib/types/api';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');
    
    if (error) {
      return createErrorResponse('DATABASE_ERROR', error.message, 500);
    }
    
    // Convert to object
    const settings = (data || []).reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, any>);
    
    return createResponse({ settings });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch settings', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    
    // Update each setting
    for (const [key, value] of Object.entries(body)) {
      await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
    }
    
    return createResponse({ message: 'Settings updated' });
    
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', 'Failed to update settings', 500);
  }
}
```
