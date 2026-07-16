import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_ORIGIN = API_URL.replace('/api', '');

export const resolveAssetUrl = (path: string): string => `${API_ORIGIN}${path}`;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the staff token (if logged in) to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 for an authenticated session, the token is invalid/expired:
// clear it and send staff back to the login page
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(useAuthStore.getState().token);
    if (error.response?.status === 401 && hadToken) {
      useAuthStore.getState().clearSession();
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path.startsWith('/kitchen')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
