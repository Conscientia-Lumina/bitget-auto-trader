import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EquityCurve } from '@/components/dashboard/EquityCurve';
import { createClient } from '@/lib/supabase/server';
import { calculateMetrics } from '@/lib/utils/calculations';
import { cn } from '@/lib/utils';

async function getAnalyticsData() {
  const supabase = await createClient();

  const { data: trades } = await supabase
    .from('trades')
    .select('realized_pnl, executed_at, is_entry');

  return calculateMetrics(trades || []);
}

export default async function AnalyticsPage() {
  const metrics = await getAnalyticsData();

  const statCards = [
    { label: 'Total Trades', value: metrics.totalTrades },
    { label: 'Winning Trades', value: metrics.winningTrades, color: 'text-green-500' },
    { label: 'Losing Trades', value: metrics.losingTrades, color: 'text-red-500' },
    { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%`, color: metrics.winRate >= 50 ? 'text-green-500' : 'text-red-500' },
    { label: 'Total P&L', value: `$${metrics.totalPnl.toFixed(2)}`, color: metrics.totalPnl >= 0 ? 'text-green-500' : 'text-red-500' },
    { label: 'Profit Factor', value: metrics.profitFactor === Infinity ? 'N/A' : metrics.profitFactor.toFixed(2), color: metrics.profitFactor >= 1.5 ? 'text-green-500' : 'text-yellow-500' },
    { label: 'Avg Win', value: `$${metrics.avgWin.toFixed(2)}`, color: 'text-green-500' },
    { label: 'Avg Loss', value: `$${metrics.avgLoss.toFixed(2)}`, color: 'text-red-500' },
    { label: 'Largest Win', value: `$${metrics.largestWin.toFixed(2)}`, color: 'text-green-500' },
    { label: 'Largest Loss', value: `$${metrics.largestLoss.toFixed(2)}`, color: 'text-red-500' },
    { label: 'Max Drawdown', value: `$${metrics.maxDrawdown.toFixed(2)}`, color: 'text-red-500' },
    { label: 'Gross Profit', value: `$${metrics.grossProfit.toFixed(2)}`, color: 'text-green-500' },
  ];

  return (
    <>
      <Header title="Analytics" />
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-bold', stat.color)}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <EquityCurve />
      </div>
    </>
  );
}
