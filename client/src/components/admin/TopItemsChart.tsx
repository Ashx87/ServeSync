import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import apiClient from '../../api/apiClient';

interface TopItem {
  name: string;
  quantity: number;
}

const TopItemsChart = () => {
  const [data, setData] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopItems = async () => {
      try {
        const res = await apiClient.get('/analytics/top-items?limit=5');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch top items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopItems();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400">No sales data</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Selling Items</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" fontSize={12} tick={{ fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              fontSize={12}
              tick={{ fill: '#6b7280' }}
            />
            <Tooltip formatter={(value) => [Number(value), 'Qty Sold']} />
            <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopItemsChart;
