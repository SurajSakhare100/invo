import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'payments@yourdomain.com';
const APP_NAME = process.env.APP_NAME || 'Invoico';

export interface PaymentLinkEmailOptions {
  toEmail: string;
  toName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  paymentUrl: string;
  senderName: string;
  senderCompany: string;
}

export interface PaymentConfirmationEmailOptions {
  toEmail: string;
  toName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  transactionId: string;
  paidAt: string;
  senderName: string;
  senderCompany: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Send a Razorpay payment link to the customer via email.
 */
export async function sendPaymentLinkEmail(opts: PaymentLinkEmailOptions): Promise<void> {
  const formattedAmount = formatCurrency(opts.amount, opts.currency);
  const dueDateFormatted = new Date(opts.dueDate).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Request – ${opts.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:#0f0f0f;padding:32px 40px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#7ED957;letter-spacing:-0.5px;">${APP_NAME}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Hi ${opts.toName},</p>
              <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111827;">You have a payment request</h1>

              <!-- Invoice card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Invoice Number</td>
                        <td align="right" style="font-size:13px;color:#6b7280;padding-bottom:6px;">Due Date</td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;font-weight:700;color:#111827;font-family:monospace;">${opts.invoiceNumber}</td>
                        <td align="right" style="font-size:15px;font-weight:600;color:#111827;">${dueDateFormatted}</td>
                      </tr>
                      <tr><td colspan="2" style="padding:12px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;">Amount Due</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="font-size:28px;font-weight:800;color:#111827;padding-top:4px;">${formattedAmount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
                ${opts.senderCompany || opts.senderName} has sent you this payment request. Click the button below to pay securely via Razorpay.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${opts.paymentUrl}"
                       style="display:inline-block;background:#7ED957;color:#000000;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.1px;">
                      Pay Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                Or copy this link: <a href="${opts.paymentUrl}" style="color:#7ED957;word-break:break-all;">${opts.paymentUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                This payment request was sent by <strong>${opts.senderName}</strong> via ${APP_NAME}.<br />
                If you did not expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await resend.emails.send({
    from: `${opts.senderCompany || APP_NAME} <${FROM_EMAIL}>`,
    to: opts.toEmail,
    subject: `Payment Request: ${opts.invoiceNumber} – ${formattedAmount}`,
    html,
  });
}

/**
 * Send a payment confirmation email to the customer after successful payment.
 */
export async function sendPaymentConfirmationEmail(
  opts: PaymentConfirmationEmailOptions
): Promise<void> {
  const formattedAmount = formatCurrency(opts.amount, opts.currency);
  const paidAtFormatted = new Date(opts.paidAt).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Confirmed – ${opts.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:#0f0f0f;padding:32px 40px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#7ED957;letter-spacing:-0.5px;">${APP_NAME}</span>
            </td>
          </tr>

          <!-- Success icon + heading -->
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="display:inline-block;width:64px;height:64px;background:#f0fdf4;border-radius:50%;line-height:64px;font-size:30px;margin-bottom:16px;">✅</div>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Payment Received!</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#6b7280;">Hi ${opts.toName}, your payment was successfully processed.</p>
            </td>
          </tr>

          <!-- Details card -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <tr><td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:13px;color:#6b7280;padding-bottom:4px;">Invoice Number</td>
                      <td align="right" style="font-size:13px;color:#6b7280;padding-bottom:4px;">Amount Paid</td>
                    </tr>
                    <tr>
                      <td style="font-size:15px;font-weight:700;color:#111827;font-family:monospace;">${opts.invoiceNumber}</td>
                      <td align="right" style="font-size:20px;font-weight:800;color:#16a34a;">${formattedAmount}</td>
                    </tr>
                    <tr><td colspan="2" style="padding:12px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>
                    <tr>
                      <td style="font-size:13px;color:#6b7280;padding-bottom:4px;">Transaction ID</td>
                      <td align="right" style="font-size:13px;color:#6b7280;padding-bottom:4px;">Paid At</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;font-weight:600;color:#111827;font-family:monospace;">${opts.transactionId}</td>
                      <td align="right" style="font-size:13px;font-weight:600;color:#111827;">${paidAtFormatted}</td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by <strong>${opts.senderName}</strong> via ${APP_NAME}.<br />
                Please keep this email as your payment receipt.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await resend.emails.send({
    from: `${opts.senderCompany || APP_NAME} <${FROM_EMAIL}>`,
    to: opts.toEmail,
    subject: `Payment Confirmed: ${opts.invoiceNumber} – ${formattedAmount}`,
    html,
  });
}
