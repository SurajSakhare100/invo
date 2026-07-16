export type InvoiceStatus = 'Draft' | 'Pending' | 'Unpaid' | 'Success' | 'Failed';

export interface InvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  client: string;
  clientEmail: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  items: InvoiceItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFormData {
  client: string;
  clientEmail: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  items: InvoiceItem[];
  notes: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  pagination: PaginationInfo;
}

export interface InvoiceResponse {
  success: boolean;
  data: Invoice;
}

export interface InvoiceFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  currency?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface StatItem {
  _id: InvoiceStatus;
  count: number;
  totalAmount: number;
}

// ─── Customer types ──────────────────────────────────────────────────────────

export type CustomerStatus = 'Active' | 'Inactive' | 'Lead' | 'Blocked';

export interface Customer {
  _id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  status: CustomerStatus;
  notes: string;
  totalInvoices: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  status: CustomerStatus;
  notes: string;
}

export interface CustomersResponse {
  success: boolean;
  data: Customer[];
  pagination: PaginationInfo;
}

export interface CustomerResponse {
  success: boolean;
  data: Customer;
}

export interface CustomerFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Transaction types ──────────────────────────────────────────────────────

export type TransactionStatus = 'Success' | 'Pending' | 'Failed' | 'Refunded';
export type PaymentMethod = 'Card' | 'Bank Transfer' | 'Cash' | 'PayPal';

export interface Transaction {
  _id: string;
  transactionId: string;
  invoice: string | null;
  invoiceNumber: string;
  customer: string | null;
  customerName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  referenceNumber: string;
  paymentDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFormData {
  customerName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  referenceNumber: string;
  paymentDate: string;
  notes: string;
}

export interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  pagination: PaginationInfo;
}

export interface TransactionResponse {
  success: boolean;
  data: Transaction;
}

export interface TransactionFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  paymentMethod?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

// ─── Auth types ─────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  companyEmail?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  currency?: string;
  sandboxMode?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: User & {
    token: string;
  };
}


