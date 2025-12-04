import { BaseRepository } from './base.repository';

export interface UserStats {
  id: number;
  user_pubkey: string;
  total_predictions: number;
  total_wins: number;
  total_losses: number;
  total_wagered: bigint;
  total_won: bigint;
  net_profit: bigint;
  current_streak: number;
  best_streak: number;
  rank?: number;
  reputation_score: number;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository extends BaseRepository<UserStats> {
  constructor() {
    super('user_stats');
  }

  async findByPubkey(pubkey: string): Promise<UserStats | null> {
    const result = await this.query(
      'SELECT * FROM user_stats WHERE user_pubkey = $1',
      [pubkey]
    );
    return result.rows[0] || null;
  }

  async findOrCreate(pubkey: string): Promise<UserStats> {
    let user = await this.findByPubkey(pubkey);
    if (!user) {
      user = await this.create({ user_pubkey: pubkey } as Partial<UserStats>);
    }
    return user;
  }

  async incrementPredictions(pubkey: string, amount: bigint): Promise<UserStats | null> {
    const result = await this.query(
      `UPDATE user_stats 
       SET total_predictions = total_predictions + 1,
           total_wagered = total_wagered + $1,
           updated_at = NOW()
       WHERE user_pubkey = $2
       RETURNING *`,
      [amount.toString(), pubkey]
    );
    return result.rows[0] || null;
  }

  async recordWin(pubkey: string, payoutAmount: bigint): Promise<UserStats | null> {
    const result = await this.query(
      `UPDATE user_stats 
       SET total_wins = total_wins + 1,
           total_won = total_won + $1,
           net_profit = net_profit + $1,
           current_streak = current_streak + 1,
           best_streak = GREATEST(best_streak, current_streak + 1),
           reputation_score = reputation_score + 10,
           updated_at = NOW()
       WHERE user_pubkey = $2
       RETURNING *`,
      [payoutAmount.toString(), pubkey]
    );
    return result.rows[0] || null;
  }

  async recordLoss(pubkey: string, lostAmount: bigint): Promise<UserStats | null> {
    const result = await this.query(
      `UPDATE user_stats 
       SET total_losses = total_losses + 1,
           net_profit = net_profit - $1,
           current_streak = 0,
           updated_at = NOW()
       WHERE user_pubkey = $2
       RETURNING *`,
      [lostAmount.toString(), pubkey]
    );
    return result.rows[0] || null;
  }

  async getLeaderboard(limit = 100, offset = 0): Promise<UserStats[]> {
    const result = await this.query(
      `SELECT * FROM user_stats 
       WHERE total_predictions > 0
       ORDER BY net_profit DESC, total_wins DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async updateRankings(): Promise<void> {
    await this.query(`
      UPDATE user_stats
      SET rank = ranked.rank
      FROM (
        SELECT user_pubkey, ROW_NUMBER() OVER (ORDER BY net_profit DESC, total_wins DESC) as rank
        FROM user_stats
        WHERE total_predictions > 0
      ) ranked
      WHERE user_stats.user_pubkey = ranked.user_pubkey
    `);
  }

  async getTopWinners(limit = 10): Promise<UserStats[]> {
    const result = await this.query(
      `SELECT * FROM user_stats 
       WHERE total_wins > 0
       ORDER BY total_won DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getTopStreaks(limit = 10): Promise<UserStats[]> {
    const result = await this.query(
      `SELECT * FROM user_stats 
       WHERE best_streak > 0
       ORDER BY best_streak DESC, current_streak DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getGlobalStats(): Promise<{
    totalUsers: number;
    totalPredictions: number;
    totalVolume: string;
    totalWinnings: string;
  }> {
    const result = await this.query(`
      SELECT 
        COUNT(*) as total_users,
        COALESCE(SUM(total_predictions), 0) as total_predictions,
        COALESCE(SUM(total_wagered), 0) as total_volume,
        COALESCE(SUM(total_won), 0) as total_winnings
      FROM user_stats
    `);
    return result.rows[0];
  }
}
