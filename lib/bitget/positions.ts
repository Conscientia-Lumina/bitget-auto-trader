import { getBitgetClient } from './client';
import crypto from 'crypto';

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;           // Position size in contracts
  sizeUSDT: number;       // Position value in USDT
  avgEntryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  leverage: number;
  marginMode: 'crossed' | 'isolated';
  liquidationPrice: number;
  margin: number;
  marginCoin: string;
  achievedProfits: number; // Realized PnL
  openTime: number;
  source: 'bot' | 'manual'; // Track if position is from bot or manual trading
}

// Direct API call to bypass potential library issues  
async function callBitgetAPI(endpoint: string, params: Record<string, string> = {}) {
  const apiKey = process.env.BITGET_API_KEY!;
  const apiSecret = process.env.BITGET_API_SECRET!;
  const passphrase = process.env.BITGET_API_PASSPHRASE!;
  
  const timestamp = Date.now().toString();
  const queryString = new URLSearchParams(params).toString();
  const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
  
  // Create signature: timestamp + method + requestPath + body
  const preHash = timestamp + 'GET' + requestPath;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(preHash)
    .digest('base64');
  
  const url = `https://api.bitget.com${requestPath}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
      'locale': 'en-US',
    },
  });
  
  return response.json();
}

export async function getPositions(): Promise<Position[]> {
  try {
    console.log('[Bitget] Fetching positions...');
    
    // GET /api/v2/mix/position/all-position
    const result = await callBitgetAPI('/api/v2/mix/position/all-position', {
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    });

    console.log('[Bitget] Positions response:', JSON.stringify(result, null, 2));

    if (result.code !== '00000' || !result.data) {
      console.error('[Bitget] Positions error:', result.msg);
      return [];
    }

    // The response has positions nested in data array
    const rawPositions = result.data as Array<{
      symbol: string;
      holdSide: string;
      total: string;
      available: string;
      openPriceAvg: string;
      markPrice: string;
      unrealizedPL: string;
      leverage: string;
      marginMode: string;
      liquidationPrice?: string;
      margin: string;
      marginCoin: string;
      achievedProfits: string;
      cTime: string;
    }>;

    return rawPositions
      .filter((p) => parseFloat(p.total) > 0)
      .map((p) => {
        const size = parseFloat(p.total);
        const markPrice = parseFloat(p.markPrice);
        const entryPrice = parseFloat(p.openPriceAvg);
        const unrealizedPnl = parseFloat(p.unrealizedPL);
        const margin = parseFloat(p.margin);
        
        // Calculate PnL percentage based on margin
        const unrealizedPnlPercent = margin > 0 ? (unrealizedPnl / margin) * 100 : 0;

        return {
          symbol: p.symbol,
          side: p.holdSide.toLowerCase() as 'long' | 'short',
          size,
          sizeUSDT: size * markPrice,
          avgEntryPrice: entryPrice,
          markPrice,
          unrealizedPnl,
          unrealizedPnlPercent,
          leverage: parseInt(p.leverage),
          marginMode: p.marginMode.toLowerCase() as 'crossed' | 'isolated',
          liquidationPrice: parseFloat(p.liquidationPrice || '0'),
          margin,
          marginCoin: p.marginCoin,
          achievedProfits: parseFloat(p.achievedProfits || '0'),
          openTime: parseInt(p.cTime),
          source: 'manual' as const, // Default to manual, API route will override if in Supabase
        };
      });
  } catch (error) {
    console.error('[Bitget] Get positions error:', error);
    return [];
  }
}

export async function getPosition(symbol: string): Promise<Position | null> {
  const positions = await getPositions();
  return positions.find((p) => p.symbol === symbol) || null;
}

// Direct API call for POST requests
async function callBitgetPostAPI(endpoint: string, body: Record<string, unknown> = {}) {
  const apiKey = process.env.BITGET_API_KEY!;
  const apiSecret = process.env.BITGET_API_SECRET!;
  const passphrase = process.env.BITGET_API_PASSPHRASE!;
  
  const timestamp = Date.now().toString();
  const bodyString = JSON.stringify(body);
  
  // Create signature: timestamp + method + requestPath + body
  const preHash = timestamp + 'POST' + endpoint + bodyString;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(preHash)
    .digest('base64');
  
  const url = `https://api.bitget.com${endpoint}`;
  
  console.log('[Bitget] POST:', url, body);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
      'locale': 'en-US',
    },
    body: bodyString,
  });
  
  const data = await response.json();
  console.log('[Bitget] Response:', JSON.stringify(data, null, 2));
  return data;
}

export async function closePosition(
  symbol: string,
  side: 'long' | 'short',
  size: number,
  marginMode: 'crossed' | 'isolated' = 'isolated'
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    // HEDGE MODE in Bitget:
    // Close long: side='buy', tradeSide='close' (buy side = long position direction)
    // Close short: side='sell', tradeSide='close' (sell side = short position direction)
    // The 'side' parameter represents the POSITION DIRECTION, not the trading action!
    const orderSide = side === 'long' ? 'buy' : 'sell';
    
    console.log(`[Bitget] Closing position: symbol=${symbol}, holdSide=${side}, orderSide=${orderSide}, size=${size}, marginMode=${marginMode}`);
    
    // POST /api/v2/mix/order/place-order
    const result = await callBitgetPostAPI('/api/v2/mix/order/place-order', {
      symbol,
      productType: 'USDT-FUTURES',
      marginMode,
      marginCoin: 'USDT',
      size: size.toString(),
      side: orderSide,       // 'buy' for long position, 'sell' for short position
      tradeSide: 'close',    // Indicates we're closing a position (required in hedge mode)
      orderType: 'market',
    });

    if (result.code !== '00000') {
      console.error('[Bitget] Close position error:', result.msg);
      return { success: false, error: result.msg };
    }

    return { 
      success: true, 
      orderId: result.data?.orderId 
    };
  } catch (error) {
    console.error('[Bitget] Close position error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function closeAllPositions(): Promise<{
  success: boolean;
  closed: number;
  error?: string;
}> {
  try {
    const positions = await getPositions();

    if (positions.length === 0) {
      return { success: true, closed: 0 };
    }

    let closed = 0;
    for (const position of positions) {
      const result = await closePosition(
        position.symbol,
        position.side,
        position.size
      );
      if (result.success) closed++;
    }

    return { success: true, closed };
  } catch (error) {
    return {
      success: false,
      closed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function setLeverage(
  symbol: string,
  leverage: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getBitgetClient();

    await client.setFuturesLeverage({
      symbol,
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
      leverage: leverage.toString(),
      holdSide: 'long',
    } as never);

    await client.setFuturesLeverage({
      symbol,
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
      leverage: leverage.toString(),
      holdSide: 'short',
    } as never);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
