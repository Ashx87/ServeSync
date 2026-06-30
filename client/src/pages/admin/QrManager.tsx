import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const QrManager = () => {
  const BASE_URL = window.location.origin;
  const [tableCount, setTableCount] = useState(10);

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const handleTableCountChange = (value: string) => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      setTableCount(Math.max(1, Math.min(100, parsed)));
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 24px !important;
            padding: 16px !important;
          }
          .print-card {
            border: 1px solid #e5e7eb !important;
            border-radius: 12px !important;
            padding: 20px !important;
            text-align: center !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="no-print flex items-center gap-4 mb-8">
            <Link
              to="/admin"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回 Admin
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">QR Code 管理</h1>
          </div>

          <div className="no-print bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="tableCount" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  桌數
                </label>
                <input
                  id="tableCount"
                  type="number"
                  min={1}
                  max={100}
                  value={tableCount}
                  onChange={(e) => handleTableCountChange(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                列印全部
              </button>
            </div>
          </div>

          <div className="print-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
            {tables.map((n) => {
              const url = `${BASE_URL}/table/${n}`;
              return (
                <div
                  key={n}
                  className="print-card bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center"
                >
                  <QRCodeSVG value={url} size={120} />
                  <p className="text-lg font-bold text-gray-900 mt-3">桌號 {n}</p>
                  <p className="text-xs text-gray-400 mt-1 text-center break-all">{url}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default QrManager;
