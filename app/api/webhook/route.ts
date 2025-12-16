import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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

function normalizeSymbol(ticker: string): string {
  const parts = ticker.split(':');
  const symbol = parts.length > 1 ? parts[1] : parts[0];
  return symbol.replace(/\.P$/, '').toUpperCase();
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const rawBody = body as Record<string, unknown>;
    if (rawBody.passphrase !== process.env.WEBHOOK_SECRET) {
      console.warn('[Webhook] Unauthorized attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const parseResult = WebhookPayloadSchema.safeParse(body);
    if (!parseResult.success) {
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

    console.log('[Webhook] Signal stored:', {
      id: data.id,
      ticker: signal.ticker,
      action: signal.action,
      processingTime: `${Date.now() - startTime}ms`,
    });

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

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'webhook',
    timestamp: new Date().toISOString(),
  });
}
