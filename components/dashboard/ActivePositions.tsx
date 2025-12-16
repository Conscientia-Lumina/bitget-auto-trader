'use client';

import { useRealtimePositions, BitgetPosition } from '@/hooks/useRealtimePositions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClosePositionModal } from '@/components/positions/ClosePositionModal';
import { cn } from '@/lib/utils';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

function formatSymbol(symbol: string): string {
  // XRPUSDT -> XRP/USDT
  return symbol.replace('USDT', '/USDT').replace('_', '/');
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
}

export function ActivePositions() {
  const { positions, isLoading, refetch } = useRealtimePositions();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Positions</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No open positions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Positions ({positions.length})</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {positions.map((position, idx) => (
          <div
            key={`${position.symbol}-${position.side}-${idx}`}
            className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {position.side === 'long' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="font-semibold text-lg">{formatSymbol(position.symbol)}</span>
                <Badge
                  variant={position.side === 'long' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {position.side.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {position.leverage}x
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {position.marginMode}
                </Badge>
                <Badge 
                  variant={position.source === 'bot' ? 'default' : 'outline'} 
                  className={`text-xs ${position.source === 'bot' ? 'bg-blue-600 hover:bg-blue-700' : 'border-yellow-500 text-yellow-500'}`}
                >
                  {position.source === 'bot' ? '🤖 BOT' : '👤 MANUAL'}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTime(position.openTime || Date.now())}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Entry</span>
                <span className="font-mono">${(position.avgEntryPrice || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Mark</span>
                <span className="font-mono">${(position.markPrice || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Size</span>
                <span className="font-mono">{(position.size || 0).toFixed(2)}</span>
                <span className="text-muted-foreground text-xs ml-1">
                  (${(position.sizeUSDT || 0).toFixed(2)})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Margin</span>
                <span className="font-mono">${(position.margin || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div>
                <span className="text-muted-foreground text-sm">Liq. Price: </span>
                <span className={cn(
                  "font-mono text-sm",
                  (position.liquidationPrice || 0) > 0 ? "text-orange-500" : "text-muted-foreground"
                )}>
                  {(position.liquidationPrice || 0) > 0 ? `$${(position.liquidationPrice || 0).toLocaleString()}` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div
                    className={cn(
                      'text-lg font-semibold',
                      (position.unrealizedPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {(position.unrealizedPnl || 0) >= 0 ? '+' : ''}
                    ${(position.unrealizedPnl || 0).toFixed(2)}
                  </div>
                  <div
                    className={cn(
                      'text-sm',
                      (position.unrealizedPnlPercent || 0) >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    )}
                  >
                    {(position.unrealizedPnlPercent || 0) >= 0 ? '+' : ''}
                    {(position.unrealizedPnlPercent || 0).toFixed(2)}%
                  </div>
                </div>
                <ClosePositionModal position={position} onSuccess={() => refetch()} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
