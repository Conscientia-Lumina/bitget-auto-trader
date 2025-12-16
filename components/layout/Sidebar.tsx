'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  LineChart,
  History,
  Settings,
  Bot,
  TrendingUp,
  AlertTriangle,
  Radar,
} from 'lucide-react';
import { BotStatusIndicator } from '@/components/bot/BotStatusIndicator';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Radar', href: '/radar', icon: Radar },
  { name: 'Positions', href: '/positions', icon: TrendingUp },
  { name: 'Trades', href: '/trades', icon: History },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Strategies', href: '/strategies', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-card border-r">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4 border-b">
          <AlertTriangle className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Pilot Trading</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bot Status Footer */}
        <div className="border-t p-4">
          <BotStatusIndicator />
        </div>
      </div>
    </aside>
  );
}
