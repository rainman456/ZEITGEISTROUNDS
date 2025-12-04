import { RoundCreatorJob } from './roundCreator.job';
import { BettingCloserJob } from './bettingCloser.job';
import { SettlementJob } from './settlement.job';
import { PriceMonitorJob } from './priceMonitor.job';
import { CleanupJob } from './cleanup.job';
import { logger } from '../utils/logger';

/**
 * Job Manager
 * Manages all background jobs
 */
export class JobManager {
  private roundCreator: RoundCreatorJob;
  private bettingCloser: BettingCloserJob;
  private settlement: SettlementJob;
  private priceMonitor: PriceMonitorJob;
  private cleanup: CleanupJob;

  constructor() {
    this.roundCreator = new RoundCreatorJob();
    this.bettingCloser = new BettingCloserJob();
    this.settlement = new SettlementJob();
    this.priceMonitor = new PriceMonitorJob();
    this.cleanup = new CleanupJob(30); // 30 days retention
  }

  /**
   * Start all jobs
   */
  startAll(): void {
    logger.info('Starting all background jobs');

    this.roundCreator.start();
    this.bettingCloser.start();
    this.settlement.start();
    this.priceMonitor.start();
    this.cleanup.start();

    logger.info('All background jobs started successfully');
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    logger.info('Stopping all background jobs');

    this.roundCreator.stop();
    this.bettingCloser.stop();
    this.settlement.stop();
    this.priceMonitor.stop();
    this.cleanup.stop();

    logger.info('All background jobs stopped');
  }

  /**
   * Get price monitor instance for WebSocket integration
   */
  getPriceMonitor(): PriceMonitorJob {
    return this.priceMonitor;
  }

  /**
   * Get individual job instances
   */
  getJobs() {
    return {
      roundCreator: this.roundCreator,
      bettingCloser: this.bettingCloser,
      settlement: this.settlement,
      priceMonitor: this.priceMonitor,
      cleanup: this.cleanup,
    };
  }
}

// Export job classes
export {
  RoundCreatorJob,
  BettingCloserJob,
  SettlementJob,
  PriceMonitorJob,
  CleanupJob,
};
