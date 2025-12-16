import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '365d') days = 365;

    const supabase = await createClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('performance_snapshots')
      .select('snapshot_date, account_balance')
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const dataPoints = (data || []).map((row) => ({
      date: row.snapshot_date,
      equity: row.account_balance,
    }));

    return NextResponse.json({
      success: true,
      data: { period, dataPoints },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch equity curve' },
      { status: 500 }
    );
  }
}
