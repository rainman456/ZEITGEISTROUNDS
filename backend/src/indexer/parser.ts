import { Program, BorshCoder, Event } from '@project-serum/anchor';
import { VersionedTransactionResponse } from '@solana/web3.js';
import { logger } from '../utils/logger';

export interface ParsedEvent {
  type: string;
  data: any;
  signature: string;
  slot: bigint;
  timestamp: number;
}

export class EventParser {
  private program: Program;
  private eventParser: BorshCoder;

  constructor(program: Program) {
    this.program = program;
    this.eventParser = new BorshCoder(program.idl);
  }

  async parseTransaction(
    tx: VersionedTransactionResponse,
    signature: string,
    slot: bigint
  ): Promise<ParsedEvent[]> {
    const events: ParsedEvent[] = [];

    try {
      if (!tx.meta?.logMessages) {
        return events;
      }

      // Parse events from logs
      const parsedEvents = this.parseLogsForEvents(tx.meta.logMessages);

      for (const event of parsedEvents) {
        events.push({
          type: event.name,
          data: event.data,
          signature,
          slot,
          timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
        });
      }

      logger.debug(`Parsed ${events.length} events from transaction ${signature}`);
    } catch (error) {
      logger.error(`Error parsing transaction ${signature}:`, error);
    }

    return events;
  }

  private parseLogsForEvents(logs: string[]): Event[] {
    const events: Event[] = [];

    for (const log of logs) {
      // Look for program event logs
      if (log.startsWith('Program data: ')) {
        try {
          const eventData = log.slice('Program data: '.length);
          const event = this.eventParser.events.decode(eventData);
          
          if (event) {
            events.push(event);
          }
        } catch (error) {
          // Not all program data logs are events, skip silently
          continue;
        }
      }
    }

    return events;
  }

  parseEventData(eventType: string, data: any): any {
    try {
      switch (eventType) {
        case 'RoundCreated':
          return this.parseRoundCreated(data);
        
        case 'PredictionPlaced':
          return this.parsePredictionPlaced(data);
        
        case 'BettingClosed':
          return this.parseBettingClosed(data);
        
        case 'RoundSettled':
          return this.parseRoundSettled(data);
        
        case 'WinningsClaimed':
          return this.parseWinningsClaimed(data);
        
        case 'RoundCancelled':
          return this.parseRoundCancelled(data);
        
        case 'TournamentCreated':
          return this.parseTournamentCreated(data);
        
        default:
          logger.warn(`Unknown event type: ${eventType}`);
          return data;
      }
    } catch (error) {
      logger.error(`Error parsing event data for ${eventType}:`, error);
      return data;
    }
  }

  private parseRoundCreated(data: any) {
    return {
      roundId: data.roundId?.toString(),
      roundPubkey: data.round?.toString(),
      title: data.title,
      description: data.description,
      category: data.category,
      bettingStart: data.bettingStart?.toString(),
      bettingEnd: data.bettingEnd?.toString(),
      createdBy: data.creator?.toString(),
    };
  }

  private parsePredictionPlaced(data: any) {
    return {
      roundId: data.roundId?.toString(),
      predictionPubkey: data.prediction?.toString(),
      userPubkey: data.user?.toString(),
      predictedOutcome: data.predictedOutcome,
      amount: data.amount?.toString(),
      timestamp: data.timestamp?.toString(),
    };
  }

  private parseBettingClosed(data: any) {
    return {
      roundId: data.roundId?.toString(),
      roundPubkey: data.round?.toString(),
      totalPool: data.totalPool?.toString(),
      totalPredictions: data.totalPredictions,
      closedAt: data.closedAt?.toString(),
    };
  }

  private parseRoundSettled(data: any) {
    return {
      roundId: data.roundId?.toString(),
      roundPubkey: data.round?.toString(),
      outcome: data.outcome,
      totalPool: data.totalPool?.toString(),
      winningPool: data.winningPool?.toString(),
      settledAt: data.settledAt?.toString(),
    };
  }

  private parseWinningsClaimed(data: any) {
    return {
      roundId: data.roundId?.toString(),
      predictionPubkey: data.prediction?.toString(),
      userPubkey: data.user?.toString(),
      amount: data.amount?.toString(),
      claimedAt: data.claimedAt?.toString(),
    };
  }

  private parseRoundCancelled(data: any) {
    return {
      roundId: data.roundId?.toString(),
      roundPubkey: data.round?.toString(),
      reason: data.reason,
      cancelledAt: data.cancelledAt?.toString(),
    };
  }

  private parseTournamentCreated(data: any) {
    return {
      tournamentId: data.tournamentId?.toString(),
      tournamentPubkey: data.tournament?.toString(),
      name: data.name,
      startTime: data.startTime?.toString(),
      endTime: data.endTime?.toString(),
      prizePool: data.prizePool?.toString(),
      createdBy: data.creator?.toString(),
    };
  }
}
