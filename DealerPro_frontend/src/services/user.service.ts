import apiClient from './api';
import { PaginatedResponse } from '../types/common';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  dealerId?: number;
  isActive: boolean;
  createdAt?: string;
}

export const userService = {
  getAll: async (params?: any): Promise<PaginatedResponse<AdminUser>> => {
    const response = await apiClient.get('/users', { params });
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

  create: async (data: Partial<AdminUser>): Promise<AdminUser> => {
    const response = await apiClient.post('/users', data);
    return response.data.data;
  },

  updateRole: async (id: number, role: string, dealerId?: number): Promise<AdminUser> => {
    const response = await apiClient.patch(`/users/${id}/role`, { role, dealerId });
    return response.data.data;
  },

  toggleActive: async (id: number, isActive: boolean): Promise<AdminUser> => {
    const response = await apiClient.patch(`/users/${id}/status`, { isActive });
    return response.data.data;
  },

  search: async (searchRequest: any): Promise<any> => {
    const response = await apiClient.post('/api/users/search', searchRequest);
    return response.data.data;
  }
};
