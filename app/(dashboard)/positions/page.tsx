'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRealtimePositions, BitgetPosition } from '@/hooks/useRealtimePositions';
import { ClosePositionModal } from '@/components/positions/ClosePositionModal';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

function formatSymbol(symbol: string): string {
  return symbol.replace('USDT', '/USDT').replace('_', '/');
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function PositionCard({ position, onClose }: { position: BitgetPosition; onClose?: () => void }) {
  const isLong = position.side === 'long';
  const pnl = position.unrealizedPnl || 0;
  const pnlPercent = position.unrealizedPnlPercent || 0;
  const pnlPositive = pnl >= 0;

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isLong ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <span className="text-xl font-semibold">{formatSymbol(position.symbol)}</span>
          <Badge variant={isLong ? 'default' : 'destructive'}>
            {position.side.toUpperCase()}
          </Badge>
          <Badge variant="outline">{position.leverage}x</Badge>
          <Badge variant="secondary">{position.marginMode}</Badge>
          <Badge 
            variant={position.source === 'bot' ? 'default' : 'outline'} 
            className={position.source === 'bot' ? 'bg-blue-600 hover:bg-blue-700' : 'border-yellow-500 text-yellow-500'}
          >
            {position.source === 'bot' ? '🤖 BOT' : '👤 MANUAL'}
          </Badge>
        </div>
        <div className="text-right">
          <div
            className={cn(
              'text-2xl font-bold',
              pnlPositive ? 'text-green-500' : 'text-red-500'
            )}
          >
            {pnlPositive ? '+' : ''}${pnl.toFixed(2)}
          </div>
          <div
            className={cn(
              'text-sm font-medium',
              pnlPositive ? 'text-green-500' : 'text-red-500'
            )}
          >
            {pnlPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground block">Entry Price</span>
          <span className="font-mono font-medium">${(position.avgEntryPrice || 0).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Mark Price</span>
          <span className="font-mono font-medium">${(position.markPrice || 0).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Size</span>
          <span className="font-mono font-medium">{(position.size || 0).toFixed(4)}</span>
          <span className="text-muted-foreground text-xs block">${(position.sizeUSDT || 0).toFixed(2)} USDT</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Margin</span>
          <span className="font-mono font-medium">${(position.margin || 0).toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-orange-500" />
            Liquidation
          </span>
          <span className={cn(
            "font-mono font-medium",
            (position.liquidationPrice || 0) > 0 ? "text-orange-500" : "text-muted-foreground"
          )}>
            {(position.liquidationPrice || 0) > 0 ? `$${(position.liquidationPrice || 0).toLocaleString()}` : 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm text-muted-foreground">
          Opened: {formatTime(position.openTime || Date.now())}
        </span>
        <div className="flex gap-2">
          <ClosePositionModal 
            position={position} 
            onSuccess={onClose}
            trigger={
              <Button variant="destructive" size="sm">
                Close Position
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function PositionsPage() {
  const { positions, isLoading, refetch } = useRealtimePositions();

  return (
    <>
      <Header title="Positions" />
      <div className="p-4 lg:p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Open Positions
              {positions.length > 0 && (
                <Badge variant="secondary">{positions.length}</Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No open positions</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Positions from Bitget will appear here automatically
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position, idx) => (
                  <PositionCard 
                    key={`${position.symbol}-${position.side}-${idx}`} 
                    position={position}
                    onClose={() => refetch()}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        {positions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Position Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <span className="text-muted-foreground text-sm block">Total Positions</span>
                  <span className="text-2xl font-bold">{positions.length}</span>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <span className="text-muted-foreground text-sm block">Total Unrealized P&L</span>
                  <span className={cn(
                    "text-2xl font-bold",
                    positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0) >= 0 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  )}>
                    ${positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <span className="text-muted-foreground text-sm block">Total Margin Used</span>
                  <span className="text-2xl font-bold">
                    ${positions.reduce((sum, p) => sum + (p.margin || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <span className="text-muted-foreground text-sm block">Total Position Value</span>
                  <span className="text-2xl font-bold">
                    ${positions.reduce((sum, p) => sum + (p.sizeUSDT || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
