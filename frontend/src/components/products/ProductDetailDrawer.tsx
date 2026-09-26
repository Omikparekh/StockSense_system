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
  CheckCircle2
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        role="dialog"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-800">
                  {product?.sku || 'SKU'}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-600 font-medium">{product?.category}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {product?.name || 'Loading details...'}
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {product && (
              <button
                onClick={() => onAdjust(product)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center space-x-1.5 transition"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Quick Adjust</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading inventory balances and audit ledger...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          ) : product ? (
            <>
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total On Hand
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-slate-900">{product.on_hand}</span>
                    <span className="text-xs text-slate-500">{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Reserved
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-amber-600">{product.reserved}</span>
                    <span className="text-xs text-slate-500">{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Free to Use
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-emerald-600">{product.free_stock}</span>
                    <span className="text-xs text-slate-500">{product.uom}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Reorder Level
                  </span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-bold text-slate-700">{product.reorder_level}</span>
                    <span className="text-xs text-slate-500">{product.uom}</span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                product.stock_status === 'in_stock'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : product.stock_status === 'low_stock'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center space-x-2 font-medium">
                  {product.stock_status === 'in_stock' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {product.stock_status === 'low_stock' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                  {product.stock_status === 'out_of_stock' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>
                    Status: {product.stock_status === 'in_stock' ? 'Healthy Stock' : product.stock_status === 'low_stock' ? 'Low Stock Warning' : 'Out of Stock Alert'}
                  </span>
                </div>
                <span>Per-unit weight: {product.per_unit_weight ? `${product.per_unit_weight} kg` : 'N/A'}</span>
              </div>

              {/* Multi-Location Stock Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Warehouse Location Breakdown
                  </h3>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Location Path</th>
                        <th className="py-2.5 px-3">Warehouse</th>
                        <th className="py-2.5 px-3 text-right">On Hand</th>
                        <th className="py-2.5 px-3 text-right">Reserved</th>
                        <th className="py-2.5 px-3 text-right">Free Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {locations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No location records found.
                          </td>
                        </tr>
                      ) : (
                        locations.map((loc) => (
                          <tr key={loc.location_id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                              {loc.location_path}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {loc.warehouse_name}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                              {loc.on_hand} {product.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              {loc.reserved}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
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
                  <History className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recent Stock Ledger History (Audit Trail)
                  </h3>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Movement Route</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">User & Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No ledger movements recorded yet for this product.
                          </td>
                        </tr>
                      ) : (
                        movements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">
                              {m.reference}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m.operation_type === 'IN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : m.operation_type === 'OUT'
                                  ? 'bg-purple-100 text-purple-800'
                                  : m.operation_type === 'ADJ'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {m.operation_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <div className="flex items-center space-x-1 font-mono text-[11px]">
                                <span className="truncate max-w-[100px]">{m.from_location}</span>
                                <span>→</span>
                                <span className="truncate max-w-[100px] text-slate-900 font-semibold">{m.to_location}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {m.quantity} {product.uom}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              <div className="text-[11px] font-medium text-slate-700">{m.user_name || 'Staff'}</div>
                              {m.notes && <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{m.notes}</div>}
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
