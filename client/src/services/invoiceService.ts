import api from './apiClient';
import { buildQueryParams } from '../utils/filterParams';
import type {
  InvoicesResponse,
  InvoiceResponse,
  InvoiceFormData,
  InvoiceFilters,
  SendPaymentLinkResponse,
} from '../types';

export const invoiceService = {
  /** Get paginated, filtered list of invoices */
  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoicesResponse> {
    const params: Record<string, string | number> = {
      ...buildQueryParams(filters as Record<string, string | number | undefined>, [
        'status',
        'search',
        'page',
        'limit',
        'currency',
        'sortBy',
        'sortOrder',
        'dateFrom',
        'dateTo',
      ]),
    };
    const { data } = await api.get<InvoicesResponse>('/invoices', { params });
    return data;
  },

  /** Get single invoice by ID */
  async getInvoiceById(id: string): Promise<InvoiceResponse> {
    const { data } = await api.get<InvoiceResponse>(`/invoices/${id}`);
    return data;
  },

  /** Create a new invoice */
  async createInvoice(payload: InvoiceFormData): Promise<InvoiceResponse> {
    const { data } = await api.post<InvoiceResponse>('/invoices', payload);
    return data;
  },

  /** Update an existing invoice */
  async updateInvoice(id: string, payload: InvoiceFormData): Promise<InvoiceResponse> {
    const { data } = await api.put<InvoiceResponse>(`/invoices/${id}`, payload);
    return data;
  },

  /** Delete a single invoice */
  async deleteInvoice(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>(`/invoices/${id}`);
    return data;
  },

  /** Bulk delete invoices by IDs */
  async bulkDeleteInvoices(ids: string[]): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>('/invoices', {
      data: { ids },
    });
    return data;
  },

  /** Get invoice stats (counts per status) */
  async getStats(): Promise<{ success: boolean; data: Array<{ _id: string; count: number; totalAmount: number }> }> {
    const { data } = await api.get('/invoices/stats');
    return data;
  },

  /**
   * Create a Razorpay Payment Link for an invoice and email it to the client.
   * If a valid link already exists for the invoice, the email is resent.
   */
  async sendPaymentLink(invoiceId: string): Promise<SendPaymentLinkResponse> {
    const { data } = await api.post<SendPaymentLinkResponse>(
      `/razorpay/send-payment-link/${invoiceId}`
    );
    return data;
  },
};
