import { z } from 'zod';

export const WebhookPayloadSchema = z.object({
  passphrase: z.string(),
  ticker: z.string().min(1),
  action: z.enum(['buy', 'sell', 'close_long', 'close_short']),
  price: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  quantity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  strategy: z.string().optional(),
  pilot: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  timeframe: z.string().optional(),
  time: z.string().optional(),
  position: z.string().optional(),
});

export const OrderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  orderType: z.enum(['market', 'limit']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  pilotNumber: z.number().min(1).max(4).optional(),
});

export const ClosePositionSchema = z.object({
  positionId: z.string().uuid(),
  percentage: z.number().min(0).max(100).default(100),
});

export const KillSwitchSchema = z.object({
  closePositions: z.boolean().default(false),
});

export function validateSymbol(symbol: string): boolean {
  const validPattern = /^[A-Z0-9]+$/;
  return validPattern.test(symbol) && symbol.length >= 4 && symbol.length <= 20;
}

export function validateQuantity(quantity: number, symbol: string): boolean {
  if (quantity <= 0) return false;

  // Symbol-specific minimum quantities
  if (symbol.includes('BTC') && quantity < 0.001) return false;
  if (!symbol.includes('BTC') && quantity < 0.01) return false;

  return true;
}

export function normalizeSymbol(ticker: string): string {
  // Remove exchange prefix if present (BINANCE:BTCUSDT -> BTCUSDT)
  const parts = ticker.split(':');
  const symbol = parts.length > 1 ? parts[1] : parts[0];

  // Remove .P suffix for perpetuals (BTCUSDT.P -> BTCUSDT)
  return symbol.replace(/\.P$/, '').toUpperCase();
}
