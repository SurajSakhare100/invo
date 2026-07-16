import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Bell,
  Download,
  Plus,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  ArrowLeftRight,
  Calendar,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TransactionStatusBadge } from '../components/TransactionStatusBadge';
import { TransactionModal } from '../components/TransactionModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { FilterDropdown } from '../components/FilterDropdown';
import { FilterPanel, FilterField, filterSelectClass } from '../components/FilterPanel';
import { transactionService } from '../services/transactionService';
import {
  TRANSACTION_TABS,
  PAGE_LIMIT,
  PAYMENT_METHODS,
  SORT_OPTIONS,
  parseSortValue,
} from '../data/data';
import type { Transaction, TransactionFormData } from '../types';

type TabType = typeof TRANSACTION_TABS[number];

interface ListFilters {
  paymentMethod: string;
  sortValue: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: ListFilters = {
  paymentMethod: 'All',
  sortValue: 'paymentDate:desc',
  dateFrom: '',
  dateTo: '',
};

export default function Transaction() {
  const queryClient = useQueryClient();

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // Selection
  const [selected, setSelected] = useState<string[]>([]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Dropdown menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const { sortBy, sortOrder } = parseSortValue(filters.sortValue);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', activeTab, debouncedSearch, page, filters],
    queryFn: () =>
      transactionService.getTransactions({
        status: activeTab,
        search: debouncedSearch,
        page,
        limit: PAGE_LIMIT,
        paymentMethod: filters.paymentMethod,
        sortBy,
        sortOrder,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const transactions = data?.data ?? [];
  const pagination = data?.pagination;

  // ─── Search debounce ─────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchQuery(val);
      setPage(1);
      clearTimeout((window as unknown as { _txnSearchTimer: ReturnType<typeof setTimeout> })._txnSearchTimer);
      (window as unknown as { _txnSearchTimer: ReturnType<typeof setTimeout> })._txnSearchTimer = setTimeout(
        () => setDebouncedSearch(val),
        400
      );
    },
    []
  );

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: TransactionFormData) => transactionService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // Invalidate invoices and customers too as statuses & spent change
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionFormData> }) =>
      transactionService.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditTransaction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteId(null);
      setSelected((prev) => prev.filter((x) => x !== deleteId));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => transactionService.bulkDeleteTransactions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelected([]);
      setBulkDeleteOpen(false);
    },
  });

  // ─── Selection helpers ────────────────────────────────────────────────────
  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const allSelected =
    transactions.length > 0 && transactions.every((t) => selected.includes(t._id));

  const toggleAll = () =>
    setSelected(allSelected ? [] : transactions.map((t) => t._id));

  // ─── Tab change ───────────────────────────────────────────────────────────
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setSelected([]);
  };

  const handlePaymentMethodChange = (paymentMethod: string) => {
    setFilters((prev) => ({ ...prev, paymentMethod }));
    setPage(1);
    setSelected([]);
  };

  const openFilterPanel = () => {
    setDraftFilters(filters);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setSelected([]);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setSelected([]);
  };

  const activeFilterCount = [
    filters.paymentMethod !== 'All',
    filters.dateFrom,
    filters.dateTo,
    filters.sortValue !== DEFAULT_FILTERS.sortValue,
  ].filter(Boolean).length;

  const hasActiveFilters =
    debouncedSearch || activeTab !== 'All' || activeFilterCount > 0;

  // ─── Formatting helpers ───────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-gray-900 font-sans flex">
      <Sidebar activePage="Transactions" />

      <main className="flex-1 px-8 py-6 h-screen overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="relative w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search payments…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className="text-gray-600" />
            </button>
            <button className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Bell size={17} className="text-gray-600" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </div>

        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">Transactions</h1>
            {pagination && (
              <p className="text-sm text-gray-400 mt-0.5">
                {pagination.total} transaction{pagination.total !== 1 ? 's' : ''} total
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selected.length > 0 && (
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} />
                Delete {selected.length} selected
              </button>
            )}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium bg-white hover:bg-gray-50 transition-colors">
              <Download size={15} />
              Export
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#7ED957] text-black text-sm font-bold hover:bg-[#6fcf4a] transition-colors shadow-sm"
            >
              <Plus size={15} />
              Record Payment
            </button>
          </div>
        </div>

        {/* Tabs + filter row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            {TRANSACTION_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ${activeTab === tab
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 relative">
            <FilterDropdown
              value={filters.paymentMethod}
              onChange={handlePaymentMethodChange}
              placeholder="All methods"
              prefix={
                <div className="w-7 h-5 rounded bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                  VISA
                </div>
              }
              options={[
                { value: 'All', label: 'All payment methods' },
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
              ]}
            />
            <button
              type="button"
              onClick={openFilterPanel}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors shadow-sm ${activeFilterCount > 0
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
            >
              <SlidersHorizontal size={14} />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <FilterPanel
              isOpen={filterOpen}
              onClose={() => setFilterOpen(false)}
              onApply={applyFilters}
              onClear={clearFilters}
              activeCount={activeFilterCount}
            >
              <FilterField label="Sort by">
                <select
                  value={draftFilters.sortValue}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, sortValue: e.target.value }))
                  }
                  className={filterSelectClass}
                >
                  {SORT_OPTIONS.transactions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Payment date from">
                <input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  className={filterSelectClass}
                />
              </FilterField>
              <FilterField label="Payment date to">
                <input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className={filterSelectClass}
                />
              </FilterField>
            </FilterPanel>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <RefreshCw size={24} className="text-red-400" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">Failed to load transactions</p>
              <p className="text-gray-400 text-sm mb-4">
                Make sure the server is running on port 5000
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[13px] bg-gray-50/50">
                  <th className="w-10 py-3.5 pl-5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={transactions.length === 0}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-black"
                    />
                  </th>
                  <th className="text-left font-semibold py-3.5 px-3">Transaction ID</th>
                  <th className="text-left font-semibold py-3.5 px-3">Date</th>
                  <th className="text-left font-semibold py-3.5 px-3">Customer</th>
                  <th className="text-left font-semibold py-3.5 px-3">Linked Invoice</th>
                  <th className="text-left font-semibold py-3.5 px-3">Method</th>
                  <th className="text-left font-semibold py-3.5 px-3">Reference No</th>
                  <th className="text-left font-semibold py-3.5 px-3">Amount</th>
                  <th className="text-left font-semibold py-3.5 px-3">Status</th>
                  <th className="w-16 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="py-4 px-3">
                          <div className="h-4 bg-gray-100 rounded-lg animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                          <ArrowLeftRight size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-semibold mb-1">No transactions found</p>
                        <p className="text-gray-400 text-sm mb-4">
                          {hasActiveFilters
                            ? 'Try adjusting your filters'
                            : 'Record your first transaction payment to get started'}
                        </p>
                        {!hasActiveFilters && (
                          <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7ED957] text-black text-sm font-bold hover:bg-[#6fcf4a] transition-colors"
                          >
                            <Plus size={14} /> Record Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr
                      key={txn._id}
                      className={`border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors ${selected.includes(txn._id) ? 'bg-green-50/30' : ''
                        }`}
                    >
                      <td className="py-4 pl-5">
                        <input
                          type="checkbox"
                          checked={selected.includes(txn._id)}
                          onChange={() => toggleRow(txn._id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-black"
                        />
                      </td>
                      <td className="py-4 px-3 font-semibold text-gray-800 font-mono text-xs">
                        {txn.transactionId}
                      </td>
                      <td className="py-4 px-3 text-gray-500 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          {formatDate(txn.paymentDate)}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-medium text-gray-800">{txn.customerName}</div>
                      </td>
                      <td className="py-4 px-3 text-xs">
                        {txn.invoiceNumber ? (
                          <span className="font-semibold font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {txn.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-gray-600 text-xs font-medium">
                        {txn.paymentMethod}
                      </td>
                      <td className="py-4 px-3 text-gray-500 font-mono text-xs">
                        {txn.referenceNumber || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-4 px-3 text-gray-800 font-semibold">
                        {formatAmount(txn.amount, txn.currency)}
                      </td>
                      <td className="py-4 px-3">
                        <TransactionStatusBadge status={txn.status} />
                      </td>
                      <td className="py-4 px-2 text-gray-400 relative">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === txn._id ? null : txn._id)
                          }
                          className="hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openMenu === txn._id && (
                          <>
                            {/* Backdrop to close */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-6 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36">
                              <button
                                onClick={() => {
                                  setEditTransaction(txn);
                                  setOpenMenu(null);
                                }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Pencil size={14} className="text-gray-400" />
                                Edit status
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(txn._id);
                                  setOpenMenu(null);
                                }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} &nbsp;·&nbsp; {pagination.total} results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - page) <= 1
                )
                .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${p === page
                        ? 'bg-[#7ED957] text-black shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Create */}
      <TransactionModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
        loading={createMutation.isPending}
      />

      {/* Edit */}
      <TransactionModal
        isOpen={!!editTransaction}
        onClose={() => setEditTransaction(null)}
        onSubmit={async (data) => {
          if (editTransaction) {
            await updateMutation.mutateAsync({ id: editTransaction._id, data });
          }
        }}
        transaction={editTransaction}
        loading={updateMutation.isPending}
      />

      {/* Delete single */}
      <DeleteConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        title="Delete Transaction Record"
        message="Are you sure you want to delete this transaction payment record? Doing so does not delete the invoice itself."
        loading={deleteMutation.isPending}
      />

      {/* Bulk delete */}
      <DeleteConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(selected)}
        title={`Delete ${selected.length} Transactions`}
        message={`Are you sure you want to delete ${selected.length} selected transaction payment records? This action cannot be undone.`}
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
