import React, { useState, useEffect } from 'react';
import { ProductWithStock } from '../../types';
import { api, ApiError } from '../../services/api';
import { X, Scale, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface QuickAdjustModalProps {
  product: ProductWithStock | null;
  onClose: () => void;
  onSuccess: (result: {
    reference: string;
    productName: string;
    previousQuantity: number;
    countedQuantity: number;
    delta: number;
  }) => void;
}

const REASON_OPTIONS = [
  'Physical count reconciliation',
  'Damaged / expired inventory write-off',
  'Found unrecorded surplus',
  'Supplier return discrepancy',
  'Internal testing / scrap sample',
  'Other (specify in notes)'
];

export const QuickAdjustModal: React.FC<QuickAdjustModalProps> = ({
  product,
  onClose,
  onSuccess
}) => {
  if (!product) return null;

  const currentCount = product.on_hand;
  const [countedQty, setCountedQty] = useState<number>(currentCount);
  const [reason, setReason] = useState<string>(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCountedQty(product.on_hand);
    setReason(REASON_OPTIONS[0]);
    setCustomReason('');
    setError(null);
  }, [product]);

  const delta = countedQty - currentCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countedQty < 0) {
      setError('Physical count cannot be negative.');
      return;
    }

    const finalReason = reason === 'Other (specify in notes)' 
      ? (customReason.trim() || 'Physical count reconciliation')
      : reason;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<any>(`/products/${product.id}/adjust`, {
        counted_quantity: Number(countedQty),
        reason: finalReason
      });

      if (res?.data) {
        onSuccess({
          reference: res.data.reference,
          productName: product.name,
          previousQuantity: res.data.previousQuantity,
          countedQuantity: res.data.countedQuantity,
          delta: res.data.delta
        });
      }
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to record stock reconciliation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                In-Table Stock Reconciliation
              </h3>
              <p className="text-xs text-slate-500">
                Adjust physical count for {product.name} ({product.sku})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Visual Stock Comparison Grid */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center items-center">
            <div className="p-2">
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                System Count
              </span>
              <span className="text-xl font-bold text-slate-800">
                {currentCount} <span className="text-xs font-normal text-slate-500">{product.uom}</span>
              </span>
            </div>

            <div className="flex flex-col items-center justify-center text-slate-400">
              <ArrowRight className="w-5 h-5" />
              <span className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">Reconcile</span>
            </div>

            <div className={`p-2 rounded-md ${
              delta > 0 
                ? 'bg-emerald-50 border border-emerald-200' 
                : delta < 0 
                ? 'bg-rose-50 border border-rose-200' 
                : 'bg-slate-100 border border-slate-200'
            }`}>
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Audit Delta
              </span>
              <span className={`text-xl font-bold ${
                delta > 0 
                  ? 'text-emerald-700' 
                  : delta < 0 
                  ? 'text-rose-700' 
                  : 'text-slate-600'
              }`}>
                {delta > 0 ? `+${delta}` : delta} <span className="text-xs font-normal">{product.uom}</span>
              </span>
            </div>
          </div>

          {/* Counted Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Actual Physical Counted Quantity ({product.uom})
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCountedQty(prev => Math.max(0, prev - 1))}
                className="w-10 h-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => setCountedQty(prev => Math.max(0, prev - 10))}
                className="px-2.5 h-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center transition"
              >
                -10
              </button>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={countedQty}
                onChange={(e) => setCountedQty(parseFloat(e.target.value) || 0)}
                className="flex-1 h-10 px-3 text-center text-lg font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setCountedQty(prev => prev + 10)}
                className="px-2.5 h-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center transition"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => setCountedQty(prev => prev + 1)}
                className="w-10 h-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition"
              >
                +1
              </button>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Adjustment Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Other (specify in notes)' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Audit Notes / Justification
              </label>
              <input
                type="text"
                placeholder="Enter specific audit explanation..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Informational Box */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">ERP Audit Guarantee:</span> Saving this reconciliation will automatically generate an immutable sequence record (<code className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-800 font-semibold">WH/ADJ/0000X</code>) in the Stock History ledger with user attribution.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
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
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm & Log WH/ADJ</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
