import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_ORIGIN = API_URL.replace('/api', '');

export const resolveAssetUrl = (path: string): string => `${API_ORIGIN}${path}`;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
