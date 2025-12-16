import { getBitgetClient } from './client';
import crypto from 'crypto';

export interface AccountBalance {
  // Core balances
  equity: number;
  available: number;
  usdtEquity: number;
  btcEquity: number;
  
  // Margin info
  crossedMaxAvailable: number;
  isolatedMaxAvailable: number;
  maxTransferOut: number;
  isolatedMargin: number;
  crossedMargin: number;
  
  // PnL
  unrealizedPnl: number;
  crossedUnrealizedPL: number;
  isolatedUnrealizedPL: number;
  
  // Risk
  crossedRiskRate: number;
  
  // Other
  locked: number;
  coupon: number;
  assetMode: string;
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
  
  console.log('[Bitget] Calling:', url);
  
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
  
  const data = await response.json();
  console.log('[Bitget] Response:', JSON.stringify(data, null, 2));
  return data;
}

export async function getAccountBalance(): Promise<AccountBalance | null> {
  try {
    console.log('[Bitget] Fetching account balance...');
    
    // Try the account list endpoint instead - might have different permission requirements
    // GET /api/v2/mix/account/accounts
    const result = await callBitgetAPI('/api/v2/mix/account/accounts', {
      productType: 'USDT-FUTURES',
    });

    console.log('[Bitget] Full response:', JSON.stringify(result, null, 2));

    if (result.code !== '00000' || !result.data) {
      console.error('[Bitget] API error:', result);
      throw new Error(result.msg || 'API error');
    }

    // Find USDT account from the list
    const accounts = Array.isArray(result.data) ? result.data : [result.data];
    const usdtAccount = accounts.find((acc: Record<string, string>) => 
      acc.marginCoin === 'USDT'
    ) || accounts[0];

    if (!usdtAccount) {
      return {
        equity: 0,
        available: 0,
        usdtEquity: 0,
        btcEquity: 0,
        crossedMaxAvailable: 0,
        isolatedMaxAvailable: 0,
        maxTransferOut: 0,
        isolatedMargin: 0,
        crossedMargin: 0,
        unrealizedPnl: 0,
        crossedUnrealizedPL: 0,
        isolatedUnrealizedPL: 0,
        crossedRiskRate: 0,
        locked: 0,
        coupon: 0,
        assetMode: 'single',
      };
    }

    return {
      equity: parseFloat(usdtAccount.accountEquity || '0'),
      available: parseFloat(usdtAccount.available || '0'),
      usdtEquity: parseFloat(usdtAccount.usdtEquity || '0'),
      btcEquity: parseFloat(usdtAccount.btcEquity || '0'),
      crossedMaxAvailable: parseFloat(usdtAccount.crossedMaxAvailable || '0'),
      isolatedMaxAvailable: parseFloat(usdtAccount.isolatedMaxAvailable || '0'),
      maxTransferOut: parseFloat(usdtAccount.maxTransferOut || '0'),
      isolatedMargin: parseFloat(usdtAccount.isolatedMargin || '0'),
      crossedMargin: parseFloat(usdtAccount.crossedMargin || '0'),
      unrealizedPnl: parseFloat(usdtAccount.unrealizedPL || '0'),
      crossedUnrealizedPL: parseFloat(usdtAccount.crossedUnrealizedPL || '0'),
      isolatedUnrealizedPL: parseFloat(usdtAccount.isolatedUnrealizedPL || '0'),
      crossedRiskRate: parseFloat(usdtAccount.crossedRiskRate || '0'),
      locked: parseFloat(usdtAccount.locked || '0'),
      coupon: parseFloat(usdtAccount.coupon || '0'),
      assetMode: usdtAccount.assetMode || 'single',
    };
  } catch (error) {
    console.error('[Bitget] Get account balance error:', error);
    throw error;
  }
}

export async function getTradeHistory(
  symbol?: string,
  limit: number = 100
): Promise<Array<Record<string, unknown>>> {
  try {
    const client = getBitgetClient();

    const params: Record<string, string> = {
      productType: 'USDT-FUTURES',
      limit: limit.toString(),
    };
    if (symbol) params.symbol = symbol;

    const result = await client.getFuturesFills(params as never);
    const data = result.data as unknown as { fillList?: Array<Record<string, unknown>> };
    return data?.fillList || [];
  } catch (error) {
    console.error('[Bitget] Get trade history error:', error);
    return [];
  }
}
