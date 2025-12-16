import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  tradingEnabled: boolean;
  riskPerPilot: number;
  maxPositionSize: number;
  dailyLossLimit: number;
  maxDrawdown: number;
  defaultLeverage: number;
  defaultSymbol: string;
}

interface SettingsState extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetToDefaults: () => void;
}

const defaultSettings: Settings = {
  tradingEnabled: true,
  riskPerPilot: 2,
  maxPositionSize: 25,
  dailyLossLimit: 5,
  maxDrawdown: 15,
  defaultLeverage: 10,
  defaultSymbol: 'BTCUSDT',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateSetting: (key, value) => set({ [key]: value }),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'trading-settings',
    }
  )
);
