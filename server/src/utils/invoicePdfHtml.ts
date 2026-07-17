import { IInvoice } from '../models/Invoice';
import { IUser } from '../models/User';

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generates a self-contained HTML string for the invoice PDF.
 * Used by the server to attach/email the invoice as an HTML email body
 * (Resend can render it inline or it can be converted server-side).
 */
export function buildInvoiceHtml(invoice: IInvoice, user: IUser): string {
  const itemRows = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:center;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right;">${fmt(item.unitPrice, invoice.currency)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;color:#111827;text-align:right;">${fmt(item.total, invoice.currency)}</td>
    </tr>`
    )
    .join('');

  const APP_NAME = process.env.APP_NAME || 'Invo';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:#0f0f0f;padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:24px;font-weight:800;color:#7ED957;letter-spacing:-0.5px;">${APP_NAME}</span><br/>
                <span style="font-size:12px;color:#9ca3af;margin-top:2px;display:block;">${user.company || user.name}</span>
              </td>
              <td align="right">
                <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">INVOICE</span><br/>
                <span style="font-size:13px;color:#7ED957;font-weight:600;font-family:monospace;">${invoice.invoiceNumber}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- From / To / Meta -->
      <tr>
        <td style="padding:32px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <!-- From -->
              <td width="33%" style="vertical-align:top;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">From</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${user.name}</p>
                ${user.company ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${user.company}</p>` : ''}
                ${user.companyEmail || user.email ? `<p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">${user.companyEmail || user.email}</p>` : ''}
                ${user.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">${user.phone}</p>` : ''}
                ${user.address ? `<p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">${user.address}${user.city ? ', ' + user.city : ''}${user.country ? ', ' + user.country : ''}</p>` : ''}
              </td>
              <!-- To -->
              <td width="33%" style="vertical-align:top;padding-left:24px;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Bill To</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${invoice.client}</p>
                <p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">${invoice.clientEmail}</p>
              </td>
              <!-- Meta -->
              <td width="34%" style="vertical-align:top;" align="right">
                <table cellpadding="0" cellspacing="0" style="margin-left:auto;">
                  <tr>
                    <td style="font-size:11px;color:#9ca3af;padding-bottom:8px;padding-right:16px;">Issue Date</td>
                    <td style="font-size:11px;font-weight:600;color:#374151;padding-bottom:8px;">${fmtDate(invoice.createdAt)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:11px;color:#9ca3af;padding-bottom:8px;padding-right:16px;">Due Date</td>
                    <td style="font-size:11px;font-weight:600;color:#374151;padding-bottom:8px;">${fmtDate(invoice.dueDate)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:11px;color:#9ca3af;padding-right:16px;">Status</td>
                    <td style="font-size:11px;font-weight:700;color:${invoice.status === 'Success' ? '#16a34a' : invoice.status === 'Pending' ? '#d97706' : '#6b7280'};">${invoice.status}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Line Items -->
      <tr>
        <td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Description</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Qty</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Unit Price</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows || `<tr><td colspan="4" style="padding:16px 12px;font-size:13px;color:#9ca3af;text-align:center;">No line items</td></tr>`}
            </tbody>
          </table>
        </td>
      </tr>

      <!-- Total -->
      <tr>
        <td style="padding:20px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td></td>
              <td align="right">
                <table cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;min-width:240px;">
                  <tr style="background:#f9fafb;">
                    <td style="padding:12px 20px;font-size:12px;color:#6b7280;">Subtotal</td>
                    <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#374151;text-align:right;">${fmt(invoice.amount, invoice.currency)}</td>
                  </tr>
                  <tr style="background:#0f0f0f;">
                    <td style="padding:14px 20px;font-size:13px;font-weight:700;color:#9ca3af;">Total Due</td>
                    <td style="padding:14px 20px;font-size:18px;font-weight:800;color:#7ED957;text-align:right;">${fmt(invoice.amount, invoice.currency)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${invoice.notes ? `
      <!-- Notes -->
      <tr>
        <td style="padding:24px 40px 0;">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Notes</p>
            <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">${invoice.notes}</p>
          </div>
        </td>
      </tr>` : ''}

      <!-- Footer -->
      <tr>
        <td style="padding:32px 40px;text-align:center;border-top:1px solid #f3f4f6;margin-top:24px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Generated by <strong style="color:#7ED957;">${APP_NAME}</strong> · Thank you for your business</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
