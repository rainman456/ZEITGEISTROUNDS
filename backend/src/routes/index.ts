import { Router } from 'express';
import { roundsRouter } from './rounds.routes';
import { predictionsRouter } from './predictions.routes';
import { claimsRouter } from './claims.routes';
import { usersRouter } from './users.routes';
import { adminRouter } from './admin.routes';

const router = Router();

// Mount route modules
router.use('/rounds', roundsRouter);
router.use('/predictions', predictionsRouter);
router.use('/claims', claimsRouter);
router.use('/users', usersRouter);
router.use('/admin', adminRouter);

export { router as apiRouter };
