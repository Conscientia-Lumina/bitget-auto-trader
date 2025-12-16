# 🧩 COMPONENTS - Frontend Component Reference

## Overview

Components are organized by feature area. Use Server Components by default, Client Components only when needed for interactivity or real-time updates.

---

## Layout Components

### Sidebar (`components/layout/Sidebar.tsx`)

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  LineChart,
  History,
  Settings,
  Bot,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Positions', href: '/positions', icon: TrendingUp },
  { name: 'Trades', href: '/trades', icon: History },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Strategies', href: '/strategies', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-card border-r">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4 border-b">
          <AlertTriangle className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Pilot Trading</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bot Status Footer */}
        <div className="border-t p-4">
          <BotStatusIndicator />
        </div>
      </div>
    </aside>
  );
}
```

### Header (`components/layout/Header.tsx`)

```typescript
'use client';

import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileNav } from './MobileNav';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <MobileNav />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <h1 className="text-xl font-semibold">{title}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

---

## Dashboard Components

### Stats Cards (`components/dashboard/StatsCards.tsx`)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  balance: number;
  todayPnl: number;
  todayPnlPercent: number;
  openPositions: number;
  winRate: number;
}

export function StatsCards({
  balance,
  todayPnl,
  todayPnlPercent,
  openPositions,
  winRate,
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Account Balance',
      value: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-blue-500',
    },
    {
      title: "Today's P&L",
      value: `${todayPnl >= 0 ? '+' : ''}$${todayPnl.toFixed(2)}`,
      subtitle: `${todayPnlPercent >= 0 ? '+' : ''}${todayPnlPercent.toFixed(2)}%`,
      icon: todayPnl >= 0 ? TrendingUp : TrendingDown,
      color: todayPnl >= 0 ? 'text-green-500' : 'text-red-500',
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
      icon: TrendingUp,
      color: winRate >= 50 ? 'text-green-500' : 'text-yellow-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={cn('h-4 w-4', stat.color)} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', stat.color)}>
              {stat.value}
            </div>
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Active Positions (`components/dashboard/ActivePositions.tsx`)

```typescript
'use client';

import { useRealtimePositions } from '@/hooks/useRealtimePositions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function ActivePositions() {
  const positions = useRealtimePositions();

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
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
      <CardHeader>
        <CardTitle>Active Positions ({positions.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {positions.map((position) => (
          <div
            key={position.id}
            className="flex items-center justify-between p-4 rounded-lg border"
          >
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{position.symbol}</span>
                  <Badge
                    variant={position.side === 'long' ? 'default' : 'destructive'}
                  >
                    {position.side.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    P{position.pilot_count}/4
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {position.quantity} @ ${position.avg_entry_price.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={cn(
                  'text-lg font-semibold',
                  position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {position.unrealized_pnl >= 0 ? '+' : ''}
                ${position.unrealized_pnl.toFixed(2)}
              </div>
              <div
                className={cn(
                  'text-sm',
                  position.unrealized_pnl_percent >= 0
                    ? 'text-green-500'
                    : 'text-red-500'
                )}
              >
                {position.unrealized_pnl_percent >= 0 ? '+' : ''}
                {position.unrealized_pnl_percent.toFixed(2)}%
              </div>
            </div>

            <Button variant="ghost" size="icon" className="ml-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Pilot Status (`components/dashboard/PilotStatus.tsx`)

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PilotStatusProps {
  position: {
    pilot_count: number;
    pilot_1_entry?: number;
    pilot_1_pnl?: number;
    pilot_2_entry?: number;
    pilot_2_pnl?: number;
    pilot_3_entry?: number;
    pilot_3_pnl?: number;
    pilot_4_entry?: number;
    pilot_4_pnl?: number;
  } | null;
}

export function PilotStatus({ position }: PilotStatusProps) {
  const pilots = [
    { num: 1, entry: position?.pilot_1_entry, pnl: position?.pilot_1_pnl },
    { num: 2, entry: position?.pilot_2_entry, pnl: position?.pilot_2_pnl },
    { num: 3, entry: position?.pilot_3_entry, pnl: position?.pilot_3_pnl },
    { num: 4, entry: position?.pilot_4_entry, pnl: position?.pilot_4_pnl },
  ];

  const activePilots = position?.pilot_count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pilot Status</span>
          <span className="text-sm font-normal text-muted-foreground">
            {activePilots}/4 Active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={(activePilots / 4) * 100} className="mb-4" />

        <div className="grid grid-cols-4 gap-2">
          {pilots.map((pilot) => {
            const isActive = pilot.entry != null;
            return (
              <div
                key={pilot.num}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors',
                  isActive ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  P{pilot.num}
                </div>
                {isActive ? (
                  <>
                    <div className="text-sm font-semibold mt-1">
                      ${pilot.entry?.toFixed(0)}
                    </div>
                    <div
                      className={cn(
                        'text-xs mt-1',
                        (pilot.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {(pilot.pnl || 0) >= 0 ? '+' : ''}
                      {pilot.pnl?.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground mt-2">
                    Waiting...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Recent Trades (`components/dashboard/RecentTrades.tsx`)

```typescript
'use client';

