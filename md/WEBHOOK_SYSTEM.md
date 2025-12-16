# 📡 WEBHOOK SYSTEM - TradingView Integration

## Overview

This file covers the complete webhook system for receiving TradingView alerts and processing them into trades.

---

## TradingView Alert Setup

### Pine Script Alert Format

Update your Pine Script strategy to send JSON alerts:

```pinescript
// In your Pine Script strategy, add these alert conditions:

// ========================================
// WEBHOOK ALERTS
// ========================================

// Generate JSON payload for alerts
getAlertPayload(action, pilotNum) =>
    '{"passphrase": "' + str.tostring(input.string("YOUR_SECRET_HERE", "Webhook Secret", group="Alerts")) + '",' +
    '"ticker": "' + syminfo.ticker + '",' +
    '"action": "' + action + '",' +
    '"price": "' + str.tostring(close) + '",' +
    '"quantity": "' + str.tostring(strategy.position_size) + '",' +
    '"strategy": "multi_pilot_v2",' +
    '"pilot": ' + str.tostring(pilotNum) + ',' +
    '"timeframe": "' + timeframe.period + '",' +
    '"time": "' + str.tostring(timenow) + '"}'

// Alert conditions for each pilot
if pilot1_long
    alert(getAlertPayload("buy", 1), alert.freq_once_per_bar_close)

if pilot1_short
    alert(getAlertPayload("sell", 1), alert.freq_once_per_bar_close)

if pilot2_long
    alert(getAlertPayload("buy", 2), alert.freq_once_per_bar_close)

// ... etc for other pilots

// Close conditions
if strategy.position_size == 0 and strategy.position_size[1] != 0
    action = strategy.position_size[1] > 0 ? "close_long" : "close_short"
    alert(getAlertPayload(action, 0), alert.freq_once_per_bar_close)
```

### TradingView Alert Configuration

1. **Create Alert** on your chart with the strategy
2. **Condition**: Select your strategy alert
3. **Webhook URL**: `https://your-domain.vercel.app/api/webhook`
4. **Message**: Leave empty (Pine Script generates it) or use:

```json
{
  "passphrase": "your-secret-passphrase",
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": "{{close}}",
  "quantity": "{{strategy.order.contracts}}",
  "strategy": "{{strategy.order.comment}}",
  "time": "{{timenow}}"
}
```

---

## Webhook API Route

### Main Webhook Handler (`app/api/webhook/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// Validation schema
const WebhookPayloadSchema = z.object({
  passphrase: z.string(),
  ticker: z.string().min(1),
  action: z.enum(['buy', 'sell', 'close_long', 'close_short']),
  price: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  quantity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  strategy: z.string().optional(),
  pilot: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  timeframe: z.string().optional(),
  time: z.string().optional(),
  position: z.string().optional(),
});

