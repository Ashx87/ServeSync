import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Receipt, RotateCcw, XCircle } from 'lucide-react';
import { fetchOrdersPage, cancelOrder, refundOrder } from '../../api/orders';
import type { Order } from '../../types/order';
import LogoutButton from '../../components/LogoutButton';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<Order['status'], string> = {
  PENDING: '待接单',
  PREPARING: '制作中',
  READY: '待取餐',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const STATUS_STYLES: Record<Order['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PAYMENT_LABELS: Record<Order['paymentStatus'], string> = {
  PENDING: '未支付',
  PAID: '已支付',
  REFUNDED: '已退款',
};

const PAYMENT_STYLES: Record<Order['paymentStatus'], string> = {
  PENDING: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

interface Filters {
  date: string;
  tableNumber: string;
  status: string;
  paymentStatus: string;
}

const EMPTY_FILTERS: Filters = { date: '', tableNumber: '', status: '', paymentStatus: '' };

const canCancel = (order: Order): boolean =>
  order.paymentStatus !== 'PAID' &&
  ['PENDING', 'PREPARING', 'READY'].includes(order.status);

const canRefund = (order: Order): boolean => order.paymentStatus === 'PAID';

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString();

const itemsSummary = (order: Order): string =>
  order.orderItems.map((item) => `${item.menuItem.name}×${item.quantity}`).join('、');

const BillsManager = () => {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadOrders = useCallback(async (targetPage: number, applied: Filters) => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchOrdersPage({
        page: targetPage,
        limit: PAGE_SIZE,
        date: applied.date || undefined,
        tableNumber: applied.tableNumber || undefined,
        status: applied.status || undefined,
        paymentStatus: applied.paymentStatus || undefined,
      });
      setOrders(result.orders);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('加载账单失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(1, EMPTY_FILTERS);
  }, [loadOrders]);

  const applyFilters = () => {
    setAppliedFilters(filters);
    loadOrders(1, filters);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    loadOrders(1, EMPTY_FILTERS);
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm(`确认取消桌号 ${order.tableNumber} 的订单？此操作不可撤销。`)) return;
    try {
      setActingId(order.id);
      await cancelOrder(order.id);
      await loadOrders(page, appliedFilters);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError('取消订单失败');
    } finally {
      setActingId(null);
    }
  };

  const handleRefund = async (order: Order) => {
    if (!window.confirm(`确认退款 $${order.totalAmount}（桌号 ${order.tableNumber}）？订单将同时被取消。`)) return;
    try {
      setActingId(order.id);
      await refundOrder(order.id);
      await loadOrders(page, appliedFilters);
    } catch (err) {
      console.error('Failed to refund order:', err);
      setError('退款失败');
    } finally {
      setActingId(null);
    }
  };

  const exportCsv = () => {
    const header = ['时间', '桌号', '菜品', '金额', '订单状态', '支付状态'];
    const rows = orders.map((order) => [
      formatDateTime(order.createdAt),
      order.tableNumber,
      itemsSummary(order),
      order.totalAmount,
      STATUS_LABELS[order.status],
      PAYMENT_LABELS[order.paymentStatus],
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bills-page${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Receipt className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold">账单管理</h1>
        </div>
        <LogoutButton />
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <main className="flex-1 p-6 overflow-auto">
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">日期</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">桌号</label>
            <input
              type="text"
              placeholder="如 T5"
              value={filters.tableNumber}
              onChange={(e) => setFilters({ ...filters, tableNumber: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">订单状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">全部</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">支付状态</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">全部</option>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={applyFilters}
            className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg"
          >
            查询
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg"
          >
            重置
          </button>
          <button
            onClick={exportCsv}
            disabled={orders.length === 0}
            className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            <Download className="w-4 h-4" />
            导出本页 CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">桌号</th>
                <th className="px-4 py-3 font-medium">菜品</th>
                <th className="px-4 py-3 font-medium text-right">金额</th>
                <th className="px-4 py-3 font-medium">订单状态</th>
                <th className="px-4 py-3 font-medium">支付状态</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">加载中…</td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">没有符合条件的账单</td>
                </tr>
              )}
              {!loading && orders.map((order) => (
                <Fragment key={order.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{order.tableNumber}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-600">{itemsSummary(order)}</td>
                    <td className="px-4 py-3 text-right font-semibold">${order.totalAmount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STYLES[order.paymentStatus]}`}>
                        {PAYMENT_LABELS[order.paymentStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {canCancel(order) && (
                        <button
                          onClick={() => handleCancel(order)}
                          disabled={actingId === order.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          取消
                        </button>
                      )}
                      {canRefund(order) && (
                        <button
                          onClick={() => handleRefund(order)}
                          disabled={actingId === order.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          退款
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={7} className="px-8 py-3">
                        <ul className="space-y-1 text-gray-600">
                          {order.orderItems.map((item) => (
                            <li key={item.id} className="flex justify-between max-w-md">
                              <span>
                                {item.menuItem.name} × {item.quantity}
                                {item.notes && <span className="text-gray-400 ml-2">（{item.notes}）</span>}
                              </span>
                              <span>${item.unitPrice}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadOrders(page - 1, appliedFilters)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg disabled:opacity-50"
            >
              上一页
            </button>
            <span>{page} / {totalPages}</span>
            <button
              onClick={() => loadOrders(page + 1, appliedFilters)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BillsManager;
