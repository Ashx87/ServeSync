import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import apiClient from '../../api/apiClient';

interface CategoryData {
  category: string;
  quantity: number;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const CategoryChart = () => {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get('/analytics/category-distribution');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch category distribution:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400">No category data</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="quantity"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(props) =>
                `${String(props.name ?? '')} ${((props.percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={true}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [Number(value), 'Qty Sold']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryChart;
