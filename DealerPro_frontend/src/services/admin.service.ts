// Admin service

import apiClient from './api';
import { User, CreateUserDto, UpdateUserDto, Dealer, CreateDealerDto, SystemConfig } from '../types/admin';
import { PaginatedResponse, QueryParams } from '../types/common';

export const adminService = {
  /**
   * Get all users
   */
  getUsers: async (params?: QueryParams): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params });
    return response.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Create new user
   */
  createUser: async (data: CreateUserDto): Promise<User> => {
    const response = await apiClient.post<User>('/admin/users', data);
    return response.data;
  },

  /**
   * Update existing user
   */
  updateUser: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string, reassignToUserId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`, {
      params: { reassignTo: reassignToUserId },
    });
  },

  /**
   * Get all dealers
   */
  getDealers: async (params?: QueryParams): Promise<PaginatedResponse<Dealer>> => {
    const response = await apiClient.get<PaginatedResponse<Dealer>>('/admin/dealers', { params });
    return response.data;
  },

  /**
   * Get dealer by ID
   */
  getDealerById: async (id: string): Promise<Dealer> => {
    const response = await apiClient.get<Dealer>(`/admin/dealers/${id}`);
    return response.data;
  },

  /**
   * Create new dealer
   */
  createDealer: async (data: CreateDealerDto): Promise<Dealer> => {
    const response = await apiClient.post<Dealer>('/admin/dealers', data);
    return response.data;
  },

  /**
   * Update existing dealer
   */
  updateDealer: async (id: string, data: Partial<CreateDealerDto>): Promise<Dealer> => {
    const response = await apiClient.put<Dealer>(`/admin/dealers/${id}`, data);
    return response.data;
  },

  /**
   * Delete dealer
   */
  deleteDealer: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/dealers/${id}`);
  },

  /**
   * Get system configuration
   */
  getConfig: async (): Promise<SystemConfig> => {
    const response = await apiClient.get<SystemConfig>('/admin/config');
    return response.data;
  },

  /**
   * Update system configuration
   */
  updateConfig: async (data: Partial<SystemConfig>): Promise<SystemConfig> => {
    const response = await apiClient.put<SystemConfig>('/admin/config', data);
    return response.data;
  },

  /**
   * Advanced search for managers
   */
  searchManagers: async (searchRequest: any): Promise<any> => {
    const response = await apiClient.post('/api/v1/managers/search', searchRequest);
    return response.data.data;
  },

  /**
   * Advanced search for admins
   */
  searchAdmins: async (searchRequest: any): Promise<any> => {
    const response = await apiClient.post('/api/v1/admins/search', searchRequest);
    return response.data.data;
  },
};
