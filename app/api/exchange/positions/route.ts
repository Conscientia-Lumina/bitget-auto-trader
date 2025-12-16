import { NextResponse } from 'next/server';
import { getPositions, Position } from '@/lib/bitget/positions';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Fetch positions from Bitget
    const bitgetPositions = await getPositions();
    
    // Fetch bot positions from Supabase to determine source
    let botPositionKeys: Set<string> = new Set();
    try {
      const supabase = await createClient();
      const { data: dbPositions } = await supabase
        .from('positions')
        .select('symbol, side')
        .eq('status', 'open');
      
      if (dbPositions) {
        // Create a set of "symbol-side" keys for quick lookup
        botPositionKeys = new Set(
          dbPositions.map(p => `${p.symbol}-${p.side}`)
        );
      }
    } catch (dbError) {
      console.log('[Positions] Supabase not configured, all positions marked as manual');
    }
    
    // Mark each position with its source
    const positionsWithSource: Position[] = bitgetPositions.map(position => {
      const key = `${position.symbol}-${position.side}`;
      return {
        ...position,
        source: botPositionKeys.has(key) ? 'bot' : 'manual',
      };
    });
    
    return NextResponse.json({ success: true, data: positionsWithSource });
  } catch (error) {
    console.error('[Positions API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
