'use client';

import { useStrategyState } from '@/hooks/useStrategyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Database, 
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Target,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ConditionBadgeStatus } from '@/types/strategy';

interface StatusBadgeProps {
  status: ConditionBadgeStatus;
  label: string;
  value?: string | number;
  tooltip?: string;
  icon?: React.ReactNode;
}

function StatusBadge({ status, label, value, tooltip, icon }: StatusBadgeProps) {
  const variants: Record<ConditionBadgeStatus, string> = {
    success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    error: 'bg-red-500/15 text-red-500 border-red-500/30',
    inactive: 'bg-muted text-muted-foreground border-border',
    pending: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 font-medium transition-colors',
        variants[status]
      )}
    >
      {icon || (
        status === 'success' ? <CheckCircle2 className="h-3 w-3" /> :
        status === 'warning' ? <AlertTriangle className="h-3 w-3" /> :
        status === 'error' ? <AlertTriangle className="h-3 w-3" /> :
        status === 'pending' ? <Clock className="h-3 w-3" /> :
        <Circle className="h-3 w-3" />
      )}
      <span>{label}</span>
      {value !== undefined && (
        <span className="font-mono text-xs opacity-75">{value}</span>
      )}
    </Badge>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

interface PilotCardProps {
  number: 1 | 2 | 3 | 4;
  state: string;
  trigger: string;
  threshold: number | null;
  ready: boolean;
  current?: number;
  entryPrice?: number | null;
  pnl?: number | null;
}

