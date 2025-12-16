'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  isKilled: boolean;
  activePilots: number;
  currentSymbol: string | null;
  dailyPnl: number;
  lastSignalAt: string | null;
}

export function useBotStatus() {
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useQuery<BotStatus>({
    queryKey: ['bot-status'],
    queryFn: async () => {
      const res = await fetch('/api/bot/status');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/bot/start', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/bot/stop', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
    },
  });

  return {
    status,
    isLoading,
    refetch,
    start: startMutation.mutate,
    stop: stopMutation.mutate,
  };
}
