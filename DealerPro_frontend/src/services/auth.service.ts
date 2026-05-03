// Authentication service

import apiClient from './api';
import { LoginCredentials, AuthResponse, User } from '../types/auth';

export const authService = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<{ data: AuthResponse }>('/api/v1/auth/login', credentials);
    return (response.data as any).data;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<{ data: User }>('/api/v1/auth/me');
    return (response.data as any).data;
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<{ data: AuthResponse }>('/api/v1/auth/refresh');
    return (response.data as any).data;
  },

  /**
   * Verify token validity
   */
  verifyToken: async (token: string): Promise<boolean> => {
    try {
      const response = await apiClient.post<{ data: { valid: boolean } }>('/api/v1/auth/verify', { token });
      return (response.data as any).data.valid;
    } catch {
      return false;
    }
  },
};
