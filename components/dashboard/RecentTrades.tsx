'use client';

import { useRealtimeTrades } from '@/hooks/useRealtimeTrades';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function RecentTrades() {
  const { trades, isLoading } = useRealtimeTrades(10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Trades</CardTitle>
        <Link
          href="/trades"
          className="text-sm text-primary flex items-center gap-1"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {trades.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No trades yet
              </p>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={trade.side === 'buy' ? 'default' : 'destructive'}
                      className="w-12 justify-center"
                    >
                      {trade.side.toUpperCase()}
                    </Badge>
                    <div>
                      <div className="font-medium">{trade.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(trade.executed_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm">
                      {trade.quantity} @ ${trade.price.toFixed(2)}
                    </div>
                    {trade.realized_pnl != null && (
                      <div
                        className={cn(
                          'text-xs',
                          trade.realized_pnl >= 0
                            ? 'text-green-500'
                            : 'text-red-500'
                        )}
                      >
                        {trade.realized_pnl >= 0 ? '+' : ''}$
                        {trade.realized_pnl.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
