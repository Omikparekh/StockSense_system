import React, { useState, useEffect, useMemo } from 'react';
import { Delivery, DeliveriesApiResponse, Warehouse, WarehousesApiResponse } from '../../types';
import { api } from '../../services/api';
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
      const matchesSearch =
        d.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.source_path.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' || d.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [deliveries, searchTerm, selectedStatus]);

  const counts = useMemo(() => {
    return {
      all: deliveries.length,
      waiting: deliveries.filter(d => d.status === 'Waiting').length,
      ready: deliveries.filter(d => d.status === 'Ready').length,
      done: deliveries.filter(d => d.status === 'Done').length,
    };
  }, [deliveries]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-xl shadow-lg border flex items-start justify-between animate-in fade-in slide-in-from-top-4 duration-200 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-start space-x-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Outbound Delivery Orders
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              WH/OUT Operations
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Customer order dispatches, automatic stock reservation checks (Waiting vs Ready), and atomic deduction.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchDeliveries()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            title="Refresh Deliveries"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Delivery Order</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedStatus === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Deliveries ({counts.all})
            </button>

            <button
              onClick={() => setSelectedStatus('waiting')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'waiting'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
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
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
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
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Dispatched ({counts.done})</span>
            </button>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
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
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-24 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading outbound deliveries...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="py-16 bg-white rounded-xl border border-slate-200 text-center p-6 space-y-3">
          <Truck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No delivery orders found</h3>
          <p className="text-xs text-slate-500">Create an outbound delivery order to fulfill customer demand.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Delivery Order</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* ERP Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Reference */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setInspectingDeliveryId(d.id)}
                        className="font-mono font-bold text-purple-700 hover:text-purple-900 text-xs block"
                      >
                        {d.reference}
                      </button>
                      <span className="text-[10px] text-slate-400">{d.warehouse_name}</span>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {d.partner_name}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {d.source_path}
                      </span>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-3 px-4 text-slate-600 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>{d.scheduled_date}</span>
                    </td>

                    {/* Total Lines */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {d.total_items} items
                      </span>
                    </td>

                    {/* Total Demand */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {d.total_demand}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'Done'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : d.status === 'Ready'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : d.status === 'Waiting'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {d.status === 'Done' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />}
                        {d.status === 'Ready' && <Clock className="w-3 h-3 mr-1 text-blue-600" />}
                        {d.status === 'Waiting' && <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />}
                        {d.status === 'Waiting' ? 'Waiting (Stock)' : d.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectingDeliveryId(d.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg inline-flex items-center space-x-1 transition"
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
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Waiting (Stock Shortage)
              </span>
              <span className="text-xs font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200 text-amber-800">
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
                    className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-purple-700">{d.reference}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">WAITING</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{d.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span>{d.total_items} items ({d.total_demand} units)</span>
                      <span className="font-mono font-medium text-slate-700">{d.source_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Ready to Dispatch
              </span>
              <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200 text-blue-800">
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
                    className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-purple-700">{d.reference}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">READY</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{d.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span>{d.total_items} items ({d.total_demand} units)</span>
                      <span className="font-mono font-medium text-slate-700">{d.source_path}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Dispatched & Completed
              </span>
              <span className="text-xs font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
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
                    className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-emerald-700">{d.reference}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{d.partner_name}</h4>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span>Dispatched {d.total_demand} units</span>
                      <span className="font-mono font-medium text-slate-700">{d.source_path}</span>
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
