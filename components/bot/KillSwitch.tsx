'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useBotStatus } from '@/hooks/useBotStatus';

export function KillSwitch() {
  const [closePositions, setClosePositions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { status: botStatus, refetch } = useBotStatus();

  const isKilled = botStatus?.isKilled || false;

  const handleKill = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/bot/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closePositions }),
      });
      await refetch();
    } catch (err) {
      console.error('Kill switch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/bot/reset', {
        method: 'POST',
      });
      await refetch();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-3">
      {isKilled ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full border-green-500 text-green-500 hover:bg-green-500/10">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Kill Switch
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Kill Switch</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the bot state and allow trading to resume. Make sure you&apos;ve reviewed
                any issues that caused the kill switch to be activated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={isResetting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isResetting ? 'Resetting...' : 'Reset Bot'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <AlertTriangle className="h-4 w-4 mr-2" />
              EMERGENCY KILL
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Emergency Kill Switch</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately stop the trading bot and cancel all open orders.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex items-center space-x-2 py-4">
              <Checkbox
                id="closePositions"
                checked={closePositions}
                onCheckedChange={(checked) => setClosePositions(checked as boolean)}
              />
              <label htmlFor="closePositions" className="text-sm">
                Also close all open positions (market orders)
              </label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleKill}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground"
              >
                {isLoading ? 'Executing...' : 'Activate Kill Switch'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isKilled && (
        <p className="text-xs text-center text-red-500 font-medium">
          ⚠️ Kill switch is active - trading is disabled
        </p>
      )}
    </div>
  );
}
