import { Outlet, Link } from 'react-router-dom';
import { ShoppingCart, Utensils } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

const Layout = () => {
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Utensils className="text-blue-600" />
              ServeSync
            </Link>
            
            <nav className="flex gap-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium">
                Menu
              </Link>
              <Link to="/cart" className="relative flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium">
                <ShoppingCart className="w-5 h-5 mr-1" />
                Cart
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {itemCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white mt-auto border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} ServeSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
