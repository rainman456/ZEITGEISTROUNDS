import { Router } from 'express';
import { ClaimsController } from '../controllers/claims.controller';
import { validate, schemas } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();
const controller = new ClaimsController();

// Apply rate limiting
router.use(apiLimiter);

/**
 * @route   POST /api/claims/:roundId
 * @desc    Claim winnings
 * @access  Public
 */
router.post('/:roundId', validate(schemas.claimWinnings), controller.claimWinnings);

/**
 * @route   GET /api/claims/:roundId/check/:address
 * @desc    Check if user has claimable winnings
 * @access  Public
 */
router.get('/:roundId/check/:address', controller.checkClaimable);

export { router as claimsRouter };
