import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { validate, schemas } from '../middleware/validation';
import { requireAdmin } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimit';

const router = Router();
const controller = new AdminController();

// Apply strict rate limiting and admin auth to all routes
router.use(strictLimiter);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin statistics
 * @access  Admin only
 */
router.get('/stats', controller.getAdminStats);

/**
 * @route   POST /api/admin/pause
 * @desc    Pause the program
 * @access  Admin only
 */
router.post('/pause', controller.pauseProgram);

/**
 * @route   POST /api/admin/unpause
 * @desc    Unpause the program
 * @access  Admin only
 */
router.post('/unpause', controller.unpauseProgram);

/**
 * @route   POST /api/admin/rounds/:id/cancel
 * @desc    Emergency cancel a round
 * @access  Admin only
 */
router.post('/rounds/:id/cancel', validate(schemas.emergencyCancel), controller.emergencyCancel);

/**
 * @route   POST /api/rounds/:id/settle
 * @desc    Settle round
 * @access  Admin only
 */
router.post('/rounds/:id/settle', validate(schemas.settleRound), controller.settleRound);

/**
 * @route   GET /api/admin/rounds/pending
 * @desc    Get rounds needing action
 * @access  Admin only
 */
router.get('/rounds/pending', controller.getRoundsNeedingAction);

export { router as adminRouter };
