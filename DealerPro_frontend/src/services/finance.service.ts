// Finance service

import apiClient from './api';
import { Transaction, CreateTransactionDto, FinancialReport } from '../types/finance';
import { PaginatedResponse, QueryParams, DateRange } from '../types/common';

export const financeService = {
  /**
   * Get all transactions
   */
  getAll: async (params?: QueryParams): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get<PaginatedResponse<Transaction>>('/api/v1/transactions', { params });
    return response.data;
  },

  /**
   * Get transaction by ID
   */
  getById: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/api/v1/transactions/${id}`);
    return response.data;
  },

  /**
   * Create new transaction
   */
  create: async (data: CreateTransactionDto): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>('/api/v1/transactions', data);
    return response.data;
  },

  /**
   * Update existing transaction
   */
  update: async (id: string, data: Partial<CreateTransactionDto>): Promise<Transaction> => {
    const response = await apiClient.put<Transaction>(`/api/v1/transactions/${id}`, data);
    return response.data;
  },

  /**
   * Delete transaction
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/transactions/${id}`);
  },

  /**
   * Generate profit and loss report
   */
  getProfitLossReport: async (dateRange: DateRange): Promise<FinancialReport> => {
    const response = await apiClient.get<FinancialReport>('/finance/reports/profit-loss', {
      params: dateRange,
    });
    return response.data;
  },

  /**
   * Generate balance sheet
   */
  getBalanceSheet: async (dateRange: DateRange): Promise<FinancialReport> => {
    const response = await apiClient.get<FinancialReport>('/finance/reports/balance-sheet', {
      params: dateRange,
    });
    return response.data;
  },

  /**
   * Export report to PDF
   */
  exportReportPDF: async (reportId: string): Promise<Blob> => {
    const response = await apiClient.get(`/finance/reports/${reportId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Export report to Excel
   */
  exportReportExcel: async (reportId: string): Promise<Blob> => {
    const response = await apiClient.get(`/finance/reports/${reportId}/excel`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
