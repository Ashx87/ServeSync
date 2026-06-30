import { useEffect, useRef } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingCart, Utensils, ClipboardList } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useCartStore } from '../store/useCartStore';
import { useOrderStore } from '../store/useOrderStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING:   '等待廚房確認',
  PREPARING: '廚房製作中',
  READY:     '餐點已備好',
};

const ORDER_STATUS_DOT: Record<string, string> = {
  PENDING:   'bg-amber-400',
  PREPARING: 'bg-blue-500',
  READY:     'bg-green-500',
};

const ACTIVE_STATUSES = new Set(['PENDING', 'PREPARING', 'READY']);

const Layout = () => {
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const lastOrder = useOrderStore((state) => state.lastOrder);
  const updateLastOrderStatus = useOrderStore((state) => state.updateLastOrderStatus);

  const socketRef = useRef<Socket | null>(null);

  const showOrderBanner = lastOrder !== null && ACTIVE_STATUSES.has(lastOrder.status);

  useEffect(() => {
    if (!lastOrder) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('order_status_update', (data: { orderId: string; status: string }) => {
      if (data.orderId === lastOrder.id) {
        updateLastOrderStatus(data.status as any);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [lastOrder?.id, updateLastOrderStatus]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Utensils className="text-blue-600" />
              ServeSync
            </Link>

            <nav className="flex items-center gap-2">
              {showOrderBanner && (
                <Link
                  to={`/receipt/${lastOrder.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full animate-pulse ${ORDER_STATUS_DOT[lastOrder.status]}`} />
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">{ORDER_STATUS_LABEL[lastOrder.status]}</span>
                  <span className="sm:hidden">我的訂單</span>
                </Link>
              )}

              <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium">
                Menu
              </Link>
              <Link to="/cart" className="relative flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium">
                <ShoppingCart className="w-5 h-5 mr-1" />
                Cart
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {itemCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white mt-auto border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} ServeSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
