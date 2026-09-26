import React, { useState, useEffect, useMemo } from 'react';
import { Warehouse, LocationItem, WarehousesApiResponse } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { WarehouseModal } from './WarehouseModal';
import { LocationModal } from './LocationModal';
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Boxes,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const WarehouseView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canManageLocations = user?.role === 'admin' || user?.role === 'inventory_manager';

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationTargetWarehouseId, setLocationTargetWarehouseId] = useState<number | undefined>(undefined);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await api.get<WarehousesApiResponse>('/warehouses');
      setWarehouses(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load warehouses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (title: string, desc: string, type: 'success' | 'error') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleWarehouseSaved = (_saved: any, isEdit: boolean) => {
    showToast(
      isEdit ? 'Warehouse Updated' : 'Warehouse Created',
      `Facility ${isEdit ? 'details updated' : 'registered and default locations provisioned'}.`,
      'success'
    );
    fetchWarehouses(true);
  };

  const handleLocationSaved = (saved: any) => {
    showToast(
      'Storage Location Created',
      `Compound location "${saved.path}" is now active for transfers and receipts.`,
      'success'
    );
    fetchWarehouses(true);
  };

  const handleDeleteLocation = async (loc: LocationItem) => {
    if (loc.total_on_hand > 0) {
      showToast(
        'Cannot Delete Location',
        `Location "${loc.path}" still holds ${loc.total_on_hand} items of stock. Relocate items first.`,
        'error'
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to delete storage location "${loc.path}"?`)) {
      return;
    }

    try {
      await api.delete(`/warehouses/locations/${loc.id}`);
      showToast('Location Deleted', `Storage bin "${loc.path}" removed.`, 'success');
      fetchWarehouses(true);
    } catch (err: any) {
      showToast('Delete Failed', err.message || 'Unable to delete location.', 'error');
    }
  };

  // Filtered warehouses
  const filteredWarehouses = useMemo(() => {
    if (!searchTerm.trim()) return warehouses;
    const term = searchTerm.toLowerCase();

    return warehouses.filter((w) => {
      const matchesWh =
        w.name.toLowerCase().includes(term) ||
        w.short_code.toLowerCase().includes(term) ||
        w.address.toLowerCase().includes(term);

      const matchesLocation = w.locations.some(
        (l) => l.name.toLowerCase().includes(term) || l.path.toLowerCase().includes(term)
      );

      return matchesWh || matchesLocation;
    });
  }, [warehouses, searchTerm]);

  // Aggregate stats
  const totalLocationsCount = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + (w.locations?.length || 0), 0);
  }, [warehouses]);

  const totalStockUnits = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + (w.total_on_hand || 0), 0);
  }, [warehouses]);

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Warehouses & Locations
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {warehouses.length} facilities
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hierarchical multi-warehouse infrastructure and compound storage bins (e.g. <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-800 dark:text-slate-200">WH/Stock</code>, <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-800 dark:text-slate-200">WH/Output</code>).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchWarehouses()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition"
            title="Refresh Facilities"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {canManageLocations && (
            <button
              onClick={() => {
                setLocationTargetWarehouseId(warehouses[0]?.id);
                setIsLocationModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Add Location Bin</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setEditingWarehouse(null);
                setIsWarehouseModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Warehouse</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <WarehouseIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Facilities
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{warehouses.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Storage Bins / Zones
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalLocationsCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Units Stored
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalStockUnits}</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by warehouse name, short code, or location path (e.g. WH/Stock)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Warehouse Facilities List */}
      {loading ? (
        <div className="py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading warehouse topology...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center p-6 space-y-3">
          <WarehouseIcon className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No warehouses found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try changing your search terms or create a new facility.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredWarehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
            >
              {/* Facility Header */}
              <div className="p-5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-xs">
                    {wh.short_code}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{wh.name}</h2>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                        {wh.short_code}
                      </span>
                    </div>
                    {wh.address ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                        <span>{wh.address}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-0.5">No street address configured</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:pr-4">
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Stock</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">{wh.total_on_hand} units</span>
                  </div>

                  {canManageLocations && (
                    <button
                      onClick={() => {
                        setLocationTargetWarehouseId(wh.id);
                        setIsLocationModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center space-x-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bin</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingWarehouse(wh);
                        setIsWarehouseModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Edit Warehouse"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Locations Table */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Storage Bins ({wh.locations.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Compound location paths used for all inventory movements
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Compound Path</th>
                        <th className="py-2.5 px-4">Location Name</th>
                        <th className="py-2.5 px-3 text-center">Products</th>
                        <th className="py-2.5 px-4 text-right">Units on Hand</th>
                        {isAdmin && <th className="py-2.5 px-4 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {wh.locations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 dark:text-slate-500">
                            No locations configured in this warehouse.
                          </td>
                        </tr>
                      ) : (
                        wh.locations.map((loc) => (
                          <tr key={loc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                              {loc.path}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                              {loc.name}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                                {loc.distinct_products} SKUs
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                              {loc.total_on_hand}
                            </td>
                            {isAdmin && (
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteLocation(loc)}
                                  disabled={loc.total_on_hand > 0}
                                  title={
                                    loc.total_on_hand > 0
                                      ? 'Cannot delete location holding stock'
                                      : 'Delete Location'
                                  }
                                  className={`p-1 rounded transition ${
                                    loc.total_on_hand > 0
                                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                      : 'text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warehouse Modal */}
      <WarehouseModal
        isOpen={isWarehouseModalOpen}
        warehouse={editingWarehouse}
        onClose={() => {
          setIsWarehouseModalOpen(false);
          setEditingWarehouse(null);
        }}
        onSuccess={handleWarehouseSaved}
      />

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        warehouses={warehouses}
        defaultWarehouseId={locationTargetWarehouseId}
        onClose={() => setIsLocationModalOpen(false)}
        onSuccess={handleLocationSaved}
      />
    </div>
  );
};
