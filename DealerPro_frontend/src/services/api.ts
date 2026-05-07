import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8083',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const user = useAuthStore.getState().user;
    if (user?.token) {
      config.headers['Authorization'] = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const isSignupRequest = error.config?.url?.includes('/auth/signup');
    const isLoginPage = window.location.pathname === '/login';
    const isSignupPage = window.location.pathname === '/signup';

    const isExpiredError = error.response?.data?.message?.toLowerCase().includes('expired');

    if (error.response?.status === 401 && !isLoginRequest && !isSignupRequest && !isLoginPage && !isSignupPage && !isExpiredError) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }

    if (error.response?.status === 409) {
      // Allow components to handle this error (e.g. by showing a Dialog or Snackbar)
    }

    return Promise.reject(error);
  }
);

export default api;
