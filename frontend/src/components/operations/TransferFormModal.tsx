import React, { useState, useEffect } from 'react';
import { ProductWithStock, Warehouse, LocationItem } from '../../types';
import { api, ApiError } from '../../services/api';
import {
  X,
  ArrowRightLeft,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  Building2,
  MapPin,
  ArrowRight,
} from 'lucide-react';

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
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [transferType, setTransferType] = useState<'intra' | 'inter'>('intra');
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number>(warehouses[0]?.id || 1);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<number>(warehouses[0]?.id || 1);
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
      const firstWh = warehouses[0];
      setSourceWarehouseId(firstWh.id);
      setDestinationWarehouseId(firstWh.id);
      if (firstWh.locations && firstWh.locations.length > 0) {
        setSourceLocationId(firstWh.locations[0].id);
        setDestinationLocationId(firstWh.locations[1]?.id || firstWh.locations[0].id);
      }
    }
  }, [warehouses, isOpen]);

  // Source locations
  const sourceWh = warehouses.find((w) => w.id === Number(sourceWarehouseId)) || warehouses[0];
  const sourceLocations: LocationItem[] = sourceWh?.locations || [];

  // Destination locations
  const destWh = warehouses.find((w) => w.id === Number(destinationWarehouseId)) || warehouses[0];
  const destinationLocations: LocationItem[] = destWh?.locations || [];

  // When source warehouse changes
  const handleSourceWarehouseChange = (newWhId: number) => {
    setSourceWarehouseId(newWhId);
    const targetWh = warehouses.find((w) => w.id === newWhId);
    const locs = targetWh?.locations || [];
    if (locs.length > 0) {
      setSourceLocationId(locs[0].id);
    }
    if (transferType === 'intra') {
      setDestinationWarehouseId(newWhId);
      if (locs.length > 1) {
        setDestinationLocationId(locs[1].id);
      } else if (locs.length === 1) {
        setDestinationLocationId(locs[0].id);
      }
    }
  };

  // When destination warehouse changes
  const handleDestWarehouseChange = (newWhId: number) => {
    setDestinationWarehouseId(newWhId);
    const targetWh = warehouses.find((w) => w.id === newWhId);
    const locs = targetWh?.locations || [];
    if (locs.length > 0) {
      setDestinationLocationId(locs[0].id);
    }
  };

  // When transfer type toggles
  const handleTransferTypeToggle = (type: 'intra' | 'inter') => {
    setTransferType(type);
    setError(null);
    if (type === 'intra') {
      setDestinationWarehouseId(sourceWarehouseId);
      const locs = sourceWh?.locations || [];
      if (locs.length > 1) {
        setDestinationLocationId(locs[1].id);
      }
    } else {
      // Pick a different warehouse if available
      const otherWh = warehouses.find((w) => w.id !== sourceWarehouseId);
      if (otherWh) {
        setDestinationWarehouseId(otherWh.id);
        const locs = otherWh.locations || [];
        if (locs.length > 0) {
          setDestinationLocationId(locs[0].id);
        }
      }
    }
  };

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
      setItems((prev) => [...prev, { product_id: products[0].id, demand_qty: 10 }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemDraft, value: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const isSameBin = sourceWarehouseId === destinationWarehouseId && sourceLocationId === destinationLocationId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSameBin) {
      setError('Source and destination storage bins cannot be the same within the same facility.');
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
        warehouse_id: Number(sourceWarehouseId),
        source_location_id: Number(sourceLocationId),
        destination_location_id: Number(destinationLocationId),
        scheduled_date: scheduledDate,
        notes: notes.trim(),
        items: items.map((i) => ({
          product_id: Number(i.product_id),
          demand_qty: Number(i.demand_qty),
        })),
      });

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create transfer. Please check location validity and availability.');
      }
    } finally {
      setLoading(false);
    }
  };

  const currentSourceLoc = sourceLocations.find((l) => l.id === sourceLocationId);
  const currentDestLoc = destinationLocations.find((l) => l.id === destinationLocationId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-white/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5]">
                Create Internal Transfer
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#A5A5A5]">
                Relocate inventory intra-warehouse or across multiple facilities
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transfer Type Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-[#161616] rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => handleTransferTypeToggle('intra')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                transferType === 'intra'
                  ? 'bg-white dark:bg-[#0A0A0A] text-brand-500 shadow-xs border border-transparent dark:border-white/[0.08]'
                  : 'text-slate-600 dark:text-[#A5A5A5] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Intra-Warehouse (Same Facility)
            </button>
            <button
              type="button"
              onClick={() => handleTransferTypeToggle('inter')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                transferType === 'inter'
                  ? 'bg-white dark:bg-[#0A0A0A] text-brand-500 shadow-xs border border-transparent dark:border-white/[0.08]'
                  : 'text-slate-600 dark:text-[#A5A5A5] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Inter-Warehouse (Between Facilities)
            </button>
          </div>

          {/* Route Visualizer Banner */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/[0.08] rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 dark:text-[#707070]" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#707070] block">Origin</span>
                <span className="font-semibold text-slate-800 dark:text-[#F5F5F5]">{sourceWh?.name}</span>
                <span className="text-[11px] font-mono text-brand-500 ml-1">
                  ({currentSourceLoc?.path || 'Select Bin'})
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                {transferType === 'intra' ? 'Internal Move' : 'Inter-Facility Transfer'}
              </span>
              <ArrowRight className="w-4 h-4 text-brand-500 my-0.5" />
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#707070] block">Destination</span>
                <span className="font-semibold text-slate-800 dark:text-[#F5F5F5]">{destWh?.name}</span>
                <span className="text-[11px] font-mono text-brand-500 ml-1">
                  ({currentDestLoc?.path || 'Select Bin'})
                </span>
              </div>
              <Building2 className="w-4 h-4 text-slate-400 dark:text-[#707070]" />
            </div>
          </div>

          {/* Warehouse and Location Selectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin Section */}
            <div className="p-4 bg-slate-50/60 dark:bg-[#151515] rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#F5F5F5] uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span>Source Origin (From)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#A5A5A5] mb-1">
                  Source Facility *
                </label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => handleSourceWarehouseChange(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.short_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#A5A5A5] mb-1">
                  Source Storage Bin / Rack *
                </label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {sourceLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.path} ({loc.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination Section */}
            <div className="p-4 bg-slate-50/60 dark:bg-[#151515] rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#F5F5F5] uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Destination (To)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#A5A5A5] mb-1">
                  Destination Facility *
                </label>
                <select
                  value={destinationWarehouseId}
                  disabled={transferType === 'intra'}
                  onChange={(e) => handleDestWarehouseChange(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.short_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#A5A5A5] mb-1">
                  Destination Storage Bin / Rack *
                </label>
                <select
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {destinationLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.path} ({loc.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Details Row: Scheduled Date & Internal Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1">
                Scheduled Transfer Date *
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1">
                Internal Justification / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Replenish assembly cell or stage for shipment"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-[#505050] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-[#F5F5F5] uppercase tracking-wider">
                Products to Relocate ({items.length})
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
                    <th className="py-2.5 px-3">Product Catalog Item</th>
                    <th className="py-2.5 px-3 text-right w-44">Quantity to Move</th>
                    <th className="py-2.5 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {items.map((item, index) => {
                    const prod = products.find((p) => p.id === Number(item.product_id));
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              value={item.demand_qty}
                              onChange={(e) => handleItemChange(index, 'demand_qty', parseFloat(e.target.value) || 0)}
                              className="w-24 h-8 px-2 text-right border border-slate-300 dark:border-white/[0.1] rounded-lg bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                            <span className="text-slate-500 dark:text-[#707070] text-[11px] w-12 text-left truncate font-medium">
                              {prod?.uom || 'Units'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition"
                              title="Remove item"
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
              disabled={loading || isSameBin}
              className="px-5 py-2 text-sm font-bold text-black bg-brand-500 hover:bg-brand-600 rounded-xl shadow-sm transition hover:shadow-orange-950/20 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
