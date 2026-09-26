import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, ReceiptsApiResponse, Warehouse, WarehousesApiResponse } from '../../types';
import { api } from '../../services/api';
import { useNavigation } from '../../context/NavigationContext';
import { ReceiptFormModal } from './ReceiptFormModal';
import { ReceiptDetailModal } from './ReceiptDetailModal';
import {
  PackagePlus,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  LayoutList,
  LayoutGrid,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const ReceiptsView: React.FC = () => {
  const { activeWarehouse } = useNavigation();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [inspectingReceiptId, setInspectingReceiptId] = useState<number | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchReceipts();
    fetchWarehouses();
  }, []);

  const fetchReceipts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await api.get<ReceiptsApiResponse>('/receipts');
      setReceipts(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inbound receipts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get<WarehousesApiResponse>('/warehouses');
      setWarehouses(res.data);
    } catch (err: any) {
      console.warn('Failed to load warehouses:', err);
    }
  };

  const showToast = (title: string, desc: string, type: 'success' | 'error') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleReceiptCreated = (data: any) => {
    showToast(
      'Receipt Created',
      `Inbound reception ${data.reference} created in Draft status.`,
      'success'
    );
    fetchReceipts(true);
    setInspectingReceiptId(data.id);
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchesWarehouse =
        activeWarehouse.id === 0 || r.warehouse_id === activeWarehouse.id;

      const matchesSearch =
        r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.destination_path.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' || r.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesWarehouse && matchesSearch && matchesStatus;
    });
  }, [receipts, activeWarehouse, searchTerm, selectedStatus]);

  const counts = useMemo(() => {
    const list = receipts.filter((r) => activeWarehouse.id === 0 || r.warehouse_id === activeWarehouse.id);
    return {
      all: list.length,
      draft: list.filter(r => r.status === 'Draft').length,
      ready: list.filter(r => r.status === 'Ready').length,
      done: list.filter(r => r.status === 'Done').length,
    };
  }, [receipts, activeWarehouse]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-xl shadow-lg border flex items-start justify-between animate-in fade-in slide-in-from-top-4 duration-200 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
        }`}>
          <div className="flex items-start space-x-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-semibold">{toastMessage.title}</h4>
              <p className="text-xs mt-0.5 opacity-90">{toastMessage.desc}</p>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Inbound Receipts
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              WH/IN Operations
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Vendor deliveries reception, destination bin assignment, and atomic inventory increments.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchReceipts()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl transition"
            title="Refresh Receipts"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-slate-950 bg-brand-500 hover:bg-brand-400 rounded-xl shadow-glow-orange flex items-center space-x-2 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Receipt</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-[#101010] p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                selectedStatus === 'all'
                  ? 'bg-brand-500 text-slate-950 font-bold shadow-glow-orange/30'
                  : 'bg-slate-50 dark:bg-[#151515] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent dark:border-white/[0.05]'
              }`}
            >
              All Receipts ({counts.all})
            </button>

            <button
              onClick={() => setSelectedStatus('draft')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition ${
                selectedStatus === 'draft'
                  ? 'bg-slate-700 dark:bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#151515] text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.05]'
              }`}
            >
              <span>Draft ({counts.draft})</span>
            </button>

            <button
              onClick={() => setSelectedStatus('ready')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition ${
                selectedStatus === 'ready'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/50 dark:border-blue-800/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Ready to Receive ({counts.ready})</span>
            </button>

            <button
              onClick={() => setSelectedStatus('done')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'done'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Done ({counts.done})</span>
            </button>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Table List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search receipts by reference (e.g. WH/IN/00001), vendor name, or destination bin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-24 bg-white dark:bg-[#101010] rounded-2xl border border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading inbound receipts...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 rounded-2xl text-red-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="py-16 bg-white dark:bg-[#101010] rounded-2xl border border-slate-200 dark:border-white/[0.08] text-center p-6 space-y-3">
          <PackagePlus className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No receipts found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create a new receipt to record incoming supplier goods.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="mt-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-500 hover:bg-brand-400 rounded-xl shadow-glow-orange inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Inbound Receipt</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* ERP Table View */
        <div className="bg-white dark:bg-[#101010] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#151515] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/[0.08] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Vendor / From</th>
                  <th className="py-3 px-4">To Location</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-3 text-center">Lines</th>
                  <th className="py-3 px-4 text-right">Demand Qty</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Reference */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setInspectingReceiptId(r.id)}
                        className="font-mono font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-xs block"
                      >
                        {r.reference}
                      </button>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{r.warehouse_name}</span>
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {r.partner_name}
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {r.destination_path}
                      </span>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" />
                      <span>{r.scheduled_date}</span>
                    </td>

                    {/* Total Lines */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {r.total_items} items
                      </span>
                    </td>

                    {/* Total Demand */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {r.total_demand}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'Done'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : r.status === 'Ready'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : r.status === 'Draft'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {r.status === 'Done' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />}
                        {r.status === 'Ready' && <Clock className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />}
                        {r.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectingReceiptId(r.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg inline-flex items-center space-x-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Draft Column */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Draft Planning
              </span>
              <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {counts.draft}
              </span>
            </div>
            <div className="space-y-3">
              {filteredReceipts
                .filter(r => r.status === 'Draft')
                .map(r => (
                  <div
                    key={r.id}
                    onClick={() => setInspectingReceiptId(r.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">{r.reference}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{r.scheduled_date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>{r.total_items} items ({r.total_demand} units)</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{r.destination_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                Ready to Receive
              </span>
              <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                {counts.ready}
              </span>
            </div>
            <div className="space-y-3">
              {filteredReceipts
                .filter(r => r.status === 'Ready')
                .map(r => (
                  <div
                    key={r.id}
                    onClick={() => setInspectingReceiptId(r.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">{r.reference}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">READY</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>{r.total_items} items ({r.total_demand} units)</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{r.destination_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Completed & Received
              </span>
              <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                {counts.done}
              </span>
            </div>
            <div className="space-y-3">
              {filteredReceipts
                .filter(r => r.status === 'Done')
                .map(r => (
                  <div
                    key={r.id}
                    onClick={() => setInspectingReceiptId(r.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">{r.reference}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>Received {r.total_demand} units</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{r.destination_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Receipt Modal */}
      <ReceiptFormModal
        isOpen={isFormOpen}
        warehouses={warehouses}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleReceiptCreated}
      />

      {/* Receipt Detail & Validation Modal */}
      <ReceiptDetailModal
        receiptId={inspectingReceiptId}
        isOpen={!!inspectingReceiptId}
        onClose={() => setInspectingReceiptId(null)}
        onStatusChanged={() => fetchReceipts(true)}
      />
    </div>
  );
};
