import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extractIp = (str?: string): string | null => {
  if (!str) return null;

  // 1. Direct IPv4 match (e.g. 10.5.0.188)
  const ipMatch = str.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  if (ipMatch) {
    const ip = ipMatch[0];
    if (ip !== '127.0.0.1' && ip !== '0.0.0.0') return ip;
  }

  // 2. Hyphenated IPv4 in Expo tunnel subdomains (e.g. abc-10-5-0-188... -> 10.5.0.188)
  const hyphenMatch = str.match(/\b(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\b/);
  if (hyphenMatch) {
    return `${hyphenMatch[1]}.${hyphenMatch[2]}.${hyphenMatch[3]}.${hyphenMatch[4]}`;
  }

  return null;
};

// Resolve backend API URL dynamically for any network:
// 1. Explicit EXPO_PUBLIC_API_URL if set in environment
// 2. Web: Connects to localhost (http://localhost:8081)
// 3. Physical device (Expo Go): Dynamically extracts the host PC IP from Metro server across multiple Expo Constants sources
// 4. Emulators/Simulators: Fallback to 10.0.2.2 (Android) or localhost (iOS)
export const getBackendUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:8081';
  }

  // Check hostUri, debuggerHost, and linkingUri for host IP
  const hostUriIp = extractIp(Constants.expoConfig?.hostUri);
  if (hostUriIp) return `http://${hostUriIp}:8081`;

  const debuggerHost =
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;
  const debuggerIp = extractIp(debuggerHost);
  if (debuggerIp) return `http://${debuggerIp}:8081`;

  const linkingIp = extractIp(Constants.linkingUri);
  if (linkingIp) return `http://${linkingIp}:8081`;

  return Platform.OS === 'android' ? 'http://10.0.2.2:8081' : 'http://localhost:8081';
};

export const api = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token and set dynamic baseURL per request
api.interceptors.request.use(
  async (config) => {
    config.baseURL = getBackendUrl();
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

let onUnauthorizedCallback: (() => void) | null = null;

export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

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
          const currentBackendUrl = getBackendUrl();
          const res = await axios.post(`${currentBackendUrl}/api/auth/refresh`, { refreshToken });
          if (res.status === 200) {
            const { token: newAccessToken } = res.data;
            await AsyncStorage.setItem('token', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
        throw new Error('No refresh token found');
      } catch (refreshError) {
        // Clear storage and logout if refresh token expired
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }
    }
    return Promise.reject(error);
  }
);
