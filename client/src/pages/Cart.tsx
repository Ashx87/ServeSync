import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useOrderStore } from '../store/useOrderStore';
import { useTableStore } from '../store/useTableStore';
import apiClient from '../api/apiClient';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';

const Cart = () => {
  const { items, removeItem, updateQuantity, getCartTotal, clearCart } = useCartStore();
  const lastOrder = useOrderStore((state) => state.lastOrder);
  const setLastOrder = useOrderStore((state) => state.setLastOrder);
  const tableNumber = useTableStore((state) => state.tableNumber) ?? '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const total = getCartTotal();
  const isAppending = !!lastOrder && lastOrder.tableNumber === tableNumber && lastOrder.paymentStatus === 'PENDING';

  const handleCheckout = async () => {
    if (!tableNumber) {
      setError('桌號遺失，請重新掃描 QR code');
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const orderItemsPayload = items.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        notes: item.notes
      }));

      let order;
      if (isAppending && lastOrder) {
        try {
          const response = await apiClient.patch(`/orders/${lastOrder.id}/items`, { items: orderItemsPayload });
          order = response.data;
        } catch (err: any) {
          if (err.response?.status === 404) {
            const response = await apiClient.post('/orders', { tableNumber, items: orderItemsPayload });
            order = response.data;
          } else {
            throw err;
          }
        }
      } else {
        const response = await apiClient.post('/orders', { tableNumber, items: orderItemsPayload });
        order = response.data;
      }

      clearCart();
      setLastOrder({ id: order.id, status: order.status, paymentStatus: order.paymentStatus, tableNumber: order.tableNumber });
      navigate(`/receipt/${order.id}`, { state: { order } });
    } catch (err: any) {
      console.error('Checkout failed', err);
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm">
        <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Cart Items */}
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.menuItem.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{item.menuItem.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">${parseFloat(item.menuItem.price).toFixed(2)} each</p>
                  {item.notes && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2 inline-block">
                      📝 {item.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center border border-gray-200 rounded-md">
                    <button 
                      onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                      className="p-2 hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-medium">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-right w-20">
                    <span className="font-bold text-gray-900">
                      ${(parseFloat(item.menuItem.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => removeItem(item.menuItem.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Checkout Section */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Checkout</h2>

          <div className="mb-6 flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg">
            <span className="text-sm font-medium text-blue-700">桌號</span>
            <span className="text-lg font-bold text-blue-900">#{tableNumber}</span>
          </div>

          <div className="border-t border-gray-100 pt-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Tax (0%)</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-md text-white font-bold text-lg transition-colors flex justify-center items-center ${
              isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : null}
            {isSubmitting ? 'Processing...' : isAppending ? '追加到帳單' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
