// Inventory service

import apiClient from './api';
import { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '../types/inventory';
import { PaginatedResponse, QueryParams } from '../types/common';

export const inventoryService = {
  /**
   * Get all vehicles with pagination and filters
   */
  getAll: async (params?: QueryParams): Promise<PaginatedResponse<Vehicle>> => {
    const response = await apiClient.get<PaginatedResponse<Vehicle>>('/vehicles', { params });
    return response.data;
  },

  /**
   * Get vehicle by ID
   */
  getById: async (id: string): Promise<Vehicle> => {
    const response = await apiClient.get<Vehicle>(`/vehicles/${id}`);
    return response.data;
  },

  /**
   * Create new vehicle
   */
  create: async (data: CreateVehicleDto): Promise<Vehicle> => {
    const response = await apiClient.post<Vehicle>('/vehicles', data);
    return response.data;
  },

  /**
   * Update existing vehicle
   */
  update: async (id: string, data: UpdateVehicleDto): Promise<Vehicle> => {
    const response = await apiClient.put<Vehicle>(`/vehicles/${id}`, data);
    return response.data;
  },

  /**
   * Delete vehicle
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`);
  },

  /**
   * Search vehicles
   */
  search: async (query: string): Promise<Vehicle[]> => {
    const response = await apiClient.get<Vehicle[]>('/vehicles/search', { 
      params: { q: query } 
    });
    return response.data;
  },
};
