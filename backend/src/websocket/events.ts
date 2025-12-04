/**
 * WebSocket Event Types
 */

export enum WebSocketEvent {
  // Client -> Server
  SUBSCRIBE_ROUND = 'subscribe:round',
  UNSUBSCRIBE_ROUND = 'unsubscribe:round',
  SUBSCRIBE_PRICES = 'subscribe:prices',
  UNSUBSCRIBE_PRICES = 'unsubscribe:prices',
  SUBSCRIBE_GLOBAL = 'subscribe:global',
  UNSUBSCRIBE_GLOBAL = 'unsubscribe:global',

  // Server -> Client
  ROUND_CREATED = 'round:created',
  ROUND_UPDATED = 'round:updated',
  BETTING_CLOSED = 'round:betting_closed',
  ROUND_SETTLED = 'round:settled',
  
  PREDICTION_PLACED = 'prediction:placed',
  POOL_UPDATED = 'pool:updated',
  
  PRICE_UPDATE = 'price:update',
  
  WINNINGS_AVAILABLE = 'winnings:available',
  
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

/**
 * Event Payloads
 */

export interface RoundCreatedPayload {
  roundId: number;
  roundPda: string;
  question: string;
  startTime: number;
  endTime: number;
  numOutcomes: number;
  verificationType: string;
  targetValue: number;
  dataSource: string;
}

export interface RoundUpdatedPayload {
  roundId: number;
  totalPool: number;
  pools: number[];
  participantCount: number;
  timeRemaining: number;
}

export interface BettingClosedPayload {
  roundId: number;
  closedAt: number;
  totalPool: number;
  pools: number[];
}

export interface RoundSettledPayload {
  roundId: number;
  winningOutcome: number;
  finalValue: number;
  targetValue: number;
  settledAt: number;
  totalPool: number;
  winningPool: number;
}

export interface PredictionPlacedPayload {
  roundId: number;
  userPubkey: string;
  outcome: number;
  amount: number;
  timestamp: number;
  newPoolTotal: number;
  newPoolAmounts: number[];
}

export interface PoolUpdatedPayload {
  roundId: number;
  pools: number[];
  totalPool: number;
  participantCount: number;
}

export interface PriceUpdatePayload {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
  timestamp: number;
  change24h?: number;
  changePercent24h?: number;
}

export interface WinningsAvailablePayload {
  roundId: number;
  userPubkey: string;
  amount: number;
  outcome: number;
}

export interface ErrorPayload {
  message: string;
  code?: string;
  details?: any;
}

export interface ConnectedPayload {
  clientId: string;
  timestamp: number;
}
