import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/webhook')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const current = rateLimitStore.get(ip);

  if (current) {
    if (now - current.timestamp < windowMs) {
      if (current.count >= maxRequests) {
        console.warn(`[RateLimit] IP ${ip} exceeded limit`);
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      current.count++;
    } else {
      rateLimitStore.set(ip, { count: 1, timestamp: now });
    }
  } else {
    rateLimitStore.set(ip, { count: 1, timestamp: now });
  }

  if (rateLimitStore.size > 1000) {
    const entries = Array.from(rateLimitStore.entries());
    for (const [key, value] of entries) {
      if (now - value.timestamp > windowMs * 5) {
        rateLimitStore.delete(key);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/webhook/:path*',
};
