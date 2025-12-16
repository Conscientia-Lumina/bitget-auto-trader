import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, DollarSign, Wallet, Lock, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  equity: number;
  available: number;
  unrealizedPnl: number;
  isolatedMargin: number;
  crossedMargin: number;
  openPositions: number;
  winRate: number;
}

export function StatsCards({
  equity,
  available,
  unrealizedPnl,
  isolatedMargin,
  crossedMargin,
  openPositions,
  winRate,
}: StatsCardsProps) {
  const totalMargin = isolatedMargin + crossedMargin;
  const pnlPercent = equity > 0 ? (unrealizedPnl / equity) * 100 : 0;

  const stats = [
    {
      title: 'Account Equity',
      value: `$${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-blue-500',
    },
    {
      title: 'Available Balance',
      value: `$${available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      color: 'text-green-500',
    },
    {
      title: 'Unrealized P&L',
      value: `${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`,
      icon: unrealizedPnl >= 0 ? TrendingUp : TrendingDown,
      color: unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500',
    },
    {
      title: 'Margin Used',
      value: `$${totalMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `Isolated: $${isolatedMargin.toFixed(2)}`,
      icon: Lock,
      color: 'text-orange-500',
    },
    {
      title: 'Open Positions',
      value: openPositions.toString(),
      icon: Activity,
      color: 'text-purple-500',
    },
    {
      title: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: PiggyBank,
      color: winRate >= 50 ? 'text-green-500' : 'text-yellow-500',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <Card key={stat.title} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground truncate">
              {stat.title}
            </CardTitle>
            <stat.icon className={cn('h-4 w-4 shrink-0', stat.color)} />
          </CardHeader>
          <CardContent className="pt-0">
            <div className={cn('text-xl lg:text-2xl font-bold truncate', stat.color)}>
              {stat.value}
            </div>
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
