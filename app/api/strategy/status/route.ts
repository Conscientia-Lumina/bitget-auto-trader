import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBitgetClient } from '@/lib/bitget/client';
import type { StrategyState } from '@/types/strategy';
import type { Database } from '@/types/database';

type BotState = Database['public']['Tables']['bot_state']['Row'];
type Position = Database['public']['Tables']['positions']['Row'];
type Settings = Database['public']['Tables']['settings']['Row'];
type Signal = Database['public']['Tables']['trade_signals']['Row'];
type Snapshot = Database['public']['Tables']['performance_snapshots']['Row'];

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get bot state with evaluation fields
    const { data: botState, error: botError } = await supabase
      .from('bot_state')
      .select('*')
      .eq('id', 1)
      .single<BotState & { last_evaluation_at?: string }>();

    if (botError || !botState) {
      console.error('[Strategy Status] Bot state error:', botError);
      return NextResponse.json(
        { error: 'Failed to fetch bot state' },
        { status: 500 }
      );
    }

    // Get current position for pilot states
    const { data: position } = await supabase
      .from('positions')
      .select('*')
      .eq('status', 'open')
      .single<Position>();

    // Get settings for risk limits
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'risk_per_pilot',
        'max_position_size',
        'daily_loss_limit',
        'max_drawdown',
        'default_leverage',
        'default_symbol',
      ]);

    const settingsMap = (settings as Settings[] | null)?.reduce((acc, s) => {
      // Try to parse as JSON, but fallback to plain string value
      if (typeof s.value === 'string') {
        try {
          acc[s.key] = JSON.parse(s.value as string);
        } catch {
          acc[s.key] = s.value; // Plain string value (e.g., "BTCUSDT")
        }
      } else {
        acc[s.key] = s.value;
      }
      return acc;
    }, {} as Record<string, unknown>) || {};

    // Get today's performance for daily loss tracking
    const today = new Date().toISOString().split('T')[0];
    const { data: snapshot } = await supabase
      .from('performance_snapshots')
      .select('daily_pnl, daily_pnl_percent, current_drawdown')
      .eq('snapshot_date', today)
      .single<Pick<Snapshot, 'daily_pnl' | 'daily_pnl_percent' | 'current_drawdown'>>();

    // Check API connection
    let apiConnected = false;
    let marketPrice: number | null = null;
    
    try {
      const client = getBitgetClient();
      const symbol = (settingsMap.default_symbol as string) || 'BTCUSDT';
      const ticker = await client.getFuturesTicker({
        symbol,
        productType: 'USDT-FUTURES',
      } as never);
      
      const tickerData = ticker.data as Array<{ lastPr?: string }>;
      marketPrice = parseFloat(tickerData?.[0]?.lastPr || '0');
      apiConnected = marketPrice > 0;
    } catch {
      apiConnected = false;
    }

    // Calculate pilot conditions based on position
    const pilotConditions = {
      p1: {
        state: position?.pilot_1_entry ? 'active' : 'inactive',
        trigger: 'signal',
        threshold: null,
        ready: !position && botState.is_running,
        entry_price: position?.pilot_1_entry,
        quantity: position?.pilot_1_qty,
        pnl: position?.pilot_1_pnl,
      },
      p2: {
        state: position?.pilot_2_entry ? 'active' : 'inactive',
        trigger: 'profit_percent',
        threshold: 0.3,
        ready: position?.pilot_1_entry && !position?.pilot_2_entry,
        current: position?.unrealized_pnl_percent || 0,
        entry_price: position?.pilot_2_entry,
        quantity: position?.pilot_2_qty,
        pnl: position?.pilot_2_pnl,
      },
      p3: {
        state: position?.pilot_3_entry ? 'active' : 'inactive',
        trigger: 'profit_percent',
        threshold: 0.5,
        ready: position?.pilot_2_entry && !position?.pilot_3_entry,
        current: position?.unrealized_pnl_percent || 0,
        entry_price: position?.pilot_3_entry,
        quantity: position?.pilot_3_qty,
        pnl: position?.pilot_3_pnl,
      },
      p4: {
        state: position?.pilot_4_entry ? 'active' : 'inactive',
        trigger: 'profit_percent',
        threshold: 0.8,
        ready: position?.pilot_3_entry && !position?.pilot_4_entry,
        current: position?.unrealized_pnl_percent || 0,
        entry_price: position?.pilot_4_entry,
        quantity: position?.pilot_4_qty,
        pnl: position?.pilot_4_pnl,
      },
    };

    // Calculate risk status
    const dailyLossLimit = (settingsMap.daily_loss_limit as number) || 5;
    const maxPositionSize = (settingsMap.max_position_size as number) || 25;
    const maxDrawdown = (settingsMap.max_drawdown as number) || 15;
    const leverage = (settingsMap.default_leverage as number) || 10;

    const dailyLossCurrent = Math.abs(Math.min(0, snapshot?.daily_pnl_percent || 0));
    const drawdownCurrent = snapshot?.current_drawdown || 0;
    
    // Calculate current position size as % of account (simplified)
    const positionSizeCurrent = position ? 
      (position.pilot_count * ((settingsMap.risk_per_pilot as number) || 2)) : 0;

    const riskStatus = {
      daily_loss_ok: dailyLossCurrent < dailyLossLimit,
      daily_loss_current: dailyLossCurrent,
      daily_loss_limit: dailyLossLimit,
      max_position_ok: positionSizeCurrent < maxPositionSize,
      position_size_current: positionSizeCurrent,
      position_size_limit: maxPositionSize,
      drawdown_ok: drawdownCurrent < maxDrawdown,
      drawdown_current: drawdownCurrent,
      drawdown_limit: maxDrawdown,
      leverage_current: leverage,
    };

    // Get last signal
    const { data: lastSignal } = await supabase
      .from('trade_signals')
      .select('action, received_at')
      .order('received_at', { ascending: false })
      .limit(1)
      .single<Pick<Signal, 'action' | 'received_at'>>();

    const evaluationConditions = {
      signal_armed: botState.is_running && !botState.is_paused && !botState.is_killed,
      market_hours: true, // Could add market hours check
      cooldown_clear: true, // Could add cooldown logic
      last_signal_action: lastSignal?.action || null,
      last_signal_time: lastSignal?.received_at || null,
    };

    const strategyState: StrategyState = {
      // Bot state
      is_running: botState.is_running,
      is_paused: botState.is_paused,
      is_killed: botState.is_killed,
      current_symbol: botState.current_symbol || (settingsMap.default_symbol as string) || 'BTCUSDT',
      current_direction: botState.current_direction || position?.side || null,
      active_pilots: botState.active_pilots || position?.pilot_count || 0,
      daily_pnl: botState.daily_pnl || snapshot?.daily_pnl || 0,
      started_at: botState.started_at,
      
      // Evaluation state
      last_evaluation_at: botState.last_evaluation_at || new Date().toISOString(),
      evaluation_conditions: evaluationConditions,
      risk_status: riskStatus,
      pilot_conditions: pilotConditions as StrategyState['pilot_conditions'],
      market_data: {
        symbol: (settingsMap.default_symbol as string) || 'BTCUSDT',
        price: marketPrice,
        price_change_24h: null,
        last_update: marketPrice ? new Date().toISOString() : null,
      },
      connection_status: {
        api: apiConnected,
        websocket: false, // Would need WebSocket state tracking
        database: true,
      },
      
      // Recent activity
      last_signal_at: botState.last_signal_at,
      last_trade_at: botState.last_trade_at,
      last_error: botState.last_error,
    };

    return NextResponse.json(strategyState);
  } catch (error) {
    console.error('[Strategy Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
