# 🚀 PILOT TRADING DASHBOARD - Master Instruction File

## READ THIS FIRST

You are building a **personal crypto trading dashboard** for automated futures trading on Bitget. This is a single-user application with no auth required (the user is the only one accessing it).

**Before writing ANY code, read ALL files in this directory in this order:**

1. `PROMPT.md` (this file) - Overview and critical rules
2. `ARCHITECTURE.md` - System design and data flow
3. `DATABASE.md` - Supabase schema (copy exactly)
4. `API_ROUTES.md` - All API endpoints to build
5. `COMPONENTS.md` - Frontend component structure
6. `BITGET_INTEGRATION.md` - Exchange API integration
7. `WEBHOOK_SYSTEM.md` - TradingView webhook handling
8. `STYLES_AND_UI.md` - Design system and UI patterns
9. `ENV_EXAMPLE.md` - Required environment variables

---

## Project Overview

### What We're Building

A Next.js 14+ application that:

1. **Receives TradingView webhook alerts** from Pine Script strategies
2. **Executes trades automatically** on Bitget Futures (USDT-M perpetuals)
3. **Tracks all trades, positions, and P&L** in real-time
4. **Displays a beautiful dashboard** with performance analytics
5. **Manages the "Multi-Pilot" strategy** - scaling into positions with 4 pilot entries

### Tech Stack (DO NOT CHANGE)

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 14+ (App Router) | Server components, API routes |
| Database | Supabase (PostgreSQL) | Real-time subscriptions, Auth ready |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| Charts | Lightweight Charts (TradingView) | Performance, familiar |
| Data Viz | Tremor | Beautiful dashboard components |
| Tables | TanStack Table | Sorting, filtering, pagination |
| Exchange | Bitget API via `bitget-api` npm | Official SDK, TypeScript |
| State | TanStack Query + Zustand | Server state + client state |
| Deployment | Vercel | Seamless Next.js hosting |

---

## Critical Rules

### 1. File Structure (FOLLOW EXACTLY)

```
pilot-trading-dashboard/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Main dashboard
│   │   ├── trades/
│   │   │   └── page.tsx             # Trade history
│   │   ├── positions/
│   │   │   └── page.tsx             # Active positions
│   │   ├── strategies/
│   │   │   └── page.tsx             # Strategy config
│   │   ├── analytics/
│   │   │   └── page.tsx             # Performance metrics
│   │   └── settings/
│   │       └── page.tsx             # API keys, preferences
│   ├── api/
│   │   ├── webhook/
│   │   │   └── route.ts             # TradingView webhooks
│   │   ├── trades/
│   │   │   └── route.ts             # Trade CRUD
│   │   ├── positions/
│   │   │   └── route.ts             # Position management
│   │   ├── exchange/
│   │   │   ├── balance/route.ts     # Account balance
│   │   │   ├── orders/route.ts      # Order management
│   │   │   └── positions/route.ts   # Exchange positions
│   │   ├── bot/
│   │   │   ├── start/route.ts       # Start trading bot
│   │   │   ├── stop/route.ts        # Stop trading bot
│   │   │   └── status/route.ts      # Bot health check
│   │   └── cron/
│   │       └── sync/route.ts        # Sync with exchange
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn components
│   ├── dashboard/
│   │   ├── StatsCards.tsx
│   │   ├── EquityCurve.tsx
│   │   ├── RecentTrades.tsx
│   │   ├── ActivePositions.tsx
│   │   └── PilotStatus.tsx
│   ├── charts/
│   │   ├── CandlestickChart.tsx
│   │   ├── PnLChart.tsx
│   │   └── DrawdownChart.tsx
│   ├── trades/
│   │   ├── TradesTable.tsx
│   │   ├── TradeDetails.tsx
│   │   └── TradeFilters.tsx
│   ├── positions/
│   │   ├── PositionCard.tsx
│   │   ├── PositionsList.tsx
│   │   └── ClosePositionModal.tsx
│   ├── strategy/
│   │   ├── StrategyCard.tsx
│   │   ├── PilotConfig.tsx
│   │   └── RiskSettings.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       ├── MobileNav.tsx
│       └── ThemeToggle.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server client
│   │   └── admin.ts                 # Service role client
│   ├── bitget/
│   │   ├── client.ts                # REST client setup
│   │   ├── websocket.ts             # WS client setup
│   │   ├── orders.ts                # Order functions
│   │   ├── positions.ts             # Position functions
│   │   └── types.ts                 # TypeScript types
│   ├── trading/
│   │   ├── bot.ts                   # Trading bot logic
│   │   ├── risk.ts                  # Risk management
│   │   ├── signals.ts               # Signal processing
│   │   └── pilot-manager.ts         # Multi-pilot logic
│   ├── utils/
│   │   ├── calculations.ts          # P&L, metrics
│   │   ├── formatters.ts            # Number/date formatting
│   │   └── validators.ts            # Input validation
│   └── constants.ts                 # App constants
├── hooks/
│   ├── useRealtimePositions.ts
│   ├── useRealtimeTrades.ts
│   ├── useBotStatus.ts
│   ├── useExchangeData.ts
│   └── usePerformanceMetrics.ts
├── stores/
│   ├── botStore.ts                  # Bot state (Zustand)
│   └── settingsStore.ts             # User preferences
├── types/
│   ├── database.ts                  # Supabase generated types
│   ├── trading.ts                   # Trading domain types
│   └── api.ts                       # API request/response types
├── .env.local                       # Environment variables
├── .env.example                     # Example env file
├── middleware.ts                    # Request middleware
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 2. Coding Standards

```typescript
// ✅ DO: Use TypeScript strictly
type Trade = {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  // ...
};

