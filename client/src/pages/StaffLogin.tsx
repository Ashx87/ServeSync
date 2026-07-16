import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { login } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';

const DEFAULT_ROUTE_BY_ROLE: Record<string, string> = {
  ADMIN: '/admin',
  KITCHEN: '/kitchen',
};

const StaffLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const { token, user } = await login(username.trim(), password);
      setSession(token, user);

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? DEFAULT_ROUTE_BY_ROLE[user.role] ?? '/', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('用户名或密码错误');
      } else {
        setError('登录失败，请稍后重试');
        console.error('Login failed:', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="p-3 bg-gray-900 rounded-xl">
            <ChefHat className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ServeSync 员工登录</h1>
          <p className="text-sm text-gray-500">后台与厨房系统入口</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
          >
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffLogin;
