import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { applyDateRange, buildSort } from '../utils/queryFilters';

// GET /api/transactions — list with filter, search, pagination
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      search,
      page = '1',
      limit = '10',
      paymentMethod,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = { user: (req as AuthenticatedRequest).user?.id };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (paymentMethod && paymentMethod !== 'All') {
      query.paymentMethod = paymentMethod;
    }

    applyDateRange(query, 'paymentDate', dateFrom as string | undefined, dateTo as string | undefined);

    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [
        { transactionId: regex },
        { customerName: regex },
        { invoiceNumber: regex },
        { referenceNumber: regex },
        { paymentMethod: regex },
      ];
    }

    const sort = buildSort('transactions', sortBy as string | undefined, sortOrder as string | undefined);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transactions,
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

// GET /api/transactions/:id
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: (req as AuthenticatedRequest).user?.id }).lean();
    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// POST /api/transactions
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, amount, currency, paymentMethod, status, referenceNumber, paymentDate, notes } = req.body;

    const transaction = new Transaction({
      invoice: null,
      invoiceNumber: '',
      customer: null,
      customerName: customerName || 'Walk-in Customer',
      amount,
      currency: currency || 'USD',
      paymentMethod: paymentMethod || 'Card',
      status: status || 'Success',
      referenceNumber: referenceNumber || '',
      paymentDate: paymentDate || new Date(),
      notes: notes || '',
      user: (req as AuthenticatedRequest).user?.id,
    });

    await transaction.save();

    res.status(201).json({ success: true, data: transaction });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ValidationError') {
      res.status(400).json({ success: false, message: 'Validation error', error });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// PUT /api/transactions/:id
export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, referenceNumber, notes, paymentMethod } = req.body;

    const oldTransaction = await Transaction.findOne({ _id: req.params.id, user: (req as AuthenticatedRequest).user?.id });
    if (!oldTransaction) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: (req as AuthenticatedRequest).user?.id },
      { status, referenceNumber, notes, paymentMethod },
      { new: true, runValidators: true }
    ).lean();

    res.json({ success: true, data: updatedTransaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// DELETE /api/transactions/:id
export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: (req as AuthenticatedRequest).user?.id });
    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// DELETE /api/transactions (bulk)
export const bulkDeleteTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'ids array is required' });
      return;
    }

    const result = await Transaction.deleteMany({ _id: { $in: ids }, user: (req as AuthenticatedRequest).user?.id });
    res.json({ success: true, message: `Deleted ${result.deletedCount} transaction(s)` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// GET /api/transactions/stats — summary stats
export const getTransactionStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Transaction.aggregate([
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
