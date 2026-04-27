// Leads service

import apiClient from './api';
import { Lead, CreateLeadDto, UpdateLeadDto, TestDrive, CreateTestDriveDto } from '../types/leads';
import { PaginatedResponse, QueryParams } from '../types/common';

export const leadsService = {
  /**
   * Get all leads with pagination and filters
   */
  getAll: async (params?: QueryParams): Promise<PaginatedResponse<Lead>> => {
    const response = await apiClient.get<PaginatedResponse<Lead>>('/api/leads', { params });
    return response.data;
  },

  /**
   * Get lead by ID
   */
  getById: async (id: string): Promise<Lead> => {
    const response = await apiClient.get<Lead>(`/api/leads/${id}`);
    return response.data;
  },

  /**
   * Create new lead
   */
  create: async (data: CreateLeadDto): Promise<Lead> => {
    const response = await apiClient.post<Lead>('/api/leads', data);
    return response.data;
  },

  /**
   * Update existing lead
   */
  update: async (id: string, data: UpdateLeadDto): Promise<Lead> => {
    const response = await apiClient.put<Lead>(`/api/leads/${id}`, data);
    return response.data;
  },

  /**
   * Delete lead
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/leads/${id}`);
  },

  /**
   * Get all test drives
   */
  getTestDrives: async (params?: QueryParams): Promise<PaginatedResponse<TestDrive>> => {
    const response = await apiClient.get<PaginatedResponse<TestDrive>>('/api/test-drives', { params });
    return response.data;
  },

  /**
   * Schedule test drive
   */
  scheduleTestDrive: async (data: CreateTestDriveDto): Promise<TestDrive> => {
    const response = await apiClient.post<TestDrive>('/api/test-drives', data);
    return response.data;
  },

  /**
   * Update test drive
   */
  updateTestDrive: async (id: string, data: Partial<CreateTestDriveDto>): Promise<TestDrive> => {
    const response = await apiClient.put<TestDrive>(`/api/test-drives/${id}`, data);
    return response.data;
  },

  /**
   * Cancel test drive
   */
  cancelTestDrive: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/test-drives/${id}`);
  },
};
