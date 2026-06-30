import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTableStore } from '../store/useTableStore';
import { useOrderStore } from '../store/useOrderStore';
import { ClipboardList } from 'lucide-react';

const MAX_TABLE_NUMBER = 999;
const ACTIVE_STATUSES = new Set(['PENDING', 'PREPARING', 'READY']);

const TableEntry = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const currentTable = useTableStore((state) => state.tableNumber);
  const setTable = useTableStore((state) => state.setTable);
  const lastOrder = useOrderStore((state) => state.lastOrder);
  const clearLastOrder = useOrderStore((state) => state.clearLastOrder);
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const parsed = parseInt(tableId ?? '', 10);
    if (!tableId || !/^\d+$/.test(tableId) || parsed < 1 || parsed > MAX_TABLE_NUMBER) {
      navigate('/', { replace: true });
      return;
    }

    if (tableId !== currentTable && lastOrder && ACTIVE_STATUSES.has(lastOrder.status)) {
      setBlocked(true);
      return;
    }

    if (tableId !== currentTable) {
      clearLastOrder();
    }
    setTable(tableId);
    navigate('/', { replace: true });
  }, [tableId, currentTable, lastOrder, setTable, clearLastOrder, navigate]);

  if (blocked && lastOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-amber-50 rounded-full">
              <ClipboardList className="w-12 h-12 text-amber-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">尚有進行中的訂單</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            目前 <span className="font-semibold text-gray-800">#{lastOrder.tableNumber}</span> 號桌的訂單尚未完成，
            請先確認訂單狀態後再切換桌號。
          </p>
          <Link
            to={`/receipt/${lastOrder.id}`}
            className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看目前訂單
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">正在進入點餐系統...</p>
    </div>
  );
};

export default TableEntry;
