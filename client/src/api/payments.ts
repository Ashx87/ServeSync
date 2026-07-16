import apiClient from './apiClient';
import type { Payment } from '../types/payment';
import type { Order } from '../types/order';

export const initiatePayment = async (orderId: string): Promise<Payment> => {
  const response = await apiClient.post<Payment>(`/orders/${orderId}/payments`);
  return response.data;
};

export const simulatePaymentSuccess = async (paymentId: string): Promise<Order> => {
  // In mock mode the browser simulates the provider callback; a real provider
  // would call the webhook itself with this shared secret
  const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET;
  const response = await apiClient.post<Order>(
    `/payments/${paymentId}/webhook`,
    undefined,
    webhookSecret ? { headers: { 'X-Webhook-Secret': webhookSecret } } : undefined
  );
  return response.data;
};
