import { create } from 'zustand';

interface BotState {
  isRunning: boolean;
  isPaused: boolean;
  isKilled: boolean;
  activePilots: number;
  currentSymbol: string | null;
  dailyPnl: number;
  setRunning: (isRunning: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  setKilled: (isKilled: boolean) => void;
  setActivePilots: (count: number) => void;
  setCurrentSymbol: (symbol: string | null) => void;
  setDailyPnl: (pnl: number) => void;
  reset: () => void;
}

const initialState = {
  isRunning: false,
  isPaused: false,
  isKilled: false,
  activePilots: 0,
  currentSymbol: null,
  dailyPnl: 0,
};

export const useBotStore = create<BotState>((set) => ({
  ...initialState,
  setRunning: (isRunning) => set({ isRunning }),
  setPaused: (isPaused) => set({ isPaused }),
  setKilled: (isKilled) => set({ isKilled }),
  setActivePilots: (activePilots) => set({ activePilots }),
  setCurrentSymbol: (currentSymbol) => set({ currentSymbol }),
  setDailyPnl: (dailyPnl) => set({ dailyPnl }),
  reset: () => set(initialState),
}));
