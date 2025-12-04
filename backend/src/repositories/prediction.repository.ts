import { BaseRepository } from './base.repository';

export interface Prediction {
  id: number;
  prediction_pubkey: string;
  round_id: bigint;
  user_pubkey: string;
  predicted_outcome: number;
  amount: bigint;
  timestamp: bigint;
  is_winner?: boolean;
  payout_amount: bigint;
  is_claimed: boolean;
  claimed_at?: bigint;
  created_at: Date;
  updated_at: Date;
}

export class PredictionRepository extends BaseRepository<Prediction> {
  constructor() {
    super('predictions');
  }

  async findByPubkey(pubkey: string): Promise<Prediction | null> {
    const result = await this.query(
      'SELECT * FROM predictions WHERE prediction_pubkey = $1',
      [pubkey]
    );
    return result.rows[0] || null;
  }

  async findByRoundId(roundId: bigint, limit = 100, offset = 0): Promise<Prediction[]> {
    const result = await this.query(
      'SELECT * FROM predictions WHERE round_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [roundId.toString(), limit, offset]
    );
    return result.rows;
  }

  async findByUser(userPubkey: string, limit = 50, offset = 0): Promise<Prediction[]> {
    const result = await this.query(
      'SELECT * FROM predictions WHERE user_pubkey = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [userPubkey, limit, offset]
    );
    return result.rows;
  }

  async findByRoundAndUser(roundId: bigint, userPubkey: string): Promise<Prediction | null> {
    const result = await this.query(
      'SELECT * FROM predictions WHERE round_id = $1 AND user_pubkey = $2',
      [roundId.toString(), userPubkey]
    );
    return result.rows[0] || null;
  }

  async findWinnersByRound(roundId: bigint): Promise<Prediction[]> {
    const result = await this.query(
      'SELECT * FROM predictions WHERE round_id = $1 AND is_winner = TRUE ORDER BY amount DESC',
      [roundId.toString()]
    );
    return result.rows;
  }

  async findUnclaimedWinnings(userPubkey: string): Promise<Prediction[]> {
    const result = await this.query(
      'SELECT * FROM predictions WHERE user_pubkey = $1 AND is_winner = TRUE AND is_claimed = FALSE ORDER BY timestamp DESC',
      [userPubkey]
    );
    return result.rows;
  }

  async markAsWinner(predictionPubkey: string, payoutAmount: bigint): Promise<Prediction | null> {
    const result = await this.query(
      `UPDATE predictions 
       SET is_winner = TRUE, payout_amount = $1, updated_at = NOW() 
       WHERE prediction_pubkey = $2 
       RETURNING *`,
      [payoutAmount.toString(), predictionPubkey]
    );
    return result.rows[0] || null;
  }

  async markAsLoser(predictionPubkey: string): Promise<Prediction | null> {
    const result = await this.query(
      `UPDATE predictions 
       SET is_winner = FALSE, payout_amount = 0, updated_at = NOW() 
       WHERE prediction_pubkey = $1 
       RETURNING *`,
      [predictionPubkey]
    );
    return result.rows[0] || null;
  }

  async markAsClaimed(predictionPubkey: string): Promise<Prediction | null> {
    const result = await this.query(
      `UPDATE predictions 
       SET is_claimed = TRUE, claimed_at = EXTRACT(EPOCH FROM NOW())::BIGINT, updated_at = NOW() 
       WHERE prediction_pubkey = $1 
       RETURNING *`,
      [predictionPubkey]
    );
    return result.rows[0] || null;
  }

  async getPoolByOutcome(roundId: bigint, outcome: number): Promise<bigint> {
    const result = await this.query(
      'SELECT COALESCE(SUM(amount), 0) as pool FROM predictions WHERE round_id = $1 AND predicted_outcome = $2',
      [roundId.toString(), outcome]
    );
    return BigInt(result.rows[0].pool);
  }

  async getStats(userPubkey?: string): Promise<{
    total: number;
    totalWagered: string;
    totalWon: string;
    winRate: number;
  }> {
    const whereClause = userPubkey ? 'WHERE user_pubkey = $1' : '';
    const params = userPubkey ? [userPubkey] : [];

    const result = await this.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(amount), 0) as total_wagered,
        COALESCE(SUM(CASE WHEN is_winner = TRUE THEN payout_amount ELSE 0 END), 0) as total_won,
        CASE 
          WHEN COUNT(*) FILTER (WHERE is_winner IS NOT NULL) > 0 
          THEN (COUNT(*) FILTER (WHERE is_winner = TRUE)::FLOAT / COUNT(*) FILTER (WHERE is_winner IS NOT NULL)) * 100
          ELSE 0 
        END as win_rate
      FROM predictions
      ${whereClause}
    `, params);
    
    return result.rows[0];
  }
}
