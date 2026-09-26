import React, { useState, useEffect } from 'react';
import { ProductWithStock, Warehouse, LocationItem, Partner } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, PackagePlus, Plus, Trash2, AlertCircle, Calendar } from 'lucide-react';
import { SupplierModal } from '../suppliers/SupplierModal';

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
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
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
    fetchSuppliers();
    if (warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, isOpen]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get<any>('/partners?type=supplier');
      setSuppliers(res.data || []);
    } catch (err) {
      console.warn('Failed to load suppliers:', err);
    }
  };

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-white/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5]">
                Create Inbound Receipt
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#A5A5A5]">
                Generate new WH/IN receipt operation in Draft state
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider">
                  Vendor / Supplier *
                </label>
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="text-xs text-brand-500 hover:text-brand-400 font-medium flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Supplier</span>
                </button>
              </div>
              <input
                type="text"
                list="receipt-suppliers-list"
                required
                placeholder="Select or enter supplier name..."
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#505050] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <datalist id="receipt-suppliers-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.contact_name ? `${s.name} (${s.contact_name})` : s.name}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1">
                Scheduled Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full h-10 pl-3 pr-9 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <Calendar className="w-4 h-4 text-slate-400 dark:text-[#707070] absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1">
                Destination Warehouse *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1">
                Destination Storage Bin *
              </label>
              <select
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(Number(e.target.value))}
                className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono font-medium"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1">
              Internal Notes / Carrier Tracking
            </label>
            <input
              type="text"
              placeholder="e.g. PO #89421, Carrier: BlueDart Waybill #104928"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#505050] text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-[#F5F5F5] uppercase tracking-wider">
                Products to Receive ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-brand-500 hover:text-brand-400 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#181818] text-slate-600 dark:text-[#A5A5A5] font-semibold border-b border-slate-200 dark:border-white/[0.08] sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-right w-36">Demand Quantity</th>
                    <th className="py-2 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {items.map((item, index) => {
                    const prod = products.find(p => p.id === Number(item.product_id));
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2 px-3">
                          <select
                            value={item.product_id}
                            onChange={(e) => handleItemChange(index, 'product_id', Number(e.target.value))}
                            className="w-full h-8 px-2 border border-slate-300 dark:border-white/[0.1] rounded-lg bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
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
                              className="w-20 h-8 px-2 text-right border border-slate-300 dark:border-white/[0.1] rounded-lg bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                            <span className="text-slate-500 dark:text-[#707070] text-[11px] w-8 text-left truncate">
                              {prod?.uom || 'Units'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
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
          <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-[#A5A5A5] hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-black bg-brand-500 hover:bg-brand-600 rounded-xl shadow-sm transition hover:shadow-orange-950/20 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Creating Draft...</span>
                </>
              ) : (
                <span>Create Inbound Receipt</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {isSupplierModalOpen && (
        <SupplierModal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSuccess={(newSupplier: Partner) => {
            setPartnerName(newSupplier.name);
            fetchSuppliers();
            setIsSupplierModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
