'use client';

import { useQuery } from '@tanstack/react-query';

export interface BitgetPosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  sizeUSDT: number;
  avgEntryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  leverage: number;
  marginMode: 'crossed' | 'isolated';
  liquidationPrice: number;
  margin: number;
  marginCoin: string;
  achievedProfits: number;
  openTime: number;
  source: 'bot' | 'manual'; // NEW: Track if position is from bot or manual trading
}

async function fetchPositions(): Promise<BitgetPosition[]> {
  const response = await fetch('/api/exchange/positions');
  if (!response.ok) {
    throw new Error('Failed to fetch positions');
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch positions');
  }
  return data.data || [];
}

export function useRealtimePositions() {
  const { data: positions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['bitget-positions'],
    queryFn: fetchPositions,
    refetchInterval: 5000, // Refresh every 5 seconds for near real-time
    staleTime: 3000,
  });

  return { 
    positions, 
    isLoading, 
    error,
    refetch,
  };
}
