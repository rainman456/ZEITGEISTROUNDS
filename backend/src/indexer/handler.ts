import { ParsedEvent } from './parser';
import { RoundRepository } from '../repositories/round.repository';
import { PredictionRepository } from '../repositories/prediction.repository';
import { UserRepository } from '../repositories/user.repository';
import { EventRepository } from '../repositories/event.repository';
import { logger } from '../utils/logger';
import { emitRoundUpdate, emitPredictionPlaced, emitSettlement } from '../websocket/integration';

export class EventHandler {
  private roundRepo: RoundRepository;
  private predictionRepo: PredictionRepository;
  private userRepo: UserRepository;
  private eventRepo: EventRepository;

  constructor() {
    this.roundRepo = new RoundRepository();
    this.predictionRepo = new PredictionRepository();
    this.userRepo = new UserRepository();
    this.eventRepo = new EventRepository();
  }

  async handleEvent(event: ParsedEvent): Promise<void> {
    try {
      logger.debug(`Handling event: ${event.type}`);

      // Log event to database
      await this.eventRepo.logEvent(
        event.type,
        event.data,
        event.signature,
        event.slot
      );

      // Handle specific event types
      switch (event.type) {
        case 'RoundCreated':
          await this.handleRoundCreated(event);
          break;

        case 'PredictionPlaced':
          await this.handlePredictionPlaced(event);
          break;

        case 'BettingClosed':
          await this.handleBettingClosed(event);
          break;

        case 'RoundSettled':
          await this.handleRoundSettled(event);
          break;

        case 'WinningsClaimed':
          await this.handleWinningsClaimed(event);
          break;

        case 'RoundCancelled':
          await this.handleRoundCancelled(event);
          break;

        default:
          logger.debug(`No handler for event type: ${event.type}`);
      }
    } catch (error) {
      logger.error(`Error handling event ${event.type}:`, error);
    }
  }

  private async handleRoundCreated(event: ParsedEvent): Promise<void> {
    const { data } = event;

    try {
      const round = await this.roundRepo.create({
        round_pubkey: data.roundPubkey,
        round_id: BigInt(data.roundId),
        title: data.title,
        description: data.description,
        category: data.category,
        betting_start: BigInt(data.bettingStart),
        betting_end: BigInt(data.bettingEnd),
        status: 'active',
        created_by: data.createdBy,
        total_pool: BigInt(0),
        total_predictions: 0,
        is_cancelled: false,
      } as any);

      logger.info(`Round created in DB: ${data.roundId}`);

      // Emit websocket event
      emitRoundUpdate({
        roundId: data.roundId,
        status: 'active',
        totalPool: '0',
        totalPredictions: 0,
      });
    } catch (error) {
      logger.error(`Error creating round ${data.roundId}:`, error);
    }
  }

  private async handlePredictionPlaced(event: ParsedEvent): Promise<void> {
    const { data } = event;

    try {
      // Create prediction
      const prediction = await this.predictionRepo.create({
        prediction_pubkey: data.predictionPubkey,
        round_id: BigInt(data.roundId),
        user_pubkey: data.userPubkey,
        predicted_outcome: data.predictedOutcome,
        amount: BigInt(data.amount),
        timestamp: BigInt(data.timestamp),
        is_claimed: false,
        payout_amount: BigInt(0),
      } as any);

      // Update user stats
      const user = await this.userRepo.findOrCreate(data.userPubkey);
      await this.userRepo.incrementPredictions(data.userPubkey, BigInt(data.amount));

      // Update round pool
      const round = await this.roundRepo.findByRoundId(BigInt(data.roundId));
      if (round) {
        const newPool = BigInt(round.total_pool) + BigInt(data.amount);
        const newCount = round.total_predictions + 1;
        await this.roundRepo.updatePool(BigInt(data.roundId), newPool, newCount);

        // Emit websocket event
        emitPredictionPlaced({
          roundId: data.roundId,
          userPubkey: data.userPubkey,
          predictedOutcome: data.predictedOutcome,
          amount: data.amount,
          totalPool: newPool.toString(),
          totalPredictions: newCount,
        });
      }

      logger.info(`Prediction placed: ${data.predictionPubkey}`);
    } catch (error) {
      logger.error(`Error handling prediction ${data.predictionPubkey}:`, error);
    }
  }

  private async handleBettingClosed(event: ParsedEvent): Promise<void> {
    const { data } = event;

    try {
      await this.roundRepo.updateStatus(BigInt(data.roundId), 'betting_closed');

      logger.info(`Betting closed for round: ${data.roundId}`);

      // Emit websocket event
      emitRoundUpdate({
        roundId: data.roundId,
        status: 'betting_closed',
        totalPool: data.totalPool,
        totalPredictions: data.totalPredictions,
      });
    } catch (error) {
      logger.error(`Error closing betting for round ${data.roundId}:`, error);
    }
  }

  private async handleRoundSettled(event: ParsedEvent): Promise<void> {
    const { data } = event;

    try {
      // Update round
      await this.roundRepo.settle(BigInt(data.roundId), data.outcome);

      // Get all predictions for this round
      const predictions = await this.predictionRepo.findByRoundId(BigInt(data.roundId));

      const totalPool = BigInt(data.totalPool);
      const winningPool = BigInt(data.winningPool);

      // Update predictions and user stats
      for (const prediction of predictions) {
        if (prediction.predicted_outcome === data.outcome) {
          // Winner
          const payout = winningPool > 0n
            ? (BigInt(prediction.amount) * totalPool) / winningPool
            : BigInt(0);

          await this.predictionRepo.markAsWinner(prediction.prediction_pubkey, payout);
          await this.userRepo.recordWin(prediction.user_pubkey, payout);
        } else {
          // Loser
          await this.predictionRepo.markAsLoser(prediction.prediction_pubkey);
          await this.userRepo.recordLoss(prediction.user_pubkey, BigInt(prediction.amount));
        }
      }

      // Update rankings
      await this.userRepo.updateRankings();

      logger.info(`Round settled: ${data.roundId}, outcome: ${data.outcome}`);

      // Emit websocket event
      emitSettlement({
        roundId: data.roundId,
        outcome: data.outcome,
        totalPool: data.totalPool,
        winningPool: data.winningPool,
      });
    } catch (error) {
      logger.error(`Error settling round ${data.roundId}:`, error);
    }
  }

  private async handleWinningsClaimed(event: ParsedEvent): Promise<void> {
    const { data } = event;

    try {
      await this.predictionRepo.markAsClaimed(data.predictionPubkey);

      logger.info(`Winnings claimed: ${data.predictionPubkey}, amount: ${data.amount}`);
    } catch (error) {
      logger.error(`Error handling claim ${data.predictionPubkey}:`, error);
    }
  }

  private async handleRoundCancelled(event: ParsedEvent): Promise<void> {
    const { data } = event;

    try {
      await this.roundRepo.cancel(BigInt(data.roundId));

      logger.info(`Round cancelled: ${data.roundId}`);

      // Emit websocket event
      emitRoundUpdate({
        roundId: data.roundId,
        status: 'cancelled',
      });
    } catch (error) {
      logger.error(`Error cancelling round ${data.roundId}:`, error);
    }
  }
}
