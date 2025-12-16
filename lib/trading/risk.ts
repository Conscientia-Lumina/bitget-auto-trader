import { createClient } from '@/lib/supabase/server';
import { getAccountBalance } from '@/lib/bitget/account';
import { getPositions } from '@/lib/bitget/positions';
import { RISK_DEFAULTS } from '@/lib/constants';
import type { RiskCheckResult } from '@/types/trading';

export async function validateRisk(
  symbol: string,
  quantity: number,
  side: string
): Promise<RiskCheckResult> {
  try {
    const supabase = await createClient();

    // Get risk settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['max_position_size', 'daily_loss_limit', 'max_drawdown', 'trading_enabled']);

    const settingsMap = (settings || []).reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, unknown>);

    // Check if trading is enabled
    if (settingsMap.trading_enabled === false) {
      return { allowed: false, reason: 'Trading is disabled' };
    }

    // Get account balance
    const balance = await getAccountBalance();
    if (!balance) {
      return { allowed: false, reason: 'Unable to fetch account balance' };
    }

    // Get bot state
    const { data: botState } = await supabase
      .from('bot_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (botState?.is_killed) {
      return { allowed: false, reason: 'Bot is in killed state' };
    }

    if (botState?.daily_loss_limit_hit) {
      return { allowed: false, reason: 'Daily loss limit has been reached' };
    }

    if (botState?.drawdown_limit_hit) {
      return { allowed: false, reason: 'Maximum drawdown limit reached' };
    }

    // Check daily loss limit
    const dailyLossLimit = Number(settingsMap.daily_loss_limit) || RISK_DEFAULTS.DAILY_LOSS_LIMIT;
    const maxDailyLoss = balance.equity * (dailyLossLimit / 100);

    if (botState && botState.daily_pnl < -maxDailyLoss) {
      return {
        allowed: false,
        reason: `Daily loss limit of ${dailyLossLimit}% exceeded`,
        details: { dailyPnl: botState.daily_pnl, maxDailyLoss }
      };
    }

    // Get current positions
    const positions = await getPositions();
    const currentPosition = positions.find(p => p.symbol === symbol);

    // Check max position size
    const maxPositionPercent = Number(settingsMap.max_position_size) || RISK_DEFAULTS.MAX_POSITION_SIZE;
    const maxPositionValue = balance.equity * (maxPositionPercent / 100);

    // Estimate position value (assuming current mark price as reference)
    const existingValue = currentPosition
      ? currentPosition.size * currentPosition.markPrice
      : 0;

    // For a new position, we need to estimate the value
    // This is simplified - in production, you'd fetch current price
    const estimatedNewValue = quantity * (currentPosition?.markPrice || 0);

    if (existingValue + estimatedNewValue > maxPositionValue && currentPosition) {
      return {
        allowed: false,
        reason: `Position would exceed max size of ${maxPositionPercent}% of account`,
        details: { existingValue, estimatedNewValue, maxPositionValue }
      };
    }

    // Check if adding to opposite direction
    if (currentPosition &&
        ((currentPosition.side === 'long' && side === 'sell') ||
         (currentPosition.side === 'short' && side === 'buy'))) {
      // This is a close/reduce position, always allowed
      return { allowed: true };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[Risk] Validation error:', error);
    return {
      allowed: false,
      reason: 'Risk validation failed due to an error'
    };
  }
}

export async function checkDailyLossLimit(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: botState } = await supabase
      .from('bot_state')
      .select('daily_pnl')
      .eq('id', 1)
      .single();

    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'daily_loss_limit')
      .single();

    const balance = await getAccountBalance();
    if (!balance || !botState) return false;

    const dailyLossLimit = Number(settings?.value) || RISK_DEFAULTS.DAILY_LOSS_LIMIT;
    const maxLoss = balance.equity * (dailyLossLimit / 100);

    return botState.daily_pnl >= -maxLoss;
  } catch {
    return false;
  }
}

export async function updateDailyPnl(pnl: number): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: botState } = await supabase
      .from('bot_state')
      .select('daily_pnl')
      .eq('id', 1)
      .single();

    const newDailyPnl = (botState?.daily_pnl || 0) + pnl;

    await supabase
      .from('bot_state')
      .update({ daily_pnl: newDailyPnl })
      .eq('id', 1);
  } catch (error) {
    console.error('[Risk] Update daily PnL error:', error);
  }
}
