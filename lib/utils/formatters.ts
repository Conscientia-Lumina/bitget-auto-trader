import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, showSign: boolean = true): string {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatPnL(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatDate(date: string | Date, pattern: string = 'MMM d, yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatQuantity(value: number, symbol: string): string {
  const decimals = symbol.includes('BTC') ? 4 : 2;
  return value.toFixed(decimals);
}

export function formatPrice(value: number, symbol?: string): string {
  if (symbol?.includes('BTC')) {
    return value.toFixed(1);
  }
  if (value < 1) {
    return value.toFixed(4);
  }
  if (value < 100) {
    return value.toFixed(2);
  }
  return value.toFixed(1);
}
