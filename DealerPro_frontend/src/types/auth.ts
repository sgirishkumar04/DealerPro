// Authentication types

export type Role = 'ADMIN' | 'MANAGER' | 'DEALER';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  roles: Role[];
  role: Role;
  dealerId?: string;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  id: number;
  roles: Role[];
  role: Role;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  roles: Role[];
}
