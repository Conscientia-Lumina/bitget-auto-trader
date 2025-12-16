'use client';

import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { LiveIndicator } from './LiveIndicator';
import { StrategyStatusCompact } from '@/components/strategy/StrategyStatusCompact';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MobileNav } from './MobileNav';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Main navigation for Pilot Trading</SheetDescription>
          </VisuallyHidden>
          <MobileNav />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <h1 className="text-xl font-semibold">{title}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Strategy Status - visible on larger screens */}
        <div className="hidden md:flex items-center border-r pr-4 mr-2">
          <StrategyStatusCompact />
        </div>
        <LiveIndicator />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
