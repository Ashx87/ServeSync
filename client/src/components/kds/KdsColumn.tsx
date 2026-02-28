import type { Order, ActiveStatus } from '../../types/order';
import OrderCard from './OrderCard';

const COLUMN_CONFIG: Record<ActiveStatus, { title: string; color: string }> = {
  PENDING: { title: 'Pending', color: 'border-amber-400 bg-amber-50' },
  PREPARING: { title: 'Preparing', color: 'border-blue-400 bg-blue-50' },
  READY: { title: 'Ready', color: 'border-green-400 bg-green-50' },
};

interface KdsColumnProps {
  status: ActiveStatus;
  orders: Order[];
}

const KdsColumn = ({ status, orders }: KdsColumnProps) => {
  const config = COLUMN_CONFIG[status];

  return (
    <div className="flex-1 min-w-[300px] flex flex-col">
      <div className={`border-t-4 ${config.color} rounded-t-lg px-4 py-3`}>
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-lg">{config.title}</h2>
          <span className="bg-white text-gray-600 text-sm font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
            {orders.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 rounded-b-lg">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {orders.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No orders</p>
        )}
      </div>
    </div>
  );
};

export default KdsColumn;
