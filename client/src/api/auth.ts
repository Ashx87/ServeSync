import apiClient from './apiClient';
import type { LoginResponse } from '../types/auth';

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
  return response.data;
};
