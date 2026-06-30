import { create } from 'zustand';
import apiClient from '../api/apiClient';
import type { Order, ActiveStatus } from '../types/order';

interface KdsState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  upsertOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  advanceOrder: (orderId: string, nextStatus: Order['status']) => Promise<void>;
}

export const useKdsStore = create<KdsState>((set) => ({
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

  upsertOrder: (order) =>
    set((state) => {
      const exists = state.orders.some((o) => o.id === order.id);
      return {
        orders: exists
          ? state.orders.map((o) => (o.id === order.id ? order : o))
          : [...state.orders, order],
      };
    }),

  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders:
        status === 'COMPLETED' || status === 'CANCELLED'
          ? state.orders.filter((o) => o.id !== orderId)
          : state.orders.map((o) =>
              o.id === orderId ? { ...o, status } : o
            ),
    })),

  advanceOrder: async (orderId, nextStatus) => {
    set({ error: null });
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: nextStatus });
    } catch {
      set({ error: 'Failed to update order status' });
    }
  },
}));
