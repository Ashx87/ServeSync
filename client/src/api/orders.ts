import apiClient from './apiClient';
import type { Order } from '../types/order';

export interface OrderPageFilters {
  page: number;
  limit: number;
  date?: string;
  tableNumber?: string;
  status?: string;
  paymentStatus?: string;
}

export interface OrderPage {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export const fetchOrdersPage = async (filters: OrderPageFilters): Promise<OrderPage> => {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  if (filters.date) params.set('date', filters.date);
  if (filters.tableNumber) params.set('tableNumber', filters.tableNumber);
  if (filters.status) params.set('status', filters.status);
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);

  const response = await apiClient.get<OrderPage>(`/orders?${params.toString()}`);
  return response.data;
};

export const cancelOrder = async (orderId: string): Promise<Order> => {
  const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, {
    status: 'CANCELLED',
  });
  return response.data;
};

export const refundOrder = async (orderId: string): Promise<Order> => {
  const response = await apiClient.post<Order>(`/orders/${orderId}/refund`);
  return response.data;
};
