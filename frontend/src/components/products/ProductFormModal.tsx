import React, { useState, useEffect } from 'react';
import { ProductWithStock } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, PackagePlus, Edit3, AlertCircle } from 'lucide-react';

interface ProductFormModalProps {
  product: ProductWithStock | null; // null means create mode
  categories: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedProduct: any, isEdit: boolean) => void;
}

const COMMON_UOMS = ['Units', 'kg', 'g', 'Liters', 'Meters', 'Boxes', 'Pallets', 'Pieces', 'Packs'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  categories,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const isEdit = !!product;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [uom, setUom] = useState('Units');
  const [perUnitWeight, setPerUnitWeight] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [initialStock, setInitialStock] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategory(product.category);
      setCustomCategory('');
      setUom(product.uom);
      setPerUnitWeight(product.per_unit_weight || 0);
      setReorderLevel(product.reorder_level || 10);
      setInitialStock(0);
    } else {
      setName('');
      setSku('');
      setCategory(categories[0] || 'Raw Materials');
      setCustomCategory('');
      setUom('Units');
      setPerUnitWeight(0);
      setReorderLevel(10);
      setInitialStock(0);
    }
    setError(null);
  }, [product, categories, isOpen]);

  // Helper to suggest SKU from name if empty
  const handleNameBlur = () => {
    if (!sku && name && !isEdit) {
      const parts = name.trim().split(/\s+/);
      const prefix = parts.map(p => p.slice(0, 3).toUpperCase()).join('-').slice(0, 8);
      const random = Math.floor(10 + Math.random() * 90);
      setSku(`${prefix}-${random}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCategory = category === '__NEW__' ? customCategory.trim() : category;
    if (!finalCategory) {
      setError('Please specify a category.');
      return;
    }

    if (!sku.trim()) {
      setError('SKU is required.');
      return;
    }

    setLoading(true);

    try {
      if (isEdit && product) {
        const res = await api.put<any>(`/products/${product.id}`, {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          uom,
          per_unit_weight: Number(perUnitWeight),
          reorder_level: Number(reorderLevel)
        });
        onSuccess(res.data, true);
      } else {
        const res = await api.post<any>('/products', {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          uom,
          per_unit_weight: Number(perUnitWeight),
          reorder_level: Number(reorderLevel),
          initial_stock: Number(initialStock)
        });
        onSuccess(res.data, false);
      }
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save product. Please check input values.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              {isEdit ? <Edit3 className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isEdit ? 'Edit Catalog Product' : 'Add New Product'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit ? `Updating attributes for ${product?.sku}` : 'Register a new SKU into warehouse inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Industrial Steel Rods 20mm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Internal SKU / Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. STL-ROD-20"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 font-mono font-semibold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__NEW__">+ Create New Category...</option>
              </select>
            </div>

            {category === '__NEW__' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  New Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electronics & Sensors"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Unit of Measure */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Unit of Measure (UoM) *
              </label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {COMMON_UOMS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Weight */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Unit Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={perUnitWeight}
                onChange={(e) => setPerUnitWeight(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Reorder Level Threshold */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Reorder Threshold ({uom})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Triggers "Low Stock" warning when on-hand falls to or below this.
              </span>
            </div>

            {/* Initial Stock (Only for new products) */}
            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Initial Stock on Hand ({uom})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Seeds central warehouse (WH/Stock) & logs opening audit entry.
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Create Product'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
