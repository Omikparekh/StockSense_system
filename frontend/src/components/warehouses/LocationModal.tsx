import React, { useState, useEffect } from 'react';
import { Warehouse } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, MapPin, AlertCircle, ArrowRight } from 'lucide-react';

interface LocationModalProps {
  warehouses: Warehouse[];
  defaultWarehouseId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: any) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  warehouses,
  defaultWarehouseId,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [warehouseId, setWarehouseId] = useState<number>(
    defaultWarehouseId || warehouses[0]?.id || 1
  );
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultWarehouseId) {
      setWarehouseId(defaultWarehouseId);
    } else if (warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
    setName('');
    setShortCode('');
    setError(null);
  }, [defaultWarehouseId, warehouses, isOpen]);

  const selectedWarehouse = warehouses.find((w) => w.id === Number(warehouseId));
  const compoundPath = selectedWarehouse && shortCode.trim() 
    ? `${selectedWarehouse.short_code}/${shortCode.trim()}`
    : `${selectedWarehouse?.short_code || 'WH'}/...`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Location name is required.');
      return;
    }

    if (!shortCode.trim()) {
      setError('Short code is required (e.g. Cold-1, Bay-2, Scrap).');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<any>('/warehouses/locations', {
        warehouse_id: Number(warehouseId),
        name: name.trim(),
        short_code: shortCode.trim()
      });
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create storage location.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                New Storage Location / Bin
              </h3>
              <p className="text-xs text-slate-500">
                Define a specialized physical zone or bin
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warehouse Parent Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Parent Warehouse *
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

          {/* Location Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Location / Bin Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Quality Inspection Zone"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Short Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Short Code / Tag *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Quality, Cold-1, Scrap, Zone-B"
              maxLength={20}
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value.replace(/\s+/g, '-'))}
              className="w-full h-10 px-3 font-mono font-semibold border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Live Compound Path Preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Generated Compound Path
            </span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                {compoundPath}
              </span>
              <span className="text-xs text-slate-500 flex items-center">
                <ArrowRight className="w-3.5 h-3.5 mx-1" />
                Auditable path in operations
              </span>
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
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Location</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
