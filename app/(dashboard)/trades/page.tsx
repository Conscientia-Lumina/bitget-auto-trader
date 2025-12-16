import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

async function getTrades() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('trades')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(100);

  return data || [];
}

export default async function TradesPage() {
  const trades = await getTrades();

  return (
    <>
      <Header title="Trade History" />
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No trades yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Symbol
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Side
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                        Quantity
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                        Price
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b last:border-0">
                        <td className="py-3 px-2 text-sm">
                          {format(new Date(trade.executed_at), 'MMM d, HH:mm')}
                        </td>
                        <td className="py-3 px-2 font-medium">{trade.symbol}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={
                              trade.side === 'buy' ? 'default' : 'destructive'
                            }
                          >
                            {trade.side.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          {trade.is_entry ? (
                            <Badge variant="outline">Entry</Badge>
                          ) : (
                            <Badge variant="secondary">Exit</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums">
                          {trade.quantity.toFixed(4)}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums">
                          ${trade.price.toFixed(2)}
                        </td>
                        <td
                          className={cn(
                            'py-3 px-2 text-right tabular-nums font-medium',
                            trade.realized_pnl != null
                              ? trade.realized_pnl >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                              : ''
                          )}
                        >
                          {trade.realized_pnl != null
                            ? `${trade.realized_pnl >= 0 ? '+' : ''}$${trade.realized_pnl.toFixed(2)}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
