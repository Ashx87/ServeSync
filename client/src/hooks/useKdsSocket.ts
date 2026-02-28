import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useKdsStore } from '../store/useKdsStore';
import type { Order } from '../types/order';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export const useKdsSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const addOrder = useKdsStore((state) => state.addOrder);
  const updateOrderStatus = useKdsStore((state) => state.updateOrderStatus);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('new_order', (order: Order) => {
      addOrder(order);
    });

    socket.on('order_status_update', (data: { orderId: string; status: string }) => {
      updateOrderStatus(data.orderId, data.status);
    });

    return () => {
      socket.disconnect();
    };
  }, [addOrder, updateOrderStatus]);
};
