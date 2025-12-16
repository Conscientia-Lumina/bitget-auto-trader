import { NextRequest, NextResponse } from 'next/server';
import { closePosition } from '@/lib/bitget/positions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, side, size, marginMode } = body;

    // Validate required fields
    if (!symbol || !side || !size) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: symbol, side, size' },
        { status: 400 }
      );
    }

    // Validate side
    if (side !== 'long' && side !== 'short') {
      return NextResponse.json(
        { success: false, error: 'Invalid side. Must be "long" or "short"' },
        { status: 400 }
      );
    }

    // Validate size
    const sizeNum = parseFloat(size);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid size. Must be a positive number' },
        { status: 400 }
      );
    }

    console.log(`[Close Position] Closing ${sizeNum} ${symbol} ${side} position`);

    const result = await closePosition(
      symbol,
      side,
      sizeNum,
      marginMode || 'isolated'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully closed ${sizeNum} ${symbol} ${side}`,
      orderId: result.orderId,
    });
  } catch (error) {
    console.error('[Close Position API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to close position' },
      { status: 500 }
    );
  }
}
