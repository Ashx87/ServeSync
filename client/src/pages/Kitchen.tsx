import { useEffect } from 'react';
import { useKdsStore } from '../store/useKdsStore';
import { useKdsSocket } from '../hooks/useKdsSocket';
import KdsColumn from '../components/kds/KdsColumn';
import { ChefHat } from 'lucide-react';
import LogoutButton from '../components/LogoutButton';
import type { ActiveStatus } from '../types/order';

const COLUMNS: ActiveStatus[] = ['PENDING', 'PREPARING', 'READY'];

const Kitchen = () => {
  const { orders, loading, error, fetchOrders } = useKdsStore();

  useKdsSocket();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold">KDS - ServeSync Kitchen</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {orders.length} active order{orders.length !== 1 ? 's' : ''}
          </span>
          <LogoutButton />
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {COLUMNS.map((status) => (
          <KdsColumn
            key={status}
            status={status}
            orders={orders
              .filter((o) => o.status === status)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())}
          />
        ))}
      </main>
    </div>
  );
};

export default Kitchen;
