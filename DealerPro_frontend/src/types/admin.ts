// Admin domain types

import { Role } from './auth';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  dealerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Dealer {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlags {
  enableAnalytics: boolean;
  enableFinance: boolean;
  [key: string]: boolean;
}

export interface SystemConfig {
  apiBaseUrl: string;
  features: FeatureFlags;
  sessionTimeout: number;
  maxLoginAttempts: number;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  dealerId?: string;
  password: string;
}

export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'password'>> {
  isActive?: boolean;
}

export interface CreateDealerDto {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
}
