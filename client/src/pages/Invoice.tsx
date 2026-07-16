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
  FileText,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { StatusBadge } from '../components/StatusBadge';
import { InvoiceModal } from '../components/InvoiceModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { FilterDropdown } from '../components/FilterDropdown';
import { FilterPanel, FilterField, filterSelectClass } from '../components/FilterPanel';
import { invoiceService } from '../services/invoiceService';
import { TABS, PAGE_LIMIT, CURRENCIES, SORT_OPTIONS, parseSortValue } from '../data/data';
import type { Invoice, InvoiceFormData } from '../types';

type TabType = typeof TABS[number];

interface ListFilters {
  currency: string;
  sortValue: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: ListFilters = {
  currency: 'All',
  sortValue: 'createdAt:desc',
  dateFrom: '',
  dateTo: '',
};

export default function Invoice() {
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
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Dropdown menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const { sortBy, sortOrder } = parseSortValue(filters.sortValue);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', activeTab, debouncedSearch, page, filters],
    queryFn: () =>
      invoiceService.getInvoices({
        status: activeTab,
        search: debouncedSearch,
        page,
        limit: PAGE_LIMIT,
        currency: filters.currency,
        sortBy,
        sortOrder,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const invoices = data?.data ?? [];
  const pagination = data?.pagination;

  // ─── Search debounce ─────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchQuery(val);
      setPage(1);
      clearTimeout((window as unknown as { _searchTimer: ReturnType<typeof setTimeout> })._searchTimer);
      (window as unknown as { _searchTimer: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
        () => setDebouncedSearch(val),
        400
      );
    },
    []
  );

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => invoiceService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceFormData }) =>
      invoiceService.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setEditInvoice(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteId(null);
      setSelected((prev) => prev.filter((x) => x !== deleteId));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => invoiceService.bulkDeleteInvoices(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
    invoices.length > 0 && invoices.every((inv) => selected.includes(inv._id));

  const toggleAll = () =>
    setSelected(allSelected ? [] : invoices.map((inv) => inv._id));

  // ─── Tab change ───────────────────────────────────────────────────────────
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setSelected([]);
  };

  const handleCurrencyChange = (currency: string) => {
    setFilters((prev) => ({ ...prev, currency }));
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
    filters.currency !== 'All',
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
      <Sidebar activePage="Invoices" />

      <main className="flex-1 px-8 py-6 h-screen overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="relative w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search invoices…"
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
            <h1 className="text-[28px] font-bold tracking-tight">Invoices</h1>
            {pagination && (
              <p className="text-sm text-gray-400 mt-0.5">
                {pagination.total} invoice{pagination.total !== 1 ? 's' : ''} total
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
              Create Invoice
            </button>
          </div>
        </div>

        {/* Tabs + filter row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            {TABS.map((tab) => (
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
              value={filters.currency}
              onChange={handleCurrencyChange}
              placeholder="All currencies"
              prefix={
                <div className="w-7 h-5 rounded bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                  $
                </div>
              }
              options={[
                { value: 'All', label: 'All currencies' },
                ...CURRENCIES.map((c) => ({ value: c, label: c })),
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
                  {SORT_OPTIONS.invoices.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Created from">
                <input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  className={filterSelectClass}
                />
              </FilterField>
              <FilterField label="Created to">
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
              <p className="text-gray-700 font-semibold mb-1">Failed to load invoices</p>
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
                      disabled={invoices.length === 0}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-black"
                    />
                  </th>
                  <th className="text-left font-semibold py-3.5 px-3">Invoice #</th>
                  <th className="text-left font-semibold py-3.5 px-3">Client</th>
                  <th className="text-left font-semibold py-3.5 px-3">Created</th>
                  <th className="text-left font-semibold py-3.5 px-3">Due Date</th>
                  <th className="text-left font-semibold py-3.5 px-3">Amount</th>
                  <th className="text-left font-semibold py-3.5 px-3">Status</th>
                  <th className="w-16 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-4 px-3">
                          <div className="h-4 bg-gray-100 rounded-lg animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                          <FileText size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-semibold mb-1">No invoices found</p>
                        <p className="text-gray-400 text-sm mb-4">
                          {hasActiveFilters
                            ? 'Try adjusting your filters'
                            : 'Create your first invoice to get started'}
                        </p>
                        {!hasActiveFilters && (
                          <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7ED957] text-black text-sm font-bold hover:bg-[#6fcf4a] transition-colors"
                          >
                            <Plus size={14} /> Create Invoice
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv._id}
                      className={`border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors ${selected.includes(inv._id) ? 'bg-green-50/30' : ''
                        }`}
                    >
                      <td className="py-4 pl-5">
                        <input
                          type="checkbox"
                          checked={selected.includes(inv._id)}
                          onChange={() => toggleRow(inv._id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-black"
                        />
                      </td>
                      <td className="py-4 px-3 font-semibold text-gray-800 font-mono text-xs">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-4 px-3">
                        <div>
                          <div className="font-medium text-gray-800">{inv.client}</div>
                          <div className="text-xs text-gray-400">{inv.clientEmail}</div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-gray-500 text-xs">{formatDate(inv.createdAt)}</td>
                      <td className="py-4 px-3 text-gray-500 text-xs">{formatDate(inv.dueDate)}</td>
                      <td className="py-4 px-3 text-gray-800 font-semibold">
                        {formatAmount(inv.amount, inv.currency)}
                      </td>
                      <td className="py-4 px-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-4 px-2 text-gray-400 relative">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === inv._id ? null : inv._id)
                          }
                          className="hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openMenu === inv._id && (
                          <>
                            {/* Backdrop to close */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-6 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36">
                              <button
                                onClick={() => {
                                  setEditInvoice(inv);
                                  setOpenMenu(null);
                                }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Pencil size={14} className="text-gray-400" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(inv._id);
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
      <InvoiceModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
        loading={createMutation.isPending}
      />

      {/* Edit */}
      <InvoiceModal
        isOpen={!!editInvoice}
        onClose={() => setEditInvoice(null)}
        onSubmit={async (data) => {
          if (editInvoice) {
            await updateMutation.mutateAsync({ id: editInvoice._id, data });
          }
        }}
        invoice={editInvoice}
        loading={updateMutation.isPending}
      />

      {/* Delete single */}
      <DeleteConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        loading={deleteMutation.isPending}
      />

      {/* Bulk delete */}
      <DeleteConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(selected)}
        title={`Delete ${selected.length} Invoices`}
        message={`Are you sure you want to delete ${selected.length} selected invoices? This action cannot be undone.`}
        loading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
