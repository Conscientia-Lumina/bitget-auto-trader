# 🎨 STYLES AND UI - Design System Guide

## Overview

This file defines the visual design system, color palette, component styling, and UX patterns for the trading dashboard.

---

## Design Philosophy

- **Dark-first**: Trading dashboards need dark mode for long screen time
- **Information dense**: Show maximum data without clutter
- **Real-time feedback**: Immediate visual updates for market data
- **Color-coded**: Green = profit/long, Red = loss/short, always
- **Accessible**: High contrast, readable fonts, keyboard navigation

---

## Tailwind Configuration

### `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Trading-specific colors
        profit: {
          DEFAULT: '#22c55e',
          light: '#4ade80',
          dark: '#16a34a',
        },
        loss: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
        },
        long: {
          DEFAULT: '#22c55e',
          bg: 'rgba(34, 197, 94, 0.1)',
        },
        short: {
          DEFAULT: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.1)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## CSS Variables

### `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --card: 224 71% 6%;
    --card-foreground: 213 31% 91%;
    --popover: 224 71% 6%;
    --popover-foreground: 213 31% 91%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 222.2 47.4% 11.2%;
    --secondary-foreground: 210 40% 98%;
    --muted: 223 47% 11%;
    --muted-foreground: 215.4 16.3% 56.9%;
    --accent: 216 34% 17%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 216 34% 17%;
    --input: 216 34% 17%;
    --ring: 224 64% 33%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Custom scrollbar for dark mode */
@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted)) transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted));
    border-radius: 3px;
  }
}

/* Trading-specific utilities */
@layer utilities {
  .text-profit {
    @apply text-green-500;
  }

  .text-loss {
    @apply text-red-500;
  }

  .bg-profit {
    @apply bg-green-500/10;
  }

  .bg-loss {
    @apply bg-red-500/10;
  }

  .border-profit {
    @apply border-green-500;
  }

  .border-loss {
    @apply border-red-500;
  }

  /* Glow effects for important elements */
  .glow-profit {
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
  }

  .glow-loss {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
  }

  /* Number display - monospace for alignment */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}

/* Animation for real-time updates */
@keyframes flash-green {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(34, 197, 94, 0.2); }
}

@keyframes flash-red {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(239, 68, 68, 0.2); }
}

.flash-profit {
  animation: flash-green 0.5s ease-in-out;
}

.flash-loss {
  animation: flash-red 0.5s ease-in-out;
}
```

---

## Component Patterns

### PnL Display Pattern

Always use consistent styling for profit/loss values:

```typescript
// components/ui/pnl-value.tsx
import { cn } from '@/lib/utils';

interface PnLValueProps {
  value: number;
  showSign?: boolean;
  className?: string;
}

export function PnLValue({ value, showSign = true, className }: PnLValueProps) {
  const isPositive = value >= 0;
  const sign = showSign ? (isPositive ? '+' : '') : '';

  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        isPositive ? 'text-green-500' : 'text-red-500',
        className
      )}
    >
      {sign}${Math.abs(value).toFixed(2)}
    </span>
  );
}

// Percent version
export function PnLPercent({ value, showSign = true, className }: PnLValueProps) {
  const isPositive = value >= 0;
  const sign = showSign ? (isPositive ? '+' : '') : '';

  return (
    <span
      className={cn(
        'tabular-nums',
        isPositive ? 'text-green-500' : 'text-red-500',
        className
      )}
    >
      {sign}{value.toFixed(2)}%
    </span>
  );
}
```

### Badge Variants for Trading

```typescript
// Extend shadcn badge for trading-specific variants
// components/ui/trading-badge.tsx

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TradingBadgeProps {
  variant: 'long' | 'short' | 'buy' | 'sell' | 'pilot';
  children: React.ReactNode;
  className?: string;
}

export function TradingBadge({ variant, children, className }: TradingBadgeProps) {
  const variantStyles = {
    long: 'bg-green-500/20 text-green-500 border-green-500/30',
    short: 'bg-red-500/20 text-red-500 border-red-500/30',
    buy: 'bg-green-500/20 text-green-500 border-green-500/30',
    sell: 'bg-red-500/20 text-red-500 border-red-500/30',
    pilot: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  };

  return (
    <Badge
      variant="outline"
      className={cn('font-semibold', variantStyles[variant], className)}
    >
      {children}
    </Badge>
  );
}
```

### Status Indicator

```typescript
// components/ui/status-indicator.tsx

import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'running' | 'stopped' | 'paused' | 'error' | 'killed';
  showLabel?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  showLabel = true,
  className,
}: StatusIndicatorProps) {
  const styles = {
    running: {
      dot: 'bg-green-500',
      label: 'text-green-500',
      text: 'Running',
    },
    stopped: {
      dot: 'bg-gray-500',
      label: 'text-gray-500',
      text: 'Stopped',
    },
    paused: {
      dot: 'bg-yellow-500',
      label: 'text-yellow-500',
      text: 'Paused',
    },
    error: {
      dot: 'bg-red-500',
      label: 'text-red-500',
      text: 'Error',
    },
    killed: {
      dot: 'bg-red-600',
      label: 'text-red-600',
      text: 'KILLED',
    },
  };

  const { dot, label, text } = styles[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-2 h-2 rounded-full animate-pulse', dot)} />
      {showLabel && (
        <span className={cn('text-sm font-medium', label)}>{text}</span>
      )}
    </div>
  );
}
```

---

## Layout Patterns

### Dashboard Grid

```typescript
// app/(dashboard)/page.tsx

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <StatsCards />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <EquityCurve />
          <RecentTrades />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <ActivePositions />
          <PilotStatus />
          <BotControls />
        </div>
      </div>
    </div>
  );
}
```

### Card Pattern

```typescript
// Standard card with consistent padding and styling

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ExampleCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Card Title</CardTitle>
          <Badge variant="outline">Optional Badge</Badge>
        </div>
        <CardDescription>Optional description text</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Card content goes here */}
      </CardContent>
    </Card>
  );
}
```

---

## Typography Scale

```typescript
// Typography classes to use consistently

