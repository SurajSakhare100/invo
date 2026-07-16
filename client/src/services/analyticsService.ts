import api from './apiClient';

export interface MonthlyRevenue {
  month: string;
  year: number;
  monthNum: number;
  revenue: number;
}

export interface PaymentMethod {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopClient {
  _id: string;
  name: string;
  email: string;
  company: string;
  totalSpent: number;
  totalInvoices: number;
}

export interface AnalyticsMetrics {
  averageInvoiceValue: number;
  transactionSuccessRate: number;
  successPaymentsCount: number;
  totalRevenue: number;
}

export interface AnalyticsReport {
  monthlyRevenue: MonthlyRevenue[];
  paymentMethods: PaymentMethod[];
  topClients: TopClient[];
  metrics: AnalyticsMetrics;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsReport;
}

export const analyticsService = {
  /** Get pre-aggregated analytics report for a time period */
  async getReport(period: string = '6m'): Promise<AnalyticsResponse> {
    const { data } = await api.get<AnalyticsResponse>('/analytics/report', {
      params: { period },
    });
    return data;
  },
};
