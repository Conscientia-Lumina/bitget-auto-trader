import { NextResponse } from 'next/server';
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
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        isRunning: data.is_running,
        isPaused: data.is_paused,
        isKilled: data.is_killed,
        activePilots: data.active_pilots,
        currentSymbol: data.current_symbol,
        dailyPnl: data.daily_pnl,
        lastSignalAt: data.last_signal_at,
        lastTradeAt: data.last_trade_at,
        lastError: data.last_error,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bot status' },
      { status: 500 }
    );
  }
}
