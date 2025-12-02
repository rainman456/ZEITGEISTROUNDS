import dotenv from 'dotenv';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

dotenv.config();

interface Config {
  server: {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
  };
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  redis: {
    url: string;
    host: string;
    port: number;
  };
  solana: {
    rpcUrl: string;
    network: string;
    programId: PublicKey;
  };
  wallets: {
    admin: Keypair;
    oracle: Keypair;
  };
  api: {
    rateLimit: number;
    rateWindow: number;
  };
  logging: {
    level: string;
  };
  security: {
    jwtSecret: string;
  };
}

function loadKeypair(privateKeyBase58: string | undefined, name: string): Keypair {
  if (!privateKeyBase58) {
    throw new Error(`${name} private key not found in environment variables`);
  }
  
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Failed to load ${name} keypair: ${error}`);
  }
}

function validateConfig(): Config {
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'SOLANA_RPC_URL',
    'PROGRAM_ID',
    'ADMIN_WALLET_PRIVATE_KEY',
    'ORACLE_WALLET_PRIVATE_KEY',
    'JWT_SECRET'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    server: {
      port: parseInt(process.env.PORT || '3001', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },
    database: {
      url: process.env.DATABASE_URL!,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'zeitgeist',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    },
    redis: {
      url: process.env.REDIS_URL!,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    solana: {
      rpcUrl: process.env.SOLANA_RPC_URL!,
      network: process.env.SOLANA_NETWORK || 'devnet',
      programId: new PublicKey(process.env.PROGRAM_ID!),
    },
    wallets: {
      admin: loadKeypair(process.env.ADMIN_WALLET_PRIVATE_KEY, 'Admin'),
      oracle: loadKeypair(process.env.ORACLE_WALLET_PRIVATE_KEY, 'Oracle'),
    },
    api: {
      rateLimit: parseInt(process.env.API_RATE_LIMIT || '100', 10),
      rateWindow: parseInt(process.env.API_RATE_WINDOW || '15', 10),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
    security: {
      jwtSecret: process.env.JWT_SECRET!,
    },
  };
}

export const config = validateConfig();
