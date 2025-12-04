import cron from 'node-cron';
import { SettlementService } from '../services/settlement.service';
import { RoundService } from '../services/round.service';
import { logger } from '../utils/logger';
import { PublicKey } from '@solana/web3.js';

/**
 * Betting Closer Job
 * Automatically closes betting windows when rounds end
 */
export class BettingCloserJob {
  private settlementService: SettlementService;
  private roundService: RoundService;
  private task: cron.ScheduledTask | null = null;
  private oraclePubkey: PublicKey;

  constructor() {
    this.settlementService = new SettlementService();
    this.roundService = new RoundService();
    
    const oracleKey = process.env.ORACLE_PUBKEY;
    if (!oracleKey) {
      throw new Error('ORACLE_PUBKEY must be set in environment');
    }
    
    this.oraclePubkey = new PublicKey(oracleKey);
  }

  /**
   * Start the cron job - runs every 10 seconds
   */
  start(): void {
    // Run every 10 seconds
    this.task = cron.schedule('*/10 * * * * *', async () => {
      await this.closeBettingWindows();
    });

    logger.info('Betting Closer Job started - checking every 10 seconds');
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Betting Closer Job stopped');
    }
  }

  /**
   * Check for rounds that need betting closed
   */
  private async closeBettingWindows(): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Get all active rounds
      const rounds = await this.roundService.getAllRounds();
      
      for (const round of rounds) {
        // Check if betting window has ended but betting is still open
        if (
          round.endTime <= now &&
          round.status === 'active' &&
          !round.bettingClosed
        ) {
          logger.info('Closing betting for round', {
            roundId: round.roundId,
            endTime: new Date(round.endTime * 1000).toISOString(),
          });

          try {
            await this.settlementService.closeBetting(
              round.roundId,
              this.oraclePubkey
            );

            logger.info('Betting closed successfully', {
              roundId: round.roundId,
            });
          } catch (error) {
            logger.error('Failed to close betting', {
              roundId: round.roundId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error in betting closer job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Run the job immediately (for testing)
   */
  async runNow(): Promise<void> {
    await this.closeBettingWindows();
  }
}
