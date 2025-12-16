import { NextResponse } from 'next/server';
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

    return NextResponse.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to stop bot' },
      { status: 500 }
    );
  }
}
