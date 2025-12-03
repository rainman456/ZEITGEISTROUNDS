import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { AdminService } from '../services/admin.service';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export interface AuthRequest extends Request {
  userPubkey?: PublicKey;
  isAdmin?: boolean;
}

/**
 * Middleware to verify admin access
 */
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminPubkey = req.headers['x-admin-pubkey'] as string;
    const message = req.headers['x-message'] as string;
    const signature = req.headers['x-signature'] as string;
    
    if (!adminPubkey || !message || !signature) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication required (pubkey, message, signature)',
      });
      return;
    }

    // Verify signature
    const pubkeyBytes = bs58.decode(adminPubkey);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubkeyBytes
    );
    
    if (!isValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature',
      });
      return;
    }

    // Check if pubkey is admin
    const adminService = new AdminService();
    const pubkey = new PublicKey(adminPubkey);
    const isAdmin = await adminService.isAdmin(pubkey);

    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    req.userPubkey = pubkey;
    req.isAdmin = true;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Middleware to extract user public key from request
 */
export function extractUserPubkey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const userPubkey = req.headers['x-user-pubkey'] as string;
    
    if (userPubkey) {
      req.userPubkey = new PublicKey(userPubkey);
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid user public key',
    });
  }
}
