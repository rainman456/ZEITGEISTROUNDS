import { Request, Response, NextFunction } from 'express';
import { redis } from '../cache/redis';
import { config } from '../config';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

/**
 * Rate limiting middleware using Redis
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || 'unknown',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `ratelimit:${keyGenerator(req)}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      const remaining = Math.max(0, maxRequests - current);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);

      if (current > maxRequests) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request through
      next();
    }
  };
}

// Predefined rate limiters
export const apiLimiter = rateLimit({
  windowMs: config.api.rateWindow * 60 * 1000,
  maxRequests: config.api.rateLimit,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});
