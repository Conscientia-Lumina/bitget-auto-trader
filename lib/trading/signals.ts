import { createClient } from '@/lib/supabase/server';
import { placeOrder } from '@/lib/bitget/orders';
import { validateRisk } from './risk';
import { getPilotManager } from './pilot-manager';
import { getAccountBalance } from '@/lib/bitget/account';
import { getBitgetClient } from '@/lib/bitget/client';
import type { Database } from '@/types/database';

type Signal = Database['public']['Tables']['trade_signals']['Row'];

export class SignalProcessor {
  private pilotManager = getPilotManager();

  async processSignal(signalId: string): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    const supabase = await createClient();

    try {
      const { data: signal, error: fetchError } = await supabase
        .from('trade_signals')
        .select('*')
        .eq('id', signalId)
        .single();

      if (fetchError || !signal) {
        return { success: false, error: 'Signal not found' };
      }

      if (signal.processed) {
        return { success: false, error: 'Signal already processed' };
      }

      await supabase
        .from('trade_signals')
        .update({ process_result: 'processing' })
        .eq('id', signalId);

      let result: { success: boolean; orderId?: string; error?: string };

      switch (signal.action) {
        case 'buy':
        case 'sell':
          result = await this.handleEntrySignal(signal);
          break;
        case 'close_long':
        case 'close_short':
          result = await this.handleExitSignal(signal);
          break;
        default:
          result = { success: false, error: `Unknown action: ${signal.action}` };
      }

      await supabase
        .from('trade_signals')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          process_result: result.success ? 'success' : 'failed',
          error_message: result.error,
        })
        .eq('id', signalId);

      await supabase.rpc('log_audit_event', {
        p_event_type: result.success ? 'signal_processed' : 'signal_failed',
        p_category: 'signal',
        p_message: result.success
          ? `Signal processed: ${signal.action} ${signal.ticker}`
          : `Signal failed: ${result.error}`,
        p_details: { signal_id: signalId, result },
        p_signal_id: signalId,
        p_severity: result.success ? 'info' : 'warning',
      });

      return result;
    } catch (error) {
      console.error('[SignalProcessor] Error:', error);

      await supabase
        .from('trade_signals')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          process_result: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', signalId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleEntrySignal(signal: Signal): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    const side = signal.action === 'buy' ? 'long' : 'short';
    const pilotNumber = signal.pilot_number || 1;

    const pilotState = await this.pilotManager.getState(signal.ticker);

    if (pilotNumber > 1 && !pilotState) {
      return { success: false, error: `Cannot add P${pilotNumber} without active position` };
    }

    if (pilotState && pilotState.direction !== side) {
      return { success: false, error: 'Signal direction conflicts with active position' };
    }

    const positionSize = await this.calculatePositionSize(
      signal.ticker,
      pilotNumber
    );

    if (!positionSize || positionSize <= 0) {
      return { success: false, error: 'Invalid position size calculated' };
    }

    const riskCheck = await validateRisk(signal.ticker, positionSize, signal.action);

    if (!riskCheck.allowed) {
      return { success: false, error: `Risk check failed: ${riskCheck.reason}` };
    }

    const orderResult = await placeOrder({
      symbol: signal.ticker,
      side: signal.action as 'buy' | 'sell',
      orderType: 'market',
      quantity: positionSize,
      clientOrderId: `signal_${signal.id}_p${pilotNumber}`,
    });

    if (!orderResult.success) {
      return { success: false, error: orderResult.error };
    }

    await this.pilotManager.addPilot(signal.ticker, {
      number: pilotNumber as 1 | 2 | 3 | 4,
      entryPrice: signal.price,
      quantity: positionSize,
      direction: side,
    });

    return { success: true, orderId: orderResult.orderId };
  }

  private async handleExitSignal(signal: Signal): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
  }> {
    const pilotState = await this.pilotManager.getState(signal.ticker);

    if (!pilotState) {
      return { success: false, error: 'No active position to close' };
    }

    const closeSide = signal.action === 'close_long' ? 'sell' : 'buy';

    const orderResult = await placeOrder({
      symbol: signal.ticker,
      side: closeSide,
      orderType: 'market',
      quantity: pilotState.totalQuantity,
      reduceOnly: true,
      clientOrderId: `close_${signal.id}`,
    });

    if (!orderResult.success) {
      return { success: false, error: orderResult.error };
    }

    await this.pilotManager.clearState(signal.ticker);

    return { success: true, orderId: orderResult.orderId };
  }

  private async calculatePositionSize(
    symbol: string,
    pilotNumber: number
  ): Promise<number> {
    const supabase = await createClient();

    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['risk_per_pilot', 'max_position_size']);

    const riskPercent =
      Number(settings?.find((s) => s.key === 'risk_per_pilot')?.value) || 2;
    const maxPositionPercent =
      Number(settings?.find((s) => s.key === 'max_position_size')?.value) || 25;

    const balance = await getAccountBalance();
    if (!balance) return 0;

    const price = await this.getCurrentPrice(symbol);
    if (!price) return 0;

    const riskAmount = balance.equity * (riskPercent / 100);
    const positionValue = riskAmount;
    let quantity = positionValue / price;

    const maxPositionValue = balance.equity * (maxPositionPercent / 100);
    const maxQuantity = maxPositionValue / price;

    const pilotState = await this.pilotManager.getState(symbol);
    const currentQuantity = pilotState?.totalQuantity || 0;

    if (currentQuantity + quantity > maxQuantity) {
      quantity = Math.max(0, maxQuantity - currentQuantity);
    }

    return quantity;
  }

  private async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const client = getBitgetClient();
      const ticker = await client.getFuturesTicker({
        symbol,
        productType: 'USDT-FUTURES',
      } as never);

      const data = ticker.data as Array<{ lastPr?: string }>;
      return parseFloat(data?.[0]?.lastPr || '0');
    } catch {
      return null;
    }
  }

  async processUnprocessedSignals(): Promise<void> {
    const supabase = await createClient();

    const { data: signals } = await supabase
      .from('trade_signals')
      .select('id')
      .eq('processed', false)
      .order('received_at', { ascending: true })
      .limit(10);

    if (!signals?.length) return;

    for (const signal of signals) {
      await this.processSignal(signal.id);
    }
  }
}

let processorInstance: SignalProcessor | null = null;

export function getSignalProcessor(): SignalProcessor {
  if (!processorInstance) {
    processorInstance = new SignalProcessor();
  }
  return processorInstance;
}
