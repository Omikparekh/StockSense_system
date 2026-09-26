import React, { useState, useEffect, useMemo } from 'react';
import { Transfer, TransfersApiResponse, Warehouse, WarehousesApiResponse } from '../../types';
import { api } from '../../services/api';
import { TransferFormModal } from './TransferFormModal';
import { TransferDetailModal } from './TransferDetailModal';
import {
  ArrowRightLeft,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  LayoutList,
  LayoutGrid,
  Calendar,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export const TransfersView: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
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
  const [inspectingTransferId, setInspectingTransferId] = useState<number | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
  }, []);

  const fetchTransfers = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await api.get<TransfersApiResponse>('/transfers');
      setTransfers(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load internal transfers.');
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

  const handleTransferCreated = (data: any) => {
    showToast(
      'Transfer Created',
      `Internal relocation ${data.reference} created in Draft status.`,
      'success'
    );
    fetchTransfers(true);
    setInspectingTransferId(data.id);
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesSearch =
        t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.source_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.destination_path.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' || t.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [transfers, searchTerm, selectedStatus]);

  const counts = useMemo(() => {
    return {
      all: transfers.length,
      draft: transfers.filter(t => t.status === 'Draft').length,
      ready: transfers.filter(t => t.status === 'Ready').length,
      done: transfers.filter(t => t.status === 'Done').length,
    };
  }, [transfers]);

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
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
              Internal Transfers
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              WH/INT Operations
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bin-to-bin and location-to-location internal shifting. Total company stock balance remains constant.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchTransfers()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
            title="Refresh Transfers"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedStatus === 'all'
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All Transfers ({counts.all})
            </button>

            <button
              onClick={() => setSelectedStatus('draft')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'draft'
                  ? 'bg-slate-700 dark:bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <span>Draft ({counts.draft})</span>
            </button>

            <button
              onClick={() => setSelectedStatus('ready')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'ready'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Ready to Move ({counts.ready})</span>
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
              <span>Completed ({counts.done})</span>
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
            placeholder="Search transfers by reference (e.g. WH/INT/00001), source location, or destination bin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading internal transfers...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center p-6 space-y-3">
          <ArrowRightLeft className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No transfers found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create an internal transfer to relocate stock between warehouse locations.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Internal Transfer</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* ERP Table View */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">From Location</th>
                  <th className="py-3 px-4">To Location</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-3 text-center">Lines</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Reference */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setInspectingTransferId(t.id)}
                        className="font-mono font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 text-xs block"
                      >
                        {t.reference}
                      </button>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.warehouse_name}</span>
                    </td>

                    {/* From */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {t.source_path}
                      </span>
                    </td>

                    {/* To */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {t.destination_path}
                      </span>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" />
                      <span>{t.scheduled_date}</span>
                    </td>

                    {/* Total Lines */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {t.total_items} items
                      </span>
                    </td>

                    {/* Total Quantity */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {t.total_demand}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'Done'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : t.status === 'Ready'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : t.status === 'Draft'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {t.status === 'Done' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />}
                        {t.status === 'Ready' && <Clock className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />}
                        {t.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectingTransferId(t.id)}
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
              {filteredTransfers
                .filter(t => t.status === 'Draft')
                .map(t => (
                  <div
                    key={t.id}
                    onClick={() => setInspectingTransferId(t.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">{t.reference}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.scheduled_date}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                      <span>{t.source_path}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{t.destination_path}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>{t.total_items} items ({t.total_demand} units)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Net 0 Delta</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                Ready to Relocate
              </span>
              <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                {counts.ready}
              </span>
            </div>
            <div className="space-y-3">
              {filteredTransfers
                .filter(t => t.status === 'Ready')
                .map(t => (
                  <div
                    key={t.id}
                    onClick={() => setInspectingTransferId(t.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">{t.reference}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">READY</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                      <span>{t.source_path}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{t.destination_path}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>{t.total_items} items ({t.total_demand} units)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Net 0 Delta</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Relocated & Completed
              </span>
              <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                {counts.done}
              </span>
            </div>
            <div className="space-y-3">
              {filteredTransfers
                .filter(t => t.status === 'Done')
                .map(t => (
                  <div
                    key={t.id}
                    onClick={() => setInspectingTransferId(t.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">{t.reference}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                      <span>{t.source_path}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{t.destination_path}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>Moved {t.total_demand} units</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Net 0 Delta</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Transfer Modal */}
      <TransferFormModal
        isOpen={isFormOpen}
        warehouses={warehouses}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleTransferCreated}
      />

      {/* Transfer Detail & Validation Modal */}
      <TransferDetailModal
        transferId={inspectingTransferId}
        isOpen={!!inspectingTransferId}
        onClose={() => setInspectingTransferId(null)}
        onStatusChanged={() => fetchTransfers(true)}
      />
    </div>
  );
};
