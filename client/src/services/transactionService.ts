import api from './apiClient';
import { buildQueryParams } from '../utils/filterParams';
import type {
  TransactionsResponse,
  TransactionResponse,
  TransactionFormData,
  TransactionFilters,
} from '../types';

export const transactionService = {
  /** Get paginated, filtered list of transactions */
  async getTransactions(filters: TransactionFilters = {}): Promise<TransactionsResponse> {
    const params: Record<string, string | number> = {
      ...buildQueryParams(filters as Record<string, string | number | undefined>, [
        'status',
        'search',
        'page',
        'limit',
        'paymentMethod',
        'sortBy',
        'sortOrder',
        'dateFrom',
        'dateTo',
      ]),
    };
    const { data } = await api.get<TransactionsResponse>('/transactions', { params });
    return data;
  },

  /** Get single transaction by ID */
  async getTransactionById(id: string): Promise<TransactionResponse> {
    const { data } = await api.get<TransactionResponse>(`/transactions/${id}`);
    return data;
  },

  /** Create a new transaction */
  async createTransaction(payload: TransactionFormData): Promise<TransactionResponse> {
    const { data } = await api.post<TransactionResponse>('/transactions', payload);
    return data;
  },

  /** Update an existing transaction */
  async updateTransaction(id: string, payload: Partial<TransactionFormData>): Promise<TransactionResponse> {
    const { data } = await api.put<TransactionResponse>(`/transactions/${id}`, payload);
    return data;
  },

  /** Delete a single transaction */
  async deleteTransaction(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>(`/transactions/${id}`);
    return data;
  },

  /** Bulk delete transactions by IDs */
  async bulkDeleteTransactions(ids: string[]): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>('/transactions', {
      data: { ids },
    });
    return data;
  },

  /** Get transaction stats (counts per status) */
  async getStats(): Promise<{ success: boolean; data: Array<{ _id: string; count: number; totalAmount: number }> }> {
    const { data } = await api.get('/transactions/stats');
    return data;
  },
};