// Page titles
<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

// Section titles
<h2 className="text-lg font-semibold">Active Positions</h2>

// Card titles (use CardTitle component)
<CardTitle className="text-base font-semibold">Recent Trades</CardTitle>

// Body text
<p className="text-sm text-muted-foreground">Description text</p>

// Numbers (always use tabular-nums)
<span className="text-2xl font-bold tabular-nums">$10,234.56</span>

// Labels
<label className="text-sm font-medium">Input Label</label>

// Helper text
<p className="text-xs text-muted-foreground">Helper text</p>
```

---

## Icon Usage

Use Lucide React icons consistently:

```typescript
import {
  // Navigation
  LayoutDashboard,
  LineChart,
  History,
  Settings,
  
  // Trading
  TrendingUp,    // Long/Profit
  TrendingDown,  // Short/Loss
  ArrowUp,       // Buy
  ArrowDown,     // Sell
  
  // Status
  Activity,      // Active/Running
  Circle,        // Status dot
  AlertTriangle, // Warning/Kill switch
  CheckCircle,   // Success
  XCircle,       // Error
  
  // Actions
  Play,          // Start
  Pause,         // Pause
  Square,        // Stop
  RefreshCw,     // Refresh
  X,             // Close
  
  // Data
  DollarSign,    // Money/Balance
  Percent,       // Percentage
  Clock,         // Time
  Calendar,      // Date
} from 'lucide-react';

// Icon sizing
<Icon className="h-4 w-4" />   // Small (in buttons, badges)
<Icon className="h-5 w-5" />   // Medium (in navigation)
<Icon className="h-6 w-6" />   // Large (standalone)
```

---

## Responsive Breakpoints

```typescript
// Mobile-first approach
// Default: Mobile (< 640px)
// sm: >= 640px (Tablet portrait)
// md: >= 768px (Tablet landscape)
// lg: >= 1024px (Desktop)
// xl: >= 1280px (Large desktop)
// 2xl: >= 1536px (Extra large)

// Example responsive layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards stack on mobile, 2 cols on tablet, 4 on desktop */}
</div>

// Hide on mobile, show on desktop
<div className="hidden lg:block">Desktop only content</div>

// Show on mobile, hide on desktop
<div className="lg:hidden">Mobile only content</div>
```

---

## Loading States

### Skeleton Pattern

```typescript
import { Skeleton } from '@/components/ui/skeleton';

// Card skeleton
export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Stats skeleton
export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Toast Notifications

```typescript
import { toast } from '@/components/ui/use-toast';

// Success
toast({
  title: 'Order Placed',
  description: 'Buy 0.01 BTC at market price',
  variant: 'default',
});

// Error
toast({
  title: 'Order Failed',
  description: 'Insufficient balance',
  variant: 'destructive',
});

// With action
toast({
  title: 'Position Opened',
  description: 'Long BTCUSDT',
  action: (
    <ToastAction altText="View">View</ToastAction>
  ),
});
```

---

## Dark Mode Toggle

```typescript
// components/layout/ThemeToggle.tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

## Chart Theming

### Lightweight Charts (TradingView)

```typescript
const chartOptions = {
  layout: {
    background: { type: ColorType.Solid, color: 'transparent' },
    textColor: '#9ca3af', // text-gray-400
  },
  grid: {
    vertLines: { color: '#1f2937' }, // gray-800
    horzLines: { color: '#1f2937' },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: '#6b7280', // gray-500
      width: 1,
      style: LineStyle.Dashed,
    },
    horzLine: {
      color: '#6b7280',
      width: 1,
      style: LineStyle.Dashed,
    },
  },
};

const candleOptions = {
  upColor: '#22c55e',      // green-500
  downColor: '#ef4444',    // red-500
  borderUpColor: '#22c55e',
  borderDownColor: '#ef4444',
  wickUpColor: '#22c55e',
  wickDownColor: '#ef4444',
};
```

### Recharts

```typescript
const chartColors = {
  profit: '#22c55e',
  loss: '#ef4444',
  primary: '#3b82f6',
  secondary: '#6366f1',
  muted: '#6b7280',
  grid: '#1f2937',
};

// Tooltip styling
const CustomTooltip = {
  contentStyle: {
    backgroundColor: 'hsl(224 71% 6%)', // card background
    border: '1px solid hsl(216 34% 17%)', // border
    borderRadius: '8px',
  },
  labelStyle: {
    color: 'hsl(213 31% 91%)', // foreground
  },
};
```
