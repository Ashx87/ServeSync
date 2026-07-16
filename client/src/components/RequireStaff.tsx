import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { StaffRole } from '../types/auth';
import LogoutButton from './LogoutButton';

interface RequireStaffProps {
  roles: StaffRole[];
  children: ReactNode;
}

const RequireStaff = ({ roles, children }: RequireStaffProps) => {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-100">
        <p className="text-lg font-semibold text-gray-800">无权访问此页面</p>
        <p className="text-sm text-gray-500">
          当前账号 {user.username}（{user.role}）没有此页面的权限
        </p>
        <LogoutButton />
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireStaff;
