'use client';

import { useStrategyState } from '@/hooks/useStrategyState';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Activity, Wifi, WifiOff, Shield, Target } from 'lucide-react';

export function StrategyStatusCompact() {
  const { state, loading } = useStrategyState();

  if (loading || !state) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const { 
    is_running, 
    is_killed,
    connection_status,
    risk_status,
    pilot_conditions,
    active_pilots,
  } = state;

  const riskOk = risk_status.daily_loss_ok && risk_status.max_position_ok && risk_status.drawdown_ok;
  
  // Count active pilots
  const activePilotCount = [
    pilot_conditions.p1,
    pilot_conditions.p2,
    pilot_conditions.p3,
    pilot_conditions.p4,
  ].filter(p => p.state === 'active').length;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* Bot Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  is_killed && 'bg-red-500',
                  !is_killed && is_running && 'bg-emerald-500 animate-pulse',
                  !is_killed && !is_running && 'bg-muted-foreground/30'
                )}
              />
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bot: {is_killed ? 'Killed' : is_running ? 'Running' : 'Stopped'}</p>
          </TooltipContent>
        </Tooltip>

        {/* API Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {connection_status.api ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>API: {connection_status.api ? 'Connected' : 'Disconnected'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Risk Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Shield className={cn(
                'h-3.5 w-3.5',
                riskOk ? 'text-emerald-500' : 'text-amber-500'
              )} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Risk: {riskOk ? 'OK' : 'Warning'}</p>
            <p className="text-xs text-muted-foreground">
              Daily: {risk_status.daily_loss_current.toFixed(1)}% / {risk_status.daily_loss_limit}%
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Active Pilots */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-mono">
                {activePilotCount}/4
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Active Pilots: {activePilotCount} of 4</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
