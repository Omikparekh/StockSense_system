import React, { useState, useEffect } from 'react';
import { ProductDetailApiResponse, ProductWithStock } from '../../types';
import { api } from '../../services/api';
import { 
  X, 
  Package, 
  MapPin, 
  History, 
  Scale, 
  AlertTriangle, 
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';

interface ProductDetailDrawerProps {
  productId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (product: ProductWithStock) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  productId,
  isOpen,
  onClose,
  onAdjust
}) => {
  const [data, setData] = useState<ProductDetailApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchDetail(productId);
    } else {
      setData(null);
    }
  }, [isOpen, productId]);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProductDetailApiResponse>(`/products/${id}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const product = data?.product;
  const locations = data?.locations || [];
  const movements = data?.recentMovements || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#101010] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/[0.08] animate-in slide-in-from-right duration-200"
        role="dialog"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200">
                  {product?.sku || 'SKU'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{product?.category}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {product?.name || 'Loading details...'}
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {product && (
              <button
                onClick={() => onAdjust(product)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-brand-500 hover:bg-brand-400 rounded-xl shadow-glow-orange flex items-center space-x-1.5 transition-all hover:-translate-y-0.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Quick Adjust</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading inventory balances and audit ledger...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          ) : product ? (
            <>
              {/* Product Photos Section */}
              {(product.image_url || product.image_url_2) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Product Photos ({[product.image_url, product.image_url_2].filter(Boolean).length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.image_url && (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-44 flex items-center justify-center shadow-xs">
                        <img src={product.image_url} alt={`${product.name} Primary`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-semibold backdrop-blur-xs">
                          Photo 1 (Primary)
                        </div>
                      </div>
                    )}
                    {product.image_url_2 && (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-44 flex items-center justify-center shadow-xs">
                        <img src={product.image_url_2} alt={`${product.name} Secondary`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-semibold backdrop-blur-xs">
                          Photo 2 (Secondary View)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/[0.08] rounded-2xl">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total On Hand
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{product.on_hand}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/[0.08] rounded-2xl">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Free to Use
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{product.free_stock}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/[0.08] rounded-2xl">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Reserved
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{product.reserved}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/[0.08] rounded-2xl">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Reorder Threshold
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{product.reorder_level}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-white/[0.08] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Unit Cost
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      product.is_approx_cost 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' 
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {product.is_approx_cost ? 'Approx' : 'Actual'}
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(product.unit_cost || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                  <span className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Total Valuation
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                      ₹{Number(product.total_value || (product.on_hand * product.unit_cost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                product.stock_status === 'in_stock'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : product.stock_status === 'low_stock'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-center space-x-2 font-medium">
                  {product.stock_status === 'in_stock' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  {product.stock_status === 'low_stock' && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                  {product.stock_status === 'out_of_stock' && <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
                  <span>
                    Status: {product.stock_status === 'in_stock' ? 'Healthy Stock' : product.stock_status === 'low_stock' ? 'Low Stock Warning' : 'Out of Stock Alert'}
                  </span>
                </div>
                <span className="opacity-90">Per-unit weight: {product.per_unit_weight ? `${product.per_unit_weight} kg` : 'N/A'}</span>
              </div>

              {/* Multi-Location Stock Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Warehouse Location Breakdown
                  </h3>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Location Path</th>
                        <th className="py-2.5 px-3">Warehouse</th>
                        <th className="py-2.5 px-3 text-right">On Hand</th>
                        <th className="py-2.5 px-3 text-right">Reserved</th>
                        <th className="py-2.5 px-3 text-right">Free Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {locations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 dark:text-slate-500">
                            No location records found.
                          </td>
                        </tr>
                      ) : (
                        locations.map((loc) => (
                          <tr key={loc.location_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                              {loc.location_path}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {loc.warehouse_name}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                              {loc.on_hand} {product.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">
                              {loc.reserved}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {loc.free_stock} {product.uom}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock Movement Audit Ledger */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Recent Stock Ledger History (Audit Trail)
                  </h3>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Movement Route</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">User & Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 dark:text-slate-500">
                            No ledger movements recorded yet for this product.
                          </td>
                        </tr>
                      ) : (
                        movements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                              {m.reference}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m.operation_type === 'IN'
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                  : m.operation_type === 'OUT'
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                  : m.operation_type === 'ADJ'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              }`}>
                                {m.operation_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              <div className="flex items-center space-x-1 font-mono text-[11px]">
                                <span className="truncate max-w-[100px]">{m.from_location}</span>
                                <span>→</span>
                                <span className="truncate max-w-[100px] text-slate-900 dark:text-slate-100 font-semibold">{m.to_location}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                              {m.quantity} {product.uom}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{m.user_name || 'Staff'}</div>
                              {m.notes && <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{m.notes}</div>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
