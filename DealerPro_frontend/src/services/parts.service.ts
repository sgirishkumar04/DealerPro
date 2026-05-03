// Parts and spares service

import apiClient from './api';
import { 
  Part, 
  CreatePartDto, 
  Supplier, 
  PurchaseOrder, 
  CreatePurchaseOrderDto 
} from '../types/parts';
import { PaginatedResponse, QueryParams } from '../types/common';

export const partsService = {
  /**
   * Get all parts
   */
  getAll: async (params?: QueryParams): Promise<PaginatedResponse<Part>> => {
    const response = await apiClient.get<any>('/api/v1/parts', { 
      params: {
        page: params?.page ? params.page - 1 : 0,
        size: params?.limit || 10,
        name: params?.search,
        supplier: params?.filters?.supplier
      } 
    });
    const d = response.data.data;
    return {
      data: d.content || [],
      total: d.totalElements || 0,
      page: (d.pageNumber || 0) + 1,
      limit: d.pageSize || 10,
      totalPages: d.totalPages || 0
    };
  },

  /**
   * Get part by ID
   */
  getById: async (id: string): Promise<Part> => {
    const response = await apiClient.get<Part>(`/api/v1/parts/${id}`);
    return response.data;
  },

  /**
   * Create new part
   */
  create: async (data: CreatePartDto): Promise<Part> => {
    const response = await apiClient.post<Part>('/api/v1/parts', data);
    return response.data;
  },

  /**
   * Update existing part
   */
  update: async (id: string, data: Partial<CreatePartDto>): Promise<Part> => {
    const response = await apiClient.put<Part>(`/api/v1/parts/${id}`, data);
    return response.data;
  },

  /**
   * Delete part
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/parts/${id}`);
  },

  /**
   * Get all suppliers
   */
  getSuppliers: async (params?: QueryParams): Promise<PaginatedResponse<Supplier>> => {
    const response = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params });
    return response.data;
  },

  /**
   * Create supplier
   */
  createSupplier: async (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', data);
    return response.data;
  },

  /**
   * Get all purchase orders
   */
  getPurchaseOrders: async (params?: QueryParams): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', { params });
    return response.data;
  },

  /**
   * Create purchase order
   */
  createPurchaseOrder: async (data: { partId: number | string; quantity: number; justification: string }): Promise<PurchaseOrder> => {
    const response = await apiClient.post<any>('/purchase-orders', data);
    return response.data.data;
  },

  /**
   * Update purchase order status
   */
  updatePurchaseOrder: async (id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const response = await apiClient.put<PurchaseOrder>(`/purchase-orders/${id}`, data);
    return response.data;
  },
};
