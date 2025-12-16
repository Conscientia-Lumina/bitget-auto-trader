# 🏗️ ARCHITECTURE - System Design

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PILOT TRADING DASHBOARD                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  TradingView │────▶│   Webhook    │────▶│   Supabase   │                │
│  │   Alerts     │     │   API Route  │     │   Database   │                │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                │
│                                                    │                        │
│                                                    │ Real-time              │
│                                                    │ Subscription           │
│                                                    ▼                        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │    Bitget    │◀───▶│  Trading Bot │◀────│   Dashboard  │                │
│  │   Exchange   │     │   (Server)   │     │    (UI)      │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Signal Flow (TradingView → Trade Execution)

```
TradingView Alert
       │
       ▼
┌─────────────────────────────┐
│  POST /api/webhook          │
│  • Validate passphrase      │
│  • Parse payload            │
│  • Store in trade_signals   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Supabase Real-time         │
│  • Broadcast INSERT event   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Trading Bot (subscribed)   │
│  • Receive signal           │
│  • Validate risk rules      │
│  • Calculate position size  │
│  • Check pilot state        │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Bitget API                 │
│  • Submit order             │
│  • Receive confirmation     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Update Database            │
│  • Create order record      │
│  • Update position          │
│  • Log audit event          │
└─────────────────────────────┘
```

### 2. Real-time Dashboard Updates

```
Database Change (INSERT/UPDATE)
       │
       ▼
┌─────────────────────────────┐
│  Supabase Realtime          │
│  • Detect postgres_changes  │
│  • Broadcast to subscribers │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  React Client Components    │
│  • useRealtimePositions()   │
│  • useRealtimeTrades()      │
│  • Update local state       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  UI Re-renders              │
│  • Positions list updates   │
│  • P&L recalculates         │
│  • Charts update            │
└─────────────────────────────┘
```

---

## Component Architecture

### Server vs Client Components

```
app/
├── (dashboard)/
│   ├── layout.tsx          [SERVER] - Fetches user settings
│   ├── page.tsx            [SERVER] - Fetches initial dashboard data
│   └── trades/
│       └── page.tsx        [SERVER] - Fetches trade history
│
components/
├── dashboard/
│   ├── StatsCards.tsx      [SERVER] - Static stats display
│   ├── EquityCurve.tsx     [CLIENT] - Interactive chart
│   ├── RecentTrades.tsx    [CLIENT] - Real-time updates
│   └── ActivePositions.tsx [CLIENT] - Real-time updates
├── charts/
│   └── CandlestickChart.tsx [CLIENT] - TradingView widget
└── layout/
    ├── Sidebar.tsx         [CLIENT] - Interactive navigation
    └── Header.tsx          [SERVER] - Static header
```

**Rule of Thumb:**
- Real-time data → Client Component
- Interactive elements → Client Component
- Static data fetched once → Server Component
- Forms → Client Component

---

## State Management

### Server State (TanStack Query)

```typescript
// For data that lives on the server and needs caching/refetching

// hooks/useExchangeBalance.ts
export function useExchangeBalance() {
  return useQuery({
    queryKey: ['exchange', 'balance'],
    queryFn: async () => {
      const res = await fetch('/api/exchange/balance');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

// hooks/useTrades.ts
export function useTrades(filters: TradeFilters) {
  return useQuery({
    queryKey: ['trades', filters],
    queryFn: async () => {
      const res = await fetch(`/api/trades?${new URLSearchParams(filters)}`);
      return res.json();
    },
  });
}
```

### Client State (Zustand)

```typescript
// For UI state that doesn't need persistence

// stores/botStore.ts
interface BotState {
  isRunning: boolean;
  lastSignal: Signal | null;
  activePilots: number;
  setRunning: (running: boolean) => void;
  setLastSignal: (signal: Signal) => void;
}

export const useBotStore = create<BotState>((set) => ({
  isRunning: false,
  lastSignal: null,
  activePilots: 0,
  setRunning: (running) => set({ isRunning: running }),
  setLastSignal: (signal) => set({ lastSignal: signal }),
}));
```

### Real-time State (Supabase Subscriptions)

```typescript
// For data that updates in real-time from database

// hooks/useRealtimePositions.ts
'use client';

export function useRealtimePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial fetch
    supabase
      .from('positions')
      .select('*')
      .eq('status', 'open')
      .then(({ data }) => setPositions(data || []));

    // Real-time subscription
    const channel = supabase
      .channel('positions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'positions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPositions((prev) => [...prev, payload.new as Position]);
          } else if (payload.eventType === 'UPDATE') {
            setPositions((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new as Position : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPositions((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return positions;
}
```

---

## Trading Bot Architecture

