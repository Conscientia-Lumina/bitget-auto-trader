'use client';

import { useBotStatus } from '@/hooks/useBotStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Square, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BotStatusIndicator() {
  const { status, start, stop, isLoading } = useBotStatus();

  const getStatusColor = () => {
    if (status?.isKilled) return 'bg-red-500';
    if (status?.isRunning && !status?.isPaused) return 'bg-green-500';
    if (status?.isPaused) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (status?.isKilled) return 'KILLED';
    if (status?.isRunning && !status?.isPaused) return 'RUNNING';
    if (status?.isPaused) return 'PAUSED';
    return 'STOPPED';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn('w-3 h-3 rounded-full animate-pulse', getStatusColor())} />
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>

      {(status?.activePilots ?? 0) > 0 && (
        <Badge variant="outline" className="w-full justify-center">
          {status?.activePilots} Active Pilots
        </Badge>
      )}

      <div className="flex gap-2">
        {!status?.isRunning ? (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => start()}
            disabled={isLoading || status?.isKilled}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => stop()}
            disabled={isLoading}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        )}
      </div>

      {status?.isKilled && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Kill switch activated. Reset required.
        </p>
      )}
    </div>
  );
}
