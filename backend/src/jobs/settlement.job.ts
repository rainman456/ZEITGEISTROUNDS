import cron from 'node-cron';
import { SettlementService } from '../services/settlement.service';
import { RoundService } from '../services/round.service';
import { OracleService } from '../services/oracle.service';
import { logger } from '../utils/logger';
import { PublicKey } from '@solana/web3.js';

/**
 * Settlement Job
 * Automatically settles rounds after betting is closed
 */
export class SettlementJob {
  private settlementService: SettlementService;
  private roundService: RoundService;
  private oracleService: OracleService;
  private task: cron.ScheduledTask | null = null;
  private oraclePubkey: PublicKey;

  constructor() {
    this.settlementService = new SettlementService();
    this.roundService = new RoundService();
    this.oracleService = new OracleService();
    
    const oracleKey = process.env.ORACLE_PUBKEY;
    if (!oracleKey) {
      throw new Error('ORACLE_PUBKEY must be set in environment');
    }
    
    this.oraclePubkey = new PublicKey(oracleKey);
  }

  /**
   * Start the cron job - runs every 15 seconds
   */
  start(): void {
    // Run every 15 seconds
    this.task = cron.schedule('*/15 * * * * *', async () => {
      await this.settleRounds();
    });

    logger.info('Settlement Job started - checking every 15 seconds');
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Settlement Job stopped');
    }
  }

  /**
   * Check for rounds that need settlement
   */
  private async settleRounds(): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Get all rounds
      const rounds = await this.roundService.getAllRounds();
      
      for (const round of rounds) {
        // Check if round has ended, betting is closed, but not yet settled
        if (
          round.endTime <= now &&
          round.bettingClosed &&
          round.status === 'active' &&
          !round.winningOutcome
        ) {
          logger.info('Settling round', {
            roundId: round.roundId,
            endTime: new Date(round.endTime * 1000).toISOString(),
          });

          try {
            // Fetch oracle data
            let oracleData: { price: number; confidence: number; publishTime: number };
            
            if (round.verificationType === 'pythPrice') {
              // Fetch from Pyth
              const pythData = await this.oracleService.fetchPythPrice(
                round.dataSource
              );
              oracleData = {
                price: Math.floor(pythData.price * 100), // Convert to 2 decimals
                confidence: Math.floor(pythData.confidence * 100),
                publishTime: pythData.publishTime,
              };
            } else {
              // Mock data for other types
              oracleData = {
                price: Math.floor(Math.random() * 20000) + 10000,
                confidence: 100,
                publishTime: now,
              };
            }

            logger.info('Oracle data fetched', {
              roundId: round.roundId,
              price: oracleData.price / 100,
              targetValue: round.targetValue / 100,
            });

            // Settle the round
            await this.settlementService.settleRound(
              round.roundId,
              this.oraclePubkey,
              oracleData.price,
              oracleData.confidence,
              oracleData.publishTime
            );

            logger.info('Round settled successfully', {
              roundId: round.roundId,
              finalPrice: oracleData.price / 100,
              targetValue: round.targetValue / 100,
              outcome: oracleData.price > round.targetValue ? 'YES' : 'NO',
            });
          } catch (error) {
            logger.error('Failed to settle round', {
              roundId: round.roundId,
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error in settlement job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Run the job immediately (for testing)
   */
  async runNow(): Promise<void> {
    await this.settleRounds();
  }
}
