import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  RefreshCw,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { StatusBadge } from '../components/StatusBadge';
import { TransactionStatusBadge } from '../components/TransactionStatusBadge';
import { invoiceService } from '../services/invoiceService';
import { customerService } from '../services/customerService';
import { transactionService } from '../services/transactionService';

export default function Dashboard() {
  const navigate = useNavigate();

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: invoicesData, isLoading: invLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['dashboardInvoices'],
    queryFn: () => invoiceService.getInvoices({ limit: 5 }),
  });

  const { data: transactionsData, isLoading: txnLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['dashboardTransactions'],
    queryFn: () => transactionService.getTransactions({ limit: 5 }),
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ['invoiceStats'],
    queryFn: () => invoiceService.getStats(),
  });

  const { data: transactionStats } = useQuery({
    queryKey: ['transactionStats'],
    queryFn: () => transactionService.getStats(),
  });

  const { data: customerStats } = useQuery({
    queryKey: ['customerStats'],
    queryFn: () => customerService.getStats(),
  });

  const handleRefreshAll = () => {
    refetchInvoices();
    refetchTransactions();
  };

  // ─── Calculating Stats ──────────────────────────────────────────────────
  const totalRevenue = transactionStats?.data
    ?.filter((t) => t._id === 'Success')
    ?.reduce((sum, item) => sum + item.totalAmount, 0) ?? 0;

  const totalInvoicedAmount = invoiceStats?.data?.reduce((sum, item) => sum + item.totalAmount, 0) ?? 0;

  const totalCustomers = customerStats?.data?.reduce((sum, item) => sum + item.count, 0) ?? 0;

  const pendingAmount = invoiceStats?.data
    ?.filter((i) => i._id === 'Pending' || i._id === 'Unpaid')
    ?.reduce((sum, item) => sum + item.totalAmount, 0) ?? 0;

  // Format currency
  const formatAmount = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
  };

  const isDataLoading = invLoading || txnLoading;

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-gray-900 font-sans flex">
      <Sidebar activePage="Dashboard" />

      <main className="flex-1 px-8 py-6 h-screen overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-sm text-gray-400">Welcome to your billing dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAll}
              className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors bg-white shadow-sm"
            >
              <RefreshCw size={16} className="text-gray-600" />
            </button>
            <button className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors bg-white shadow-sm">
              <Bell size={17} className="text-gray-600" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </div>

        {/* ─── Metric Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
                <DollarSign size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800">
                {formatAmount(totalRevenue)}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-green-600 font-semibold">
                <TrendingUp size={12} />
                <span>+12.5% from last month</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Balance</span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                <ArrowUpRight size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800">
                {formatAmount(pendingAmount)}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400 font-medium">
                <span>Waiting for client payment</span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Customers</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Users size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800">
                {totalCustomers}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-green-600 font-semibold">
                <span>Active relation states</span>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoiced Total</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <FileText size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-gray-800">
                {formatAmount(totalInvoicedAmount)}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-600 font-semibold">
                <span>Total billings created</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Content Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Quick Actions & Recent Activity */}
          <div className="col-span-2 space-y-6">
            {/* Quick Actions Panel */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-gray-700 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/invoices')}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-150 bg-[#7ED957]/5 hover:bg-[#7ED957]/10 border-[#7ED957]/30 transition-all text-left group"
                >
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">Create Invoice</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Send a new bill to a client</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#7ED957] flex items-center justify-center text-black shadow-sm group-hover:scale-105 transition-transform">
                    <Plus size={16} />
                  </div>
                </button>

                <button
                  onClick={() => navigate('/transactions')}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-150 bg-black/5 hover:bg-black/10 border-black/10 transition-all text-left group"
                >
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">Record Payment</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Capture client payment manually</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                    <ArrowLeftRight size={14} />
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Invoices Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-700">Recent Invoices</h3>
                <button
                  onClick={() => navigate('/invoices')}
                  className="text-xs font-semibold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                >
                  View All Invoices <ChevronRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-[11px] font-semibold bg-gray-50/50">
                      <th className="text-left py-3 px-5">Invoice</th>
                      <th className="text-left py-3 px-3">Client</th>
                      <th className="text-left py-3 px-3">Amount</th>
                      <th className="text-left py-3 px-3">Due</th>
                      <th className="text-left py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isDataLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="py-4 px-3">
                              <div className="h-4 bg-gray-150 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : invoicesData?.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                          No invoices created yet
                        </td>
                      </tr>
                    ) : (
                      invoicesData?.data.slice(0, 4).map((inv) => (
                        <tr key={inv._id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-all">
                          <td className="py-3.5 pl-5 font-bold font-mono text-xs text-gray-800">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-medium text-gray-700">{inv.client}</span>
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-gray-800">
                            {formatAmount(inv.amount, inv.currency)}
                          </td>
                          <td className="py-3.5 px-3 text-xs text-gray-500">
                            {formatDate(inv.dueDate)}
                          </td>
                          <td className="py-3.5 px-3">
                            <StatusBadge status={inv.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Activity / Transactions Ledger */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-700">Recent Transactions</h3>
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-xs font-semibold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-gray-50 px-5">
                {isDataLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="py-4 flex gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-100 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-2/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : transactionsData?.data.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    No transactions captured yet
                  </div>
                ) : (
                  transactionsData?.data.slice(0, 5).map((txn) => (
                    <div key={txn._id} className="py-3.5 flex items-center justify-between hover:bg-gray-50/50 -mx-3 px-3 rounded-xl transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.status === 'Success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                          }`}>
                          <ArrowLeftRight size={14} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-xs text-gray-800">{txn.customerName}</h4>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {txn.invoiceNumber || 'Custom Payment'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-xs text-gray-800">
                          {formatAmount(txn.amount, txn.currency)}
                        </div>
                        <span className="text-[9px] block mt-1.5">
                          <TransactionStatusBadge status={txn.status} />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 text-center text-xs text-gray-400 font-medium">
              Real-time payment updates active
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
