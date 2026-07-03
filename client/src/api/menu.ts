import apiClient from './apiClient';
import type { Category } from '../types/menu';
import type { MenuItem } from '../store/useCartStore';

export const getCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get<Category[]>('/menu/categories');
  return response.data;
};

export const createCategory = async (data: { name: string; description?: string }): Promise<Category> => {
  const response = await apiClient.post<Category>('/menu/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: { name?: string; description?: string }): Promise<Category> => {
  const response = await apiClient.patch<Category>(`/menu/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/menu/categories/${id}`);
};

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
  const response = await apiClient.get<MenuItem[]>('/menu/items', { params: { includeUnavailable: true } });
  return response.data;
};

export interface MenuItemInput {
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  imageUrl?: string;
}

export const createMenuItem = async (data: MenuItemInput): Promise<MenuItem> => {
  const response = await apiClient.post<MenuItem>('/menu/items', data);
  return response.data;
};

export const updateMenuItem = async (
  id: string,
  data: Partial<MenuItemInput> & { isAvailable?: boolean }
): Promise<MenuItem> => {
  const response = await apiClient.patch<MenuItem>(`/menu/items/${id}`, data);
  return response.data;
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  await apiClient.delete(`/menu/items/${id}`);
};

export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post<{ url: string }>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