// ❌ DON'T: Use 'any'
const data: any = await fetch(...);

// ✅ DO: Use async/await with proper error handling
async function fetchTrades() {
  try {
    const { data, error } = await supabase.from('trades').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to fetch trades:', err);
    throw err;
  }
}

// ✅ DO: Use server components by default
// app/trades/page.tsx
export default async function TradesPage() {
  const trades = await getTrades(); // Server-side fetch
  return <TradesTable data={trades} />;
}

// ✅ DO: Mark client components explicitly
// components/dashboard/EquityCurve.tsx
'use client';
import { useEffect, useState } from 'react';

// ✅ DO: Use environment variables safely
const apiKey = process.env.BITGET_API_KEY!;

// ✅ DO: Validate webhook payloads
import { z } from 'zod';
const WebhookSchema = z.object({
  passphrase: z.string(),
  ticker: z.string(),
  action: z.enum(['buy', 'sell']),
  // ...
});
```

### 3. Database Rules

- **NEVER** store API keys in plain text - use Supabase Vault
- **ALWAYS** use RLS policies (even for single user)
- **ALWAYS** use generated TypeScript types from Supabase
- **NEVER** delete trade records - soft delete with `deleted_at` column
- **ALWAYS** log every order event for audit trail

### 4. API Route Rules

- **ALWAYS** validate request bodies with Zod
- **ALWAYS** return consistent response shapes
- **ALWAYS** handle errors gracefully with proper status codes
- **NEVER** expose internal error messages to client
- **ALWAYS** use `NextResponse.json()` for responses

### 5. Trading Safety Rules

- **ALWAYS** implement daily loss limit checks before orders
- **ALWAYS** validate position size against max allowed
- **ALWAYS** log order attempts before sending to exchange
- **NEVER** send orders without risk validation
- **ALWAYS** implement kill switch functionality

---

## Initial Setup Commands

When starting the project, run these commands in order:

```bash
# 1. Create Next.js app
npx create-next-app@latest pilot-trading-dashboard --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# 2. Navigate to project
cd pilot-trading-dashboard