function PilotCard({ number, state, trigger, threshold, ready, current, entryPrice, pnl }: PilotCardProps) {
  const isActive = state === 'active';
  const isPending = ready && !isActive;
  const progress = threshold && current !== undefined 
    ? Math.min((current / threshold) * 100, 100) 
    : 0;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border transition-all',
        isActive && 'border-emerald-500/50 bg-emerald-500/5',
        isPending && 'border-blue-500/50 bg-blue-500/5',
        !isActive && !isPending && 'border-border bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Pilot {number}
        </span>
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isActive && 'bg-emerald-500 animate-pulse',
            isPending && 'bg-blue-500',
            !isActive && !isPending && 'bg-muted-foreground/30'
          )}
        />
      </div>
      
      <div className="text-lg font-semibold">
        {trigger === 'signal' ? 'Entry' : `+${threshold}%`}
      </div>
      
      <div className="text-xs text-muted-foreground mt-1">
        {trigger === 'signal' 
          ? 'Triggers on signal'
          : `Scale at ${threshold}% profit`}
      </div>

      {isActive && entryPrice && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
          <div className="text-xs flex justify-between">
            <span className="text-muted-foreground">Entry</span>
            <span className="font-mono">${entryPrice.toLocaleString()}</span>
          </div>
          {pnl !== null && pnl !== undefined && (
            <div className="text-xs flex justify-between">
              <span className="text-muted-foreground">P&L</span>
              <span className={cn(
                'font-mono',
                pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
              )}>
                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {isPending && threshold && current !== undefined && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono">{current.toFixed(2)}% / {threshold}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </div>
  );
}

interface RiskMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  inverted?: boolean;
}

function RiskMeter({ label, current, limit, unit = '%', inverted = false }: RiskMeterProps) {
  const percentage = (current / limit) * 100;
  const isWarning = percentage >= 70;
  const isDanger = percentage >= 90;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          'font-mono text-xs',
          isDanger && 'text-red-500',
          isWarning && !isDanger && 'text-amber-500',
          !isWarning && !isDanger && 'text-emerald-500'
        )}>
          {current.toFixed(1)}{unit} / {limit}{unit}
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all',
            isDanger && 'bg-red-500',
            isWarning && !isDanger && 'bg-amber-500',
            !isWarning && !isDanger && 'bg-emerald-500'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function StrategyMonitor() {
  const { state, loading, error } = useStrategyState();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Strategy Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Strategy Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span>{error || 'Failed to load strategy state'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    is_running, 
    is_paused, 
    is_killed,
    current_symbol,
    current_direction,
    evaluation_conditions,
    risk_status,
    pilot_conditions,
    market_data,
    connection_status,
    last_signal_at,
    last_evaluation_at,
  } = state;

  // Derive badge statuses
  const botStatus: ConditionBadgeStatus = 
    is_killed ? 'error' : 
    is_paused ? 'warning' : 
    is_running ? 'success' : 'inactive';

  const apiStatus: ConditionBadgeStatus = connection_status.api ? 'success' : 'error';
  const dbStatus: ConditionBadgeStatus = connection_status.database ? 'success' : 'error';
  
  const signalArmedStatus: ConditionBadgeStatus = 
    evaluation_conditions.signal_armed ? 'success' : 'inactive';

  const riskOk = risk_status.daily_loss_ok && risk_status.max_position_ok && risk_status.drawdown_ok;
  const riskStatus: ConditionBadgeStatus = riskOk ? 'success' : 'warning';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Strategy Monitor
            {current_symbol && (
              <Badge variant="outline" className="ml-2 font-mono">
                {current_symbol}
              </Badge>
            )}
          </CardTitle>
          {last_evaluation_at && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(new Date(last_evaluation_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Status Badges */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            status={botStatus}
            label={is_killed ? 'Killed' : is_paused ? 'Paused' : is_running ? 'Running' : 'Stopped'}
            icon={<Zap className="h-3 w-3" />}
            tooltip={is_running ? 'Bot is actively monitoring' : 'Bot is not running'}
          />
          <StatusBadge
            status={apiStatus}
            label="API"
            icon={connection_status.api ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            tooltip={connection_status.api ? 'Connected to Bitget' : 'API connection failed'}
          />
          <StatusBadge
            status={dbStatus}
            label="Database"
            icon={<Database className="h-3 w-3" />}
            tooltip="Supabase connection"
          />
          <StatusBadge
            status={signalArmedStatus}
            label="Signal Armed"
            icon={<Target className="h-3 w-3" />}
            tooltip={evaluation_conditions.signal_armed ? 'Ready to receive signals' : 'Not accepting signals'}
          />
          <StatusBadge
            status={riskStatus}
            label="Risk OK"
            icon={<Shield className="h-3 w-3" />}
            tooltip={riskOk ? 'All risk checks passing' : 'Risk limits approaching'}
          />
          {current_direction && (
            <StatusBadge
              status={current_direction === 'long' ? 'success' : 'warning'}
              label={current_direction.toUpperCase()}
              icon={current_direction === 'long' 
                ? <TrendingUp className="h-3 w-3" /> 
                : <TrendingDown className="h-3 w-3" />}
            />
          )}
        </div>

        {/* Market Data */}
        {market_data.price && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground">Market Price</div>
              <div className="text-xl font-mono font-semibold">
                ${market_data.price.toLocaleString()}
              </div>
            </div>
            {last_signal_at && (
              <div className="ml-auto text-right">
                <div className="text-xs text-muted-foreground">Last Signal</div>
                <div className="text-sm">
                  {formatDistanceToNow(new Date(last_signal_at), { addSuffix: true })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pilot Status Grid */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Pilot Conditions
          </h4>
          <div className="grid gap-3 md:grid-cols-4">
            <PilotCard
              number={1}
              state={pilot_conditions.p1.state}
              trigger={pilot_conditions.p1.trigger}
              threshold={pilot_conditions.p1.threshold}
              ready={pilot_conditions.p1.ready}
              entryPrice={pilot_conditions.p1.entry_price}
              pnl={pilot_conditions.p1.pnl}
            />
            <PilotCard
              number={2}
              state={pilot_conditions.p2.state}
              trigger={pilot_conditions.p2.trigger}
              threshold={pilot_conditions.p2.threshold}
              ready={pilot_conditions.p2.ready}
              current={pilot_conditions.p2.current}
              entryPrice={pilot_conditions.p2.entry_price}
              pnl={pilot_conditions.p2.pnl}
            />
            <PilotCard
              number={3}
              state={pilot_conditions.p3.state}
              trigger={pilot_conditions.p3.trigger}
              threshold={pilot_conditions.p3.threshold}
              ready={pilot_conditions.p3.ready}
              current={pilot_conditions.p3.current}
              entryPrice={pilot_conditions.p3.entry_price}
              pnl={pilot_conditions.p3.pnl}
            />
            <PilotCard
              number={4}
              state={pilot_conditions.p4.state}
              trigger={pilot_conditions.p4.trigger}
              threshold={pilot_conditions.p4.threshold}
              ready={pilot_conditions.p4.ready}
              current={pilot_conditions.p4.current}
              entryPrice={pilot_conditions.p4.entry_price}
              pnl={pilot_conditions.p4.pnl}
            />
          </div>
        </div>

        {/* Risk Meters */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Limits
          </h4>
          <div className="grid gap-4 md:grid-cols-3">
            <RiskMeter
              label="Daily Loss"
              current={risk_status.daily_loss_current}
              limit={risk_status.daily_loss_limit}
            />
            <RiskMeter
              label="Position Size"
              current={risk_status.position_size_current}
              limit={risk_status.position_size_limit}
            />
            <RiskMeter
              label="Drawdown"
              current={risk_status.drawdown_current}
              limit={risk_status.drawdown_limit}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Leverage:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {risk_status.leverage_current}x
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
