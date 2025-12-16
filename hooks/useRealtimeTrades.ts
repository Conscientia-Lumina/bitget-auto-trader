'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Trade = Database['public']['Tables']['trades']['Row'];

export function useRealtimeTrades(limit: number = 10) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchTrades = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('trades')
          .select('*')
          .order('executed_at', { ascending: false })
          .limit(limit);
        if (data) setTrades(data);
      } catch {
        // Silently handle error
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrades();

    // Real-time subscription
    const channel = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
        },
        (payload) => {
          setTrades((prev) => {
            const newTrades = [payload.new as Trade, ...prev];
            return newTrades.slice(0, limit);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, limit]);

  return { trades, isLoading };
}
