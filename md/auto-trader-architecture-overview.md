# Building a Next.js trading dashboard with Bitget and TradingView

The optimal architecture combines **Next.js App Router with Supabase** for the frontend/database layer, **Bitget's V2 API with the `bitget-api` npm SDK** for exchange connectivity, and **event-driven state management** for reliable order execution. TradingView webhooks can be received directly in Next.js API routes with passphrase validation, while Supabase Vault handles secure API key storage. This stack enables real-time position tracking, automated signal execution, and comprehensive performance analytics—all in a single deployable application.

The architecture follows a proven pattern: webhooks trigger trade signals stored in Supabase, which notifies the trading bot via real-time subscriptions. The bot validates against risk rules, executes via Bitget's API, and logs all events for audit trails. Dashboard components subscribe to position and trade tables for live P&L updates.

---

## Bitget Futures API integration requires HMAC-SHA256 signatures and WebSocket heartbeats

Bitget's V2 API serves USDT-M perpetual futures at `https://api.bitget.com`. Every authenticated request needs four headers: `ACCESS-KEY` (your API key), `ACCESS-SIGN` (Base64-encoded HMAC-SHA256 signature), `ACCESS-TIMESTAMP` (milliseconds since epoch), and `ACCESS-PASSPHRASE`. The signature is computed over a prehash string constructed as `timestamp + HTTP_METHOD + requestPath + body`.

The **`bitget-api` npm package** (maintained by tiagosiebler) handles authentication automatically and supports both REST and WebSocket connections:

```typescript
import { RestClientV2, WebsocketClientV2 } from 'bitget-api';

const client = new RestClientV2({
  apiKey: process.env.BITGET_API_KEY,
  apiSecret: process.env.BITGET_API_SECRET,
  apiPass: process.env.BITGET_API_PASSPHRASE,
});

// Place a limit order
const order = await client.submitFuturesOrder({
  symbol: 'BTCUSDT',
  productType: 'USDT-FUTURES',
  marginMode: 'crossed',
  marginCoin: 'USDT',
  size: '0.01',
  price: '50000',
  side: 'buy',
  orderType: 'limit',
  force: 'gtc',
});

// WebSocket for real-time position updates
const wsClient = new WebsocketClientV2({
  apiKey: process.env.BITGET_API_KEY,
  apiSecret: process.env.BITGET_API_SECRET,
  apiPass: process.env.BITGET_API_PASSPHRASE,
});

wsClient.on('update', (data) => console.log('Position update:', data));
wsClient.subscribeTopic('USDT-FUTURES', 'positions', 'default');
wsClient.subscribeTopic('USDT-FUTURES', 'orders', 'default');
```

Rate limits are **10 requests/second per endpoint** for order placement and account queries. WebSocket connections require sending `"ping"` every 30 seconds and are force-closed after 24 hours—implement automatic reconnection. The SDK handles this internally with the `WebsocketClientV2` class.

For hedge-mode trading, specify both `side` (buy/sell) and `tradeSide` (open/close). Opening a long uses `side=buy, tradeSide=open`; closing that long uses `side=buy, tradeSide=close`. One-way mode ignores `tradeSide` entirely.

---

## TradingView webhooks need secret passphrases and sub-3-second responses

TradingView requires a **Pro subscription** ($12.95/month minimum) for webhook functionality and only accepts URLs on **ports 80 or 443**. Alerts must include 2FA enabled on your account. The platform sends POST requests with `application/json` content-type when the alert message is valid JSON.

Structure your alert message with dynamic placeholders and a secret passphrase for authentication:

```json
{
  "passphrase": "your-secret-key-here",
  "ticker": "{{ticker}}",
  "exchange": "{{exchange}}",
  "action": "{{strategy.order.action}}",
  "price": "{{close}}",
  "quantity": "{{strategy.order.contracts}}",
  "time": "{{timenow}}",
  "position": "{{strategy.market_position}}"
}
```

Create a Next.js API route that validates the passphrase and responds within TradingView's **3-second timeout**:

```typescript
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const TRADINGVIEW_IPS = ['52.89.214.238', '34.212.75.30', '54.218.53.128', '52.32.178.7'];

export async function POST(request: NextRequest) {
  const payload = await request.json();
  
  // Validate secret
  if (payload.passphrase !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Store signal in Supabase (bot will pick up via real-time subscription)
  const supabase = await createClient();
  await supabase.from('trade_signals').insert({
    ticker: payload.ticker,
    action: payload.action,
    price: parseFloat(payload.price),
    quantity: parseFloat(payload.quantity),
    source: 'tradingview',
    processed: false
  });
  
  return NextResponse.json({ success: true });
}
```

For production reliability, implement **idempotency** using Redis or Supabase to track processed signal IDs, preventing duplicate order execution if TradingView sends retries. IP whitelisting provides an additional security layer but should not be the only validation method.

---

## Supabase schema design centers on trades, positions, and encrypted API keys

A trading application needs tables for **orders** (pending/filled/cancelled), **trades** (executed fills), **positions** (current holdings), **strategies** (trading logic configuration), and **performance_snapshots** (daily metrics). Enable Row-Level Security on all tables with policies like `auth.uid() = user_id` for single-user apps.

```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'long' or 'short'
  quantity DECIMAL(18,8) NOT NULL,
  avg_entry_price DECIMAL(18,8) NOT NULL,
  unrealized_pnl DECIMAL(18,8),
  realized_pnl DECIMAL(18,8) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  position_id UUID REFERENCES positions(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity DECIMAL(18,8) NOT NULL,
  price DECIMAL(18,8) NOT NULL,
  fee DECIMAL(18,8) DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time for dashboard subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE positions, trades;
```

Store exchange API keys in **Supabase Vault** rather than plain database columns. Vault uses authenticated encryption at rest with keys managed by Supabase infrastructure:

