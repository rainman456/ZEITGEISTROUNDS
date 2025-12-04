import cron from 'node-cron';
import { logger } from '../utils/logger';
import { db } from '../db/client';

/**
 * Cleanup Job
 * Archives old rounds and cleans up stale data
 */
export class CleanupJob {
  private task: cron.ScheduledTask | null = null;
  private retentionDays: number;

  constructor(retentionDays: number = 30) {
    this.retentionDays = retentionDays;
  }

  /**
   * Start the cron job - runs daily at 3 AM
   */
  start(): void {
    // Run daily at 3:00 AM
    this.task = cron.schedule('0 3 * * *', async () => {
      await this.cleanup();
    });

    logger.info('Cleanup Job started - running daily at 3:00 AM', {
      retentionDays: this.retentionDays,
    });
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Cleanup Job stopped');
    }
  }

  /**
   * Perform cleanup operations
   */
  private async cleanup(): Promise<void> {
    try {
      logger.info('Starting cleanup job');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      // Archive old rounds
      await this.archiveOldRounds(cutoffDate);

      // Clean up old predictions
      await this.cleanupOldPredictions(cutoffDate);

      // Clean up old events
      await this.cleanupOldEvents(cutoffDate);

      // Vacuum database (PostgreSQL specific)
      await this.vacuumDatabase();

      logger.info('Cleanup job completed successfully');
    } catch (error) {
      logger.error('Error in cleanup job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Archive old rounds to separate table
   */
  private async archiveOldRounds(cutoffDate: Date): Promise<void> {
    try {
      // Create archive table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS rounds_archive (
          LIKE rounds INCLUDING ALL
        )
      `);

      // Move old rounds to archive
      const result = await db.query(
        `
        WITH moved_rows AS (
          DELETE FROM rounds
          WHERE created_at < $1
          AND status = 'settled'
          RETURNING *
        )
        INSERT INTO rounds_archive
        SELECT * FROM moved_rows
      `,
        [cutoffDate]
      );

      logger.info('Archived old rounds', {
        count: result.rowCount,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to archive rounds', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clean up old predictions
   */
  private async cleanupOldPredictions(cutoffDate: Date): Promise<void> {
    try {
      // Create archive table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS predictions_archive (
          LIKE predictions INCLUDING ALL
        )
      `);

      // Move old predictions to archive
      const result = await db.query(
        `
        WITH moved_rows AS (
          DELETE FROM predictions
          WHERE created_at < $1
          AND round_id IN (
            SELECT round_id FROM rounds_archive
          )
          RETURNING *
        )
        INSERT INTO predictions_archive
        SELECT * FROM moved_rows
      `,
        [cutoffDate]
      );

      logger.info('Archived old predictions', {
        count: result.rowCount,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to archive predictions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clean up old events
   */
  private async cleanupOldEvents(cutoffDate: Date): Promise<void> {
    try {
      const result = await db.query(
        `
        DELETE FROM events
        WHERE created_at < $1
      `,
        [cutoffDate]
      );

      logger.info('Cleaned up old events', {
        count: result.rowCount,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to cleanup events', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Vacuum database to reclaim space
   */
  private async vacuumDatabase(): Promise<void> {
    try {
      await db.query('VACUUM ANALYZE');
      logger.info('Database vacuumed successfully');
    } catch (error) {
      logger.error('Failed to vacuum database', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Run the job immediately (for testing)
   */
  async runNow(): Promise<void> {
    await this.cleanup();
  }
}
