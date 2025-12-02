import { Router } from 'express';
import { RoundsController } from '../controllers/rounds.controller';
import { validate, schemas } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();
const controller = new RoundsController();

// Apply rate limiting to all routes
router.use(apiLimiter);

/**
 * @route   POST /api/rounds
 * @desc    Create new round
 * @access  Public (should be admin in production)
 */
router.post('/', validate(schemas.createRound), controller.createRound);

/**
 * @route   GET /api/rounds/active
 * @desc    Get current active round
 * @access  Public
 */
router.get('/active', controller.getActiveRound);

/**
 * @route   GET /api/rounds
 * @desc    Get all rounds
 * @access  Public
 */
router.get('/', controller.getAllRounds);

/**
 * @route   GET /api/rounds/:id
 * @desc    Get round details
 * @access  Public
 */
router.get('/:id', validate(schemas.getRound), controller.getRound);

export { router as roundsRouter };
