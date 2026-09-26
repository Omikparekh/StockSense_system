import React, { useState, useEffect } from 'react';
import { ReceiptDetailApiResponse, ReceiptItem } from '../../types';
import { api } from '../../services/api';
import { 
  X, 
  PackagePlus, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  ArrowRight,
  Truck
} from 'lucide-react';

interface ReceiptDetailModalProps {
  receiptId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  receiptId,
  isOpen,
  onClose,
  onStatusChanged
}) => {
  const [data, setData] = useState<ReceiptDetailApiResponse['data'] | null>(null);
  const [lineItems, setLineItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && receiptId) {
      fetchDetail(receiptId);
    } else {
      setData(null);
      setLineItems([]);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, receiptId]);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReceiptDetailApiResponse>(`/receipts/${id}`);
      setData(res.data);
      setLineItems(res.data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load receipt details.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!receiptId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/receipts/${receiptId}/mark-ready`);
      setSuccessMsg('Receipt marked Ready for receiving inspection.');
      fetchDetail(receiptId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to mark receipt Ready.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!receiptId) return;
    setActionLoading(true);
    setError(null);

    const payload = {
      items: lineItems.map((item) => ({
        product_id: item.product_id,
        done_qty: item.done_qty > 0 ? Number(item.done_qty) : Number(item.demand_qty)
      }))
    };

    try {
      const res = await api.post<any>(`/receipts/${receiptId}/validate`, payload);
      setSuccessMsg(res.message || 'Receipt validated. Stock on hand updated in ledger.');
      fetchDetail(receiptId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Validation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!receiptId) return;
    if (!window.confirm('Are you sure you want to cancel this inbound receipt?')) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/receipts/${receiptId}/cancel`);
      setSuccessMsg('Receipt has been cancelled.');
      fetchDetail(receiptId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel receipt.');
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

  const receipt = data?.receipt;

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
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-500/20">
                  {receipt?.reference || 'WH/IN/...'}
                </span>
                <span className="text-xs text-slate-500 dark:text-[#A5A5A5] font-medium">Inbound Reception</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] mt-0.5">
                {receipt?.partner_name || 'Loading vendor...'}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 dark:text-[#A5A5A5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] rounded-xl transition"
              title="Print Receipt Slip"
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

        {/* Stepper / Status Workflow Ribbon */}
        <div className="px-6 py-3 bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <span className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[11px] ${
              receipt?.status === 'Draft' 
                ? 'bg-slate-900 dark:bg-brand-500 text-white dark:text-black font-extrabold' 
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-[#707070]'
            }`}>
              1. Draft
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#505050]" />
            <span className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[11px] ${
              receipt?.status === 'Ready' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-[#707070]'
            }`}>
              2. Ready to Receive
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#505050]" />
            <span className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-[11px] ${
              receipt?.status === 'Done' 
                ? 'bg-emerald-600 text-white' 
                : receipt?.status === 'Cancelled'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-[#707070]'
            }`}>
              {receipt?.status === 'Cancelled' ? 'Cancelled' : '3. Done (Stock Added)'}
            </span>
          </div>

          {/* Action triggers depending on status */}
          <div className="flex items-center space-x-2">
            {receipt?.status === 'Draft' && (
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
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center space-x-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark as Ready</span>
                </button>
              </>
            )}

            {receipt?.status === 'Ready' && (
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
                  <span>Validate & Receive Stock</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start space-x-2 text-emerald-800 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading receipt details...</p>
            </div>
          ) : receipt ? (
            <>
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/[0.08] text-xs">
                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">Vendor</span>
                  <span className="font-bold text-slate-800 dark:text-[#F5F5F5] text-sm mt-0.5 block truncate">
                    {receipt.partner_name}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">Destination Bin</span>
                  <span className="font-mono font-bold text-brand-500 text-sm mt-0.5 block">
                    {receipt.destination_path}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">Scheduled Date</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F5F5F5] text-sm mt-0.5 block flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-[#707070]" />
                    {receipt.scheduled_date}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-[#707070] font-semibold uppercase text-[10px]">Created By</span>
                  <span className="font-semibold text-slate-700 dark:text-[#A5A5A5] text-sm mt-0.5 block">
                    {receipt.created_by_user}
                  </span>
                </div>
              </div>

              {receipt.notes && (
                <div className="p-3 bg-slate-50 dark:bg-[#161616] rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs text-slate-600 dark:text-[#A5A5A5] flex items-start space-x-2">
                  <Truck className="w-4 h-4 text-slate-400 dark:text-[#707070] shrink-0 mt-0.5" />
                  <span>Notes: {receipt.notes}</span>
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#F5F5F5] uppercase tracking-wider">
                    Product Line Items ({lineItems.length})
                  </h4>
                  {receipt.status === 'Ready' && (
                    <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                      Enter verified physical count in "Done Qty" column before validating.
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#181818] text-slate-600 dark:text-[#A5A5A5] font-semibold border-b border-slate-200 dark:border-white/[0.08]">
                      <tr>
                        <th className="py-2.5 px-3">Product Name & SKU</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-right">Current On Hand</th>
                        <th className="py-2.5 px-3 text-right">Demand (Expected)</th>
                        <th className="py-2.5 px-3 text-right">Done (Received)</th>
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
                          <td className="py-3 px-3 text-right text-slate-500 dark:text-[#A5A5A5] font-mono">
                            {item.current_on_hand}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-[#F5F5F5]">
                            {item.demand_qty}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {receipt.status === 'Ready' ? (
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.done_qty || item.demand_qty}
                                onChange={(e) => handleDoneQtyChange(index, parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 px-2 text-right border border-blue-300 dark:border-white/[0.15] rounded-lg font-bold text-blue-900 dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-blue-50/30 dark:bg-[#0E0E0E]"
                              />
                            ) : (
                              <span className={`font-bold ${
                                receipt.status === 'Done' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-[#505050]'
                              }`}>
                                {receipt.status === 'Done' ? item.done_qty : '—'}
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
