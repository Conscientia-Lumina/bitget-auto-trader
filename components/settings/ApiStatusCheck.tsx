'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ApiStatus {
  name: string;
  status: 'checking' | 'connected' | 'error' | 'unknown';
  message?: string;
  latency?: number;
  details?: Record<string, unknown>;
}

export function ApiStatusCheck() {
  const [statuses, setStatuses] = useState<ApiStatus[]>([
    { name: 'Bitget API', status: 'unknown' },
    { name: 'Supabase Database', status: 'unknown' },
    { name: 'Webhook Endpoint', status: 'unknown' },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const checkBitgetApi = async (): Promise<ApiStatus> => {
    const start = Date.now();
    try {
      const res = await fetch('/api/exchange/balance');
      const data = await res.json();
      const latency = Date.now() - start;
      
      if (data.success) {
        return {
          name: 'Bitget API',
          status: 'connected',
          message: `Balance: $${data.data.equity?.toFixed(2) || '0.00'}`,
          latency,
          details: data.data,
        };
      } else {
        return {
          name: 'Bitget API',
          status: 'error',
          message: data.error || 'Failed to connect',
          latency,
        };
      }
    } catch (err) {
      return {
        name: 'Bitget API',
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
        latency: Date.now() - start,
      };
    }
  };

  const checkSupabase = async (): Promise<ApiStatus> => {
    const start = Date.now();
    try {
      const res = await fetch('/api/bot/status');
      const data = await res.json();
      const latency = Date.now() - start;
      
      if (data.success !== false) {
        return {
          name: 'Supabase Database',
          status: 'connected',
          message: 'Database connected',
          latency,
          details: { botRunning: data.isRunning },
        };
      } else {
        return {
          name: 'Supabase Database',
          status: 'error',
          message: data.error || 'Failed to connect',
          latency,
        };
      }
    } catch (err) {
      return {
        name: 'Supabase Database',
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection failed',
        latency: Date.now() - start,
      };
    }
  };

  const checkWebhook = async (): Promise<ApiStatus> => {
    const start = Date.now();
    try {
      // Just check if the endpoint responds (OPTIONS or a test)
      const res = await fetch('/api/webhook', {
        method: 'OPTIONS',
      });
      const latency = Date.now() - start;
      
      return {
        name: 'Webhook Endpoint',
        status: 'connected',
        message: 'Endpoint ready',
        latency,
      };
    } catch (err) {
      return {
        name: 'Webhook Endpoint',
        status: 'error',
        message: err instanceof Error ? err.message : 'Endpoint unavailable',
        latency: Date.now() - start,
      };
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    setStatuses([
      { name: 'Bitget API', status: 'checking' },
      { name: 'Supabase Database', status: 'checking' },
      { name: 'Webhook Endpoint', status: 'checking' },
    ]);

    const results = await Promise.all([
      checkBitgetApi(),
      checkSupabase(),
      checkWebhook(),
    ]);

    setStatuses(results);
    setIsChecking(false);
  };

  const getStatusIcon = (status: ApiStatus['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ApiStatus['status']) => {
    switch (status) {
      case 'checking':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Checking...</Badge>;
      case 'connected':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Connected</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Health Check</CardTitle>
            <CardDescription>
              Check the status of all connected services
            </CardDescription>
          </div>
          <Button onClick={runHealthCheck} disabled={isChecking} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Run Check'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuses.map((api) => (
          <div
            key={api.name}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(api.status)}
              <div>
                <p className="font-medium">{api.name}</p>
                {api.message && (
                  <p className="text-sm text-muted-foreground">{api.message}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {api.latency && (
                <span className="text-xs text-muted-foreground">
                  {api.latency}ms
                </span>
              )}
              {getStatusBadge(api.status)}
            </div>
          </div>
        ))}

        {statuses.every(s => s.status === 'unknown') && (
          <p className="text-center text-muted-foreground py-4">
            Click &quot;Run Check&quot; to test API connections
          </p>
        )}
      </CardContent>
    </Card>
  );
}
