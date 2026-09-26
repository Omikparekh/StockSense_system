import React, { useState, useEffect } from 'react';
import { ProductWithStock, Warehouse, LocationItem } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, PackagePlus, Plus, Trash2, AlertCircle, Calendar } from 'lucide-react';

interface LineItemDraft {
  product_id: number;
  demand_qty: number;
}

interface ReceiptFormModalProps {
  isOpen: boolean;
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: (newReceipt: any) => void;
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  warehouses,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [warehouseId, setWarehouseId] = useState<number>(warehouses[0]?.id || 1);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [destinationLocationId, setDestinationLocationId] = useState<number>(1);
  const [partnerName, setPartnerName] = useState('');
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
    // Update destination locations when warehouse changes
    const selectedWh = warehouses.find((w) => w.id === Number(warehouseId));
    if (selectedWh) {
      setLocations(selectedWh.locations || []);
      const stockLoc = selectedWh.locations?.find((l) => l.short_code === 'Stock');
      if (stockLoc) {
        setDestinationLocationId(stockLoc.id);
      } else if (selectedWh.locations?.length > 0) {
        setDestinationLocationId(selectedWh.locations[0].id);
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
      console.warn('Failed to load products for receipt form:', err);
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

    if (!partnerName.trim()) {
      setError('Vendor / Supplier name is required.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item to receive.');
      return;
    }

    for (const item of items) {
      if (item.demand_qty <= 0) {
        setError('Demand quantity must be greater than 0 for all lines.');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await api.post<any>('/receipts', {
        warehouse_id: Number(warehouseId),
        partner_name: partnerName.trim(),
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
        setError('Failed to create inbound receipt.');
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
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Create Inbound Receipt
              </h3>
              <p className="text-xs text-slate-500">
                Generate new WH/IN receipt operation in Draft state
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
            {/* Vendor Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vendor / Supplier *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tata Steel Supplies Ltd."
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Scheduled Date *
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

            {/* Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Destination Warehouse *
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

            {/* Destination Bin */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Destination Storage Bin *
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
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes / Carrier Tracking
            </label>
            <input
              type="text"
              placeholder="e.g. PO #89421, Carrier: BlueDart Waybill #104928"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Products to Receive ({items.length})
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
                    <th className="py-2 px-3 text-right w-36">Demand Quantity</th>
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
                  <span>Creating Draft...</span>
                </>
              ) : (
                <span>Create Inbound Receipt</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
