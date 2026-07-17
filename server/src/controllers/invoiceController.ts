import { Request, Response } from 'express';
import Invoice from '../models/Invoice';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { applyDateRange, buildSort } from '../utils/queryFilters';
import { Resend } from 'resend';
import User from '../models/User';
import { buildInvoiceHtml } from '../utils/invoicePdfHtml';

// GET /api/invoices — list with filter, search, pagination
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      search,
      page = '1',
      limit = '10',
      currency,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const query: Record<string, unknown> = { user: (req as AuthenticatedRequest).user?.id };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (currency && currency !== 'All') {
      query.currency = currency;
    }

    applyDateRange(query, 'createdAt', dateFrom as string | undefined, dateTo as string | undefined);

    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [{ client: regex }, { invoiceNumber: regex }, { clientEmail: regex }];
    }

    const sort = buildSort('invoices', sortBy as string | undefined, sortOrder as string | undefined);

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// GET /api/invoices/:id
export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: (req as AuthenticatedRequest).user?.id }).lean();
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// POST /api/invoices
export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { client, clientEmail, amount, currency, status, dueDate, items, notes } = req.body;

    const invoice = new Invoice({
      client,
      clientEmail,
      amount,
      currency: currency || 'USD',
      status: status || 'Draft',
      dueDate,
      items: items || [],
      notes: notes || '',
      user: (req as AuthenticatedRequest).user?.id,
    });

    await invoice.save();
    res.status(201).json({ success: true, data: invoice });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ValidationError') {
      res.status(400).json({ success: false, message: 'Validation error', error });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// PUT /api/invoices/:id
export const updateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { client, clientEmail, amount, currency, status, dueDate, items, notes } = req.body;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: (req as AuthenticatedRequest).user?.id },
      { client, clientEmail, amount, currency, status, dueDate, items, notes },
      { new: true, runValidators: true }
    ).lean();

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// DELETE /api/invoices/:id
export const deleteInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, user: (req as AuthenticatedRequest).user?.id });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// DELETE /api/invoices (bulk)
export const bulkDeleteInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'ids array is required' });
      return;
    }
    const result = await Invoice.deleteMany({ _id: { $in: ids }, user: (req as AuthenticatedRequest).user?.id });
    res.json({ success: true, message: `Deleted ${result.deletedCount} invoice(s)` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// GET /api/invoices/stats — summary counts per status
export const getInvoiceStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Invoice.aggregate([
      { $match: { user: new (require('mongoose').Types.ObjectId)((_req as AuthenticatedRequest).user?.id) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// POST /api/invoices/:id/send-pdf
// Emails the invoice as an HTML email (renders inline) to the client.
// Accepts optional pdfBase64 from the client (generated by @react-pdf/renderer in browser).
export const sendInvoicePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [invoice, user] = await Promise.all([
      Invoice.findOne({ _id: req.params.id, user: authReq.user?.id }),
      User.findById(authReq.user?.id),
    ]);

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL!;
    const APP_NAME = process.env.APP_NAME || 'Invo';

    const htmlBody = buildInvoiceHtml(invoice, user);

    const formatAmount = (n: number, cur: string) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n);

    const emailPayload: Parameters<typeof resend.emails.send>[0] = {
      from: `${user.company || APP_NAME} <${FROM_EMAIL}>`,
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} – ${formatAmount(invoice.amount, invoice.currency)}`,
      html: htmlBody,
    };

    // If the client sent a browser-generated PDF as base64, attach it
    const { pdfBase64 } = req.body as { pdfBase64?: string };
    if (pdfBase64) {
      emailPayload.attachments = [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBase64,
        },
      ];
    }

    await resend.emails.send(emailPayload);

    res.json({ success: true, message: `Invoice emailed to ${invoice.clientEmail}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send invoice email', error });
  }
};
