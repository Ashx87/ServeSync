export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  referenceId: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  qrPayload: string;
  createdAt: string;
  updatedAt: string;
}
