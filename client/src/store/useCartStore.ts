import { create } from 'zustand';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  categoryId: string;
  isAvailable: boolean;
  imageUrl: string | null;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (menuItem: MenuItem, notes?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (menuItem, notes) => set((state) => {
    const existingItem = state.items.find(item => item.menuItem.id === menuItem.id);
    if (existingItem) {
      return {
        items: state.items.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1, notes: notes || item.notes }
            : item
        )
      };
    }
    return { items: [...state.items, { menuItem, quantity: 1, notes }] };
  }),

  removeItem: (menuItemId) => set((state) => ({
    items: state.items.filter(item => item.menuItem.id !== menuItemId)
  })),

  updateQuantity: (menuItemId, quantity) => set((state) => {
    if (quantity <= 0) {
      return { items: state.items.filter(item => item.menuItem.id !== menuItemId) };
    }
    return {
      items: state.items.map(item => 
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    };
  }),

  clearCart: () => set({ items: [] }),

  getCartTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      return total + (parseFloat(item.menuItem.price) * item.quantity);
    }, 0);
  }
}));
