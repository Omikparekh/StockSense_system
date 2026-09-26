import React, { useState, useEffect, useMemo } from 'react';
import { Delivery, DeliveriesApiResponse, Warehouse, WarehousesApiResponse } from '../../types';
import { api } from '../../services/api';
import { useNavigation } from '../../context/NavigationContext';
import { DeliveryFormModal } from './DeliveryFormModal';
import { DeliveryDetailModal } from './DeliveryDetailModal';
import {
  Truck,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LayoutList,
  LayoutGrid,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const DeliveriesView: React.FC = () => {
  const { activeWarehouse } = useNavigation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
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
  const [inspectingDeliveryId, setInspectingDeliveryId] = useState<number | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchDeliveries();
    fetchWarehouses();
  }, []);

  const fetchDeliveries = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await api.get<DeliveriesApiResponse>('/deliveries');
      setDeliveries(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load outbound delivery orders.');
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

  const handleDeliveryCreated = (data: any) => {
    showToast(
      'Delivery Order Created',
      `Outbound order ${data.reference} created. Initial status: ${data.status}.`,
      'success'
    );
    fetchDeliveries(true);
    setInspectingDeliveryId(data.id);
  };

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesWarehouse =
        activeWarehouse.id === 0 || d.warehouse_id === activeWarehouse.id;

      const matchesSearch =
        d.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.source_path.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' || d.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesWarehouse && matchesSearch && matchesStatus;
    });
  }, [deliveries, activeWarehouse, searchTerm, selectedStatus]);

  const counts = useMemo(() => {
    const list = deliveries.filter((d) => activeWarehouse.id === 0 || d.warehouse_id === activeWarehouse.id);
    return {
      all: list.length,
      waiting: list.filter(d => d.status === 'Waiting').length,
      ready: list.filter(d => d.status === 'Ready').length,
      done: list.filter(d => d.status === 'Done').length,
    };
  }, [deliveries, activeWarehouse]);

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
              Outbound Delivery Orders
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              WH/OUT Operations
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customer order dispatches, automatic stock reservation checks (Waiting vs Ready), and atomic deduction.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchDeliveries()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl transition"
            title="Refresh Deliveries"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-slate-950 bg-brand-500 hover:bg-brand-400 rounded-xl shadow-glow-orange flex items-center space-x-2 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Delivery Order</span>
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
              All Deliveries ({counts.all})
            </button>

            <button
              onClick={() => setSelectedStatus('waiting')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'waiting'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Waiting / Shortage ({counts.waiting})</span>
            </button>

            <button
              onClick={() => setSelectedStatus('ready')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'ready'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Ready to Dispatch ({counts.ready})</span>
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
              <span>Dispatched ({counts.done})</span>
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
            placeholder="Search deliveries by reference (e.g. WH/OUT/00001), customer name, or source bin..."
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
          <p className="text-sm font-medium">Loading outbound deliveries...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 rounded-2xl text-red-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="py-16 bg-white dark:bg-[#101010] rounded-2xl border border-slate-200 dark:border-white/[0.08] text-center p-6 space-y-3">
          <Truck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No delivery orders found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create an outbound delivery order to fulfill customer demand.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="mt-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-500 hover:bg-brand-400 rounded-xl shadow-glow-orange inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Delivery Order</span>
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
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">From Location</th>
                  <th className="py-3 px-4">Dispatch Date</th>
                  <th className="py-3 px-3 text-center">Lines</th>
                  <th className="py-3 px-4 text-right">Demand Qty</th>
                  <th className="py-3 px-4 text-center">Availability Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Reference */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setInspectingDeliveryId(d.id)}
                        className="font-mono font-bold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 text-xs block"
                      >
                        {d.reference}
                      </button>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{d.warehouse_name}</span>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {d.partner_name}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {d.source_path}
                      </span>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" />
                      <span>{d.scheduled_date}</span>
                    </td>

                    {/* Total Lines */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {d.total_items} items
                      </span>
                    </td>

                    {/* Total Demand */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {d.total_demand}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'Done'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : d.status === 'Ready'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : d.status === 'Waiting'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {d.status === 'Done' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />}
                        {d.status === 'Ready' && <Clock className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />}
                        {d.status === 'Waiting' && <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />}
                        {d.status === 'Waiting' ? 'Waiting (Stock)' : d.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectingDeliveryId(d.id)}
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
          {/* Waiting Column */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                Waiting (Stock Shortage)
              </span>
              <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                {counts.waiting}
              </span>
            </div>
            <div className="space-y-3">
              {filteredDeliveries
                .filter(d => d.status === 'Waiting')
                .map(d => (
                  <div
                    key={d.id}
                    onClick={() => setInspectingDeliveryId(d.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-400">{d.reference}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">WAITING</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>{d.total_items} items ({d.total_demand} units)</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{d.source_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                Ready to Dispatch
              </span>
              <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                {counts.ready}
              </span>
            </div>
            <div className="space-y-3">
              {filteredDeliveries
                .filter(d => d.status === 'Ready')
                .map(d => (
                  <div
                    key={d.id}
                    onClick={() => setInspectingDeliveryId(d.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-400">{d.reference}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-bold">READY</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>{d.total_items} items ({d.total_demand} units)</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{d.source_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Dispatched & Completed
              </span>
              <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                {counts.done}
              </span>
            </div>
            <div className="space-y-3">
              {filteredDeliveries
                .filter(d => d.status === 'Done')
                .map(d => (
                  <div
                    key={d.id}
                    onClick={() => setInspectingDeliveryId(d.id)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">{d.reference}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <span>Dispatched {d.total_demand} units</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{d.source_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Delivery Modal */}
      <DeliveryFormModal
        isOpen={isFormOpen}
        warehouses={warehouses}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleDeliveryCreated}
      />

      {/* Delivery Detail & Validation Modal */}
      <DeliveryDetailModal
        deliveryId={inspectingDeliveryId}
        isOpen={!!inspectingDeliveryId}
        onClose={() => setInspectingDeliveryId(null)}
        onStatusChanged={() => fetchDeliveries(true)}
      />
    </div>
  );
};
