import { Router, Request, Response, NextFunction } from 'express';
import { sendPaymentLink, handleWebhook } from '../controllers/razorpayController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/razorpay/webhook
 *
 * PUBLIC — no JWT auth.
 * Receives raw body (captured by the rawBody middleware in index.ts).
 * Razorpay signs each request with HMAC-SHA256 using RAZORPAY_WEBHOOK_SECRET.
 */
router.post('/webhook', handleWebhook);

// All routes below require authentication
router.use(protect);

/**
 * POST /api/razorpay/send-payment-link/:invoiceId
 *
 * Creates a Razorpay Payment Link for the given invoice and emails it to
 * the client. If a valid link already exists, the email is resent instead.
 */
router.post(
  '/send-payment-link/:invoiceId',
  (req: Request, res: Response, next: NextFunction) => {
    sendPaymentLink(req, res).catch(next);
  }
);

export default router;
