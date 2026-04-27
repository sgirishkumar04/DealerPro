// Common types used across the application

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface QueryParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}
