import { Header } from '@/components/layout/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { ActivePositions } from '@/components/dashboard/ActivePositions';
import { RecentTrades } from '@/components/dashboard/RecentTrades';
import { KillSwitch } from '@/components/bot/KillSwitch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getAccountBalance } from '@/lib/bitget/account';
import { getPositions } from '@/lib/bitget/positions';

async function getDashboardData() {
  const supabase = await createClient();

  // Fetch balance and positions from Bitget API directly
  const [bitgetBalance, bitgetPositions, snapshotRes] = await Promise.all([
    getAccountBalance().catch(() => null),
    getPositions().catch(() => []),
    supabase
      .from('performance_snapshots')
      .select('win_rate')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single(),
  ]);

  return {
    equity: bitgetBalance?.equity || 0,
    available: bitgetBalance?.available || 0,
    unrealizedPnl: bitgetBalance?.unrealizedPnl || 0,
    isolatedMargin: bitgetBalance?.isolatedMargin || 0,
    crossedMargin: bitgetBalance?.crossedMargin || 0,
    openPositions: bitgetPositions.length,
    winRate: snapshotRes.data?.win_rate || 0,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats Row */}
        <StatsCards
          equity={data.equity}
          available={data.available}
          unrealizedPnl={data.unrealizedPnl}
          isolatedMargin={data.isolatedMargin}
          crossedMargin={data.crossedMargin}
          openPositions={data.openPositions}
          winRate={data.winRate}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Positions (takes 2 cols on large screens) */}
          <div className="lg:col-span-2">
            <ActivePositions />
          </div>

          {/* Right Column - Controls & Trades */}
          <div className="space-y-6">
            {/* Emergency Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Emergency Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <KillSwitch />
              </CardContent>
            </Card>

            {/* Recent Trades */}
            <RecentTrades />
          </div>
        </div>
      </div>
    </>
  );
}
