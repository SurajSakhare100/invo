import { Router } from 'express';
import { getAnalyticsReport } from '../controllers/analyticsController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All analytics routes require authentication
router.use(protect);

// GET /api/analytics/report?period=6m
router.get('/report', getAnalyticsReport);

export default router;
