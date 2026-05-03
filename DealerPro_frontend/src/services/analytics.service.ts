// Analytics service

import apiClient from './api';
import { ApiResponse, PaginatedResponse } from '../types/common';
import { DealerPerformance, AnalyticsSummary } from '../types/analytics';

export const analyticsService = {
  getDealerPerformance: async (params?: { page?: number; limit?: number; dealerId?: number; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/analytics/dealer-performance', { params });
    const d = response.data.data;
    return {
      data: d.content || [],
      total: d.totalElements || 0,
      page: (d.pageable?.pageNumber || 0) + 1,
      limit: d.pageable?.pageSize || 10,
      totalPages: d.totalPages || 0
    } as PaginatedResponse<DealerPerformance>;
  },

  getMyPerformance: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/analytics/my-performance', { params });
    const d = response.data.data;
    return {
      data: d.content || [],
      total: d.totalElements || 0,
      page: (d.pageable?.pageNumber || 0) + 1,
      limit: d.pageable?.pageSize || 10,
      totalPages: d.totalPages || 0
    } as PaginatedResponse<DealerPerformance>;
  },

  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const response = await apiClient.get<ApiResponse<AnalyticsSummary>>('/api/v1/analytics/summary');
    return response.data.data;
  },

  getConversionSplit: async () => {
    const response = await apiClient.get<ApiResponse<Array<{ status: string; count: number }>>>('/api/v1/analytics/conversion-split');
    return response.data.data;
  },

  getMonthlySalesData: async () => {
    const response = await apiClient.get<ApiResponse<Array<{ name: string; sales: number; revenue: number }>>>('/api/v1/analytics/monthly-sales');
    return response.data.data;
  },

  getDashboardData: async () => {
    const response = await apiClient.get<any>('/api/v1/analytics/dashboard');
    return response.data;
  }
};
