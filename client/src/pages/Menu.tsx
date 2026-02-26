import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { useCartStore } from '../store/useCartStore';
import type { MenuItem } from '../store/useCartStore';
import { Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

const Menu = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, itemsRes] = await Promise.all([
          apiClient.get('/menu/categories'),
          apiClient.get('/menu/items')
        ]);
        
        setCategories(categoriesRes.data);
        setMenuItems(itemsRes.data);
        if (categoriesRes.data.length > 0) {
          setActiveCategory(categoriesRes.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch menu data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  const filteredItems = activeCategory 
    ? menuItems.filter(item => item.categoryId === activeCategory)
    : menuItems;

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Categories */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
          <h2 className="text-lg font-bold mb-4 text-gray-900">Categories</h2>
          <ul className="space-y-2">
            <li 
              className={`cursor-pointer px-3 py-2 rounded-md transition-colors ${activeCategory === null ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveCategory(null)}
            >
              All Items
            </li>
            {categories.map((category) => (
              <li 
                key={category.id}
                className={`cursor-pointer px-3 py-2 rounded-md transition-colors ${activeCategory === category.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                 {/* Placeholder for image */}
                 <span className="text-gray-400">No Image</span>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{item.name}</h3>
                  <span className="font-semibold text-blue-600 ml-2">${parseFloat(item.price).toFixed(2)}</span>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{item.description}</p>
                <button 
                  onClick={() => addItem(item)}
                  disabled={!item.isAvailable}
                  className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${
                    item.isAvailable 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {item.isAvailable ? 'Add to Cart' : 'Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No items found in this category.
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
