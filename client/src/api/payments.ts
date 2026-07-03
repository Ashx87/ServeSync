import apiClient from './apiClient';
import type { Payment } from '../types/payment';
import type { Order } from '../types/order';

export const initiatePayment = async (orderId: string): Promise<Payment> => {
  const response = await apiClient.post<Payment>(`/orders/${orderId}/payments`);
  return response.data;
};

export const simulatePaymentSuccess = async (paymentId: string): Promise<Order> => {
  const response = await apiClient.post<Order>(`/payments/${paymentId}/webhook`);
  return response.data;
};
