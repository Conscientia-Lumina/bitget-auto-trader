import { RestClientV2 } from 'bitget-api';

let client: RestClientV2 | null = null;

export function getBitgetClient(): RestClientV2 {
  if (!client) {
    const apiKey = process.env.BITGET_API_KEY;
    const apiSecret = process.env.BITGET_API_SECRET;
    const apiPassphrase = process.env.BITGET_API_PASSPHRASE;

    console.log('[Bitget] Initializing client...');
    console.log('[Bitget] API Key present:', !!apiKey);
    console.log('[Bitget] API Secret present:', !!apiSecret);
    console.log('[Bitget] API Passphrase present:', !!apiPassphrase);

    if (!apiKey || !apiSecret || !apiPassphrase) {
      throw new Error('Bitget API credentials not configured');
    }

    client = new RestClientV2({
      apiKey,
      apiSecret,
      apiPass: apiPassphrase,
    });
    
    console.log('[Bitget] Client initialized successfully');
  }

  return client;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getBitgetClient();
    const result = await client.getFuturesAccountAsset({
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
    } as never);
    return !!result.data;
  } catch (error) {
    console.error('Bitget connection test failed:', error);
    return false;
  }
}