```sql
-- Store API key in Vault
SELECT vault.create_secret(
  'your-bitget-api-key',
  'bitget_api_key_user_123',
  'Bitget API key for trading'
);

-- Access in Edge Function via security definer function
CREATE FUNCTION get_exchange_credentials(connection_id UUID)
RETURNS TABLE(api_key TEXT, api_secret TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT ds.decrypted_secret as api_key, ds2.decrypted_secret as api_secret
  FROM exchange_connections ec
  JOIN vault.decrypted_secrets ds ON ec.api_key_id = ds.id
  JOIN vault.decrypted_secrets ds2 ON ec.api_secret_id = ds2.id
  WHERE ec.id = connection_id AND ec.user_id = auth.uid();
END;
$$;
```

Real-time subscriptions must run in **Client Components** since they maintain WebSocket connections. Subscribe to position changes for live P&L updates:

```typescript
// hooks/useRealtimePositions.ts
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimePositions(userId: string) {
  const [positions, setPositions] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`positions:${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'positions', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPositions(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return positions;
}
```

---

## Trading bot architecture needs state machines, retry logic, and risk safeguards

Model order lifecycle as a **state machine** with states: CREATED → SUBMITTED → PENDING → PARTIAL_FILL → FILLED (or CANCELLED/REJECTED/FAILED). This enables proper handling of partial fills—record each fill incrementally and update position average price accordingly.

```typescript
enum OrderState {
  CREATED, SUBMITTED, PENDING, PARTIAL_FILL, FILLED, CANCELLED, REJECTED, FAILED
}

async function handleOrderUpdate(update: ExchangeOrderUpdate) {
  const order = await getOrder(update.clientOrderId);
  
  if (update.filledSize > order.filledSize) {
    const newFillSize = update.filledSize - order.filledSize;
    await recordFill({ orderId: order.id, size: newFillSize, price: update.lastFillPrice });
    
    order.filledSize = update.filledSize;
    order.state = update.filledSize >= order.requestedSize 
      ? OrderState.FILLED 
      : OrderState.PARTIAL_FILL;
    
    await updatePositionOnFill(order);
  }
}
```

Implement **exponential backoff with jitter** for transient failures (HTTP 429, 500, 502, 503, 504). Non-retryable errors (400, 401, 403) should fail immediately. A circuit breaker pattern prevents cascading failures when an exchange is unresponsive:

```typescript
async function executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === maxRetries - 1) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      const jitter = delay * 0.3 * (Math.random() - 0.5);
      await sleep(delay + jitter);
    }
  }
}
```

Risk management requires **multiple validation layers** before order execution:

- **Maximum position size**: Reject orders exceeding configurable limits per symbol
- **Daily loss limit**: Track cumulative P&L and halt trading at threshold (e.g., -5%)
- **Maximum drawdown**: Monitor peak-to-trough equity decline, activate kill switch at threshold
- **Rate limiting**: Enforce maximum orders per minute to prevent runaway algorithms
- **Kill switch**: Manual and automatic emergency stop that cancels all orders and optionally closes positions

Log every order event with immutable audit trails including timestamp, order details, exchange response, and cryptographic hash linking to previous log entry.

---

## Dashboard combines Lightweight Charts, TanStack Table, and Tremor components

TradingView's open-source **Lightweight Charts** library provides performant candlestick rendering. For a Next.js trading dashboard, combine it with **Recharts** for equity curves and **Tremor** for KPI cards:

```typescript
import { createChart, CandlestickSeries } from 'lightweight-charts';

useEffect(() => {
  const chart = createChart(containerRef.current, {
    layout: { background: { color: '#1a1a2e' }, textColor: '#d1d4dc' },
    width: containerRef.current.clientWidth,
    height: 400,
  });
  
  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a',
    downColor: '#ef5350',
  });
  
  candleSeries.setData(priceData);
  
  // Real-time updates
  wsClient.on('update', (tick) => candleSeries.update(tick));
  
  return () => chart.remove();
}, []);
```

Calculate **performance metrics** server-side or in a dedicated worker:

- **Win rate**: Percentage of trades with positive P&L (target >55%)
- **Profit factor**: Gross profit ÷ gross loss (target >1.5)
- **Maximum drawdown**: Largest peak-to-trough decline (keep <20%)
- **Sharpe ratio**: (Return - RiskFreeRate) ÷ StandardDeviation, annualized (target >1.5)

Use **TanStack Table** for trade history with sorting, filtering, and pagination. Export functionality via CSV generation in the browser.

The recommended UI stack for 2024-2025: **shadcn/ui** for base components, **Tremor** for dashboard-specific widgets (metric cards, progress bars), **Tailwind CSS** for styling, and **TanStack Query** for server state management with automatic refetching.

---

## Conclusion

This architecture delivers a production-ready trading dashboard by separating concerns: Next.js handles the UI and webhook ingestion, Supabase manages persistence and real-time subscriptions, and a dedicated trading bot process (which can run in Supabase Edge Functions or a separate Node.js service) handles order execution with proper risk controls.

Key implementation priorities: Start with the Bitget SDK integration and manual trading to verify authentication works. Add the TradingView webhook endpoint with passphrase validation. Build the Supabase schema with RLS policies before storing any real credentials in Vault. Implement the risk management layer **before** enabling automated execution—daily loss limits and kill switches prevent catastrophic losses. Finally, add the dashboard visualization layer using the real-time subscription patterns.

The `bitget-api` npm package significantly reduces integration complexity by handling signature generation, WebSocket reconnection, and type safety. For the database, keep trade logs immutable and use Supabase's built-in Point-in-Time Recovery for disaster recovery. Test all automated workflows in Bitget's testnet environment before deploying with real capital.