import { createClient } from '@/lib/supabase/server';
import { getSignalProcessor } from './signals';

export interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  isKilled: boolean;
  activePilots: number;
  currentSymbol: string | null;
  currentDirection: 'long' | 'short' | null;
  dailyPnl: number;
  dailyLossLimitHit: boolean;
  lastSignalAt: string | null;
  lastTradeAt: string | null;
  lastError: string | null;
  startedAt: string | null;
}

export async function getBotStatus(): Promise<BotStatus | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bot_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return null;

    return {
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
    };
  } catch (error) {
    console.error('[Bot] Get status error:', error);
    return null;
  }
}

export async function startBot(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: current } = await supabase
      .from('bot_state')
      .select('is_running, is_killed')
      .eq('id', 1)
      .single();

    if (current?.is_killed) {
      return { success: false, error: 'Bot is in killed state. Reset required.' };
    }

    if (current?.is_running) {
      return { success: true };
    }

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

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function stopBot(): Promise<{ success: boolean; error?: string }> {
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

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function pauseBot(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    await supabase
      .from('bot_state')
      .update({ is_paused: true })
      .eq('id', 1);

    await supabase.rpc('log_audit_event', {
      p_event_type: 'bot_paused',
      p_category: 'bot',
      p_message: 'Trading bot paused',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function resumeBot(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    await supabase
      .from('bot_state')
      .update({ is_paused: false })
      .eq('id', 1);

    await supabase.rpc('log_audit_event', {
      p_event_type: 'bot_resumed',
      p_category: 'bot',
      p_message: 'Trading bot resumed',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function resetBot(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    await supabase
      .from('bot_state')
      .update({
        is_running: false,
        is_paused: false,
        is_killed: false,
        daily_pnl: 0,
        daily_loss_limit_hit: false,
        drawdown_limit_hit: false,
        last_error: null,
      })
      .eq('id', 1);

    await supabase.rpc('log_audit_event', {
      p_event_type: 'bot_reset',
      p_category: 'bot',
      p_message: 'Trading bot reset',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function setError(error: string): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase
      .from('bot_state')
      .update({
        last_error: error,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', 1);
  } catch (e) {
    console.error('[Bot] Set error failed:', e);
  }
}
