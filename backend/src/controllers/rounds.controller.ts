import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { RoundService, VerificationMethod } from '../services/round.service';
import { logger } from '../utils/logger';

export class RoundsController {
  private roundService: RoundService;

  constructor() {
    this.roundService = new RoundService();
  }

  /**
   * POST /api/rounds - Create new round
   */
  public createRound = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        question,
        startTime,
        endTime,
        numOutcomes,
        verificationType,
        targetValue,
        dataSource,
        oracle,
      } = req.body;

      const result = await this.roundService.createRound({
        question,
        startTime,
        endTime,
        numOutcomes,
        verificationType: verificationType as VerificationMethod,
        targetValue,
        dataSource: new PublicKey(dataSource),
        oracle: new PublicKey(oracle),
      });

      logger.info('Round created', { roundId: result.roundId });

      res.status(201).json({
        success: true,
        data: {
          roundId: result.roundId,
          roundPda: result.roundPda.toBase58(),
          vaultPda: result.vaultPda.toBase58(),
          signature: result.signature,
          explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
        },
      });
    } catch (error) {
      logger.error('Failed to create round', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create round',
      });
    }
  };

  /**
   * GET /api/rounds/:id - Get round details
   */
  public getRound = async (req: Request, res: Response): Promise<void> => {
    try {
      const roundId = parseInt(req.params.id);
      const round = await this.roundService.getRound(roundId);

      if (!round) {
        res.status(404).json({
          success: false,
          error: 'Round not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          roundId: round.data.roundId.toNumber(),
          question: round.data.question,
          status: Object.keys(round.data.status)[0],
          creator: round.data.creator.toBase58(),
          startTime: round.data.startTime.toNumber(),
          endTime: round.data.endTime.toNumber(),
          bettingCloseTime: round.data.bettingCloseTime.toNumber(),
          totalPool: round.data.totalPool.toNumber(),
          totalPredictions: round.data.totalPredictions,
          winningPool: round.data.winningPool.toNumber(),
          numOutcomes: round.data.numOutcomes,
          winningOutcome: round.data.winningOutcome === 255 ? null : round.data.winningOutcome,
          verificationMethod: Object.keys(round.data.verificationMethod)[0],
          targetValue: round.data.targetValue.toNumber(),
          dataSource: round.data.dataSource.toBase58(),
          oracle: round.data.oracle.toBase58(),
        },
      });
    } catch (error) {
      logger.error('Failed to get round', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get round',
      });
    }
  };

  /**
   * GET /api/rounds/active - Get current active round
   */
  public getActiveRound = async (req: Request, res: Response): Promise<void> => {
    try {
      const allRounds = await this.roundService.getAllRounds();
      const now = Math.floor(Date.now() / 1000);

      // Find active round (betting is open)
      const activeRound = allRounds.find((round) => {
        const status = Object.keys(round.status)[0];
        const startTime = round.startTime.toNumber();
        const bettingCloseTime = round.bettingCloseTime.toNumber();
        
        return (
          status === 'active' &&
          now >= startTime &&
          now < bettingCloseTime
        );
      });

      if (!activeRound) {
        res.status(404).json({
          success: false,
          error: 'No active round found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          roundId: activeRound.roundId.toNumber(),
          question: activeRound.question,
          status: Object.keys(activeRound.status)[0],
          startTime: activeRound.startTime.toNumber(),
          endTime: activeRound.endTime.toNumber(),
          bettingCloseTime: activeRound.bettingCloseTime.toNumber(),
          totalPool: activeRound.totalPool.toNumber(),
          totalPredictions: activeRound.totalPredictions,
          numOutcomes: activeRound.numOutcomes,
        },
      });
    } catch (error) {
      logger.error('Failed to get active round', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active round',
      });
    }
  };

  /**
   * GET /api/rounds - Get all rounds
   */
  public getAllRounds = async (req: Request, res: Response): Promise<void> => {
    try {
      const allRounds = await this.roundService.getAllRounds();

      const rounds = allRounds.map((round) => ({
        roundId: round.roundId.toNumber(),
        question: round.question,
        status: Object.keys(round.status)[0],
        startTime: round.startTime.toNumber(),
        endTime: round.endTime.toNumber(),
        totalPool: round.totalPool.toNumber(),
        totalPredictions: round.totalPredictions,
        numOutcomes: round.numOutcomes,
        winningOutcome: round.winningOutcome === 255 ? null : round.winningOutcome,
      }));

      res.json({
        success: true,
        data: rounds,
        count: rounds.length,
      });
    } catch (error) {
      logger.error('Failed to get all rounds', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get rounds',
      });
    }
  };
}
