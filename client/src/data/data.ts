export const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-orange-50 text-orange-500 border border-orange-200',
  Failed: 'bg-red-50 text-red-500 border border-red-200',
  Success: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  Draft: 'bg-gray-100 text-gray-500 border border-gray-200',
  Unpaid: 'bg-violet-50 text-violet-500 border border-violet-200',
};

export const TABS = ['All', 'Draft', 'Unpaid', 'Pending', 'Failed', 'Success'] as const;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

export const STATUS_OPTIONS = ['Draft', 'Pending', 'Unpaid', 'Success', 'Failed'] as const;

export const PAGE_LIMIT = 10;

// ─── Customer constants ──────────────────────────────────────────────────────

export const CUSTOMER_STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  Inactive: 'bg-gray-100 text-gray-500 border border-gray-200',
  Lead: 'bg-blue-50 text-blue-500 border border-blue-200',
  Blocked: 'bg-red-50 text-red-500 border border-red-200',
};

export const CUSTOMER_TABS = ['All', 'Active', 'Inactive', 'Lead', 'Blocked'] as const;

export const CUSTOMER_STATUS_OPTIONS = ['Active', 'Inactive', 'Lead', 'Blocked'] as const;

export const COUNTRIES = [
  'United States', 'United Kingdom', 'India', 'Canada', 'Australia',
  'Germany', 'France', 'Japan', 'Brazil', 'Netherlands',
  'Singapore', 'UAE', 'South Korea', 'Sweden', 'Switzerland',
];

// ─── Transaction constants ──────────────────────────────────────────────────

export const TRANSACTION_STATUS_STYLES: Record<string, string> = {
  Success: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  Pending: 'bg-orange-50 text-orange-500 border border-orange-200',
  Failed: 'bg-red-50 text-red-500 border border-red-200',
  Refunded: 'bg-gray-100 text-gray-500 border border-gray-200',
};

export const TRANSACTION_TABS = ['All', 'Success', 'Pending', 'Failed', 'Refunded'] as const;

export const TRANSACTION_STATUS_OPTIONS = ['Success', 'Pending', 'Failed', 'Refunded'] as const;

export const PAYMENT_METHODS = ['Cash', 'Razorpay'] as const;

export const SORT_OPTIONS = {
  invoices: [
    { value: 'createdAt:desc', label: 'Newest first' },
    { value: 'createdAt:asc', label: 'Oldest first' },
    { value: 'dueDate:asc', label: 'Due date (soonest)' },
    { value: 'dueDate:desc', label: 'Due date (latest)' },
    { value: 'amount:desc', label: 'Amount (high to low)' },
    { value: 'amount:asc', label: 'Amount (low to high)' },
  ],
  customers: [
    { value: 'createdAt:desc', label: 'Newest first' },
    { value: 'createdAt:asc', label: 'Oldest first' },
    { value: 'name:asc', label: 'Name (A to Z)' },
    { value: 'name:desc', label: 'Name (Z to A)' },
  ],
  transactions: [
    { value: 'paymentDate:desc', label: 'Newest first' },
    { value: 'paymentDate:asc', label: 'Oldest first' },
    { value: 'amount:desc', label: 'Amount (high to low)' },
    { value: 'amount:asc', label: 'Amount (low to high)' },
  ],
} as const;

export const REPORT_PERIODS = [
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
] as const;

export function parseSortValue(value: string): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const [sortBy, sortOrder] = value.split(':');
  return { sortBy, sortOrder: sortOrder === 'asc' ? 'asc' : 'desc' };
}

export function getPeriodStartDate(period: string): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case '1m':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3m':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      return null;
  }
  return start;
}

