import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '../../types/menu';
import type { MenuItem } from '../../store/useCartStore';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem,
} from '../../api/menu';
import CategoryForm from '../../components/admin/menu/CategoryForm';
import MenuItemForm from '../../components/admin/menu/MenuItemForm';

const MenuManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, menuItems] = await Promise.all([getCategories(), getAllMenuItems()]);
      setCategories(cats);
      setItems(menuItems);
      setActiveCategory((prev) => prev ?? (cats[0]?.id ?? null));
    } catch {
      setError('載入資料失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleItems = items.filter((item) => item.categoryId === activeCategory);

  const handleSaveCategory = async (data: { name: string; description?: string }) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data);
    } else {
      const created = await createCategory(data);
      setActiveCategory(created.id);
    }
    await loadData();
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(`確定要刪除分類「${category.name}」嗎？`)) return;
    try {
      await deleteCategory(category.id);
      if (activeCategory === category.id) setActiveCategory(null);
      await loadData();
    } catch (err: any) {
      window.alert(err.response?.data?.error ?? '刪除失敗');
    }
  };

  const handleSaveItem = async (data: { name: string; price: number; categoryId: string; description?: string; imageUrl?: string }) => {
    if (editingItem) {
      await updateMenuItem(editingItem.id, data);
    } else {
      await createMenuItem(data);
    }
    await loadData();
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!window.confirm(`確定要刪除菜品「${item.name}」嗎？`)) return;
    try {
      await deleteMenuItem(item.id);
      await loadData();
    } catch (err: any) {
      window.alert(err.response?.data?.error ?? '刪除失敗');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    await updateMenuItem(item.id, { isAvailable: !item.isAvailable });
    await loadData();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回 Admin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">菜品管理</h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-2 text-sm mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">分類</h2>
                <button
                  onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}
                  className="text-blue-600 hover:text-blue-800"
                  title="新增分類"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category.id} className="group">
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        activeCategory === category.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      <span>{category.name}</span>
                      <span className="hidden group-hover:flex items-center gap-2">
                        <Pencil
                          className="w-3.5 h-3.5"
                          onClick={(e) => { e.stopPropagation(); setEditingCategory(category); setShowCategoryForm(true); }}
                        />
                        <Trash2
                          className="w-3.5 h-3.5"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                        />
                      </span>
                    </div>
                  </li>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-gray-400 px-3 py-2">尚無分類，請先新增</p>
                )}
              </ul>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">菜品</h2>
                <button
                  onClick={() => { setEditingItem(null); setShowItemForm(true); }}
                  disabled={!activeCategory}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  新增菜品
                </button>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-medium">圖片</th>
                    <th className="py-2 font-medium">名稱</th>
                    <th className="py-2 font-medium">價格</th>
                    <th className="py-2 font-medium">上架</th>
                    <th className="py-2 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-gray-400">無圖</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 text-gray-700">${parseFloat(item.price).toFixed(2)}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.isAvailable ? '上架中' : '已下架'}
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                          className="text-gray-400 hover:text-blue-600 mr-3"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        此分類尚無菜品
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onSave={handleSaveCategory}
          onClose={() => setShowCategoryForm(false)}
        />
      )}
      {showItemForm && (
        <MenuItemForm
          item={editingItem}
          categories={categories}
          defaultCategoryId={activeCategory}
          onSave={handleSaveItem}
          onClose={() => setShowItemForm(false)}
        />
      )}
    </div>
  );
};

export default MenuManager;
