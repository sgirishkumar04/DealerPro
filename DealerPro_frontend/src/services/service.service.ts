// Service and workshop service

import apiClient from './api';
import { 
  ServiceAppointment, 
  CreateServiceAppointmentDto, 
  RepairOrder, 
  CreateRepairOrderDto 
} from '../types/service';
import { PaginatedResponse, QueryParams } from '../types/common';

export const serviceService = {
  /**
   * Get all service appointments
   */
  getAppointments: async (params?: QueryParams): Promise<PaginatedResponse<ServiceAppointment>> => {
    const response = await apiClient.get<PaginatedResponse<ServiceAppointment>>('/service/appointments', { params });
    return response.data;
  },

  /**
   * Get appointment by ID
   */
  getAppointmentById: async (id: string): Promise<ServiceAppointment> => {
    const response = await apiClient.get<ServiceAppointment>(`/service/appointments/${id}`);
    return response.data;
  },

  /**
   * Create service appointment
   */
  createAppointment: async (data: CreateServiceAppointmentDto): Promise<ServiceAppointment> => {
    const response = await apiClient.post<ServiceAppointment>('/service/appointments', data);
    return response.data;
  },

  /**
   * Update service appointment
   */
  updateAppointment: async (id: string, data: Partial<CreateServiceAppointmentDto>): Promise<ServiceAppointment> => {
    const response = await apiClient.put<ServiceAppointment>(`/service/appointments/${id}`, data);
    return response.data;
  },

  /**
   * Delete service appointment
   */
  deleteAppointment: async (id: string): Promise<void> => {
    await apiClient.delete(`/service/appointments/${id}`);
  },

  /**
   * Get all repair orders
   */
  getRepairOrders: async (params?: QueryParams): Promise<PaginatedResponse<RepairOrder>> => {
    const response = await apiClient.get<PaginatedResponse<RepairOrder>>('/service/repair-orders', { params });
    return response.data;
  },

  /**
   * Get repair order by ID
   */
  getRepairOrderById: async (id: string): Promise<RepairOrder> => {
    const response = await apiClient.get<RepairOrder>(`/service/repair-orders/${id}`);
    return response.data;
  },

  /**
   * Create repair order
   */
  createRepairOrder: async (data: CreateRepairOrderDto): Promise<RepairOrder> => {
    const response = await apiClient.post<RepairOrder>('/service/repair-orders', data);
    return response.data;
  },

  /**
   * Update repair order
   */
  updateRepairOrder: async (id: string, data: Partial<CreateRepairOrderDto>): Promise<RepairOrder> => {
    const response = await apiClient.put<RepairOrder>(`/service/repair-orders/${id}`, data);
    return response.data;
  },

  /**
   * Delete repair order
   */
  deleteRepairOrder: async (id: string): Promise<void> => {
    await apiClient.delete(`/service/repair-orders/${id}`);
  },
};
