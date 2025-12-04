import cron from 'node-cron';
import { RoundService } from '../services/round.service';
import { logger } from '../utils/logger';
import { PublicKey } from '@solana/web3.js';

/**
 * Round Creator Job
 * Automatically creates new rounds every 60 seconds
 */
export class RoundCreatorJob {
  private roundService: RoundService;
  private task: cron.ScheduledTask | null = null;
  private adminPubkey: PublicKey;
  private oraclePubkey: PublicKey;

  constructor() {
    this.roundService = new RoundService();
    
    // Load from environment
    const adminKey = process.env.ADMIN_PUBKEY;
    const oracleKey = process.env.ORACLE_PUBKEY;
    
    if (!adminKey || !oracleKey) {
      throw new Error('ADMIN_PUBKEY and ORACLE_PUBKEY must be set in environment');
    }
    
    this.adminPubkey = new PublicKey(adminKey);
    this.oraclePubkey = new PublicKey(oracleKey);
  }

  /**
   * Start the cron job - runs every 60 seconds
   */
  start(): void {
    // Run every minute at :00 seconds
    this.task = cron.schedule('0 * * * * *', async () => {
      await this.createRound();
    });

    logger.info('Round Creator Job started - creating rounds every 60 seconds');
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Round Creator Job stopped');
    }
  }

  /**
   * Create a new round with predefined parameters
   */
  private async createRound(): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const startTime = now;
      const endTime = now + 60; // 60 second rounds

      // SOL/USD price prediction
      const params = {
        question: `Will SOL price be above $150 at ${new Date(endTime * 1000).toISOString()}?`,
        startTime,
        endTime,
        numOutcomes: 2, // Yes/No
        verificationType: 'pythPrice' as const,
        targetValue: 15000, // $150.00 (2 decimals)
        dataSource: 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG', // SOL/USD Pyth price feed
        oracle: this.oraclePubkey.toBase58(),
      };

      logger.info('Creating new round', { params });

      const result = await this.roundService.createRound(params);

      logger.info('Round created successfully', {
        roundId: result.roundId,
        roundPda: result.roundPda,
        startTime: new Date(startTime * 1000).toISOString(),
        endTime: new Date(endTime * 1000).toISOString(),
      });
    } catch (error) {
      logger.error('Failed to create round', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Create a round immediately (for testing)
   */
  async createNow(): Promise<void> {
    await this.createRound();
  }
}
