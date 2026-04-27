// Authentication utility functions

import { AUTH } from './constants';

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH.tokenKey);
};

/**
 * Set authentication token in localStorage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH.tokenKey, token);
};

/**
 * Remove authentication token from localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(AUTH.tokenKey);
  localStorage.removeItem(AUTH.userKey);
};

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    return expirationTime < Date.now();
  } catch {
    return true;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  return !isTokenExpired(token);
};

/**
 * Hash password using bcrypt (client-side hashing before transmission)
 * Note: This is a placeholder. In production, use a proper bcrypt library
 */
export const hashPassword = async (password: string): Promise<string> => {
  // In production, use bcryptjs or similar library
  // For now, return the password as-is (server should handle hashing)
  return password;
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  removeAuthToken();
  // Clear any other auth-related data from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('auth_')) {
      localStorage.removeItem(key);
    }
  });
};

/**
 * Get time until token expires (in milliseconds)
 */
export const getTimeUntilExpiration = (token: string): number => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return 0;
  return Math.max(0, expiration.getTime() - Date.now());
};

/**
 * Check if token will expire soon (within 5 minutes)
 */
export const willExpireSoon = (token: string): boolean => {
  const timeUntilExpiration = getTimeUntilExpiration(token);
  return timeUntilExpiration > 0 && timeUntilExpiration < 5 * 60 * 1000; // 5 minutes
};
