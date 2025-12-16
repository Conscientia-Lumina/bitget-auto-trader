import { NextResponse } from 'next/server';
import { getAccountBalance } from '@/lib/bitget/account';

export async function GET() {
  try {
    const balance = await getAccountBalance();

    if (!balance) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch balance - no data returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: balance });
  } catch (error: unknown) {
    console.error('[API] Balance fetch error:', error);
    
    // Extract detailed error information
    let errorMessage = 'Failed to fetch balance';
    let errorDetails: Record<string, unknown> = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3),
      };
    }
    
    // Check if it's a Bitget API error with response data
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      if (err.body) errorDetails.body = err.body;
      if (err.response) errorDetails.response = err.response;
      if (err.code) errorDetails.code = err.code;
      if (err.msg) errorMessage = String(err.msg);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
