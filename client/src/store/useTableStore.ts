import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TableState {
  tableNumber: string | null;
  setTable: (tableNumber: string) => void;
  clearTable: () => void;
}

export const useTableStore = create<TableState>()(
  persist(
    (set) => ({
      tableNumber: null,
      setTable: (tableNumber) => set({ tableNumber }),
      clearTable: () => set({ tableNumber: null }),
    }),
    { name: 'serve-sync-table' }
  )
);
