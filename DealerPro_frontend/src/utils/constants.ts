// Application constants

// KIA Brand Colors
export const COLORS = {
  primary: '#C8102E',
  secondary: '#1A1A1A',
  accent: '#F5F5F5',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// Date formats
export const DATE_FORMATS = {
  display: 'MM/DD/YYYY',
  displayWithTime: 'MM/DD/YYYY HH:mm',
  api: 'YYYY-MM-DD',
  apiWithTime: 'YYYY-MM-DDTHH:mm:ss',
} as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  maxPageSize: 100,
} as const;

// API
export const API = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
} as const;

// Authentication
export const AUTH = {
  tokenKey: 'auth_token',
  userKey: 'auth_user',
  sessionTimeout: 1800000, // 30 minutes in milliseconds
  maxLoginAttempts: 5,
} as const;

// Validation
export const VALIDATION = {
  minPasswordLength: 8,
  vinLength: 17,
  phoneRegex: /^[\d\s\-\+\(\)]+$/,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// UI
export const UI = {
  toastDuration: 5000,
  maxVisibleToasts: 3,
  debounceDelay: 300,
  animationDuration: 300,
  minTouchTargetSize: 44,
} as const;

// Roles and Permissions
export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  DEALER: 'DEALER',
} as const;

// Stock Status
export const STOCK_STATUS = {
  AVAILABLE: 'available',
  SOLD: 'sold',
  RESERVED: 'reserved',
  SERVICE: 'service',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETED: 'completed',
} as const;

// Lead Status
export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CONVERTED: 'converted',
  LOST: 'lost',
} as const;

// Service Status
export const SERVICE_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Transaction Categories
export const TRANSACTION_CATEGORIES = {
  SALES: 'sales',
  EXPENSES: 'expenses',
  PAYROLL: 'payroll',
  INVENTORY: 'inventory',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INVENTORY: '/inventory',
  SALES: '/sales',
  SALES_ORDERS: '/sales/orders',
  SALES_INVOICES: '/sales/invoices',
  LEADS: '/leads',
  LEADS_TEST_DRIVES: '/leads/test-drives',
  SERVICE: '/service',
  SERVICE_REPAIR_ORDERS: '/service/repair-orders',
  PARTS: '/parts',
  PARTS_SUPPLIERS: '/parts/suppliers',
  PARTS_PURCHASE_ORDERS: '/parts/purchase-orders',
  FINANCE: '/finance',
  FINANCE_REPORTS: '/finance/reports',
  ANALYTICS: '/analytics',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_DEALERS: '/admin/dealers',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SAVED: 'Saved successfully',
} as const;
