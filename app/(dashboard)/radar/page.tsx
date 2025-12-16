'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRealtimePositions } from '@/hooks/useRealtimePositions';
import { useRealtimeTrades } from '@/hooks/useRealtimeTrades';
import { TrendingUp, TrendingDown, Clock, DollarSign, Settings2, Save, RotateCcw } from 'lucide-react';

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => void;
    };
  }
}

// Chart settings interface
interface ChartSettings {
  symbol: string;
  interval: string;
  style: string;
  studies: string[];
  timezone: string;
}

const DEFAULT_SETTINGS: ChartSettings = {
  symbol: 'BITGET:BTCUSDT.P',
  interval: '15',
  style: '1', // 1 = candles, 2 = line, 3 = area, 4 = bars
  studies: ['Volume@tv-basicstudies'],
  timezone: 'Etc/UTC',
};

const STORAGE_KEY = 'radar-chart-settings';

// Available options
const INTERVALS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' },
];

const CHART_STYLES = [
  { value: '1', label: 'Candles' },
  { value: '2', label: 'Line' },
  { value: '3', label: 'Area' },
  { value: '4', label: 'Bars' },
  { value: '5', label: 'Hollow Candles' },
  { value: '9', label: 'Heikin Ashi' },
];

const AVAILABLE_STUDIES = [
  { value: 'Volume@tv-basicstudies', label: 'Volume' },
  { value: 'RSI@tv-basicstudies', label: 'RSI' },
  { value: 'MACD@tv-basicstudies', label: 'MACD' },
  { value: 'BB@tv-basicstudies', label: 'Bollinger Bands' },
  { value: 'EMA@tv-basicstudies', label: 'EMA' },
  { value: 'MASimple@tv-basicstudies', label: 'SMA' },
  { value: 'VWAP@tv-basicstudies', label: 'VWAP' },
];

const SYMBOLS = [
  { value: 'BITGET:BTCUSDT.P', label: 'BTC/USDT' },
  { value: 'BITGET:ETHUSDT.P', label: 'ETH/USDT' },
  { value: 'BITGET:SOLUSDT.P', label: 'SOL/USDT' },
  { value: 'BITGET:XRPUSDT.P', label: 'XRP/USDT' },
  { value: 'BITGET:DOGEUSDT.P', label: 'DOGE/USDT' },
];

// Load settings from localStorage
function loadSettings(): ChartSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load chart settings:', e);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings: ChartSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save chart settings:', e);
  }
}

