import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const LogoutButton = () => {
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <LogOut className="w-4 h-4" />
      退出登录
    </button>
  );
};

export default LogoutButton;
