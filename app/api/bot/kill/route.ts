import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelAllOrders } from '@/lib/bitget/orders';
import { closeAllPositions } from '@/lib/bitget/positions';

export async function POST(request: NextRequest) {
  try {
    const { closePositions } = await request.json();
    const supabase = await createClient();

    // Cancel all orders first
    const cancelResult = await cancelAllOrders();
    console.log('[Kill] Cancelled orders:', cancelResult);

    // Optionally close positions
    if (closePositions) {
      const closeResult = await closeAllPositions();
      console.log('[Kill] Closed positions:', closeResult);
    }

    // Update bot state
    await supabase
      .from('bot_state')
      .update({
        is_running: false,
        is_paused: false,
        is_killed: true,
        stopped_at: new Date().toISOString(),
      })
      .eq('id', 1);

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'kill_switch_activated',
      p_category: 'bot',
      p_message: `Kill switch activated. Close positions: ${closePositions}`,
      p_severity: 'critical',
    });

    return NextResponse.json({
      success: true,
      message: 'Kill switch activated',
      cancelledOrders: cancelResult.cancelled,
    });
  } catch (error) {
    console.error('[Kill] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Kill switch failed' },
      { status: 500 }
    );
  }
}
