import { Request, Response } from 'express';
import crypto from 'crypto';
import Invoice from '../models/Invoice';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getRazorpayClient, getWebhookSecret } from '../utils/razorpayClient';
import {
  sendPaymentLinkEmail,
  sendPaymentConfirmationEmail,
} from '../utils/emailService';

// ─── POST /api/razorpay/send-payment-link/:invoiceId ─────────────────────────
export const sendPaymentLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    const [invoice, user] = await Promise.all([
      Invoice.findOne({ _id: req.params.invoiceId, user: userId }),
      User.findById(userId),
    ]);

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Resend existing active link without creating a new one
    if (
      invoice.razorpayPaymentLinkId &&
      invoice.razorpayPaymentLinkStatus !== 'cancelled' &&
      invoice.razorpayPaymentLinkStatus !== 'expired'
    ) {
      await sendPaymentLinkEmail({
        toEmail: invoice.clientEmail,
        toName: invoice.client,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString(),
        paymentUrl: invoice.razorpayPaymentLinkShortUrl || invoice.razorpayPaymentLinkUrl,
        senderName: user.name,
        senderCompany: user.company || '',
      });

      res.json({
        success: true,
        message: 'Payment link email resent to customer',
        data: {
          paymentLinkId: invoice.razorpayPaymentLinkId,
          paymentUrl: invoice.razorpayPaymentLinkShortUrl || invoice.razorpayPaymentLinkUrl,
        },
      });
      return;
    }

    const amountInSmallestUnit = Math.round(invoice.amount * 100);

    let razorpay: ReturnType<typeof getRazorpayClient>;
    try {
      razorpay = getRazorpayClient();
    } catch (credErr) {
      res.status(500).json({ success: false, message: (credErr as Error).message });
      return;
    }

    const paymentLinkPayload = {
      amount: amountInSmallestUnit,
      currency: invoice.currency.toUpperCase(),
      accept_partial: false,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      customer: {
        name: invoice.client,
        email: invoice.clientEmail,
      },
      notify: {
        email: true,
        sms: false,
      },
      reminder_enable: true,
      notes: {
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        userId: String(userId),
      },
      callback_url: `${process.env.CLIENT_URL}/payment-success`,
      callback_method: 'get',
    };

    let paymentLink: Record<string, string>;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paymentLink = await (razorpay as any).paymentLink.create(paymentLinkPayload);
    } catch (rzpErr) {
      res.status(502).json({ success: false, message: 'Razorpay API error', error: rzpErr });
      return;
    }

    invoice.razorpayPaymentLinkId = paymentLink.id;
    invoice.razorpayPaymentLinkUrl = paymentLink.long_url;
    invoice.razorpayPaymentLinkShortUrl = paymentLink.short_url;
    invoice.razorpayPaymentLinkStatus = paymentLink.status;
    invoice.status = 'Pending';
    await invoice.save();

    try {
      await sendPaymentLinkEmail({
        toEmail: invoice.clientEmail,
        toName: invoice.client,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString(),
        paymentUrl: paymentLink.short_url || paymentLink.long_url,
        senderName: user.name,
        senderCompany: user.company || '',
      });
    } catch {
      // Non-fatal: link was created, email failed
    }

    res.status(201).json({
      success: true,
      message: 'Payment link created and emailed to customer',
      data: {
        paymentLinkId: paymentLink.id,
        paymentUrl: paymentLink.short_url || paymentLink.long_url,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: 'Failed to create payment link', error });
  }
};

// ─── POST /api/razorpay/webhook ───────────────────────────────────────────────
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    if (!signature) {
      res.status(400).json({ success: false, message: 'Missing Razorpay signature' });
      return;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.status(400).json({ success: false, message: 'Raw body not available' });
      return;
    }

    let webhookSecret: string;
    try {
      webhookSecret = getWebhookSecret();
    } catch {
      res.status(500).json({ success: false, message: 'Webhook secret not configured' });
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      )
    ) {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const eventType: string = event.event;

    if (eventType === 'payment_link.paid') {
      const paymentLinkEntity = event.payload?.payment_link?.entity;
      const paymentEntity = event.payload?.payment?.entity;

      if (!paymentLinkEntity || !paymentEntity) {
        res.status(400).json({ success: false, message: 'Malformed webhook payload' });
        return;
      }

      const paymentLinkId: string = paymentLinkEntity.id;
      const razorpayPaymentId: string = paymentEntity.id;
      const paidAt = new Date(paymentEntity.created_at * 1000);

      const invoice = await Invoice.findOne({ razorpayPaymentLinkId: paymentLinkId });
      if (!invoice) {
        res.json({ success: true, message: 'Payment link not matched to an invoice' });
        return;
      }

      const user = await User.findById(invoice.user);

      invoice.status = 'Success';
      invoice.razorpayPaymentLinkStatus = 'paid';
      await invoice.save();

      const transaction = new Transaction({
        invoice: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        customer: null,
        customerName: invoice.client,
        amount: invoice.amount,
        currency: invoice.currency,
        paymentMethod: 'Razorpay',
        status: 'Success',
        referenceNumber: razorpayPaymentId,
        paymentDate: paidAt,
        notes: `Paid via Razorpay Payment Link (${paymentLinkId})`,
        user: invoice.user,
      });
      await transaction.save();

      if (user) {
        try {
          await sendPaymentConfirmationEmail({
            toEmail: invoice.clientEmail,
            toName: invoice.client,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            currency: invoice.currency,
            transactionId: transaction.transactionId,
            paidAt: paidAt.toISOString(),
            senderName: user.name,
            senderCompany: user.company || '',
          });
        } catch {
          // Non-fatal
        }
      }
    }

    if (eventType === 'payment_link.cancelled' || eventType === 'payment_link.expired') {
      const paymentLinkEntity = event.payload?.payment_link?.entity;
      if (paymentLinkEntity?.id) {
        const invoice = await Invoice.findOne({ razorpayPaymentLinkId: paymentLinkEntity.id });
        if (invoice && invoice.status === 'Pending') {
          invoice.status = 'Failed';
          invoice.razorpayPaymentLinkStatus =
            eventType === 'payment_link.cancelled' ? 'cancelled' : 'expired';
          await invoice.save();
        }
      }
    }

    res.json({ success: true, received: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