// TradingView IP addresses (for optional IP filtering)
const TRADINGVIEW_IPS = [
  '52.89.214.238',
  '34.212.75.30',
  '54.218.53.128',
  '52.32.178.7',
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const headersList = await headers();
  const clientIP =
    headersList.get('x-forwarded-for')?.split(',')[0] ||
    headersList.get('x-real-ip') ||
    'unknown';

  try {
    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      console.error('[Webhook] Invalid JSON body');
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Validate passphrase FIRST (before any other processing)
    const rawBody = body as Record<string, unknown>;
    if (rawBody.passphrase !== process.env.WEBHOOK_SECRET) {
      console.warn('[Webhook] Unauthorized attempt:', {
        ip: clientIP,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate payload structure
    const parseResult = WebhookPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('[Webhook] Validation failed:', parseResult.error.flatten());
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const signal = parseResult.data;

    // Store in database
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('trade_signals')
      .insert({
        ticker: normalizeSymbol(signal.ticker),
        action: signal.action,
        price: signal.price,
        quantity: signal.quantity,
        strategy_name: signal.strategy,
        pilot_number: signal.pilot,
        timeframe: signal.timeframe,
        raw_payload: body as object,
        processed: false,
        source: 'tradingview',
      })
      .select()
      .single();

    if (error) {
      console.error('[Webhook] Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to store signal' },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'signal_received',
      p_category: 'signal',
      p_message: `Received ${signal.action} signal for ${signal.ticker} from TradingView`,
      p_details: {
        signal_id: data.id,
        price: signal.price,
        pilot: signal.pilot,
        processing_time_ms: Date.now() - startTime,
      },
      p_signal_id: data.id,
    });

    console.log('[Webhook] Signal stored:', {
      id: data.id,
      ticker: signal.ticker,
      action: signal.action,
      pilot: signal.pilot,
      processingTime: `${Date.now() - startTime}ms`,
    });

    // Return success (must respond quickly for TradingView)
    return NextResponse.json({
      success: true,
      signalId: data.id,
      message: 'Signal received',
    });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Normalize symbol format
function normalizeSymbol(ticker: string): string {
  // Remove exchange prefix if present (BINANCE:BTCUSDT -> BTCUSDT)
  const parts = ticker.split(':');
  const symbol = parts.length > 1 ? parts[1] : parts[0];

  // Remove .P suffix for perpetuals (BTCUSDT.P -> BTCUSDT)
  return symbol.replace(/\.P$/, '').toUpperCase();
}

// Optional: GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'webhook',
    timestamp: new Date().toISOString(),
  });
}
```

---

## Signal Processor

### Signal Processing Service (`lib/trading/signals.ts`)

```typescript
import { createClient } from '@/lib/supabase/server';
import { placeOrder } from '@/lib/bitget/orders';
import { validateRisk } from './risk';
import { PilotManager } from './pilot-manager';
import type { Database } from '@/types/database';

type Signal = Database['public']['Tables']['trade_signals']['Row'];

export class SignalProcessor {
  private supabase: ReturnType<typeof createClient>;
  private pilotManager: PilotManager;

  constructor() {
    this.supabase = createClient();
    this.pilotManager = new PilotManager();
  }

  // Process a single signal
  async processSignal(signalId: string): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    const supabase = await this.supabase;

    try {
      // Get signal
      const { data: signal, error: fetchError } = await supabase
        .from('trade_signals')
        .select('*')
        .eq('id', signalId)
        .single();

      if (fetchError || !signal) {
        return { success: false, error: 'Signal not found' };
      }

      // Check if already processed
      if (signal.processed) {
        return { success: false, error: 'Signal already processed' };
      }

      // Mark as processing
      await supabase
        .from('trade_signals')
        .update({ process_result: 'processing' })
        .eq('id', signalId);

      // Determine action
      let result: { success: boolean; orderId?: string; error?: string };

      switch (signal.action) {
        case 'buy':
        case 'sell':
          result = await this.handleEntrySignal(signal);
          break;
        case 'close_long':
        case 'close_short':
          result = await this.handleExitSignal(signal);
          break;
        default:
          result = { success: false, error: `Unknown action: ${signal.action}` };
      }

      // Update signal status
      await supabase
        .from('trade_signals')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          process_result: result.success ? 'success' : 'failed',
          error_message: result.error,
        })
        .eq('id', signalId);

      // Log result
      await supabase.rpc('log_audit_event', {
        p_event_type: result.success ? 'signal_processed' : 'signal_failed',
        p_category: 'signal',
        p_message: result.success
          ? `Signal processed: ${signal.action} ${signal.ticker}`
          : `Signal failed: ${result.error}`,
        p_details: { signal_id: signalId, result },
        p_signal_id: signalId,
        p_severity: result.success ? 'info' : 'warning',
      });

      return result;
    } catch (error) {
      console.error('[SignalProcessor] Error:', error);

      // Mark as failed
      await supabase
        .from('trade_signals')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          process_result: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', signalId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Handle entry signals (buy/sell)
  private async handleEntrySignal(signal: Signal): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    const supabase = await this.supabase;

    // Determine direction
    const side = signal.action === 'buy' ? 'long' : 'short';

    // Check if this is a new position or adding to existing (pilot system)
    const pilotNumber = signal.pilot_number || 1;

    // Validate via pilot manager
    const pilotState = await this.pilotManager.getState(signal.ticker);

    if (pilotNumber > 1 && !pilotState) {
      return { success: false, error: `Cannot add P${pilotNumber} without active position` };
    }

    if (pilotState && pilotState.direction !== side) {
      return { success: false, error: 'Signal direction conflicts with active position' };
    }

    // Calculate position size
    const positionSize = await this.calculatePositionSize(
      signal.ticker,
      pilotNumber
    );

    if (!positionSize || positionSize <= 0) {
      return { success: false, error: 'Invalid position size calculated' };
    }

    // Validate risk
    const riskCheck = await validateRisk(signal.ticker, positionSize, signal.action);

    if (!riskCheck.allowed) {
      return { success: false, error: `Risk check failed: ${riskCheck.reason}` };
    }

    // Place order
    const orderResult = await placeOrder({
      symbol: signal.ticker,
      side: signal.action as 'buy' | 'sell',
      orderType: 'market',
      quantity: positionSize,
      clientOrderId: `signal_${signal.id}_p${pilotNumber}`,
    });

    if (!orderResult.success) {
      return { success: false, error: orderResult.error };
    }

    // Update pilot manager state
    await this.pilotManager.addPilot(signal.ticker, {
      number: pilotNumber as 1 | 2 | 3 | 4,
      entryPrice: signal.price,
      quantity: positionSize,
      direction: side,
    });

    return { success: true, orderId: orderResult.orderId };
  }

  // Handle exit signals
  private async handleExitSignal(signal: Signal): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    const pilotState = await this.pilotManager.getState(signal.ticker);

    if (!pilotState) {
      return { success: false, error: 'No active position to close' };
    }

    // Close the position
    const closeSide = signal.action === 'close_long' ? 'sell' : 'buy';

    const orderResult = await placeOrder({
      symbol: signal.ticker,
      side: closeSide,
      orderType: 'market',
      quantity: pilotState.totalQuantity,
      reduceOnly: true,
      clientOrderId: `close_${signal.id}`,
    });

    if (!orderResult.success) {
      return { success: false, error: orderResult.error };
    }

    // Clear pilot state
    await this.pilotManager.clearState(signal.ticker);

    return { success: true, orderId: orderResult.orderId };
  }

  // Calculate position size for a pilot
  private async calculatePositionSize(
    symbol: string,
    pilotNumber: number
  ): Promise<number> {
    const supabase = await this.supabase;

    // Get settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['risk_per_pilot', 'max_position_size']);

    const riskPercent =
      settings?.find((s) => s.key === 'risk_per_pilot')?.value || 2;
    const maxPositionPercent =
      settings?.find((s) => s.key === 'max_position_size')?.value || 25;

    // Get account balance
    const { getAccountBalance } = await import('@/lib/bitget/account');
    const balance = await getAccountBalance();

    if (!balance) return 0;

    // Get current price
    // In production, you'd fetch current price from exchange
    const price = await this.getCurrentPrice(symbol);

    if (!price) return 0;

    // Calculate size based on risk
    const riskAmount = balance.equity * (riskPercent / 100);
    const positionValue = riskAmount; // Simplified - in reality, factor in stop loss distance

    // Convert to quantity
    let quantity = positionValue / price;

    // Check against max position limit
    const maxPositionValue = balance.equity * (maxPositionPercent / 100);
    const maxQuantity = maxPositionValue / price;

    // Get current position size
    const pilotState = await this.pilotManager.getState(symbol);
    const currentQuantity = pilotState?.totalQuantity || 0;

    // Ensure we don't exceed max
    if (currentQuantity + quantity > maxQuantity) {
      quantity = Math.max(0, maxQuantity - currentQuantity);
    }

    return quantity;
  }

  // Get current price (placeholder - implement with your preferred method)
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    // Option 1: Use cached price from WebSocket
    // Option 2: Fetch from Bitget REST API
    // Option 3: Use the signal price as approximation

    const { getBitgetClient } = await import('@/lib/bitget/client');
    const client = getBitgetClient();

    try {
      const ticker = await client.getFuturesTicker({
        symbol,
        productType: 'USDT-FUTURES',
      });

      return parseFloat(ticker.data?.[0]?.lastPr || '0');
    } catch {
      return null;
    }
  }

  // Process unprocessed signals (called by cron or background job)
  async processUnprocessedSignals(): Promise<void> {
    const supabase = await this.supabase;

    const { data: signals } = await supabase
      .from('trade_signals')
      .select('id')
      .eq('processed', false)
      .order('received_at', { ascending: true })
      .limit(10);

    if (!signals?.length) return;

    for (const signal of signals) {
      await this.processSignal(signal.id);
    }
  }
}

