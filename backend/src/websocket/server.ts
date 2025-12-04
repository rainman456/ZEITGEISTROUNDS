import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config';
import {
  WebSocketEvent,
  RoundCreatedPayload,
  RoundUpdatedPayload,
  BettingClosedPayload,
  RoundSettledPayload,
  PredictionPlacedPayload,
  PoolUpdatedPayload,
  PriceUpdatePayload,
  WinningsAvailablePayload,
  ErrorPayload,
  ConnectedPayload,
} from './events';

/**
 * WebSocket Server
 * Manages real-time connections and broadcasts
 */
export class WebSocketServer {
  private io: Server;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.server.corsOrigin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
  }

  /**
   * Setup connection and event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      this.connectedClients.set(clientId, socket);

      logger.info('Client connected', { clientId });

      // Send connection confirmation
      const payload: ConnectedPayload = {
        clientId,
        timestamp: Date.now(),
      };
      socket.emit(WebSocketEvent.CONNECTED, payload);

      // Handle subscriptions
      this.handleSubscriptions(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        logger.info('Client disconnected', { clientId });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', { clientId, error });
      });
    });
  }

  /**
   * Handle client subscriptions
   */
  private handleSubscriptions(socket: Socket): void {
    // Subscribe to specific round updates
    socket.on(WebSocketEvent.SUBSCRIBE_ROUND, (roundId: number) => {
      const room = `round:${roundId}`;
      socket.join(room);
      logger.debug('Client subscribed to round', {
        clientId: socket.id,
        roundId,
      });
    });

    // Unsubscribe from round
    socket.on(WebSocketEvent.UNSUBSCRIBE_ROUND, (roundId: number) => {
      const room = `round:${roundId}`;
      socket.leave(room);
      logger.debug('Client unsubscribed from round', {
        clientId: socket.id,
        roundId,
      });
    });

    // Subscribe to price updates
    socket.on(WebSocketEvent.SUBSCRIBE_PRICES, () => {
      socket.join('prices');
      logger.debug('Client subscribed to prices', {
        clientId: socket.id,
      });
    });

    // Unsubscribe from prices
    socket.on(WebSocketEvent.UNSUBSCRIBE_PRICES, () => {
      socket.leave('prices');
      logger.debug('Client unsubscribed from prices', {
        clientId: socket.id,
      });
    });

    // Subscribe to global events
    socket.on(WebSocketEvent.SUBSCRIBE_GLOBAL, () => {
      socket.join('global');
      logger.debug('Client subscribed to global events', {
        clientId: socket.id,
      });
    });

    // Unsubscribe from global
    socket.on(WebSocketEvent.UNSUBSCRIBE_GLOBAL, () => {
      socket.leave('global');
      logger.debug('Client unsubscribed from global events', {
        clientId: socket.id,
      });
    });
  }

  /**
   * Broadcast round created event
   */
  broadcastRoundCreated(payload: RoundCreatedPayload): void {
    this.io.to('global').emit(WebSocketEvent.ROUND_CREATED, payload);
    logger.debug('Broadcasted round created', { roundId: payload.roundId });
  }

  /**
   * Broadcast round updated event
   */
  broadcastRoundUpdated(payload: RoundUpdatedPayload): void {
    const room = `round:${payload.roundId}`;
    this.io.to(room).emit(WebSocketEvent.ROUND_UPDATED, payload);
    logger.debug('Broadcasted round updated', { roundId: payload.roundId });
  }

  /**
   * Broadcast betting closed event
   */
  broadcastBettingClosed(payload: BettingClosedPayload): void {
    const room = `round:${payload.roundId}`;
    this.io.to(room).emit(WebSocketEvent.BETTING_CLOSED, payload);
    this.io.to('global').emit(WebSocketEvent.BETTING_CLOSED, payload);
    logger.debug('Broadcasted betting closed', { roundId: payload.roundId });
  }

  /**
   * Broadcast round settled event
   */
  broadcastRoundSettled(payload: RoundSettledPayload): void {
    const room = `round:${payload.roundId}`;
    this.io.to(room).emit(WebSocketEvent.ROUND_SETTLED, payload);
    this.io.to('global').emit(WebSocketEvent.ROUND_SETTLED, payload);
    logger.info('Broadcasted round settled', {
      roundId: payload.roundId,
      winningOutcome: payload.winningOutcome,
    });
  }

  /**
   * Broadcast prediction placed event
   */
  broadcastPredictionPlaced(payload: PredictionPlacedPayload): void {
    const room = `round:${payload.roundId}`;
    this.io.to(room).emit(WebSocketEvent.PREDICTION_PLACED, payload);
    logger.debug('Broadcasted prediction placed', {
      roundId: payload.roundId,
      outcome: payload.outcome,
    });
  }

  /**
   * Broadcast pool updated event
   */
  broadcastPoolUpdated(payload: PoolUpdatedPayload): void {
    const room = `round:${payload.roundId}`;
    this.io.to(room).emit(WebSocketEvent.POOL_UPDATED, payload);
    logger.debug('Broadcasted pool updated', { roundId: payload.roundId });
  }

  /**
   * Broadcast price update
   */
  broadcastPriceUpdate(payload: PriceUpdatePayload): void {
    this.io.to('prices').emit(WebSocketEvent.PRICE_UPDATE, payload);
    logger.debug('Broadcasted price update', { symbol: payload.symbol });
  }

  /**
   * Broadcast winnings available to specific user
   */
  broadcastWinningsAvailable(payload: WinningsAvailablePayload): void {
    // Broadcast to all clients in the round room
    const room = `round:${payload.roundId}`;
    this.io.to(room).emit(WebSocketEvent.WINNINGS_AVAILABLE, payload);
    logger.debug('Broadcasted winnings available', {
      roundId: payload.roundId,
      userPubkey: payload.userPubkey,
    });
  }

  /**
   * Send error to specific client
   */
  sendError(clientId: string, payload: ErrorPayload): void {
    const socket = this.connectedClients.get(clientId);
    if (socket) {
      socket.emit(WebSocketEvent.ERROR, payload);
      logger.debug('Sent error to client', { clientId, message: payload.message });
    }
  }

  /**
   * Get connected client count
   */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get clients in a specific room
   */
  async getRoomClients(room: string): Promise<number> {
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.length;
  }

  /**
   * Get server instance for external integrations
   */
  getServer(): Server {
    return this.io;
  }
}
