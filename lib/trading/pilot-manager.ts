import { createClient } from '@/lib/supabase/server';
import type { PilotManagerState, Pilot, PilotNumber } from '@/types/trading';

const DEFAULT_PILOT: Pilot = {
  number: 1,
  state: 'inactive',
  entryPrice: null,
  quantity: null,
  stopLoss: null,
  takeProfit: null,
  pnl: 0,
  pnlPercent: 0,
};

export class PilotManager {
  async getState(symbol: string): Promise<PilotManagerState | null> {
    try {
      const supabase = await createClient();

      const { data: position } = await supabase
        .from('positions')
        .select('*')
        .eq('symbol', symbol)
        .eq('status', 'open')
        .single();

      if (!position) return null;

      const pilots: [Pilot, Pilot, Pilot, Pilot] = [
        {
          number: 1,
          state: position.pilot_1_entry ? 'active' : 'inactive',
          entryPrice: position.pilot_1_entry,
          quantity: position.pilot_1_qty,
          stopLoss: null,
          takeProfit: null,
          pnl: position.pilot_1_pnl || 0,
          pnlPercent: 0,
        },
        {
          number: 2,
          state: position.pilot_2_entry ? 'active' : 'inactive',
          entryPrice: position.pilot_2_entry,
          quantity: position.pilot_2_qty,
          stopLoss: null,
          takeProfit: null,
          pnl: position.pilot_2_pnl || 0,
          pnlPercent: 0,
        },
        {
          number: 3,
          state: position.pilot_3_entry ? 'active' : 'inactive',
          entryPrice: position.pilot_3_entry,
          quantity: position.pilot_3_qty,
          stopLoss: null,
          takeProfit: null,
          pnl: position.pilot_3_pnl || 0,
          pnlPercent: 0,
        },
        {
          number: 4,
          state: position.pilot_4_entry ? 'active' : 'inactive',
          entryPrice: position.pilot_4_entry,
          quantity: position.pilot_4_qty,
          stopLoss: null,
          takeProfit: null,
          pnl: position.pilot_4_pnl || 0,
          pnlPercent: 0,
        },
      ];

      return {
        symbol,
        direction: position.side as 'long' | 'short',
        pilots,
        totalQuantity: position.quantity,
        avgEntryPrice: position.avg_entry_price,
        masterStopLoss: position.stop_loss,
        masterTakeProfit: position.take_profit,
      };
    } catch (error) {
      console.error('[PilotManager] Get state error:', error);
      return null;
    }
  }

  async addPilot(
    symbol: string,
    pilot: {
      number: PilotNumber;
      entryPrice: number;
      quantity: number;
      direction: 'long' | 'short';
    }
  ): Promise<boolean> {
    try {
      const supabase = await createClient();

      // Check if position exists
      const { data: existingPosition } = await supabase
        .from('positions')
        .select('*')
        .eq('symbol', symbol)
        .eq('status', 'open')
        .single();

      if (existingPosition) {
        // Update existing position
        const pilotKey = `pilot_${pilot.number}` as const;
        const updates: Record<string, number | null> = {
          [`${pilotKey}_entry`]: pilot.entryPrice,
          [`${pilotKey}_qty`]: pilot.quantity,
          [`${pilotKey}_pnl`]: 0,
        };

        // Recalculate average entry and total quantity
        const pilots = [
          { entry: existingPosition.pilot_1_entry, qty: existingPosition.pilot_1_qty },
          { entry: existingPosition.pilot_2_entry, qty: existingPosition.pilot_2_qty },
          { entry: existingPosition.pilot_3_entry, qty: existingPosition.pilot_3_qty },
          { entry: existingPosition.pilot_4_entry, qty: existingPosition.pilot_4_qty },
        ];
        pilots[pilot.number - 1] = { entry: pilot.entryPrice, qty: pilot.quantity };

        const activePilots = pilots.filter(p => p.entry !== null);
        const totalQty = activePilots.reduce((sum, p) => sum + (p.qty || 0), 0);
        const avgEntry = totalQty > 0
          ? activePilots.reduce((sum, p) => sum + (p.entry || 0) * (p.qty || 0), 0) / totalQty
          : 0;

        await supabase
          .from('positions')
          .update({
            ...updates,
            quantity: totalQty,
            avg_entry_price: avgEntry,
            pilot_count: activePilots.length,
          })
          .eq('id', existingPosition.id);

      } else {
        // Create new position
        await supabase.from('positions').insert({
          symbol,
          side: pilot.direction,
          status: 'open',
          quantity: pilot.quantity,
          avg_entry_price: pilot.entryPrice,
          pilot_count: 1,
          [`pilot_${pilot.number}_entry`]: pilot.entryPrice,
          [`pilot_${pilot.number}_qty`]: pilot.quantity,
          [`pilot_${pilot.number}_pnl`]: 0,
        });
      }

      // Update bot state
      await supabase
        .from('bot_state')
        .update({
          current_symbol: symbol,
          current_direction: pilot.direction,
          active_pilots: existingPosition ? existingPosition.pilot_count + 1 : 1,
          last_trade_at: new Date().toISOString(),
        })
        .eq('id', 1);

      return true;
    } catch (error) {
      console.error('[PilotManager] Add pilot error:', error);
      return false;
    }
  }

  async clearState(symbol: string): Promise<boolean> {
    try {
      const supabase = await createClient();

      await supabase
        .from('positions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('symbol', symbol)
        .eq('status', 'open');

      await supabase
        .from('bot_state')
        .update({
          current_symbol: null,
          current_direction: null,
          active_pilots: 0,
        })
        .eq('id', 1);

      return true;
    } catch (error) {
      console.error('[PilotManager] Clear state error:', error);
      return false;
    }
  }

  async updatePilotPnl(
    symbol: string,
    pilotNumber: PilotNumber,
    pnl: number
  ): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase
        .from('positions')
        .update({ [`pilot_${pilotNumber}_pnl`]: pnl })
        .eq('symbol', symbol)
        .eq('status', 'open');
    } catch (error) {
      console.error('[PilotManager] Update PnL error:', error);
    }
  }
}

let instance: PilotManager | null = null;

export function getPilotManager(): PilotManager {
  if (!instance) {
    instance = new PilotManager();
  }
  return instance;
}