import { useRealtimeTrades } from '@/hooks/useRealtimeTrades';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function RecentTrades() {
  const trades = useRealtimeTrades(10); // Last 10 trades

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
      </CardContent>
    </Card>
  );
}
```

### Equity Curve (`components/dashboard/EquityCurve.tsx`)

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export function EquityCurve() {
  const { data, isLoading } = useQuery({
    queryKey: ['equity-curve'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/equity-curve?period=30d');
      const json = await res.json();
      return json.data?.dataPoints || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Curve (30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => new Date(val).toLocaleDateString()}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(val) => `$${val.toLocaleString()}`}
              className="text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(val: number) => [`$${val.toFixed(2)}`, 'Equity']}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#3b82f6"
              fill="url(#equityGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## Charts Components

### Candlestick Chart (`components/charts/CandlestickChart.tsx`)

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CandlestickChartProps {
  symbol: string;
  data: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  markers?: {
    time: string;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text: string;
  }[];
}

export function CandlestickChart({ symbol, data, markers }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    candleSeries.setData(data as any);

    if (markers && markers.length > 0) {
      candleSeries.setMarkers(markers as any);
    }

    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, markers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{symbol} Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} />
      </CardContent>
    </Card>
  );
}
```

---

## Trade Components

### Trades Table (`components/trades/TradesTable.tsx`)

```typescript
'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  realized_pnl: number | null;
  realized_pnl_percent: number | null;
  pilot_number: number | null;
  executed_at: string;
}

const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: 'executed_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(new Date(row.getValue('executed_at')), 'MMM d, HH:mm'),
  },
  {
    accessorKey: 'symbol',
    header: 'Symbol',
  },
  {
    accessorKey: 'side',
    header: 'Side',
    cell: ({ row }) => (
      <Badge variant={row.getValue('side') === 'buy' ? 'default' : 'destructive'}>
        {(row.getValue('side') as string).toUpperCase()}
      </Badge>
    ),
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => row.getValue<number>('quantity').toFixed(4),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => `$${row.getValue<number>('price').toFixed(2)}`,
  },
  {
    accessorKey: 'pilot_number',
    header: 'Pilot',
    cell: ({ row }) => {
      const pilot = row.getValue<number | null>('pilot_number');
      return pilot ? <Badge variant="outline">P{pilot}</Badge> : '-';
    },
  },
  {
    accessorKey: 'realized_pnl',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        P&L
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const pnl = row.getValue<number | null>('realized_pnl');
      if (pnl == null) return '-';
      return (
        <span className={cn(pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      );
    },
  },
];

interface TradesTableProps {
  data: Trade[];
}

export function TradesTable({ data }: TradesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No trades found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

---

## Bot Control Components

### Bot Status Indicator (`components/bot/BotStatusIndicator.tsx`)

```typescript
'use client';

import { useBotStatus } from '@/hooks/useBotStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, AlertTriangle } from 'lucide-react';
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

      {status?.activePilots > 0 && (
        <Badge variant="outline" className="w-full justify-center">
          {status.activePilots} Active Pilots
        </Badge>
      )}

      <div className="flex gap-2">
        {!status?.isRunning ? (
          <Button
            size="sm"
            className="flex-1"
            onClick={start}
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
            onClick={stop}
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
```

### Kill Switch Button (`components/bot/KillSwitch.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

export function KillSwitch() {
  const [closePositions, setClosePositions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleKill = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/bot/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closePositions }),
      });
      // Force refresh
      window.location.reload();
    } catch (err) {
      console.error('Kill switch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <AlertTriangle className="h-4 w-4 mr-2" />
          EMERGENCY KILL
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Emergency Kill Switch</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately stop the trading bot and cancel all open orders.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="closePositions"
            checked={closePositions}
            onCheckedChange={(checked) => setClosePositions(checked as boolean)}
          />
          <label htmlFor="closePositions" className="text-sm">
            Also close all open positions (market orders)
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleKill}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground"
          >
            {isLoading ? 'Executing...' : 'Activate Kill Switch'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Hooks

### useRealtimePositions (`hooks/useRealtimePositions.ts`)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Position = Database['public']['Tables']['positions']['Row'];

export function useRealtimePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    supabase
      .from('positions')
      .select('*')
      .eq('status', 'open')
      .then(({ data }) => {
        if (data) setPositions(data);
      });

    // Real-time subscription
    const channel = supabase
      .channel('positions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPositions((prev) => [...prev, payload.new as Position]);
          } else if (payload.eventType === 'UPDATE') {
            setPositions((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Position) : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPositions((prev) =>
              prev.filter((p) => p.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return positions.filter((p) => p.status === 'open');
}
```

### useBotStatus (`hooks/useBotStatus.ts`)

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  isKilled: boolean;
  activePilots: number;
  currentSymbol: string | null;
  dailyPnl: number;
  lastSignalAt: string | null;
}

export function useBotStatus() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<BotStatus>({
    queryKey: ['bot-status'],
    queryFn: async () => {
      const res = await fetch('/api/bot/status');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/bot/start', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/bot/stop', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
    },
  });

  return {
    status,
    isLoading,
    start: startMutation.mutate,
    stop: stopMutation.mutate,
  };
}
```
