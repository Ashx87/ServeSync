import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { BarChart3, DollarSign, QrCode, ReceiptText, ShoppingBag, TrendingUp, UtensilsCrossed } from 'lucide-react';
import RevenueChart from '../components/admin/RevenueChart';
import TopItemsChart from '../components/admin/TopItemsChart';
import CategoryChart from '../components/admin/CategoryChart';
import LogoutButton from '../components/LogoutButton';

interface SummaryStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const Admin = () => {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/analytics/summary');
        setSummary(res.data);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/menu"
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UtensilsCrossed className="w-4 h-4" />
            菜品管理
          </Link>
          <Link
            to="/admin/bills"
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ReceiptText className="w-4 h-4" />
            账单管理
          </Link>
          <Link
            to="/admin/qr"
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <QrCode className="w-4 h-4" />
            QR 管理
          </Link>
          <LogoutButton />
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <main className="flex-1 p-6 overflow-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Orders"
            value={summary?.totalOrders.toString() ?? '0'}
            icon={ShoppingBag}
            color="bg-blue-500"
          />
          <StatCard
            title="Total Revenue"
            value={`$${summary?.totalRevenue.toFixed(2) ?? '0.00'}`}
            icon={DollarSign}
            color="bg-green-500"
          />
          <StatCard
            title="Avg Order Value"
            value={`$${summary?.averageOrderValue.toFixed(2) ?? '0.00'}`}
            icon={TrendingUp}
            color="bg-amber-500"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-80">
            <RevenueChart />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-80">
            <TopItemsChart />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-80">
            <CategoryChart />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
