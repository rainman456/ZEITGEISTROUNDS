import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../db/client';
import { redis } from '../cache/redis';
//import { solana } from '../solana/connection';
//import { existsSync } from 'fs';
//import { join } from 'path';

interface StartupCheck {
  name: string;
  check: () => Promise<boolean>;
  required: boolean;
}

export async function startupChecks(): Promise<void> {
  logger.info('Running startup checks...');

  const checks: StartupCheck[] = [
    {
      name: 'Environment Variables',
      check: async () => {
        try {
          // Config validation happens in config/index.ts
          logger.info('Environment variables validated');
          return true;
        } catch (error) {
          logger.error('Environment validation failed', error);
          return false;
        }
      },
      required: true,
    },
    {
      name: 'PostgreSQL Database',
      check: async () => {
        const healthy = await db.healthCheck();
        if (healthy) {
          logger.info('PostgreSQL connection established');
        } else {
          logger.error('PostgreSQL connection failed');
        }
        return healthy;
      },
      required: true,
    },
    {
      name: 'Redis Server',
      check: async () => {
        const healthy = await redis.healthCheck();
        if (healthy) {
          logger.info('Redis connection established');
        } else {
          logger.error('Redis connection failed');
        }
        return healthy;
      },
      required: true,
    },
    // {
    //   name: 'Solana RPC Endpoint',
    //   check: async () => {
    //     const healthy = await solana.healthCheck();
    //     if (healthy) {
    //       logger.info('Solana RPC connection established', {
    //         network: config.solana.network,
    //       });
    //     } else {
    //       logger.error('Solana RPC connection failed');
    //     }
    //     return healthy;
    //   },
    //   required: true,
    // },
    {
      name: 'Admin Wallet',
      check: async () => {
        try {
          const adminPubkey = config.wallets.admin.publicKey.toString();
          logger.info('Admin wallet loaded', { pubkey: adminPubkey });
          return true;
        } catch (error) {
          logger.error('Admin wallet check failed', error);
          return false;
        }
      },
      required: true,
    },
    {
      name: 'Oracle Wallet',
      check: async () => {
        try {
          const oraclePubkey = config.wallets.oracle.publicKey.toString();
          logger.info('Oracle wallet loaded', { pubkey: oraclePubkey });
          return true;
        } catch (error) {
          logger.error('Oracle wallet check failed', error);
          return false;
        }
      },
      required: true,
    },
  ];

  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        const passed = await check.check();
        return { ...check, passed };
      } catch (error) {
        logger.error(`Startup check failed: ${check.name}`, error);
        return { ...check, passed: false };
      }
    })
  );

  const failed = results.filter((r) => !r.passed);
  const requiredFailed = failed.filter((r) => r.required);

  if (requiredFailed.length > 0) {
    logger.error('Required startup checks failed:', {
      failed: requiredFailed.map((r) => r.name),
    });
    throw new Error('Startup checks failed');
  }

  if (failed.length > 0) {
    logger.warn('Some optional startup checks failed:', {
      failed: failed.map((r) => r.name),
    });
  }

  logger.info('All required startup checks passed ✓');
}
