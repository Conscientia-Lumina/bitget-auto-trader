import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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
        last_error_at: null,
      })
      .eq('id', 1);

    await supabase.rpc('log_audit_event', {
      p_event_type: 'bot_reset',
      p_category: 'bot',
      p_message: 'Bot state reset',
    });

    return NextResponse.json({ success: true, message: 'Bot reset' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset bot' },
      { status: 500 }
    );
  }
}
