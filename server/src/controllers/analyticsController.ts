import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import Transaction from '../models/Transaction';
import Customer from '../models/Customer';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ─── Helper: compute period start date ────────────────────────────────────────
function getPeriodStart(period: string): Date | null {
  if (!period || period === 'all') return null;
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case '1m': start.setMonth(start.getMonth() - 1); break;
    case '3m': start.setMonth(start.getMonth() - 3); break;
    case '6m': start.setMonth(start.getMonth() - 6); break;
    case '1y': start.setFullYear(start.getFullYear() - 1); break;
    default:   return null;
  }
  return start;
}

// ─── Helper: how many months to show ─────────────────────────────────────────
function periodToMonths(period: string): number {
  switch (period) {
    case '1m': return 1;
    case '3m': return 3;
    case '6m': return 6;
    case '1y': return 12;
    default:   return 12;
  }
}

// GET /api/analytics/report?period=6m
export const getAnalyticsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const period = (req.query.period as string) || '6m';
    const periodStart = getPeriodStart(period);
    const numMonths = periodToMonths(period);

    // ─── Date filter for transactions ─────────────────────────────────
    const txnDateMatch: Record<string, unknown> = { user: userObjectId };
    if (periodStart) {
      txnDateMatch.paymentDate = { $gte: periodStart };
    }

    // ─── Date filter for invoices ──────────────────────────────────────
    const invDateMatch: Record<string, unknown> = { user: userObjectId };
    if (periodStart) {
      invDateMatch.createdAt = { $gte: periodStart };
    }

    // ─── 1. Monthly Revenue (from successful transactions) ─────────────
    const monthlyRevenuePipeline: mongoose.PipelineStage[] = [
      { $match: { ...txnDateMatch, status: 'Success' } },
      {
        $group: {
          _id: {
            year:  { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
          },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ];
    const monthlyRevenueRaw = await Transaction.aggregate(monthlyRevenuePipeline);

    // Build a complete month array (filling zeros for empty months)
    const now = new Date();
    const monthlyRevenue: { month: string; year: number; monthNum: number; revenue: number }[] = [];
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-based
      const found = monthlyRevenueRaw.find((r) => r._id.year === y && r._id.month === m);
      monthlyRevenue.push({
        month: MONTHS[m - 1],
        year: y,
        monthNum: m,
        revenue: found ? found.revenue : 0,
      });
    }

    // ─── 2. Payment Method Breakdown (from successful transactions) ────
    const methodPipeline: mongoose.PipelineStage[] = [
      { $match: { ...txnDateMatch, status: 'Success' } },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$amount' },
          count:  { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ];
    const methodRaw = await Transaction.aggregate(methodPipeline);
    const totalMethodAmount = methodRaw.reduce((s, m) => s + m.amount, 0);
    const paymentMethods = methodRaw.map((m) => ({
      method:     m._id as string,
      amount:     m.amount as number,
      count:      m.count  as number,
      percentage: totalMethodAmount > 0
        ? Math.round((m.amount / totalMethodAmount) * 100)
        : 0,
    }));

    // ─── 3. Top Clients (by totalSpent) ───────────────────────────────
    const topClients = await Customer.find({ user: userObjectId })
      .sort({ totalSpent: -1 })
      .limit(5)
      .select('name email company totalSpent totalInvoices')
      .lean();

    // ─── 4. Summary Metrics ────────────────────────────────────────────
    // Average invoice value (filtered period)
    const invAgg = await Invoice.aggregate([
      { $match: invDateMatch },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const invStats = invAgg[0] ?? { totalAmount: 0, count: 0 };
    const averageInvoiceValue = invStats.count > 0 ? invStats.totalAmount / invStats.count : 0;

    // Transaction success rate (filtered period)
    const txnTotals = await Transaction.aggregate([
      { $match: txnDateMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    const totalTxn    = txnTotals.reduce((s, t) => s + t.count, 0);
    const successTxn  = txnTotals.find((t) => t._id === 'Success')?.count ?? 0;
    const transactionSuccessRate = totalTxn > 0
      ? parseFloat(((successTxn / totalTxn) * 100).toFixed(1))
      : 0;

    // Total revenue (successful transactions in period)
    const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);

    res.json({
      success: true,
      data: {
        monthlyRevenue,
        paymentMethods,
        topClients,
        metrics: {
          averageInvoiceValue,
          transactionSuccessRate,
          successPaymentsCount: successTxn,
          totalRevenue,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Analytics server error', error });
  }
};
