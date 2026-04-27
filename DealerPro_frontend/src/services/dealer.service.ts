import apiClient from './api';
import { PaginatedResponse } from '../types/common';

export interface Dealer {
  id: number;
  name: string;
  location: string;
  contactNumber: string;
  email: string;
  status: string;
  createdAt?: string;
}

export const dealerService = {
  getAll: async (params?: any): Promise<PaginatedResponse<Dealer>> => {
    const response = await apiClient.get('/dealers', { params });
    // Normalize to PaginatedResponse if it returns raw array or spring page
    if (response.data.data && Array.isArray(response.data.data.content)) {
      const d = response.data.data;
      return {
        data: d.content,
        total: d.totalElements,
        page: d.pageable?.pageNumber + 1 || 1,
        limit: d.pageable?.pageSize || 10,
        totalPages: d.totalPages
      };
    }
    return { data: response.data.data || [], total: 0, page: 1, limit: 10, totalPages: 1 };
  },

  create: async (data: Partial<Dealer>): Promise<Dealer> => {
    const response = await apiClient.post('/dealers', data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<Dealer>): Promise<Dealer> => {
    const response = await apiClient.put(`/dealers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/dealers/${id}`);
  }
};
