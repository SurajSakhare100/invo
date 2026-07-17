import Razorpay from 'razorpay';

/**
 * Returns a Razorpay instance using RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
 * These are always your test keys during development.
 */
export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env'
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables.');
  }
  return secret;
}
