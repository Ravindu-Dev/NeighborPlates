import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'COOK' | 'ADMIN';
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (request: any) => Promise<void>;
  register: (request: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/auth/login', request);
      const { token, refreshToken, id, name, email, role } = response.data;
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      const userObj = { id, name, email, role };
      await AsyncStorage.setItem('user', JSON.stringify(userObj));

      set({
        token,
        refreshToken,
        user: userObj,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Authentication failed. Please verify credentials.',
      });
      throw err;
    }
  },

  register: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/auth/register', request);
      const { token, refreshToken, id, name, email, role } = response.data;
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      const userObj = { id, name, email, role };
      await AsyncStorage.setItem('user', JSON.stringify(userObj));

      set({
        token,
        refreshToken,
        user: userObj,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Registration failed. Try checking your inputs.',
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const userString = await AsyncStorage.getItem('user');

      if (token && refreshToken && userString) {
        set({
          token,
          refreshToken,
          user: JSON.parse(userString),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (err) {
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
