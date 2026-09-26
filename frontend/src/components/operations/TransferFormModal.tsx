import React, { useState, useEffect } from 'react';
import { ProductWithStock, Warehouse, LocationItem } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, ArrowRightLeft, Plus, Trash2, AlertCircle, Calendar } from 'lucide-react';

interface LineItemDraft {
  product_id: number;
  demand_qty: number;
}

interface TransferFormModalProps {
  isOpen: boolean;
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: (newTransfer: any) => void;
}

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  isOpen,
  warehouses,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [warehouseId, setWarehouseId] = useState<number>(warehouses[0]?.id || 1);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [sourceLocationId, setSourceLocationId] = useState<number>(1);
  const [destinationLocationId, setDestinationLocationId] = useState<number>(2);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    if (warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, isOpen]);

  useEffect(() => {
    const selectedWh = warehouses.find((w) => w.id === Number(warehouseId));
    if (selectedWh) {
      const locs = selectedWh.locations || [];
      setLocations(locs);
      if (locs.length >= 2) {
        setSourceLocationId(locs[0].id);
        setDestinationLocationId(locs[1].id);
      } else if (locs.length === 1) {
        setSourceLocationId(locs[0].id);
      }
    }
  }, [warehouseId, warehouses]);

  const fetchProducts = async () => {
    try {
      const res = await api.get<any>('/products');
      const prods = res.data.products || [];
      setProducts(prods);
      if (prods.length > 0 && items.length === 0) {
        setItems([{ product_id: prods[0].id, demand_qty: 10 }]);
      }
    } catch (err: any) {
      console.warn('Failed to load products for transfer form:', err);
    }
  };

  const handleAddItem = () => {
    if (products.length > 0) {
      setItems(prev => [...prev, { product_id: products[0].id, demand_qty: 10 }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemDraft, value: number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sourceLocationId === destinationLocationId) {
      setError('Source and destination storage bins cannot be the same.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item to transfer.');
      return;
    }

    for (const item of items) {
      if (item.demand_qty <= 0) {
        setError('Transfer quantity must be greater than 0 for all lines.');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await api.post<any>('/transfers', {
        warehouse_id: Number(warehouseId),
        source_location_id: Number(sourceLocationId),
        destination_location_id: Number(destinationLocationId),
        scheduled_date: scheduledDate,
        notes: notes.trim(),
        items: items.map(i => ({
          product_id: Number(i.product_id),
          demand_qty: Number(i.demand_qty)
        }))
      });

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create internal transfer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Create Internal Transfer
              </h3>
              <p className="text-xs text-slate-500">
                Relocate inventory between physical bins (e.g. WH/Stock to WH/Output)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warehouse */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Facility / Warehouse *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.short_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Source Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Source Location (From) *
              </label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.path} ({loc.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Destination Location (To) *
              </label>
              <select
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.path} ({loc.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Scheduled Transfer Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full h-10 pl-3 pr-9 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Internal Justification / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Staging materials for shift B"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Products to Relocate ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-right w-36">Quantity to Move</th>
                    <th className="py-2 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const prod = products.find(p => p.id === Number(item.product_id));
                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <select
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', Number(e.target.value))}
                            className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — {p.uom}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              value={item.demand_qty}
                              onChange={(e) => handleItemChange(index, 'demand_qty', parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 px-2 text-right border border-slate-300 rounded text-slate-900 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="text-slate-500 text-[11px] w-8 text-left truncate">
                              {prod?.uom || 'Units'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-400 hover:text-red-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
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
                  <span>Creating Transfer...</span>
                </>
              ) : (
                <span>Create Transfer Draft</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
