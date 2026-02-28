import { Clock, ChefHat, Check, CheckCheck } from 'lucide-react';
import type { Order } from '../../types/order';
import { useKdsStore } from '../../store/useKdsStore';

const STATUS_CONFIG = {
  PENDING: {
    buttonLabel: 'Start Preparing',
    buttonIcon: ChefHat,
    nextStatus: 'PREPARING',
    buttonColor: 'bg-amber-500 hover:bg-amber-600',
  },
  PREPARING: {
    buttonLabel: 'Mark Ready',
    buttonIcon: Check,
    nextStatus: 'READY',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
  },
  READY: {
    buttonLabel: 'Complete',
    buttonIcon: CheckCheck,
    nextStatus: 'COMPLETED',
    buttonColor: 'bg-green-500 hover:bg-green-600',
  },
} as const;

const getElapsedTime = (createdAt: string): string => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
};

interface OrderCardProps {
  order: Order;
}

const OrderCard = ({ order }: OrderCardProps) => {
  const advanceOrder = useKdsStore((state) => state.advanceOrder);
  const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];

  if (!config) return null;

  const Icon = config.buttonIcon;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <span className="font-bold text-lg text-gray-900">
          Table {order.tableNumber}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {getElapsedTime(order.createdAt)}
        </span>
      </div>

      <ul className="space-y-1 text-sm text-gray-700">
        {order.orderItems.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>
              {item.quantity}x {item.menuItem.name}
            </span>
            {item.notes && (
              <span className="text-xs text-gray-400 italic ml-2 truncate max-w-[120px]">
                {item.notes}
              </span>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={() => advanceOrder(order.id, config.nextStatus)}
        className={`w-full mt-auto py-2 px-3 rounded-md text-white font-medium flex items-center justify-center gap-2 transition-colors ${config.buttonColor}`}
      >
        <Icon className="w-4 h-4" />
        {config.buttonLabel}
      </button>
    </div>
  );
};

export default OrderCard;