function ChartSettingsPanel({ 
  settings, 
  onSettingsChange, 
  onSave,
  onReset,
  hasChanges 
}: { 
  settings: ChartSettings;
  onSettingsChange: (settings: ChartSettings) => void;
  onSave: () => void;
  onReset: () => void;
  hasChanges: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleStudy = (study: string) => {
    const newStudies = settings.studies.includes(study)
      ? settings.studies.filter(s => s !== study)
      : [...settings.studies, study];
    onSettingsChange({ ...settings, studies: newStudies });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        Chart Settings
        {hasChanges && <span className="w-2 h-2 bg-yellow-500 rounded-full" />}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-card border rounded-lg shadow-lg p-4 space-y-4">
          {/* Symbol */}
          <div>
            <label className="text-sm font-medium mb-2 block">Symbol</label>
            <div className="flex flex-wrap gap-1">
              {SYMBOLS.map(s => (
                <button
                  key={s.value}
                  onClick={() => onSettingsChange({ ...settings, symbol: s.value })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    settings.symbol === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-sm font-medium mb-2 block">Timeframe</label>
            <div className="flex flex-wrap gap-1">
              {INTERVALS.map(i => (
                <button
                  key={i.value}
                  onClick={() => onSettingsChange({ ...settings, interval: i.value })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    settings.interval === i.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Style */}
          <div>
            <label className="text-sm font-medium mb-2 block">Chart Style</label>
            <div className="flex flex-wrap gap-1">
              {CHART_STYLES.map(s => (
                <button
                  key={s.value}
                  onClick={() => onSettingsChange({ ...settings, style: s.value })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    settings.style === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Indicators */}
          <div>
            <label className="text-sm font-medium mb-2 block">Indicators</label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_STUDIES.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleStudy(s.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    settings.studies.includes(s.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" onClick={onSave} className="flex-1 gap-1">
              <Save className="h-3 w-3" />
              Save & Apply
            </Button>
            <Button size="sm" variant="outline" onClick={onReset} className="gap-1">
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Settings are saved locally and persist across sessions.
          </p>
        </div>
      )}
    </div>
  );
}

function TradingViewChart({ settings }: { settings: ChartSettings }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<unknown>(null);

  useEffect(() => {
    // Clean up previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (containerRef.current && window.TradingView) {
        widgetRef.current = new window.TradingView.widget({
          symbol: settings.symbol,
          interval: settings.interval,
          timezone: settings.timezone,
          theme: 'dark',
          style: settings.style,
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview_chart',
          width: '100%',
          height: '100%',
          autosize: true,
          save_image: false,
          hide_side_toolbar: false,
          studies: settings.studies,
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [settings]);

  return (
    <div 
      id="tradingview_chart" 
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ minHeight: '400px', maxHeight: '100%' }}
    />
  );
}

function PositionsPanel() {
  const { positions, isLoading } = useRealtimePositions();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading positions...
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No open positions
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {positions.map((position, idx) => {
        const isLong = position.side === 'long';
        const pnl = position.unrealizedPnl || 0;
        const pnlPercent = position.unrealizedPnlPercent || 0;
        
        return (
          <div
            key={`${position.symbol}-${position.side}-${idx}`}
            className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={isLong ? 'default' : 'destructive'} className="text-xs">
                  {isLong ? 'LONG' : 'SHORT'}
                </Badge>
                <span className="font-medium">{position.symbol.replace('USDT', '')}</span>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1 ${position.source === 'bot' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-yellow-500/50 text-yellow-500'}`}
                >
                  {position.source === 'bot' ? 'BOT' : 'MAN'}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {position.leverage}x
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Entry:</span>
                <span className="ml-1 font-mono">${position.avgEntryPrice.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <span className="ml-1 font-mono">${position.sizeUSDT.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className={`flex items-center gap-1 ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="font-medium">
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentTradesPanel() {
  const { trades, isLoading } = useRealtimeTrades();

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Loading trades...
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No recent trades
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.slice(0, 5).map((trade) => {
        const isLong = trade.side === 'buy';
        const pnl = trade.realized_pnl || 0;
        
        return (
          <div
            key={trade.id}
            className="flex items-center justify-between p-2 rounded border text-sm"
          >
            <div className="flex items-center gap-2">
              <Badge variant={isLong ? 'default' : 'destructive'} className="text-xs px-1.5 py-0">
                {isLong ? 'L' : 'S'}
              </Badge>
              <span className="font-mono text-xs">${trade.price.toLocaleString()}</span>
            </div>
            <div className={`font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LivePrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number>(0);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.bitget.com/api/v2/mix/market/ticker?symbol=BTCUSDT&productType=USDT-FUTURES');
        const data = await res.json();
        if (data.data?.[0]) {
          setPrice(parseFloat(data.data[0].lastPr));
          setChange24h(parseFloat(data.data[0].change24h || 0) * 100);
        }
      } catch (err) {
        console.error('Failed to fetch price:', err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-muted-foreground" />
        <span className="text-2xl font-bold font-mono">
          {price ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
        </span>
      </div>
      {change24h !== 0 && (
        <Badge variant={change24h >= 0 ? 'default' : 'destructive'} className="text-sm">
          {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
        </Badge>
      )}
    </div>
  );
}

export default function RadarPage() {
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setSavedSettings(loaded);
    setIsLoaded(true);
  }, []);

  const handleSave = useCallback(() => {
    saveSettings(settings);
    setSavedSettings(settings);
  }, [settings]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setSavedSettings(DEFAULT_SETTINGS);
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Don't render chart until settings are loaded from localStorage
  if (!isLoaded) {
    return (
      <>
        <Header title="Radar" />
        <div className="p-4 lg:p-6 flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading chart settings...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Radar" />
      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Chart - Takes up 3 columns on XL screens */}
          <div className="xl:col-span-3">
            <Card className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span>{SYMBOLS.find(s => s.value === savedSettings.symbol)?.label || 'BTC/USDT'} Perpetual</span>
                      <span className="text-sm font-normal text-muted-foreground">Bitget</span>
                      <Badge variant="outline" className="text-xs">
                        {INTERVALS.find(i => i.value === savedSettings.interval)?.label || '15m'}
                      </Badge>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-4">
                    <LivePrice />
                    <ChartSettingsPanel 
                      settings={settings}
                      onSettingsChange={setSettings}
                      onSave={handleSave}
                      onReset={handleReset}
                      hasChanges={hasChanges}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <TradingViewChart settings={savedSettings} />
              </CardContent>
            </Card>
          </div>

          {/* Side Panel - Positions & Trades */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PositionsPanel />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecentTradesPanel />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
