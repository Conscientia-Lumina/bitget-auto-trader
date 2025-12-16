import { WebsocketClientV2 } from 'bitget-api';

let wsClient: WebsocketClientV2 | null = null;

export function getBitgetWebsocket(): WebsocketClientV2 {
  if (!wsClient) {
    const apiKey = process.env.BITGET_API_KEY;
    const apiSecret = process.env.BITGET_API_SECRET;
    const apiPassphrase = process.env.BITGET_API_PASSPHRASE;

    if (!apiKey || !apiSecret || !apiPassphrase) {
      throw new Error('Bitget API credentials not configured');
    }

    wsClient = new WebsocketClientV2({
      apiKey,
      apiSecret,
      apiPass: apiPassphrase,
    });

    wsClient.on('open', () => {
      console.log('[Bitget WS] Connected');
    });

    wsClient.on('close', () => {
      console.log('[Bitget WS] Disconnected');
    });

    (wsClient as unknown as { on: (event: string, cb: (e: unknown) => void) => void }).on('error', (error: unknown) => {
      console.error('[Bitget WS] Error:', error);
    });

    (wsClient as unknown as { on: (event: string, cb: () => void) => void }).on('reconnect', () => {
      console.log('[Bitget WS] Reconnecting...');
    });

    (wsClient as unknown as { on: (event: string, cb: () => void) => void }).on('reconnected', () => {
      console.log('[Bitget WS] Reconnected');
    });
  }

  return wsClient;
}

export function subscribeToPositions(
  callback: (data: unknown) => void
): () => void {
  const ws = getBitgetWebsocket();

  ws.on('update', (data: { arg?: { channel?: string }; data?: unknown }) => {
    if (data.arg?.channel === 'positions') {
      callback(data.data);
    }
  });

  ws.subscribeTopic('USDT-FUTURES', 'positions', 'default');

  return () => {
    ws.unsubscribeTopic('USDT-FUTURES', 'positions', 'default');
  };
}

export function subscribeToOrders(callback: (data: unknown) => void): () => void {
  const ws = getBitgetWebsocket();

  ws.on('update', (data: { arg?: { channel?: string }; data?: unknown }) => {
    if (data.arg?.channel === 'orders') {
      callback(data.data);
    }
  });

  ws.subscribeTopic('USDT-FUTURES', 'orders', 'default');

  return () => {
    ws.unsubscribeTopic('USDT-FUTURES', 'orders', 'default');
  };
}

export function subscribeToTicker(
  symbol: string,
  callback: (data: unknown) => void
): () => void {
  const ws = getBitgetWebsocket();

  ws.on('update', (data: { arg?: { channel?: string; instId?: string }; data?: unknown }) => {
    if (data.arg?.channel === 'ticker' && data.arg?.instId === symbol) {
      callback(data.data);
    }
  });

  ws.subscribeTopic('USDT-FUTURES', 'ticker', symbol);

  return () => {
    ws.unsubscribeTopic('USDT-FUTURES', 'ticker', symbol);
  };
}
