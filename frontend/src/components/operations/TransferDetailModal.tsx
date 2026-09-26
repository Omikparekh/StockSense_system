import React, { useState, useEffect } from 'react';
import { TransferDetailApiResponse, TransferItem } from '../../types';
import { api } from '../../services/api';
import { 
  X, 
  ArrowRightLeft, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  ArrowRight
} from 'lucide-react';

interface TransferDetailModalProps {
  transferId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const TransferDetailModal: React.FC<TransferDetailModalProps> = ({
  transferId,
  isOpen,
  onClose,
  onStatusChanged
}) => {
  const [data, setData] = useState<TransferDetailApiResponse['data'] | null>(null);
  const [lineItems, setLineItems] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transferId) {
      fetchDetail(transferId);
    } else {
      setData(null);
      setLineItems([]);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, transferId]);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TransferDetailApiResponse>(`/transfers/${id}`);
      setData(res.data);
      setLineItems(res.data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load transfer details.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!transferId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/transfers/${transferId}/mark-ready`);
      setSuccessMsg('Transfer marked Ready for execution.');
      fetchDetail(transferId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to mark transfer Ready.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!transferId) return;
    setActionLoading(true);
    setError(null);

    const payload = {
      items: lineItems.map((item) => ({
        product_id: item.product_id,
        done_qty: item.done_qty > 0 ? Number(item.done_qty) : Number(item.demand_qty)
      }))
    };

    try {
      const res = await api.post<any>(`/transfers/${transferId}/validate`, payload);
      setSuccessMsg(res.message || 'Transfer completed. Items relocated in ledger.');
      fetchDetail(transferId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Transfer validation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!transferId) return;
    if (!window.confirm('Are you sure you want to cancel this transfer?')) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/transfers/${transferId}/cancel`);
      setSuccessMsg('Transfer has been cancelled.');
      fetchDetail(transferId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDoneQtyChange = (index: number, val: number) => {
    setLineItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], done_qty: Math.max(0, val) };
      return copy;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const transfer = data?.transfer;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-500/20">
                  {transfer?.reference || 'WH/INT/...'}
                </span>
                <span className="text-xs text-slate-500 dark:text-[#A5A5A5] font-medium">Internal Relocation</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] mt-0.5 flex items-center space-x-1.5">
                <span className="font-mono text-brand-500">{transfer?.source_path}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-[#505050]" />
                <span className="font-mono text-brand-500">{transfer?.destination_path}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 dark:text-[#A5A5A5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] rounded-xl transition"
              title="Print Transfer Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Workflow Ribbon */}
        <div className="px-6 py-3 bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <span className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[11px] ${
              transfer?.status === 'Draft' 
                ? 'bg-slate-900 dark:bg-brand-500 text-white dark:text-black font-extrabold' 
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-[#707070]'
            }`}>
              1. Draft
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#505050]" />
            <span className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[11px] ${
              transfer?.status === 'Ready' 
                ? 'bg-amber-600 text-white' 
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-[#707070]'
            }`}>
              2. Ready to Move
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#505050]" />
            <span className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[11px] ${
              transfer?.status === 'Done' 
                ? 'bg-emerald-600 text-white' 
                : transfer?.status === 'Cancelled'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-[#707070]'
            }`}>
              {transfer?.status === 'Cancelled' ? 'Cancelled' : '3. Relocated (Done)'}
            </span>
          </div>

          {/* Action triggers depending on status */}
          <div className="flex items-center space-x-2">
            {transfer?.status === 'Draft' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkReady}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs flex items-center space-x-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark as Ready</span>
                </button>
              </>
            )}

            {transfer?.status === 'Ready' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleValidate}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center space-x-1.5 transition hover:shadow-emerald-900/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validate & Relocate</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start space-x-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-start space-x-2 text-emerald-800 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading transfer details...</p>
            </div>
          ) : transfer ? (
            <>
              {/* Route Summary Banner */}
              <div className="p-4 bg-slate-50 dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/[0.08] text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">From Location</span>
                  <span className="font-mono font-bold text-brand-500 text-sm mt-0.5 block">
                    {transfer.source_path}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">To Location</span>
                  <span className="font-mono font-bold text-brand-500 text-sm mt-0.5 block">
                    {transfer.destination_path}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">Scheduled Date</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F5F5F5] text-sm mt-0.5 block flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-[#707070]" />
                    {transfer.scheduled_date}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">Company Net Effect</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5 block">
                    Neutral (0 Delta)
                  </span>
                </div>
              </div>

              {transfer.notes && (
                <div className="p-3 bg-slate-50 dark:bg-[#161616] rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs text-slate-600 dark:text-[#A5A5A5]">
                  <span className="font-semibold">Notes:</span> {transfer.notes}
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-[#F5F5F5] uppercase tracking-wider">
                  Products to Move ({lineItems.length})
                </h4>

                <div className="border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#181818] text-slate-600 dark:text-[#A5A5A5] font-semibold border-b border-slate-200 dark:border-white/[0.08]">
                      <tr>
                        <th className="py-2.5 px-3">Product Name & SKU</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-right">Available in Source</th>
                        <th className="py-2.5 px-3 text-right">Quantity to Move</th>
                        <th className="py-2.5 px-3 text-right">Done Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                      {lineItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-900 dark:text-[#F5F5F5] block">{item.product_name}</span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-[#707070] font-medium">{item.product_sku}</span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-[#A5A5A5] font-medium">
                            {item.product_uom}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700 dark:text-[#A5A5A5] font-mono font-medium">
                            {item.source_on_hand} {item.product_uom}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-[#F5F5F5]">
                            {item.demand_qty}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {transfer.status === 'Ready' ? (
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.done_qty || item.demand_qty}
                                onChange={(e) => handleDoneQtyChange(index, parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 px-2 text-right border border-amber-300 dark:border-white/[0.15] rounded-lg font-bold text-amber-900 dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-amber-50/30 dark:bg-[#0E0E0E]"
                              />
                            ) : (
                              <span className={`font-bold ${
                                transfer.status === 'Done' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-[#505050]'
                              }`}>
                                {transfer.status === 'Done' ? item.done_qty : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
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
