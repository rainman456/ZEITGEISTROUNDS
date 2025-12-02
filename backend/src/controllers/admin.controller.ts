import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { SettlementService } from '../services/settlement.service';
import { logger } from '../utils/logger';

export class AdminController {
  private adminService: AdminService;
  private settlementService: SettlementService;

  constructor() {
    this.adminService = new AdminService();
    this.settlementService = new SettlementService();
  }

  /**
   * GET /api/admin/stats - Get admin statistics
   */
  public getAdminStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.adminService.getAdminStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get admin stats', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get admin stats',
      });
    }
  };

  /**
   * POST /api/admin/pause - Pause the program
   */
  public pauseProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = await this.adminService.pauseProgram();

      logger.info('Program paused', { signature });

      res.json({
        success: true,
        data: {
          signature,
          message: 'Program paused successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to pause program', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause program',
      });
    }
  };

  /**
   * POST /api/admin/unpause - Unpause the program
   */
  public unpauseProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = await this.adminService.unpauseProgram();

      logger.info('Program unpaused', { signature });

      res.json({
        success: true,
        data: {
          signature,
          message: 'Program unpaused successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to unpause program', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpause program',
      });
    }
  };

  /**
   * POST /api/admin/rounds/:id/cancel - Emergency cancel a round
   */
  public emergencyCancel = async (req: Request, res: Response): Promise<void> => {
    try {
      const roundId = parseInt(req.params.id);
      const { reason } = req.body;

      const signature = await this.adminService.emergencyCancel({
        roundId,
        reason,
      });

      logger.info('Round cancelled', { roundId, reason });

      res.json({
        success: true,
        data: {
          signature,
          message: 'Round cancelled successfully',
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        },
      });
    } catch (error) {
      logger.error('Failed to cancel round', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel round',
      });
    }
  };

  /**
   * POST /api/rounds/:id/settle - Settle round (admin only)
   */
  public settleRound = async (req: Request, res: Response): Promise<void> => {
    try {
      const roundId = parseInt(req.params.id);

      const result = await this.settlementService.completeSettlement(roundId);

      logger.info('Round settled', {
        roundId,
        winningOutcome: result.winningOutcome,
        platformFee: result.platformFee,
      });

      res.json({
        success: true,
        data: {
          closeBettingSignature: result.closeBettingSignature,
          settlementSignature: result.settlementSignature,
          winningOutcome: result.winningOutcome,
          platformFee: result.platformFee,
          message: 'Round settled successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to settle round', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to settle round',
      });
    }
  };

  /**
   * GET /api/admin/rounds/pending - Get rounds needing action
   */
  public getRoundsNeedingAction = async (req: Request, res: Response): Promise<void> => {
    try {
      const rounds = await this.adminService.getRoundsNeedingAction();

      res.json({
        success: true,
        data: rounds,
        count: rounds.length,
      });
    } catch (error) {
      logger.error('Failed to get rounds needing action', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get rounds needing action',
      });
    }
  };
}
