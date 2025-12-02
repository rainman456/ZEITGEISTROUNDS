import { Request, Response } from 'express';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PredictionService } from '../services/prediction.service';
import { logger } from '../utils/logger';

export class UsersController {
  private predictionService: PredictionService;

  constructor() {
    this.predictionService = new PredictionService();
  }

  /**
   * GET /api/users/:address/stats - Get user statistics
   */
  public getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userPubkey = new PublicKey(req.params.address);
      const stats = await this.predictionService.getUserStats(userPubkey);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'User stats not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: stats.data.user.toBase58(),
          totalPredictions: stats.data.totalPredictions.toNumber(),
          totalWins: stats.data.totalWins.toNumber(),
          totalLosses: stats.data.totalLosses.toNumber(),
          totalWagered: stats.data.totalWagered.toNumber(),
          totalWon: stats.data.totalWon.toNumber(),
          netProfit: stats.data.netProfit.toNumber(),
          currentStreak: stats.data.currentStreak,
          bestStreak: stats.data.bestStreak,
          winRate: stats.data.totalPredictions.toNumber() > 0
            ? (stats.data.totalWins.toNumber() / stats.data.totalPredictions.toNumber()) * 100
            : 0,
        },
      });
    } catch (error) {
      logger.error('Failed to get user stats', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user stats',
      });
    }
  };

  /**
   * GET /api/leaderboard - Get top players
   */
  public getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Fetch all user stats
      const allStats = await (this.predictionService as any).programService.program.account.userStats.all();

      // Sort by net profit
      const leaderboard = allStats
        .map((stat: any) => ({
          user: stat.account.user.toBase58(),
          totalPredictions: stat.account.totalPredictions.toNumber(),
          totalWins: stat.account.totalWins.toNumber(),
          totalWagered: stat.account.totalWagered.toNumber(),
          totalWon: stat.account.totalWon.toNumber(),
          netProfit: stat.account.netProfit.toNumber(),
          currentStreak: stat.account.currentStreak,
          bestStreak: stat.account.bestStreak,
          winRate: stat.account.totalPredictions.toNumber() > 0
            ? (stat.account.totalWins.toNumber() / stat.account.totalPredictions.toNumber()) * 100
            : 0,
        }))
        .sort((a: any, b: any) => b.netProfit - a.netProfit)
        .slice(0, limit);

      res.json({
        success: true,
        data: leaderboard,
        count: leaderboard.length,
      });
    } catch (error) {
      logger.error('Failed to get leaderboard', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get leaderboard',
      });
    }
  };
}
