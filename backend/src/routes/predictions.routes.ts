import { Router } from 'express';
import { PredictionsController } from '../controllers/predictions.controller';
import { validate, schemas } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();
const controller = new PredictionsController();

// Apply rate limiting
router.use(apiLimiter);

/**
 * @route   POST /api/predictions
 * @desc    Place a bet
 * @access  Public
 */
router.post('/', validate(schemas.placePrediction), controller.placePrediction);

/**
 * @route   GET /api/predictions/user/:address
 * @desc    Get user's predictions
 * @access  Public
 */
router.get('/user/:address', controller.getUserPredictions);

/**
 * @route   GET /api/predictions/round/:roundId
 * @desc    Get predictions for a round
 * @access  Public
 */
router.get('/round/:roundId', controller.getRoundPredictions);

/**
 * @route   GET /api/predictions/round/:roundId/distribution
 * @desc    Get pool distribution for a round
 * @access  Public
 */
router.get('/round/:roundId/distribution', controller.getPoolDistribution);

export { router as predictionsRouter };
