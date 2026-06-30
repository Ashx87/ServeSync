import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { CheckCircle, ChefHat, Bell, CircleCheck, UtensilsCrossed } from 'lucide-react';
import apiClient from '../api/apiClient';
import type { Order } from '../types/order';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

const ORDER_STATUS_CONFIG: Record<Order['status'], { label: string; color: string; Icon: React.ElementType }> = {
  PENDING:    { label: '等待廚房確認', color: 'text-amber-600 bg-amber-50 border-amber-200',   Icon: Bell },
  PREPARING:  { label: '廚房製作中',   color: 'text-blue-600 bg-blue-50 border-blue-200',     Icon: ChefHat },
  READY:      { label: '餐點已備好',   color: 'text-green-600 bg-green-50 border-green-200',  Icon: CheckCircle },
  COMPLETED:  { label: '已送達',       color: 'text-gray-600 bg-gray-50 border-gray-200',     Icon: CircleCheck },
  CANCELLED:  { label: '已取消',       color: 'text-red-600 bg-red-50 border-red-200',        Icon: UtensilsCrossed },
};

const PAYMENT_STATUS_CONFIG: Record<Order['paymentStatus'], { label: string; color: string }> = {
  PENDING:  { label: '待付款', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  PAID:     { label: '已付款', color: 'text-green-700 bg-green-50 border-green-300' },
  REFUNDED: { label: '已退款', color: 'text-gray-600 bg-gray-50 border-gray-300' },
};

const Receipt = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(location.state?.order ?? null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!order && orderId) {
      apiClient.get<Order>(`/orders/${orderId}`)
        .then(res => setOrder(res.data))
        .catch(() => setError('無法載入訂單資料，請稍後再試。'))
        .finally(() => setLoading(false));
    }
  }, [orderId, order]);

  useEffect(() => {
    if (!orderId) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('order_status_update', (data: { orderId: string; status: Order['status'] }) => {
      if (data.orderId === orderId) {
        setOrder(prev => prev ? { ...prev, status: data.status } : prev);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-600 mb-4">{error || '找不到訂單'}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
          返回菜單
        </button>
      </div>
    );
  }

  const statusCfg = ORDER_STATUS_CONFIG[order.status];
  const paymentCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus];
  const OrderStatusIcon = statusCfg.Icon;
  const shortId = order.id.slice(-8).toUpperCase();

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">訂單已送出！</h1>
        <p className="text-gray-500 text-sm">我們已收到您的訂單，廚房正在處理中</p>
      </div>

      {/* Order Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">訂單編號</p>
            <p className="font-mono font-bold text-gray-900">#{shortId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">桌號</p>
            <p className="font-bold text-gray-900">{order.tableNumber}</p>
          </div>
        </div>

        {/* Items */}
        <ul className="divide-y divide-gray-50 mb-4">
          {order.orderItems.map(item => (
            <li key={item.id} className="py-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{item.menuItem.name}</span>
                  <span className="text-gray-400 text-sm ml-2">× {item.quantity}</span>
                  {item.notes && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 mt-1 inline-block">
                      {item.notes}
                    </p>
                  )}
                </div>
                <span className="font-medium text-gray-900 ml-4">
                  ${(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Total */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <span className="font-bold text-gray-900">總計</span>
          <span className="text-xl font-bold text-blue-600">${parseFloat(order.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">目前狀態</h2>
        <div className="flex flex-col gap-3">
          <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${statusCfg.color}`}>
            <OrderStatusIcon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium opacity-70 mb-0.5">訂單進度</p>
              <p className="font-semibold">{statusCfg.label}</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${paymentCfg.color}`}>
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <span className="text-lg">💳</span>
            </div>
            <div>
              <p className="text-xs font-medium opacity-70 mb-0.5">付款狀態</p>
              <p className="font-semibold">{paymentCfg.label}</p>
            </div>
          </div>
        </div>
        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
          <p className="text-xs text-gray-400 mt-3 text-center">訂單狀態將自動更新，無需重新整理頁面</p>
        )}
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
      >
        繼續點餐
      </button>
    </div>
  );
};

export default Receipt;
