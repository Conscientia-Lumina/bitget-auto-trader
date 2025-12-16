import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StrategyMonitor } from '@/components/strategy/StrategyMonitor';

export default function StrategiesPage() {
  return (
    <>
      <Header title="Strategies" />
      <div className="p-4 lg:p-6 space-y-6">
        {/* Live Strategy Monitor */}
        <StrategyMonitor />

        {/* Strategy Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Multi-Pilot Strategy v2</CardTitle>
                <CardDescription>
                  4-pilot scaling strategy with dynamic position sizing
                </CardDescription>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Risk per Pilot</div>
                <div className="text-2xl font-semibold mt-1">2%</div>
                <div className="text-xs text-muted-foreground mt-1">of account equity</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Max Position</div>
                <div className="text-2xl font-semibold mt-1">25%</div>
                <div className="text-xs text-muted-foreground mt-1">maximum exposure</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Daily Loss Limit</div>
                <div className="text-2xl font-semibold mt-1">5%</div>
                <div className="text-xs text-muted-foreground mt-1">auto-stop trading</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Max Drawdown</div>
                <div className="text-2xl font-semibold mt-1">15%</div>
                <div className="text-xs text-muted-foreground mt-1">kill switch trigger</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signal Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Signal Sources</CardTitle>
            <CardDescription>
              TradingView webhook integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">TradingView Alerts</div>
                  <div className="text-sm text-muted-foreground">
                    Webhook endpoint active
                  </div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Webhook URL</div>
                <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
                  {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app'}/api/webhook
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
