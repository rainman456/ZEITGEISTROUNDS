import { BaseRepository } from './base.repository';

export interface Round {
  id: number;
  round_pubkey: string;
  round_id: bigint;
  title: string;
  description?: string;
  category?: string;
  betting_start: bigint;
  betting_end: bigint;
  settlement_time?: bigint;
  total_pool: bigint;
  total_predictions: number;
  status: 'pending' | 'active' | 'betting_closed' | 'settled' | 'cancelled';
  outcome?: number;
  is_cancelled: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export class RoundRepository extends BaseRepository<Round> {
  constructor() {
    super('rounds');
  }

  async findByRoundId(roundId: bigint): Promise<Round | null> {
    const result = await this.query(
      'SELECT * FROM rounds WHERE round_id = $1',
      [roundId.toString()]
    );
    return result.rows[0] || null;
  }

  async findByPubkey(pubkey: string): Promise<Round | null> {
    const result = await this.query(
      'SELECT * FROM rounds WHERE round_pubkey = $1',
      [pubkey]
    );
    return result.rows[0] || null;
  }

  async findByStatus(status: string, limit = 50, offset = 0): Promise<Round[]> {
    const result = await this.query(
      'SELECT * FROM rounds WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [status, limit, offset]
    );
    return result.rows;
  }

  async findActive(): Promise<Round[]> {
    const result = await this.query(
      `SELECT * FROM rounds 
       WHERE status = 'active' 
       AND betting_end > EXTRACT(EPOCH FROM NOW())::BIGINT 
       ORDER BY betting_end ASC`
    );
    return result.rows;
  }

  async findReadyToClose(): Promise<Round[]> {
    const result = await this.query(
      `SELECT * FROM rounds 
       WHERE status = 'active' 
       AND betting_end <= EXTRACT(EPOCH FROM NOW())::BIGINT 
       ORDER BY betting_end ASC`
    );
    return result.rows;
  }

  async findReadyToSettle(): Promise<Round[]> {
    const result = await this.query(
      `SELECT * FROM rounds 
       WHERE status = 'betting_closed' 
       AND settlement_time IS NOT NULL 
       AND settlement_time <= EXTRACT(EPOCH FROM NOW())::BIGINT 
       ORDER BY settlement_time ASC`
    );
    return result.rows;
  }

  async updateStatus(roundId: bigint, status: string): Promise<Round | null> {
    const result = await this.query(
      'UPDATE rounds SET status = $1, updated_at = NOW() WHERE round_id = $2 RETURNING *',
      [status, roundId.toString()]
    );
    return result.rows[0] || null;
  }

  async updatePool(roundId: bigint, totalPool: bigint, totalPredictions: number): Promise<Round | null> {
    const result = await this.query(
      `UPDATE rounds 
       SET total_pool = $1, total_predictions = $2, updated_at = NOW() 
       WHERE round_id = $3 
       RETURNING *`,
      [totalPool.toString(), totalPredictions, roundId.toString()]
    );
    return result.rows[0] || null;
  }

  async settle(roundId: bigint, outcome: number): Promise<Round | null> {
    const result = await this.query(
      `UPDATE rounds 
       SET status = 'settled', outcome = $1, settlement_time = EXTRACT(EPOCH FROM NOW())::BIGINT, updated_at = NOW() 
       WHERE round_id = $2 
       RETURNING *`,
      [outcome, roundId.toString()]
    );
    return result.rows[0] || null;
  }

  async cancel(roundId: bigint): Promise<Round | null> {
    const result = await this.query(
      `UPDATE rounds 
       SET status = 'cancelled', is_cancelled = TRUE, updated_at = NOW() 
       WHERE round_id = $1 
       RETURNING *`,
      [roundId.toString()]
    );
    return result.rows[0] || null;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    settled: number;
    totalVolume: string;
  }> {
    const result = await this.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'settled') as settled,
        COALESCE(SUM(total_pool), 0) as total_volume
      FROM rounds
    `);
    return result.rows[0];
  }
}
