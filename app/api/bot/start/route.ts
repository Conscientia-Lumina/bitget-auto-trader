import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    const { data: current } = await supabase
      .from('bot_state')
      .select('is_running, is_killed')
      .eq('id', 1)
      .single();

    if (current?.is_killed) {
      return NextResponse.json(
        { success: false, error: 'Bot is in killed state. Reset required.' },
        { status: 400 }
      );
    }

    if (current?.is_running) {
      return NextResponse.json({ success: true, message: 'Bot already running' });
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

    return NextResponse.json({ success: true, message: 'Bot started' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to start bot' },
      { status: 500 }
    );
  }
}
