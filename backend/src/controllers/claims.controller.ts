import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { ClaimsService } from '../services/claims.service';
import { logger } from '../utils/logger';

export class ClaimsController {
  private claimsService: ClaimsService;

  constructor() {
    this.claimsService = new ClaimsService();
  }

  /**
   * POST /api/claims/:roundId - Claim winnings
   */
  public claimWinnings = async (req: Request, res: Response): Promise<void> => {
    try {
      const roundId = parseInt(req.params.roundId);
      const { userPubkey } = req.body;

      const result = await this.claimsService.claimWinnings(
        roundId,
        new PublicKey(userPubkey)
      );

      logger.info('Winnings claimed', { roundId, userPubkey, amount: result.amount });

      res.json({
        success: true,
        data: {
          signature: result.signature,
          amount: result.amount,
          explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
        },
      });
    } catch (error) {
      logger.error('Failed to claim winnings', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim winnings',
      });
    }
  };

  /**
   * GET /api/claims/:roundId/check/:address - Check if user has claimable winnings
   */
  public checkClaimable = async (req: Request, res: Response): Promise<void> => {
    try {
      const roundId = parseInt(req.params.roundId);
      const userPubkey = new PublicKey(req.params.address);

      const result = await this.claimsService.hasClaimableWinnings(roundId, userPubkey);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to check claimable winnings', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check claimable winnings',
      });
    }
  };
}
