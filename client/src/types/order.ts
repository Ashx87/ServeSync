export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: string;
  notes: string | null;
  menuItem: {
    id: string;
    name: string;
  };
}

export interface Order {
  id: string;
  tableNumber: string;
  totalAmount: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}

export type ActiveStatus = 'PENDING' | 'PREPARING' | 'READY';
