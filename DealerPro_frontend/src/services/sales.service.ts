// Sales service

import apiClient from './api';
import { Order, CreateOrderDto, UpdateOrderDto, Invoice } from '../types/sales';
import { PaginatedResponse, QueryParams } from '../types/common';

export const salesService = {
  /**
   * Get all orders with pagination and filters
   */
  getAll: async (params?: QueryParams): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get<PaginatedResponse<Order>>('/api/v1/orders', { params });
    return response.data;
  },

  /**
   * Get order by ID
   */
  getById: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/api/v1/orders/${id}`);
    return response.data;
  },

  /**
   * Create new order
   */
  create: async (data: CreateOrderDto): Promise<Order> => {
    const response = await apiClient.post<Order>('/api/v1/orders', data);
    return response.data;
  },

  /**
   * Update existing order
   */
  update: async (id: string, data: UpdateOrderDto): Promise<Order> => {
    const response = await apiClient.put<Order>(`/api/v1/orders/${id}`, data);
    return response.data;
  },

  /**
   * Delete order
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/orders/${id}`);
  },

  /**
   * Generate invoice for order
   */
  generateInvoice: async (orderId: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/orders/${orderId}/invoice`);
    return response.data;
  },

  /**
   * Get invoice by ID
   */
  getInvoice: async (invoiceId: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
    return response.data;
  },
};
