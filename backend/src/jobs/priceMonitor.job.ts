import cron from 'node-cron';
import { OracleService } from '../services/oracle.service';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface PriceUpdate {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
  timestamp: number;
}

/**
 * Price Monitor Job
 * Fetches live prices every few seconds and broadcasts to clients
 */
export class PriceMonitorJob extends EventEmitter {
  private oracleService: OracleService;
  private task: cron.ScheduledTask | null = null;
  private priceFeeds: Map<string, string> = new Map();
  private latestPrices: Map<string, PriceUpdate> = new Map();

  constructor() {
    super();
    this.oracleService = new OracleService();
    
    // Default price feeds
    this.priceFeeds.set('SOL/USD', 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG');
    this.priceFeeds.set('BTC/USD', 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU');
    this.priceFeeds.set('ETH/USD', 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB');
  }

  /**
   * Start the cron job - runs every 5 seconds
   */
  start(): void {
    // Run every 5 seconds
    this.task = cron.schedule('*/5 * * * * *', async () => {
      await this.fetchPrices();
    });

    logger.info('Price Monitor Job started - fetching prices every 5 seconds');
    
    // Fetch immediately on start
    this.fetchPrices();
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Price Monitor Job stopped');
    }
  }

  /**
   * Add a price feed to monitor
   */
  addPriceFeed(symbol: string, feedId: string): void {
    this.priceFeeds.set(symbol, feedId);
    logger.info('Added price feed', { symbol, feedId });
  }

  /**
   * Remove a price feed
   */
  removePriceFeed(symbol: string): void {
    this.priceFeeds.delete(symbol);
    this.latestPrices.delete(symbol);
    logger.info('Removed price feed', { symbol });
  }

  /**
   * Get latest price for a symbol
   */
  getLatestPrice(symbol: string): PriceUpdate | undefined {
    return this.latestPrices.get(symbol);
  }

  /**
   * Get all latest prices
   */
  getAllPrices(): Map<string, PriceUpdate> {
    return new Map(this.latestPrices);
  }

  /**
   * Fetch prices from all configured feeds
   */
  private async fetchPrices(): Promise<void> {
    const timestamp = Date.now();

    for (const [symbol, feedId] of this.priceFeeds.entries()) {
      try {
        const data = await this.oracleService.fetchPythPrice(feedId);

        const priceUpdate: PriceUpdate = {
          symbol,
          price: data.price,
          confidence: data.confidence,
          publishTime: data.publishTime,
          timestamp,
        };

        this.latestPrices.set(symbol, priceUpdate);

        // Emit price update event
        this.emit('priceUpdate', priceUpdate);

        logger.debug('Price updated', {
          symbol,
          price: data.price,
          confidence: data.confidence,
        });
      } catch (error) {
        logger.error('Failed to fetch price', {
          symbol,
          feedId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Run the job immediately (for testing)
   */
  async runNow(): Promise<void> {
    await this.fetchPrices();
  }
}
