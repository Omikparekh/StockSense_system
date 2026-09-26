import React, { useState, useEffect, useRef } from 'react';
import { ProductWithStock } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, PackagePlus, Edit3, AlertCircle, Upload, Image as ImageIcon, Trash2, Link as LinkIcon, DollarSign } from 'lucide-react';

interface ProductFormModalProps {
  product: ProductWithStock | null; // null means create mode
  categories: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedProduct: any, isEdit: boolean) => void;
}

const UOM_GROUPS = [
  {
    group: 'Discrete & Packaging',
    units: ['Units', 'Pieces (pcs)', 'Boxes (box)', 'Cartons (ctn)', 'Packs (pk)', 'Pallets', 'Dozen (dz)', 'Sets', 'Pairs (pr)', 'Rolls', 'Bags', 'Bottles', 'Bundles', 'Barrels (bbl)']
  },
  {
    group: 'Weight & Mass',
    units: ['Kilograms (kg)', 'Grams (g)', 'Milligrams (mg)', 'Metric Tons (MT)', 'Pounds (lb)']
  },
  {
    group: 'Volume & Liquid',
    units: ['Liters (L)', 'Milliliters (mL)', 'Gallons (gal)']
  },
  {
    group: 'Length & Area',
    units: ['Meters (m)', 'Centimeters (cm)', 'Millimeters (mm)', 'Square Meters (sqm)']
  }
];

const ALL_STANDARD_UOMS = UOM_GROUPS.flatMap(g => g.units);

