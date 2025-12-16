'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Circle, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function LiveIndicator() {
  const { data, isLoading } = useQuery({
    queryKey: ['api-status'],
    queryFn: async () => {
      const response = await fetch('/api/exchange/balance');
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      return data.success === true;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  const isConnected = data === true;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
        <Circle className="h-2 w-2 animate-pulse" />
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide cursor-default transition-colors',
              isConnected
                ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                : 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30'
            )}
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>Live</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                <span>Disconnected</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isConnected ? (
            <p className="text-xs">
              <span className="font-semibold text-red-500">⚠️ LIVE TRADING</span>
              <br />
              Connected to Bitget - Real money at risk
            </p>
          ) : (
            <p className="text-xs">
              <span className="font-semibold text-yellow-500">API Disconnected</span>
              <br />
              Check your Bitget API credentials
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
