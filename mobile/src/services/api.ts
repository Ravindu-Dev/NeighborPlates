import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve backend API URL dynamically:
// - Web: Connects to localhost (127.0.0.1:8081)
// - Physical device (Expo Go): Dynamically extracts the host PC IP from the Metro server (e.g., 10.90.111.12:8081)
// - Emulators/Simulators: Fallback to 10.0.2.2 (Android) or localhost (iOS)
const getBackendUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8081';
  }

  // hostUri looks like "10.90.111.12:8082"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8081`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:8081' : 'http://localhost:8081';
};

const BASE_URL = getBackendUrl(); 

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
          if (res.status === 200) {
            const { token: newAccessToken } = res.data;
            await AsyncStorage.setItem('token', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Clear storage and logout if refresh token expired
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
      }
    }
    return Promise.reject(error);
  }
);
