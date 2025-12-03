import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { PredictionService } from '../services/prediction.service';
import { logger } from '../utils/logger';

export class PredictionsController {
  private predictionService: PredictionService;

  constructor() {
    this.predictionService = new PredictionService();
  }

  /**
   * POST /api/predictions - Place a bet
   */
  public placePrediction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roundId, outcome, amount } = req.body;
       // const userPubkey = req.userPubkey || new PublicKey(req.body.userPubkey);


      const result = await this.predictionService.placePrediction({
        roundId,
        outcome,
        amount,
      });

      logger.info('Prediction placed', { roundId, outcome, amount });

      res.status(201).json({
        success: true,
        data: {
          signature: result.signature,
          predictionPda: result.predictionPda.toBase58(),
          amount: result.amount,
          explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
        },
      });
    } catch (error) {
      logger.error('Failed to place prediction', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place prediction',
      });
    }
  };

  /**
   * GET /api/predictions/user/:address - Get user's predictions
   */
  public getUserPredictions = async (req: Request, res: Response): Promise<void> => {
    try {
      const userPubkey = new PublicKey(req.params.address);
      
      // Get all predictions and filter by user
      const allPredictions = await (this.predictionService as any).programService.program.account.prediction.all();
      
      const userPredictions = allPredictions
        .filter((pred: any) => pred.account.user.equals(userPubkey))
        .map((pred: any) => ({
          roundId: pred.account.roundId.toNumber(),
          outcome: pred.account.outcome,
          amount: pred.account.amount.toNumber(),
          timestamp: pred.account.timestamp.toNumber(),
          claimed: pred.account.claimed,
          address: pred.publicKey.toBase58(),
        }));

      res.json({
        success: true,
        data: userPredictions,
        count: userPredictions.length,
      });
    } catch (error) {
      logger.error('Failed to get user predictions', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user predictions',
      });
    }
  };

  /**
   * GET /api/predictions/round/:roundId - Get predictions for a round
   */
  public getRoundPredictions = async (req: Request, res: Response): Promise<void> => {
    try {
      const roundId = parseInt(req.params.roundId);
      const predictions = await this.predictionService.getPredictionsForRound(roundId);

      const formattedPredictions = predictions.map((pred: any) => ({
        user: pred.account.user.toBase58(),
        outcome: pred.account.outcome,
        amount: pred.account.amount.toNumber(),
        timestamp: pred.account.timestamp.toNumber(),
        claimed: pred.account.claimed,
      }));

      res.json({
        success: true,
        data: formattedPredictions,
        count: formattedPredictions.length,
      });
    } catch (error) {
      logger.error('Failed to get round predictions', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get round predictions',
      });
    }
  };

  /**
   * GET /api/predictions/round/:roundId/distribution - Get pool distribution
   */
  public getPoolDistribution = async (req: Request, res: Response): Promise<void> => {
    try {
      const roundId = parseInt(req.params.roundId);
      const distribution = await this.predictionService.calculatePoolDistribution(roundId);

      res.json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      logger.error('Failed to get pool distribution', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pool distribution',
      });
    }
  };
}