export const getCategoryApproxCost = (cat: string) => {
  switch (cat) {
    case 'Machinery': return 210.00;
    case 'Furniture': return 120.00;
    case 'Raw Materials': return 45.50;
    case 'Hardware': return 0.85;
    case 'Packaging': return 4.25;
    default: return 25.00;
  }
};

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
  const [isCustomUom, setIsCustomUom] = useState(false);
  const [customUom, setCustomUom] = useState('');
  const [perUnitWeight, setPerUnitWeight] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageUrl2, setImageUrl2] = useState<string>('');
  const [initialStock, setInitialStock] = useState<number>(0);

  // URL input toggles
  const [showUrlInput1, setShowUrlInput1] = useState(false);
  const [showUrlInput2, setShowUrlInput2] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setCategory(product.category || 'Raw Materials');
      setCustomCategory('');

      if (ALL_STANDARD_UOMS.includes(product.uom)) {
        setUom(product.uom);
        setIsCustomUom(false);
        setCustomUom('');
      } else {
        setUom('__CUSTOM__');
        setIsCustomUom(true);
        setCustomUom(product.uom || '');
      }

      setPerUnitWeight(product.per_unit_weight || 0);
      setReorderLevel(product.reorder_level || 10);
      setUnitCost(product.unit_cost || 0);
      setImageUrl(product.image_url || '');
      setImageUrl2(product.image_url_2 || '');
      setInitialStock(0);
    } else {
      setName('');
      setSku('');
      const defaultCat = categories[0] || 'Raw Materials';
      setCategory(defaultCat);
      setCustomCategory('');
      setUom('Units');
      setIsCustomUom(false);
      setCustomUom('');
      setPerUnitWeight(0);
      setReorderLevel(10);
      setUnitCost(getCategoryApproxCost(defaultCat));
      setImageUrl('');
      setImageUrl2('');
      setInitialStock(0);
    }
    setShowUrlInput1(false);
    setShowUrlInput2(false);
    setError(null);
  }, [product, isOpen]);

  const effectiveUom = isCustomUom ? (customUom.trim() || 'Units') : uom;
  const currentCategoryName = category === '__NEW__' ? customCategory.trim() : category;
  const approxSuggestedCost = getCategoryApproxCost(currentCategoryName);

  // Helper to suggest SKU from name if empty
  const handleNameBlur = () => {
    if (!sku && name && !isEdit) {
      const parts = name.trim().split(/\s+/);
      const prefix = parts.map(p => p.slice(0, 3).toUpperCase()).join('-').slice(0, 8);
      const random = Math.floor(10 + Math.random() * 90);
      setSku(`${prefix}-${random}`);
    }
  };

  // Helper to handle image file upload and client-side compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (slot === 1) setImageUrl(dataUrl);
          else setImageUrl2(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

    const finalUom = isCustomUom ? customUom.trim() : uom;
    if (!finalUom) {
      setError('Please specify a valid Unit of Measure (UoM).');
      return;
    }

    setLoading(true);

    const effectiveFinalCost = Number(unitCost) > 0 ? Number(unitCost) : approxSuggestedCost;

    try {
      if (isEdit && product) {
        const res = await api.put<any>(`/products/${product.id}`, {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          uom: finalUom,
          per_unit_weight: Number(perUnitWeight),
          reorder_level: Number(reorderLevel),
          unit_cost: effectiveFinalCost,
          image_url: imageUrl.trim() || null,
          image_url_2: imageUrl2.trim() || null
        });
        onSuccess(res.data, true);
      } else {
        const res = await api.post<any>('/products', {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          uom: finalUom,
          per_unit_weight: Number(perUnitWeight),
          reorder_level: Number(reorderLevel),
          unit_cost: effectiveFinalCost,
          image_url: imageUrl.trim() || null,
          image_url_2: imageUrl2.trim() || null,
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
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Unit of Measure (UoM) *
                </label>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Active Unit: <strong className="font-semibold underline decoration-indigo-300 dark:decoration-indigo-700 underline-offset-2">{effectiveUom}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={isCustomUom ? '__CUSTOM__' : uom}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__CUSTOM__') {
                      setIsCustomUom(true);
                    } else {
                      setIsCustomUom(false);
                      setUom(val);
                    }
                  }}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {UOM_GROUPS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__CUSTOM__">+ Custom Unit of Measure...</option>
                </select>

                {isCustomUom ? (
                  <input
                    type="text"
                    required
                    placeholder="Type custom unit (e.g. Bunches, Drums, Vials)..."
                    value={customUom}
                    onChange={(e) => setCustomUom(e.target.value)}
                    autoFocus
                    className="w-full h-10 px-3 border border-indigo-400 dark:border-indigo-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                ) : (
                  <div className="h-10 px-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center text-xs text-slate-500 dark:text-slate-400">
                    <span>Stock tracking will measure in <strong className="text-slate-800 dark:text-slate-200 font-semibold">{effectiveUom}</strong></span>
                  </div>
                )}
              </div>
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
                Reorder Threshold ({effectiveUom})
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

            {/* Unit Cost ($) & Valuation */}
            <div className="md:col-span-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Cost per Unit (${effectiveUom})</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUnitCost(approxSuggestedCost)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Use approx: ${approxSuggestedCost.toFixed(2)}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Approx $${approxSuggestedCost.toFixed(2)}`}
                    value={unitCost > 0 ? unitCost : ''}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 pl-7 pr-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Used to compute real-time warehouse inventory valuation. Suggested approx for {currentCategoryName}: <strong>${approxSuggestedCost.toFixed(2)}</strong>.
              </p>
            </div>

            {/* Product Photos (Up to 2 photos) */}
            <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Product Photos (Upload up to 2)</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Visible across Stock Table, Kanban & Detail views
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Photo 1: Primary Photo */}
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Photo 1 (Primary)</span>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput1(!showUrlInput1)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{showUrlInput1 ? 'Upload File' : 'Paste URL'}</span>
                    </button>
                  </div>

                  {imageUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-28 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                      <img src={imageUrl} alt="Photo 1" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef1.current?.click()}
                          className="p-1.5 bg-white text-slate-800 rounded-md text-xs font-semibold shadow hover:bg-slate-100"
                          title="Replace Photo"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="p-1.5 bg-rose-600 text-white rounded-md text-xs font-semibold shadow hover:bg-rose-700"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : showUrlInput1 ? (
                    <div className="space-y-1.5">
                      <input
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                      />
                      <p className="text-[10px] text-slate-400">Direct HTTPS image URL</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef1.current?.click()}
                      className="w-full h-28 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all p-3 text-center"
                    >
                      <Upload className="w-5 h-5 mb-1 text-slate-400" />
                      <span className="text-xs font-medium">Click to upload photo</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef1}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 1)}
                    className="hidden"
                  />
                </div>

                {/* Photo 2: Secondary / Angle Photo */}
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Photo 2 (Secondary)</span>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput2(!showUrlInput2)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{showUrlInput2 ? 'Upload File' : 'Paste URL'}</span>
                    </button>
                  </div>

                  {imageUrl2 ? (
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-28 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                      <img src={imageUrl2} alt="Photo 2" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef2.current?.click()}
                          className="p-1.5 bg-white text-slate-800 rounded-md text-xs font-semibold shadow hover:bg-slate-100"
                          title="Replace Photo"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUrl2('')}
                          className="p-1.5 bg-rose-600 text-white rounded-md text-xs font-semibold shadow hover:bg-rose-700"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : showUrlInput2 ? (
                    <div className="space-y-1.5">
                      <input
                        type="url"
                        placeholder="https://example.com/photo-angle.jpg"
                        value={imageUrl2}
                        onChange={(e) => setImageUrl2(e.target.value)}
                        className="w-full h-9 px-3 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                      />
                      <p className="text-[10px] text-slate-400">Direct HTTPS image URL</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef2.current?.click()}
                      className="w-full h-28 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all p-3 text-center"
                    >
                      <Upload className="w-5 h-5 mb-1 text-slate-400" />
                      <span className="text-xs font-medium">Click to upload photo</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Optional secondary view</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef2}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 2)}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Initial Stock (Only for new products) */}
            {!isEdit && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Initial Stock on Hand ({effectiveUom})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Seeds central warehouse (WH/Stock) & logs opening audit entry.</span>
                  {initialStock > 0 && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Opening Valuation: ${(initialStock * (unitCost > 0 ? unitCost : approxSuggestedCost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
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
