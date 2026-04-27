// Permission utility functions

import { Role } from '../types/auth';

export type Permission =
  | 'view_inventory'
  | 'create_inventory'
  | 'update_inventory'
  | 'delete_inventory'
  | 'view_sales'
  | 'create_sales'
  | 'update_sales'
  | 'delete_sales'
  | 'view_leads'
  | 'create_leads'
  | 'update_leads'
  | 'delete_leads'
  | 'view_service'
  | 'create_service'
  | 'update_service'
  | 'delete_service'
  | 'view_parts'
  | 'create_parts'
  | 'update_parts'
  | 'delete_parts'
  | 'view_finance'
  | 'create_finance'
  | 'update_finance'
  | 'delete_finance'
  | 'view_analytics'
  | 'manage_users'
  | 'manage_dealers'
  | 'manage_settings';

/**
 * Role-based permission mapping
 */
const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    'view_inventory',
    'create_inventory',
    'update_inventory',
    'delete_inventory',
    'view_sales',
    'create_sales',
    'update_sales',
    'delete_sales',
    'view_leads',
    'create_leads',
    'update_leads',
    'delete_leads',
    'view_service',
    'create_service',
    'update_service',
    'delete_service',
    'view_parts',
    'create_parts',
    'update_parts',
    'delete_parts',
    'view_finance',
    'create_finance',
    'update_finance',
    'delete_finance',
    'view_analytics',
    'manage_users',
    'manage_dealers',
    'manage_settings',
  ],
  MANAGER: [
    'view_inventory',
    'create_inventory',
    'update_inventory',
    'view_sales',
    'create_sales',
    'update_sales',
    'view_leads',
    'create_leads',
    'update_leads',
    'view_service',
    'create_service',
    'update_service',
    'view_parts',
    'create_parts',
    'update_parts',
    'view_finance',
    'view_analytics',
  ],
  DEALER: [
    'view_inventory',
    'create_inventory',
    'update_inventory',
    'view_sales',
    'create_sales',
    'update_sales',
    'view_leads',
    'create_leads',
    'update_leads',
    'view_service',
    'create_service',
    'update_service',
    'view_parts',
    'create_parts',
    'update_parts',
    'view_analytics',
  ],
};

/**
 * Check if a role has a specific permission
 */
export const checkPermission = (role: Role, permission: Permission): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};

/**
 * Check if a role can delete resources
 */
export const canDelete = (role: Role): boolean => {
  return role === 'ADMIN';
};

/**
 * Check if a role can access finance module
 */
export const canAccessFinance = (role: Role): boolean => {
  return role === 'ADMIN' || role === 'MANAGER';
};

/**
 * Check if a role can manage users
 */
export const canManageUsers = (role: Role): boolean => {
  return role === 'ADMIN';
};

/**
 * Check if a role can manage dealers
 */
export const canManageDealers = (role: Role): boolean => {
  return role === 'ADMIN';
};

/**
 * Check if a role can manage system settings
 */
export const canManageSettings = (role: Role): boolean => {
  return role === 'ADMIN';
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role: Role): Permission[] => {
  return rolePermissions[role] || [];
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (role: Role, permissions: Permission[]): boolean => {
  return permissions.some((permission) => checkPermission(role, permission));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (role: Role, permissions: Permission[]): boolean => {
  return permissions.every((permission) => checkPermission(role, permission));
};
