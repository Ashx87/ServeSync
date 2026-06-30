import { QrCode } from 'lucide-react';
import { useTableStore } from '../store/useTableStore';

interface TableGuardProps {
  children: React.ReactNode;
}

const TableGuard = ({ children }: TableGuardProps) => {
  const tableNumber = useTableStore((state) => state.tableNumber);

  if (!tableNumber) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-50 rounded-full">
              <QrCode className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">歡迎光臨</h1>
          <p className="text-gray-500 leading-relaxed">
            請掃描桌上的 QR code<br />開始點餐
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default TableGuard;