// Singleton instance
let processorInstance: SignalProcessor | null = null;

export function getSignalProcessor(): SignalProcessor {
  if (!processorInstance) {
    processorInstance = new SignalProcessor();
  }
  return processorInstance;
}
```

---

## Real-time Signal Subscription

### Signal Listener (`lib/trading/signal-listener.ts`)

```typescript
import { createClient } from '@/lib/supabase/server';
import { getSignalProcessor } from './signals';

export class SignalListener {
  private supabase: ReturnType<typeof createClient>;
  private isRunning: boolean = false;

  constructor() {
    this.supabase = createClient();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    const supabase = await this.supabase;

    console.log('[SignalListener] Starting...');

    // Subscribe to new signals
    const channel = supabase
      .channel('trade-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_signals',
          filter: 'processed=eq.false',
        },
        async (payload) => {
          console.log('[SignalListener] New signal:', payload.new);

          // Process immediately
          const processor = getSignalProcessor();
          await processor.processSignal(payload.new.id as string);
        }
      )
      .subscribe();

    this.isRunning = true;

    console.log('[SignalListener] Started and listening for signals');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    const supabase = await this.supabase;
    await supabase.removeAllChannels();

    this.isRunning = false;
    console.log('[SignalListener] Stopped');
  }
}
```

---

## Webhook Security

### Middleware (`middleware.ts`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

export function middleware(request: NextRequest) {
  // Only apply to webhook route
  if (!request.nextUrl.pathname.startsWith('/api/webhook')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  // Rate limiting: 10 requests per minute per IP
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  const current = rateLimitStore.get(ip);

  if (current) {
    if (now - current.timestamp < windowMs) {
      if (current.count >= maxRequests) {
        console.warn(`[RateLimit] IP ${ip} exceeded limit`);
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      current.count++;
    } else {
      // Reset window
      rateLimitStore.set(ip, { count: 1, timestamp: now });
    }
  } else {
    rateLimitStore.set(ip, { count: 1, timestamp: now });
  }

  // Clean up old entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.timestamp > windowMs * 5) {
        rateLimitStore.delete(key);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/webhook/:path*',
};
```

---

## Testing Webhooks

### Test Script (`scripts/test-webhook.ts`)

```typescript
// Test webhook endpoint locally
// Run with: npx ts-node scripts/test-webhook.ts

async function testWebhook() {
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook';
  const secret = process.env.WEBHOOK_SECRET || 'test-secret';

  const testPayloads = [
    // Valid buy signal
    {
      passphrase: secret,
      ticker: 'BTCUSDT',
      action: 'buy',
      price: '50000',
      quantity: '0.01',
      strategy: 'multi_pilot_v2',
      pilot: 1,
      timeframe: '15',
    },
    // Invalid passphrase
    {
      passphrase: 'wrong-secret',
      ticker: 'BTCUSDT',
      action: 'buy',
      price: '50000',
    },
    // Missing required fields
    {
      passphrase: secret,
      action: 'buy',
    },
  ];

  for (const [index, payload] of testPayloads.entries()) {
    console.log(`\n--- Test ${index + 1} ---`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

testWebhook();
```

### Webhook Testing with ngrok

For local development testing with TradingView:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Use the ngrok URL in TradingView alert webhook
# Example: https://abc123.ngrok.io/api/webhook
```
