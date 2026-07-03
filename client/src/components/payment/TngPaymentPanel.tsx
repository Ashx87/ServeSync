import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { initiatePayment, simulatePaymentSuccess } from '../../api/payments';
import type { Payment } from '../../types/payment';

interface TngPaymentPanelProps {
  orderId: string;
}

const TngPaymentPanel = ({ orderId }: TngPaymentPanelProps) => {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInitiate = async () => {
    try {
      setIsLoading(true);
      setError('');
      const created = await initiatePayment(orderId);
      setPayment(created);
    } catch (err: any) {
      setError(err.response?.data?.error || '發起付款失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!payment) return;
    try {
      setIsLoading(true);
      setError('');
      await simulatePaymentSuccess(payment.id);
    } catch (err: any) {
      setError(err.response?.data?.error || '確認付款失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">TNG 付款</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
          {error}
        </div>
      )}

      {!payment ? (
        <button
          onClick={handleInitiate}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
          {isLoading ? '處理中...' : '用 TNG 付款'}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <QRCodeSVG value={payment.qrPayload} size={160} />
          <p className="text-sm text-gray-500">請使用 TNG eWallet 掃描付款</p>
          <button
            onClick={handleSimulateSuccess}
            disabled={isLoading}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:bg-green-400"
          >
            {isLoading ? '確認中...' : '模擬付款成功'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TngPaymentPanel;
