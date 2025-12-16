// Trading constants
export const SUPPORTED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];

export const PILOT_GATES = {
  P1_TO_P2: 0.3, // 0.3% profit to add P2
  P2_TO_P3: 0.5, // 0.5% profit to add P3
  P3_TO_P4: 0.8, // 0.8% profit to add P4
};

export const RISK_DEFAULTS = {
  RISK_PER_PILOT: 2, // 2% risk per pilot
  MAX_POSITION_SIZE: 25, // 25% of account max
  DAILY_LOSS_LIMIT: 5, // 5% daily loss limit
  MAX_DRAWDOWN: 15, // 15% max drawdown
  DEFAULT_LEVERAGE: 10,
  ATR_SL_MULTIPLIER: 1.2,
  ATR_TP_MULTIPLIER: 3.5,
};

export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP_MARKET: 'stop_market',
  STOP_LIMIT: 'stop_limit',
} as const;

export const POSITION_SIDES = {
  LONG: 'long',
  SHORT: 'short',
} as const;

export const ORDER_SIDES = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

export const BOT_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  PAUSED: 'paused',
  KILLED: 'killed',
} as const;

export const SIGNAL_ACTIONS = {
  BUY: 'buy',
  SELL: 'sell',
  CLOSE_LONG: 'close_long',
  CLOSE_SHORT: 'close_short',
} as const;
