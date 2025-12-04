import { Connection, PublicKey, Logs, Context } from '@solana/web3.js';
import { Program } from '@project-serum/anchor';
import { getProgram } from '../blockchain/program';
import { logger } from '../utils/logger';
import { EventParser } from './parser';
import { EventHandler } from './handler';

export class BlockchainListener {
  private connection: Connection;
  private program: Program;
  private parser: EventParser;
  private handler: EventHandler;
  private subscriptionId: number | null = null;
  private isRunning = false;

  constructor() {
    this.program = getProgram();
    this.connection = this.program.provider.connection;
    this.parser = new EventParser(this.program);
    this.handler = new EventHandler();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Blockchain listener already running');
      return;
    }

    try {
      logger.info('Starting blockchain event listener...');

      // Subscribe to program logs
      this.subscriptionId = this.connection.onLogs(
        this.program.programId,
        async (logs: Logs, ctx: Context) => {
          await this.handleLogs(logs, ctx);
        },
        'confirmed'
      );

      this.isRunning = true;
      logger.info(`Blockchain listener started. Subscription ID: ${this.subscriptionId}`);
      logger.info(`Listening to program: ${this.program.programId.toString()}`);
    } catch (error) {
      logger.error('Failed to start blockchain listener:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning || this.subscriptionId === null) {
      logger.warn('Blockchain listener not running');
      return;
    }

    try {
      logger.info('Stopping blockchain event listener...');
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
      this.isRunning = false;
      logger.info('Blockchain listener stopped');
    } catch (error) {
      logger.error('Failed to stop blockchain listener:', error);
      throw error;
    }
  }

  private async handleLogs(logs: Logs, ctx: Context): Promise<void> {
    try {
      const { signature, err } = logs;

      // Skip failed transactions
      if (err) {
        logger.debug(`Skipping failed transaction: ${signature}`);
        return;
      }

      logger.debug(`Processing transaction: ${signature}, slot: ${ctx.slot}`);

      // Fetch full transaction details
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        logger.warn(`Transaction not found: ${signature}`);
        return;
      }

      // Parse events from transaction
      const events = await this.parser.parseTransaction(tx, signature, BigInt(ctx.slot));

      // Handle each event
      for (const event of events) {
        await this.handler.handleEvent(event);
      }

      logger.debug(`Processed ${events.length} events from transaction ${signature}`);
    } catch (error) {
      logger.error(`Error handling logs for ${logs.signature}:`, error);
    }
  }

  getStatus(): {
    isRunning: boolean;
    subscriptionId: number | null;
    programId: string;
  } {
    return {
      isRunning: this.isRunning,
      subscriptionId: this.subscriptionId,
      programId: this.program.programId.toString(),
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isRunning) return false;
      
      // Test connection
      const slot = await this.connection.getSlot();
      return slot > 0;
    } catch (error) {
      logger.error('Listener health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let listenerInstance: BlockchainListener | null = null;

export function getListener(): BlockchainListener {
  if (!listenerInstance) {
    listenerInstance = new BlockchainListener();
  }
  return listenerInstance;
}