# 3. Install core dependencies
npm install @supabase/supabase-js @supabase/ssr bitget-api zustand @tanstack/react-query @tanstack/react-table zod date-fns decimal.js

# 4. Install UI dependencies
npm install @tremor/react lightweight-charts recharts lucide-react class-variance-authority clsx tailwind-merge

# 5. Install shadcn/ui CLI and init
npx shadcn-ui@latest init

# 6. Add shadcn components
npx shadcn-ui@latest add button card input label select tabs table badge dialog dropdown-menu sheet toast separator skeleton avatar

# 7. Install dev dependencies
npm install -D @types/node supabase

# 8. Generate Supabase types (after setting up tables)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

---

## Implementation Order

Build the app in this exact order:

### Phase 1: Foundation (Do First)
1. Set up environment variables (`.env.local`)
2. Configure Supabase client (`lib/supabase/`)
3. Create database tables (run SQL from `DATABASE.md`)
4. Generate TypeScript types
5. Create base layout and navigation

### Phase 2: Exchange Integration
1. Set up Bitget client (`lib/bitget/client.ts`)
2. Implement balance fetching
3. Implement position fetching
4. Implement order placement
5. Test with small orders

### Phase 3: Webhook System
1. Create webhook API route
2. Implement passphrase validation
3. Store signals in database
4. Test with TradingView alerts

### Phase 4: Trading Bot
1. Implement signal processor
2. Implement pilot manager (multi-pilot logic)
3. Implement risk checks
4. Connect signals → orders
5. Test full flow

### Phase 5: Dashboard
1. Build stats cards
2. Build equity curve chart
3. Build positions display
4. Build trade history table
5. Build real-time subscriptions

### Phase 6: Polish
1. Add loading states
2. Add error boundaries
3. Add toast notifications
4. Mobile responsiveness
5. Performance optimization

---

## Key Features to Implement

### Multi-Pilot System

The core trading logic uses 4 "pilots" that scale into positions:

```
P1 (Pilot 1): Initial entry on HTF fib touch
    ↓ When P1 is +0.3% profitable
P2 (Pilot 2): Add to position on pullback
    ↓ When P1 is +0.5% profitable  
P3 (Pilot 3): Add to position on pullback
    ↓ When P1 is +0.8% profitable
P4 (Pilot 4): Final add on pullback
```

Each pilot has:
- Entry price
- Quantity
- Individual P&L tracking
- Stop loss (tightens as pilots add)

### Risk Management

Implement these safeguards:
- **Max position size**: 25% of account per symbol
- **Max daily loss**: 5% of account
- **Max drawdown**: 15% from peak
- **Kill switch**: Immediately cancel all orders + close positions

### Performance Metrics

Calculate and display:
- Total P&L (USDT and %)
- Win rate
- Profit factor
- Max drawdown
- Sharpe ratio
- Average trade duration
- Best/worst trade

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Bitget
BITGET_API_KEY=xxx
BITGET_API_SECRET=xxx
BITGET_API_PASSPHRASE=xxx

# Webhook
WEBHOOK_SECRET=your-super-secret-passphrase-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing Checklist

Before considering any feature complete:

- [ ] TypeScript compiles with no errors
- [ ] Works on mobile viewport
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] Real-time updates working
- [ ] Console has no errors/warnings

---

## Questions to Ask Before Building

If anything is unclear, ask these questions:

1. "Should this be a server or client component?"
2. "What happens if the API call fails?"
3. "Is this data sensitive and needs server-side only?"
4. "Does this need real-time updates?"
5. "What's the loading state look like?"

---

## NOW READ THE OTHER FILES

Continue reading in this order:
1. `ARCHITECTURE.md`
2. `DATABASE.md`
3. `API_ROUTES.md`
4. `COMPONENTS.md`
5. `BITGET_INTEGRATION.md`
6. `WEBHOOK_SYSTEM.md`
7. `STYLES_AND_UI.md`
8. `ENV_EXAMPLE.md`

Only start coding after reading ALL files.
