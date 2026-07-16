import api from './apiClient';
import { buildQueryParams } from '../utils/filterParams';
import type {
  CustomersResponse,
  CustomerResponse,
  CustomerFormData,
  CustomerFilters,
} from '../types';

export const customerService = {
  /** Get paginated, filtered list of customers */
  async getCustomers(filters: CustomerFilters = {}): Promise<CustomersResponse> {
    const params: Record<string, string | number> = {
      ...buildQueryParams(filters as Record<string, string | number | undefined>, [
        'status',
        'search',
        'page',
        'limit',
        'country',
        'sortBy',
        'sortOrder',
      ]),
    };
    const { data } = await api.get<CustomersResponse>('/customers', { params });
    return data;
  },

  /** Get single customer by ID */
  async getCustomerById(id: string): Promise<CustomerResponse> {
    const { data } = await api.get<CustomerResponse>(`/customers/${id}`);
    return data;
  },

  /** Create a new customer */
  async createCustomer(payload: CustomerFormData): Promise<CustomerResponse> {
    const { data } = await api.post<CustomerResponse>('/customers', payload);
    return data;
  },

  /** Update an existing customer */
  async updateCustomer(id: string, payload: CustomerFormData): Promise<CustomerResponse> {
    const { data } = await api.put<CustomerResponse>(`/customers/${id}`, payload);
    return data;
  },

  /** Delete a single customer */
  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>(`/customers/${id}`);
    return data;
  },

  /** Bulk delete customers by IDs */
  async bulkDeleteCustomers(ids: string[]): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>('/customers', {
      data: { ids },
    });
    return data;
  },

  /** Get customer stats (counts per status) */
  async getStats(): Promise<{ success: boolean; data: Array<{ _id: string; count: number; totalSpent: number }> }> {
    const { data } = await api.get('/customers/stats');
    return data;
  },
};
