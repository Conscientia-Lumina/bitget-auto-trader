import { getBitgetClient } from './client';
import Decimal from 'decimal.js';

export interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  price?: number;
  clientOrderId?: string;
  reduceOnly?: boolean;
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  clientOrderId?: string;
  error?: string;
}

function formatSymbol(symbol: string): string {
  return symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
}

function roundQuantity(symbol: string, quantity: number): string {
  const precision = symbol.includes('BTC') ? 3 : 2;
  return new Decimal(quantity).toFixed(precision);
}

export async function placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
  try {
    const client = getBitgetClient();
    const symbol = formatSymbol(params.symbol);
    const size = roundQuantity(symbol, params.quantity);

    console.log(`[Bitget] Placing ${params.orderType} ${params.side} order:`, {
      symbol,
      size,
      price: params.price,
    });

    const orderRequest = {
      symbol,
      productType: 'USDT-FUTURES' as const,
      marginMode: 'crossed' as const,
      marginCoin: 'USDT',
      size,
      side: params.side,
      orderType: params.orderType,
      force: params.orderType === 'market' ? 'ioc' as const : 'gtc' as const,
      price: params.orderType === 'limit' && params.price ? params.price.toString() : undefined,
      clientOid: params.clientOrderId,
      reduceOnly: params.reduceOnly ? 'YES' as const : undefined,
    };

    const result = await client.futuresSubmitOrder(orderRequest as never);

    if (result.code !== '00000') {
      console.error('[Bitget] Order failed:', result);
      return {
        success: false,
        error: result.msg || 'Order failed',
      };
    }

    console.log('[Bitget] Order placed successfully:', result.data);

    if (params.stopLoss) {
      await placeStopLoss(symbol, params.side, size, params.stopLoss);
    }

    if (params.takeProfit) {
      await placeTakeProfit(symbol, params.side, size, params.takeProfit);
    }

    return {
      success: true,
      orderId: (result.data as { orderId?: string })?.orderId,
      clientOrderId: (result.data as { clientOid?: string })?.clientOid,
    };
  } catch (error) {
    console.error('[Bitget] Order error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function placeStopLoss(
  symbol: string,
  side: 'buy' | 'sell',
  size: string,
  stopPrice: number
): Promise<void> {
  try {
    const client = getBitgetClient();
    const holdSide = side === 'buy' ? 'long' : 'short';

    await client.futuresSubmitTPSLOrder({
      symbol,
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
      planType: 'loss_plan',
      triggerPrice: stopPrice.toString(),
      triggerType: 'mark_price',
      holdSide,
      size,
    } as never);

    console.log(`[Bitget] Stop loss placed at ${stopPrice}`);
  } catch (error) {
    console.error('[Bitget] Stop loss error:', error);
  }
}

async function placeTakeProfit(
  symbol: string,
  side: 'buy' | 'sell',
  size: string,
  tpPrice: number
): Promise<void> {
  try {
    const client = getBitgetClient();
    const holdSide = side === 'buy' ? 'long' : 'short';

    await client.futuresSubmitTPSLOrder({
      symbol,
      productType: 'USDT-FUTURES',
      marginCoin: 'USDT',
      planType: 'profit_plan',
      triggerPrice: tpPrice.toString(),
      triggerType: 'mark_price',
      holdSide,
      size,
    } as never);

    console.log(`[Bitget] Take profit placed at ${tpPrice}`);
  } catch (error) {
    console.error('[Bitget] Take profit error:', error);
  }
}

export async function cancelOrder(
  symbol: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getBitgetClient();

    const result = await client.futuresCancelOrder({
      symbol: formatSymbol(symbol),
      productType: 'USDT-FUTURES',
      orderId,
    } as never);

    if (result.code !== '00000') {
      return { success: false, error: result.msg };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function cancelAllOrders(): Promise<{
  success: boolean;
  cancelled: number;
  error?: string;
}> {
  try {
    const client = getBitgetClient();

    const openOrders = await client.getFuturesOpenOrders({
      productType: 'USDT-FUTURES',
    } as never);

    const data = openOrders.data as { entrustedList?: Array<{ symbol: string; orderId: string }> } | undefined;
    const orderList = data?.entrustedList;
    if (!orderList?.length) {
      return { success: true, cancelled: 0 };
    }

    let cancelled = 0;
    for (const order of orderList) {
      const result = await cancelOrder(order.symbol, order.orderId);
      if (result.success) cancelled++;
    }

    const planOrders = await client.getFuturesPlanOrders({
      productType: 'USDT-FUTURES',
    } as never);

    const planData = planOrders.data as { entrustedList?: Array<{ symbol: string; orderId: string }> } | undefined;
    const planList = planData?.entrustedList;
    if (planList?.length) {
      for (const order of planList) {
        try {
          await client.futuresCancelPlanOrder({
            symbol: order.symbol,
            productType: 'USDT-FUTURES',
            orderId: order.orderId,
          } as never);
          cancelled++;
        } catch {
          // Ignore errors for individual cancellations
        }
      }
    }

    return { success: true, cancelled };
  } catch (error) {
    return {
      success: false,
      cancelled: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getOpenOrders(symbol?: string): Promise<Array<Record<string, unknown>>> {
  try {
    const client = getBitgetClient();

    const params: { productType: 'USDT-FUTURES'; symbol?: string } = { productType: 'USDT-FUTURES' };
    if (symbol) params.symbol = formatSymbol(symbol);

    const result = await client.getFuturesOpenOrders(params as never);
    const data = result.data as unknown as { entrustedList?: Array<Record<string, unknown>> } | undefined;
    return data?.entrustedList || [];
  } catch (error) {
    console.error('[Bitget] Get open orders error:', error);
    return [];
  }
}

export async function getOrder(
  symbol: string,
  orderId: string
): Promise<Record<string, unknown> | null> {
  try {
    const client = getBitgetClient();

    const result = await client.getFuturesOrder({
      symbol: formatSymbol(symbol),
      productType: 'USDT-FUTURES',
      orderId,
    } as never);

    return (result.data as unknown as Record<string, unknown>) || null;
  } catch (error) {
    console.error('[Bitget] Get order error:', error);
    return null;
  }
}
