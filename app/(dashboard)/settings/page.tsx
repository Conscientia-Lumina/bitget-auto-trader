'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState } from 'react';
import { ApiStatusCheck } from '@/components/settings/ApiStatusCheck';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trading_enabled: settings.tradingEnabled,
          risk_per_pilot: settings.riskPerPilot,
          max_position_size: settings.maxPositionSize,
          daily_loss_limit: settings.dailyLossLimit,
          max_drawdown: settings.maxDrawdown,
          default_leverage: settings.defaultLeverage,
          default_symbol: settings.defaultSymbol,
        }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Header title="Settings" />
      <div className="p-4 lg:p-6 space-y-6">
        <ApiStatusCheck />

        <Card>
          <CardHeader>
            <CardTitle>Trading Settings</CardTitle>
            <CardDescription>
              Configure risk management and trading parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trading-enabled">Trading Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable automated trading
                </p>
              </div>
              <Switch
                id="trading-enabled"
                checked={settings.tradingEnabled}
                onCheckedChange={(checked) =>
                  settings.updateSetting('tradingEnabled', checked)
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="risk-per-pilot">Risk per Pilot (%)</Label>
                <Input
                  id="risk-per-pilot"
                  type="number"
                  step="0.1"
                  value={settings.riskPerPilot}
                  onChange={(e) =>
                    settings.updateSetting('riskPerPilot', parseFloat(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-position">Max Position Size (%)</Label>
                <Input
                  id="max-position"
                  type="number"
                  step="1"
                  value={settings.maxPositionSize}
                  onChange={(e) =>
                    settings.updateSetting('maxPositionSize', parseFloat(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-loss">Daily Loss Limit (%)</Label>
                <Input
                  id="daily-loss"
                  type="number"
                  step="0.5"
                  value={settings.dailyLossLimit}
                  onChange={(e) =>
                    settings.updateSetting('dailyLossLimit', parseFloat(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-drawdown">Max Drawdown (%)</Label>
                <Input
                  id="max-drawdown"
                  type="number"
                  step="1"
                  value={settings.maxDrawdown}
                  onChange={(e) =>
                    settings.updateSetting('maxDrawdown', parseFloat(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leverage">Default Leverage</Label>
                <Input
                  id="leverage"
                  type="number"
                  step="1"
                  value={settings.defaultLeverage}
                  onChange={(e) =>
                    settings.updateSetting('defaultLeverage', parseInt(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Default Symbol</Label>
                <Input
                  id="symbol"
                  value={settings.defaultSymbol}
                  onChange={(e) =>
                    settings.updateSetting('defaultSymbol', e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="outline" onClick={settings.resetToDefaults}>
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Exchange API credentials (set via environment variables)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Bitget API</span>
                <span className="text-green-500 text-sm">Configured</span>
              </div>
              <p className="text-sm text-muted-foreground">
                API credentials are configured via environment variables for security.
                Update them in your .env.local file or Vercel dashboard.
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Webhook Secret</span>
                <span className="text-green-500 text-sm">Configured</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The webhook secret is used to authenticate TradingView alerts.
                Keep this secret safe and update it periodically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
