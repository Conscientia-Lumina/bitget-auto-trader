'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { BitgetPosition } from '@/hooks/useRealtimePositions';
import { cn } from '@/lib/utils';

interface ClosePositionModalProps {
  position: BitgetPosition;
  onClose?: () => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ClosePositionModal({ 
  position, 
  onClose, 
  onSuccess,
  trigger 
}: ClosePositionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [closeAmount, setCloseAmount] = useState(position.size.toString());
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSize = position.size;
  const closeSize = parseFloat(closeAmount) || 0;
  const isPartial = closeSize < maxSize && closeSize > 0;
  const isValid = closeSize > 0 && closeSize <= maxSize;
  const closePercent = maxSize > 0 ? (closeSize / maxSize) * 100 : 0;

  // Estimate P&L for the close amount
  const estimatedPnl = maxSize > 0 
    ? ((position.unrealizedPnl || 0) * closeSize) / maxSize 
    : 0;

  const handleClose = async () => {
    if (!isValid) return;
    
    setIsClosing(true);
    setError(null);

    try {
      const response = await fetch('/api/exchange/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: position.symbol,
          side: position.side,
          size: closeSize,
          marginMode: position.marginMode,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to close position');
        return;
      }

      setIsOpen(false);
      onSuccess?.();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsClosing(false);
    }
  };

  const setPercentage = (percent: number) => {
    const amount = (maxSize * percent) / 100;
    setCloseAmount(amount.toString());
  };

  const formatSymbol = (symbol: string) => symbol.replace('USDT', '/USDT');

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Close Position
            <Badge variant={position.side === 'long' ? 'default' : 'destructive'}>
              {position.side.toUpperCase()}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Close your {formatSymbol(position.symbol)} {position.side} position
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Position Info */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted text-sm">
            <div>
              <span className="text-muted-foreground">Symbol</span>
              <div className="font-semibold">{formatSymbol(position.symbol)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Entry Price</span>
              <div className="font-mono">${(position.avgEntryPrice || 0).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Current Size</span>
              <div className="font-mono">{maxSize.toFixed(4)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Mark Price</span>
              <div className="font-mono">${(position.markPrice || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Close Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="closeAmount">Close Amount</Label>
            <Input
              id="closeAmount"
              type="number"
              step="any"
              min="0"
              max={maxSize}
              value={closeAmount}
              onChange={(e) => setCloseAmount(e.target.value)}
              className="font-mono"
            />
            <div className="flex gap-2">
              {[25, 50, 75, 100].map((percent) => (
                <Button
                  key={percent}
                  variant={closePercent === percent ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPercentage(percent)}
                >
                  {percent}%
                </Button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Closing</span>
              <span className="font-mono">
                {closeSize.toFixed(4)} ({closePercent.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated P&L</span>
              <span className={cn(
                "font-mono font-medium",
                estimatedPnl >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {estimatedPnl >= 0 ? '+' : ''}${estimatedPnl.toFixed(2)}
              </span>
            </div>
            {isPartial && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-mono">
                  {(maxSize - closeSize).toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Warning for full close */}
          {closePercent === 100 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-500 text-sm">
              <AlertTriangle className="h-4 w-4" />
              This will close your entire position at market price
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={!isValid || isClosing}
          >
            {isClosing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Closing...
              </>
            ) : (
              <>
                Close {isPartial ? 'Partial' : 'Full'} Position
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
