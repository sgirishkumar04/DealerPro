// Validation utility functions

import { VALIDATION } from './constants';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return VALIDATION.emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  return VALIDATION.phoneRegex.test(phone);
};

/**
 * Validate VIN (Vehicle Identification Number)
 */
export const isValidVIN = (vin: string): boolean => {
  return vin.length === VALIDATION.vinLength && /^[A-HJ-NPR-Z0-9]+$/i.test(vin);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < VALIDATION.minPasswordLength) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

/**
 * Get password strength level
 */
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < VALIDATION.minPasswordLength) return 'weak';
  
  let strength = 0;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  if (password.length >= 12) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 3) return 'medium';
  return 'strong';
};

/**
 * Validate required field
 */
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

/**
 * Validate numeric range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate date is not in the past
 */
export const isNotPastDate = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return dateObj >= now;
};

/**
 * Validate date is in the future
 */
export const isFutureDate = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
};

/**
 * Validate URL format
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate positive number
 */
export const isPositiveNumber = (value: number): boolean => {
  return typeof value === 'number' && value > 0;
};

/**
 * Validate non-negative number
 */
export const isNonNegativeNumber = (value: number): boolean => {
  return typeof value === 'number' && value >= 0;
};

/**
 * Sanitize string input (basic XSS prevention)
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
