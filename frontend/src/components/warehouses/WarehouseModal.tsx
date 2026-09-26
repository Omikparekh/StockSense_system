import React, { useState, useEffect } from 'react';
import { Warehouse } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, Warehouse as WarehouseIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface WarehouseModalProps {
  warehouse: Warehouse | null; // null for create mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: any, isEdit: boolean) => void;
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  warehouse,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const isEdit = !!warehouse;
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name);
      setShortCode(warehouse.short_code);
      setAddress(warehouse.address || '');
    } else {
      setName('');
      setShortCode('');
      setAddress('');
    }
    setError(null);
  }, [warehouse, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Warehouse name is required.');
      return;
    }

    if (!isEdit && !shortCode.trim()) {
      setError('Short code is required (e.g. WH, EAST, ORD).');
      return;
    }

    setLoading(true);

    try {
      if (isEdit && warehouse) {
        const res = await api.put<any>(`/warehouses/${warehouse.id}`, {
          name: name.trim(),
          address: address.trim()
        });
        onSuccess(res.data, true);
      } else {
        const res = await api.post<any>('/warehouses', {
          name: name.trim(),
          short_code: shortCode.trim().toUpperCase(),
          address: address.trim()
        });
        onSuccess(res.data, false);
      }
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save warehouse facility.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-white/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
              <WarehouseIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isEdit ? 'Edit Warehouse' : 'New Warehouse Facility'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit ? `Updating ${warehouse?.short_code}` : 'Register a new storage and logistics center'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start space-x-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Central Distribution Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Short Code * {isEdit && <span className="text-slate-400 dark:text-slate-500 font-normal">(Immutable)</span>}
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              placeholder="e.g. WH, CDH, NORTH"
              maxLength={10}
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              className={`w-full h-10 px-3 font-mono font-semibold border rounded-lg text-sm focus:outline-none ${
                isEdit 
                  ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500'
              }`}
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Used in sequence codes (e.g. <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-800 dark:text-slate-200">{shortCode || 'WH'}/IN/00001</code>) and compound location paths.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Physical Street Address
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Building 4, Logistics Park Sector 7..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {!isEdit && (
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-xs text-brand-900 dark:text-brand-300 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Automatic Provisioning:</span> Creating this warehouse will automatically initialize default storage locations: <code className="font-mono bg-brand-500/20 px-1 py-0.5 rounded text-brand-300 font-semibold">{shortCode || 'CODE'}/Stock</code> and <code className="font-mono bg-brand-500/20 px-1 py-0.5 rounded text-brand-300 font-semibold">{shortCode || 'CODE'}/Output</code>.
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-brand-500 hover:bg-brand-400 rounded-xl shadow-glow-orange transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Create Warehouse'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
