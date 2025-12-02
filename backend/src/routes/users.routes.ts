import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { validate, schemas } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();
const controller = new UsersController();

// Apply rate limiting
router.use(apiLimiter);

/**
 * @route   GET /api/users/:address/stats
 * @desc    Get user statistics
 * @access  Public
 */
router.get('/:address/stats', validate(schemas.getUserStats), controller.getUserStats);

/**
 * @route   GET /api/leaderboard
 * @desc    Get top players
 * @access  Public
 */
router.get('/leaderboard', controller.getLeaderboard);

export { router as usersRouter };
