import { useState, useEffect } from 'react';
import type { MenuItem } from '../../../store/useCartStore';
import type { Category } from '../../../types/menu';
import { uploadImage } from '../../../api/menu';
import { resolveAssetUrl } from '../../../api/apiClient';

interface MenuItemFormProps {
  item: MenuItem | null;
  categories: Category[];
  defaultCategoryId: string | null;
  onSave: (data: { name: string; price: number; categoryId: string; description?: string; imageUrl?: string }) => Promise<void>;
  onClose: () => void;
}

const MenuItemForm = ({ item, categories, defaultCategoryId, onSave, onClose }: MenuItemFormProps) => {
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item?.price ?? '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(item?.name ?? '');
    setPrice(item?.price ?? '');
    setCategoryId(item?.categoryId ?? defaultCategoryId ?? '');
    setDescription(item?.description ?? '');
    setImageUrl(item?.imageUrl ?? '');
    setError('');
  }, [item, defaultCategoryId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadImage(file);
      setImageUrl(url);
    } catch (err: any) {
      setError(err.response?.data?.error ?? '圖片上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(price);
    if (!name.trim()) {
      setError('名稱為必填');
      return;
    }
    if (!price || isNaN(numericPrice) || numericPrice <= 0) {
      setError('價格必須大於 0');
      return;
    }
    if (!categoryId) {
      setError('請選擇分類');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        price: numericPrice,
        categoryId,
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ?? '儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {item ? '編輯菜品' : '新增菜品'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">圖片</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  <img src={resolveAssetUrl(imageUrl)} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">無圖片</span>
                )}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="text-sm" />
            </div>
            {uploading && <p className="text-xs text-gray-500 mt-1">上傳中...</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">價格</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">請選擇分類</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述（選填）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              取消
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemForm;
