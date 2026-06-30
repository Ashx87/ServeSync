import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LastOrder {
  id: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  tableNumber: string;
}

interface OrderState {
  lastOrder: LastOrder | null;
  setLastOrder: (order: LastOrder) => void;
  updateLastOrderStatus: (status: LastOrder['status']) => void;
  clearLastOrder: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      lastOrder: null,
      setLastOrder: (order) => set({ lastOrder: order }),
      updateLastOrderStatus: (status) =>
        set((state) =>
          state.lastOrder ? { lastOrder: { ...state.lastOrder, status } } : state
        ),
      clearLastOrder: () => set({ lastOrder: null }),
    }),
    { name: 'serve-sync-last-order' }
  )
);
