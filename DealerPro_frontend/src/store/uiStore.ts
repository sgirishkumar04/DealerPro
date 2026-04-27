import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserPreferences {
  itemsPerPage: number;
  dateFormat: string;
  currency: string;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  preferences: UserPreferences;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      preferences: {
        itemsPerPage: 20,
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
      },
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
    }),
    {
      name: 'ui-storage',
    }
  )
);
