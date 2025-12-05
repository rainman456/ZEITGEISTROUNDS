import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisClient {
  private client: Redis;
  private pubSubClient: Redis;
  private static instance: RedisClient;
  private connected: boolean = false;

  private constructor() {
    // Parse REDIS_URL and create main Redis client for caching
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 5,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.error('Redis max retry attempts reached');
          return null; // Stop retrying
        }
        // Exponential backoff with max 3000ms
        const delay = Math.min(times * 200, 3000);
        logger.info(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      enableReadyCheck: true,
      connectTimeout: 60000, // Max retry time
    });

    // Create separate Redis client for pub/sub
    this.pubSubClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 5,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 200, 3000);
      },
      enableReadyCheck: true,
      connectTimeout: 60000,
    });

    // Set up Redis event listeners for main client
    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.connected = true;
    });

    this.client.on('reconnecting', (delay: number) => {
      logger.info(`Redis client reconnecting in ${delay}ms`);
    });

    // Set up event listeners for pub/sub client
    this.pubSubClient.on('error', (err) => {
      logger.error('Redis pub/sub client error', err);
    });

    this.pubSubClient.on('ready', () => {
      logger.info('Redis pub/sub client ready');
    });

    this.pubSubClient.on('reconnecting', (delay: number) => {
      logger.info(`Redis pub/sub client reconnecting in ${delay}ms`);
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error', { key, error });
      return null;
    }
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error', { key, error });
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error', { key, error });
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error });
      return false;
    }
  }

  public async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis INCR error', { key, error });
      return 0;
    }
  }

  public async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, error });
    }
  }

  public async hset(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hset(key, field, value);
    } catch (error) {
      logger.error('Redis HSET error', { key, field, error });
    }
  }

  public async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error('Redis HGET error', { key, field, error });
      return null;
    }
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error('Redis HGETALL error', { key, error });
      return {};
    }
  }

  /**
   * Connect to Redis with retry logic
   */
  public async connect(): Promise<void> {
    const maxRetries = 5;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting Redis connection (attempt ${attempt}/${maxRetries})...`);
        
        // Test connection with PING command
        const result = await this.client.ping();
        
        if (result === 'PONG') {
          logger.info('Redis connected successfully');
          this.connected = true;
          return;
        }
      } catch (error) {
        logger.error(`Redis connection attempt ${attempt} failed`, error);
        
        if (attempt === maxRetries) {
          logger.error('All Redis connection retries failed');
          throw new Error('Failed to connect to Redis after maximum retries');
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', error);
      return false;
    }
  }

  public getPubSubClient(): Redis {
    return this.pubSubClient;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async close(): Promise<void> {
    await this.client.quit();
    await this.pubSubClient.quit();
    this.connected = false;
    logger.info('Redis clients closed');
  }
}

export const redis = RedisClient.getInstance();
