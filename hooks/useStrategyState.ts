'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { StrategyState } from '@/types/strategy';

const POLL_INTERVAL = 5000; // 5 seconds

export function useStrategyState() {
  const [state, setState] = useState<StrategyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch('/api/strategy/status');
      if (!response.ok) {
        throw new Error('Failed to fetch strategy status');
      }
      const data = await response.json();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();

    // Poll for updates
    const interval = setInterval(fetchState, POLL_INTERVAL);

    // Also subscribe to realtime updates for bot_state
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('strategy-state')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_state',
        },
        () => {
          // Refetch when bot_state changes
          fetchState();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
        },
        () => {
          // Refetch when positions change
          fetchState();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_signals',
        },
        () => {
          // Refetch when new signal arrives
          fetchState();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchState]);

  return { state, loading, error, refetch: fetchState };
}
