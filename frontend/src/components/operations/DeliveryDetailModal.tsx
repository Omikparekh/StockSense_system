import React, { useState, useEffect } from 'react';
import { DeliveryDetailApiResponse, DeliveryItem } from '../../types';
import { api } from '../../services/api';
import { 
  X, 
  Truck, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight
} from 'lucide-react';

interface DeliveryDetailModalProps {
  deliveryId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({
  deliveryId,
  isOpen,
  onClose,
  onStatusChanged
}) => {
  const [data, setData] = useState<DeliveryDetailApiResponse['data'] | null>(null);
  const [lineItems, setLineItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && deliveryId) {
      fetchDetail(deliveryId);
    } else {
      setData(null);
      setLineItems([]);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, deliveryId]);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DeliveryDetailApiResponse>(`/deliveries/${id}`);
      setData(res.data);
      setLineItems(res.data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!deliveryId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post<any>(`/deliveries/${deliveryId}/check-availability`);
      setSuccessMsg(res.message);
      fetchDetail(deliveryId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to check availability.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!deliveryId) return;
    setActionLoading(true);
    setError(null);

    const payload = {
      items: lineItems.map((item) => ({
        product_id: item.product_id,
        done_qty: item.done_qty > 0 ? Number(item.done_qty) : Number(item.demand_qty)
      }))
    };

    try {
      const res = await api.post<any>(`/deliveries/${deliveryId}/validate`, payload);
      setSuccessMsg(res.message || 'Delivery successfully dispatched and stock deducted.');
      fetchDetail(deliveryId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Dispatch validation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!deliveryId) return;
    if (!window.confirm('Are you sure you want to cancel this delivery order?')) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/deliveries/${deliveryId}/cancel`);
      setSuccessMsg('Delivery order has been cancelled.');
      fetchDetail(deliveryId);
      onStatusChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel delivery.');
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

  const delivery = data?.delivery;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  {delivery?.reference || 'WH/OUT/...'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customer Dispatch</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {delivery?.partner_name || 'Loading client...'}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
              title="Print Delivery Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Workflow Ribbon */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
              delivery?.status === 'Draft' 
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              Draft
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
              delivery?.status === 'Waiting'
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              Waiting (Stock)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
              delivery?.status === 'Ready' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              Ready to Dispatch
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
              delivery?.status === 'Done' 
                ? 'bg-emerald-600 text-white' 
                : delivery?.status === 'Cancelled'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {delivery?.status === 'Cancelled' ? 'Cancelled' : 'Done'}
            </span>
          </div>

          {/* Action triggers depending on status */}
          <div className="flex items-center space-x-2">
            {delivery?.status === 'Waiting' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckAvailability}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Re-Check Stock</span>
                </button>
              </>
            )}

            {delivery?.status === 'Ready' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleValidate}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center space-x-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validate & Dispatch</span>
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
              <p className="text-sm">Loading delivery details...</p>
            </div>
          ) : delivery ? (
            <>
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">Customer</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5 block truncate">
                    {delivery.partner_name}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">Source Bin</span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-sm mt-0.5 block">
                    {delivery.source_path}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">Scheduled Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-0.5 block flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" />
                    {delivery.scheduled_date}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">Current Status</span>
                  <span className={`font-bold text-sm mt-0.5 block uppercase ${
                    delivery.status === 'Ready'
                      ? 'text-blue-700 dark:text-blue-400'
                      : delivery.status === 'Waiting'
                      ? 'text-amber-600 dark:text-amber-400'
                      : delivery.status === 'Done'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {delivery.status}
                  </span>
                </div>
              </div>

              {delivery.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start space-x-2">
                  <Truck className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  <span>Shipping Notes: {delivery.notes}</span>
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Dispatched Items ({lineItems.length})
                  </h4>
                  {delivery.status === 'Waiting' && (
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Some products exceed available inventory.
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Product Name & SKU</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-right">Available in Stock</th>
                        <th className="py-2.5 px-3 text-right">Demand</th>
                        <th className="py-2.5 px-3 text-center">Stock Check</th>
                        <th className="py-2.5 px-3 text-right">Done (Dispatched)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lineItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block">{item.product_name}</span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-medium">{item.product_sku}</span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-medium">
                            {item.product_uom}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 font-mono font-bold">
                            {item.free_stock} {item.product_uom}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {item.demand_qty}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {delivery.status === 'Done' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Dispatched
                              </span>
                            ) : item.is_available ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Available
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                Shortage
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {delivery.status === 'Ready' ? (
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.done_qty || item.demand_qty}
                                onChange={(e) => handleDoneQtyChange(index, parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 px-2 text-right border border-blue-300 dark:border-blue-700 rounded font-bold text-blue-900 dark:text-blue-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/30 dark:bg-blue-950/40"
                              />
                            ) : (
                              <span className={`font-bold ${
                                delivery.status === 'Done' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                {delivery.status === 'Done' ? item.done_qty : '—'}
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
