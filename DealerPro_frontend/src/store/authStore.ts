import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  role: string;
  token: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (authResponse: User) => void;
  logout: () => void;
}

const getInitialUser = (): User | null => {
  const stored = localStorage.getItem('auth_user');
  if (!stored) return null;
  try {
    const user = JSON.parse(stored) as User;
    const payloadBase64 = user.token.split('.')[1];
    if (payloadBase64) {
      const decodedPayload = JSON.parse(atob(payloadBase64));
      if (decodedPayload.exp * 1000 < Date.now()) {
        localStorage.removeItem('auth_user');
        return null;
      }
    }
    return user;
  } catch (e) {
    localStorage.removeItem('auth_user');
    return null;
  }
};

const initialUser = getInitialUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,
  login: (user: User) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: async () => {
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        await fetch('http://localhost:8083/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
      } catch (e) {
        console.error('Logout API call failed', e);
      }
    }
    localStorage.removeItem('auth_user');
    set({ user: null, isAuthenticated: false });
  },
}));
