import { BaseRepository } from './base.repository';

export interface EventLog {
  id: number;
  event_type: string;
  round_id?: bigint;
  user_pubkey?: string;
  data?: any;
  signature?: string;
  slot?: bigint;
  created_at: Date;
}

export class EventRepository extends BaseRepository<EventLog> {
  constructor() {
    super('events_log');
  }

  async logEvent(
    eventType: string,
    data: any,
    signature?: string,
    slot?: bigint,
    roundId?: bigint,
    userPubkey?: string
  ): Promise<EventLog> {
    const result = await this.query(
      `INSERT INTO events_log (event_type, round_id, user_pubkey, data, signature, slot) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        eventType,
        roundId?.toString() || null,
        userPubkey || null,
        JSON.stringify(data),
        signature || null,
        slot?.toString() || null,
      ]
    );
    return result.rows[0];
  }

  async findByType(eventType: string, limit = 100, offset = 0): Promise<EventLog[]> {
    const result = await this.query(
      'SELECT * FROM events_log WHERE event_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [eventType, limit, offset]
    );
    return result.rows;
  }

  async findByRound(roundId: bigint, limit = 100, offset = 0): Promise<EventLog[]> {
    const result = await this.query(
      'SELECT * FROM events_log WHERE round_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [roundId.toString(), limit, offset]
    );
    return result.rows;
  }

  async findByUser(userPubkey: string, limit = 100, offset = 0): Promise<EventLog[]> {
    const result = await this.query(
      'SELECT * FROM events_log WHERE user_pubkey = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userPubkey, limit, offset]
    );
    return result.rows;
  }

  async findBySignature(signature: string): Promise<EventLog | null> {
    const result = await this.query(
      'SELECT * FROM events_log WHERE signature = $1',
      [signature]
    );
    return result.rows[0] || null;
  }

  async findRecent(limit = 50): Promise<EventLog[]> {
    const result = await this.query(
      'SELECT * FROM events_log ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  async getEventStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
  }> {
    const totalResult = await this.query('SELECT COUNT(*) as total FROM events_log');
    const typeResult = await this.query(`
      SELECT event_type, COUNT(*) as count 
      FROM events_log 
      GROUP BY event_type 
      ORDER BY count DESC
    `);

    const eventsByType: Record<string, number> = {};
    typeResult.rows.forEach((row) => {
      eventsByType[row.event_type] = parseInt(row.count);
    });

    return {
      totalEvents: parseInt(totalResult.rows[0].total),
      eventsByType,
    };
  }

  async cleanup(daysToKeep = 30): Promise<number> {
    const result = await this.query(
      `DELETE FROM events_log 
       WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'`
    );
    return result.rowCount || 0;
  }
}
