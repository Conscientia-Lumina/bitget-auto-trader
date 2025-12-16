import type { PerformanceMetrics } from '@/types/trading';

interface Trade {
  realized_pnl: number | null;
  executed_at: string;
  is_entry: boolean;
}

export function calculateMetrics(trades: Trade[]): PerformanceMetrics {
  const closingTrades = trades.filter(t => !t.is_entry && t.realized_pnl !== null);

  const totalTrades = closingTrades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      maxDrawdown: 0,
      avgTradeDuration: 0,
    };
  }

  const pnls = closingTrades.map(t => t.realized_pnl || 0);

  const winningTrades = pnls.filter(pnl => pnl > 0).length;
  const losingTrades = pnls.filter(pnl => pnl < 0).length;

  const winRate = (winningTrades / totalTrades) * 100;

  const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);

  const grossProfit = pnls.filter(pnl => pnl > 0).reduce((sum, pnl) => sum + pnl, 0);
  const grossLoss = Math.abs(pnls.filter(pnl => pnl < 0).reduce((sum, pnl) => sum + pnl, 0));

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const winningPnls = pnls.filter(pnl => pnl > 0);
  const losingPnls = pnls.filter(pnl => pnl < 0);

  const avgWin = winningPnls.length > 0
    ? winningPnls.reduce((sum, pnl) => sum + pnl, 0) / winningPnls.length
    : 0;
  const avgLoss = losingPnls.length > 0
    ? Math.abs(losingPnls.reduce((sum, pnl) => sum + pnl, 0)) / losingPnls.length
    : 0;

  const largestWin = Math.max(...pnls, 0);
  const largestLoss = Math.abs(Math.min(...pnls, 0));

  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnl = 0;

  for (const pnl of pnls) {
    runningPnl += pnl;
    if (runningPnl > peak) {
      peak = runningPnl;
    }
    const drawdown = peak - runningPnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    totalPnl,
    grossProfit,
    grossLoss,
    profitFactor,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    maxDrawdown,
    avgTradeDuration: 0, // Would need entry/exit time pairs to calculate
  };
}

export function calculatePositionPnl(
  side: 'long' | 'short',
  entryPrice: number,
  currentPrice: number,
  quantity: number
): { pnl: number; pnlPercent: number } {
  let pnl: number;
  let pnlPercent: number;

  if (side === 'long') {
    pnl = (currentPrice - entryPrice) * quantity;
    pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    pnl = (entryPrice - currentPrice) * quantity;
    pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
  }

  return { pnl, pnlPercent };
}