### Bot Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRADING BOT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │  IDLE   │───▶│ RUNNING │───▶│ PAUSED  │───▶│ STOPPED │     │
│  └─────────┘    └────┬────┘    └─────────┘    └─────────┘     │
│                      │                                          │
│                      ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SIGNAL PROCESSOR                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │   Receive   │─▶│   Validate  │─▶│   Execute   │      │  │
│  │  │   Signal    │  │    Risk     │  │    Order    │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PILOT MANAGER                          │  │
│  │  ┌────┐  ┌────┐  ┌────┐  ┌────┐                         │  │
│  │  │ P1 │  │ P2 │  │ P3 │  │ P4 │  ← Track individually   │  │
│  │  └────┘  └────┘  └────┘  └────┘                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    RISK MANAGER                           │  │
│  │  • Daily loss limit check                                 │  │
│  │  • Max position size check                                │  │
│  │  • Drawdown monitoring                                    │  │
│  │  • Kill switch trigger                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pilot State Machine

```typescript
type PilotState = 'inactive' | 'pending' | 'active' | 'closing' | 'closed';

interface Pilot {
  number: 1 | 2 | 3 | 4;
  state: PilotState;
  entryPrice: number | null;
  quantity: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  pnlPercent: number;
}

interface PilotManagerState {
  direction: 'long' | 'short' | null;
  pilots: [Pilot, Pilot, Pilot, Pilot];
  masterStopLoss: number | null;
  masterTakeProfit: number | null;
}
```

---

## API Design

### RESTful Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook` | Receive TradingView alerts |
| GET | `/api/trades` | List trades with filters |
| GET | `/api/trades/[id]` | Get single trade |
| GET | `/api/positions` | List open positions |
| POST | `/api/positions/close` | Close a position |
| GET | `/api/exchange/balance` | Get account balance |
| GET | `/api/exchange/positions` | Get exchange positions |
| POST | `/api/exchange/orders` | Place an order |
| DELETE | `/api/exchange/orders/[id]` | Cancel an order |
| GET | `/api/bot/status` | Get bot status |
| POST | `/api/bot/start` | Start the bot |
| POST | `/api/bot/stop` | Stop the bot |
| POST | `/api/bot/kill` | Emergency kill switch |
| GET | `/api/analytics/performance` | Get performance metrics |
| GET | `/api/analytics/equity-curve` | Get equity history |

### Response Format

```typescript
// Success response
{
  success: true,
  data: { ... },
  meta: {
    timestamp: "2024-01-15T10:30:00Z",
    requestId: "req_abc123"
  }
}

// Error response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid position size",
    details: { field: "quantity", reason: "exceeds_max" }
  },
  meta: {
    timestamp: "2024-01-15T10:30:00Z",
    requestId: "req_abc123"
  }
}
```

---

## Security Architecture

### API Key Storage

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE VAULT                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Encrypted at rest with AES-256-GCM                    │ │
│  │                                                         │ │
│  │  bitget_api_key     → ••••••••••••••••                 │ │
│  │  bitget_api_secret  → ••••••••••••••••                 │ │
│  │  bitget_passphrase  → ••••••••••••••••                 │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Access: Only via SECURITY DEFINER functions                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Webhook Security

1. **Passphrase validation** - Must match `WEBHOOK_SECRET`
2. **IP whitelisting** (optional) - TradingView IPs
3. **Rate limiting** - Max 10 requests/minute
4. **Request logging** - All webhooks logged for audit

### Environment Variables

```
# Server-only (never exposed to client)
BITGET_API_KEY
BITGET_API_SECRET
BITGET_API_PASSPHRASE
WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY

# Public (safe in browser)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

---

## Error Handling Strategy

### Error Boundaries

```typescript
// app/(dashboard)/error.tsx
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button onClick={reset} className="btn btn-primary">
        Try again
      </button>
    </div>
  );
}
```

### API Error Handling

```typescript
// lib/utils/api-error.ts
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Usage in API route
export async function POST(req: Request) {
  try {
    // ... logic
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    
    // Unknown error - log and return generic message
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
```

---

## Performance Considerations

### Caching Strategy

| Data Type | Cache Duration | Strategy |
|-----------|----------------|----------|
| Exchange balance | 30 seconds | TanStack Query refetchInterval |
| Trade history | 5 minutes | TanStack Query staleTime |
| Performance metrics | 1 minute | TanStack Query staleTime |
| Price data | Real-time | WebSocket subscription |
| Positions | Real-time | Supabase subscription |

### Database Optimization

- Index on `trades.created_at` for time-based queries
- Index on `trades.symbol` for filtering
- Index on `positions.status` for active positions
- Partitioning for `audit_logs` table (by month)

### Bundle Optimization

- Dynamic imports for charts (heavy libraries)
- Server components for initial data
- Lazy loading for settings/analytics pages
