'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PilotStatusProps {
  position: {
    pilot_count: number;
    pilot_1_entry?: number | null;
    pilot_1_pnl?: number | null;
    pilot_2_entry?: number | null;
    pilot_2_pnl?: number | null;
    pilot_3_entry?: number | null;
    pilot_3_pnl?: number | null;
    pilot_4_entry?: number | null;
    pilot_4_pnl?: number | null;
  } | null;
}

export function PilotStatus({ position }: PilotStatusProps) {
  const pilots = [
    { num: 1, entry: position?.pilot_1_entry, pnl: position?.pilot_1_pnl },
    { num: 2, entry: position?.pilot_2_entry, pnl: position?.pilot_2_pnl },
    { num: 3, entry: position?.pilot_3_entry, pnl: position?.pilot_3_pnl },
    { num: 4, entry: position?.pilot_4_entry, pnl: position?.pilot_4_pnl },
  ];

  const activePilots = position?.pilot_count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pilot Status</span>
          <span className="text-sm font-normal text-muted-foreground">
            {activePilots}/4 Active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={(activePilots / 4) * 100} className="mb-4" />

        <div className="grid grid-cols-4 gap-2">
          {pilots.map((pilot) => {
            const isActive = pilot.entry != null;
            return (
              <div
                key={pilot.num}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors',
                  isActive ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  P{pilot.num}
                </div>
                {isActive ? (
                  <>
                    <div className="text-sm font-semibold mt-1">
                      ${pilot.entry?.toFixed(0)}
                    </div>
                    <div
                      className={cn(
                        'text-xs mt-1',
                        (pilot.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {(pilot.pnl || 0) >= 0 ? '+' : ''}
                      {pilot.pnl?.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground mt-2">
                    Waiting...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
