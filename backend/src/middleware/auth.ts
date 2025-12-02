import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { AdminService } from '../services/admin.service';

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
    const adminService = new AdminService();
    
    // In production, you'd verify a signed message or JWT
    // For now, we check if the request includes admin credentials
    const adminPubkey = req.headers['x-admin-pubkey'] as string;
    
    if (!adminPubkey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin public key required',
      });
      return;
    }

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
