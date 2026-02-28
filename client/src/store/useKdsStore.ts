import { create } from 'zustand';
import apiClient from '../api/apiClient';
import type { Order, ActiveStatus } from '../types/order';

interface KdsState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  advanceOrder: (orderId: string, nextStatus: string) => Promise<void>;
}

export const useKdsStore = create<KdsState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const statuses: ActiveStatus[] = ['PENDING', 'PREPARING', 'READY'];
      const responses = await Promise.all(
        statuses.map((status) => apiClient.get(`/orders?status=${status}`))
      );
      const allOrders = responses.flatMap((res) => res.data);
      set({ orders: allOrders, loading: false });
    } catch {
      set({ error: 'Failed to fetch orders', loading: false });
    }
  },

  addOrder: (order) =>
    set((state) => ({ orders: [...state.orders, order] })),

  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders:
        status === 'COMPLETED' || status === 'CANCELLED'
          ? state.orders.filter((o) => o.id !== orderId)
          : state.orders.map((o) =>
              o.id === orderId ? { ...o, status: status as Order['status'] } : o
            ),
    })),

  advanceOrder: async (orderId, nextStatus) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: nextStatus });
      get().updateOrderStatus(orderId, nextStatus);
    } catch {
      set({ error: 'Failed to update order status' });
    }
  },
}));
