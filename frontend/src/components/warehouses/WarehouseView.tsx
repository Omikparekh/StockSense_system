import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Warehouse,
  LocationItem,
  WarehousesApiResponse,
  WarehouseInventoryItem,
  WarehouseInventoryApiResponse,
  ProductWithStock,
  ProductsApiResponse
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { WarehouseModal } from './WarehouseModal';
import { LocationModal } from './LocationModal';
import { ProductFormModal } from '../products/ProductFormModal';
import { ProductDetailDrawer } from '../products/ProductDetailDrawer';
import { QuickAdjustModal } from '../products/QuickAdjustModal';
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
  AlertCircle,
  Package,
  IndianRupee,
  Eye,
  SlidersHorizontal,
  Image as ImageIcon,
  X
} from 'lucide-react';

export const WarehouseView: React.FC = () => {
  const { user } = useAuth();
  const { refreshWarehouses: refreshNavigationWarehouses } = useNavigation();
  const isAdmin = user?.role === 'admin';
  const canManageLocations = user?.role === 'admin' || user?.role === 'inventory_manager';

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseInventory, setWarehouseInventory] = useState<Record<number, WarehouseInventoryItem[]>>({});
  const [warehouseTabs, setWarehouseTabs] = useState<Record<number, 'products' | 'bins'>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<string[]>([
    'Raw Materials',
    'Machinery',
    'Furniture',
    'Hardware',
    'Packaging',
    'Electronics & Sensors',
    'Chemicals',
    'Office Supplies'
  ]);

  // Modals & Drawers state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationTargetWarehouseId, setLocationTargetWarehouseId] = useState<number | undefined>(undefined);

  // Product interaction modals
  const [selectedPhotoProduct, setSelectedPhotoProduct] = useState<WarehouseInventoryItem | null>(null);
  const [inspectingProductId, setInspectingProductId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductWithStock | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  // Load product categories once
  useEffect(() => {
    api.get<ProductsApiResponse>('/products?limit=1')
      .then((res) => {
        if (res?.data?.categories?.length) {
          setCategories(res.data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const fetchWarehouses = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await api.get<WarehousesApiResponse>('/warehouses');
      const whList = res.data || [];
      setWarehouses(whList);

      // Rapidly fetch inventory for all facilities in parallel
      const invMap: Record<number, WarehouseInventoryItem[]> = {};
      await Promise.all(
        whList.map(async (w) => {
          try {
            const invRes = await api.get<WarehouseInventoryApiResponse>(`/warehouses/${w.id}/inventory`);
            invMap[w.id] = invRes.data || [];
          } catch {
            invMap[w.id] = [];
          }
        })
      );
      setWarehouseInventory(invMap);

      // Keep top-level warehouse selector in sync
      refreshNavigationWarehouses();
    } catch (err: any) {
      setError(err.message || 'Failed to load warehouses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshNavigationWarehouses]);

  // Initial load
  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Rapid Auto-Refresh polling (every 10s) and on tab visibility change
  useEffect(() => {
    const timer = setInterval(() => {
      fetchWarehouses(true);
    }, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchWarehouses(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchWarehouses]);

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

  // Helper to construct ProductWithStock for modals
  const constructProductWithStock = (item: WarehouseInventoryItem): ProductWithStock => ({
    id: item.productId,
    name: item.productName,
    sku: item.sku,
    category: item.category,
    uom: item.uom,
    per_unit_weight: 1,
    reorder_level: 10,
    unit_cost: item.unitCost,
    is_approx_cost: item.isApproxCost,
    image_url: item.imageUrl,
    image_url_2: item.imageUrl2,
    on_hand: item.onHand,
    reserved: item.reserved,
    free_stock: item.onHand - item.reserved,
    stock_status: item.onHand > 10 ? 'in_stock' : item.onHand > 0 ? 'low_stock' : 'out_of_stock',
    total_value: item.totalValuation
  });

  const handleEditProduct = async (item: WarehouseInventoryItem) => {
    try {
      const res = await api.get<{ success: boolean; data: { product: ProductWithStock } }>(`/products/${item.productId}`);
      if (res?.data?.product) {
        setEditingProduct(res.data.product);
      } else {
        setEditingProduct(constructProductWithStock(item));
      }
    } catch {
      setEditingProduct(constructProductWithStock(item));
    }
  };

  const handleAdjustProduct = (item: WarehouseInventoryItem) => {
    setAdjustingProduct(constructProductWithStock(item));
  };

  // Filtered warehouses based on search query
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

      const matchesProduct = (warehouseInventory[w.id] || []).some(
        (p) =>
          p.productName.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term)
      );

      return matchesWh || matchesLocation || matchesProduct;
    });
  }, [warehouses, warehouseInventory, searchTerm]);

  // Aggregate stats
  const totalLocationsCount = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + (w.locations?.length || 0), 0);
  }, [warehouses]);

  const totalStockUnits = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + (w.total_on_hand || 0), 0);
  }, [warehouses]);

  const totalSystemValuation = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + (w.total_valuation || 0), 0);
  }, [warehouses]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-start justify-between animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
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
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Warehouses & Products
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {warehouses.length} facilities
            </span>
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync Active</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse stored products with dual photos, verify physical bin locations, and track rapid inventory valuations per facility.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchWarehouses()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition"
            title="Refresh Facilities & Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              Storage Bins
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
              Total Units
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalStockUnits.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Valuation
            </span>
            <span className="text-xl font-bold text-purple-700 dark:text-purple-400 font-mono">
              ₹{totalSystemValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by warehouse name, short code, stored product name, SKU, or location bin (e.g. WH/Stock)..."
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
          <p className="text-sm">Loading warehouse topology and live inventory...</p>
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
          {filteredWarehouses.map((wh) => {
            const currentTab = warehouseTabs[wh.id] || 'products';
            const invItems = warehouseInventory[wh.id] || [];

            // Filter products within warehouse if searching
            const filteredProducts = searchTerm.trim()
              ? invItems.filter(
                  (p) =>
                    p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.locationPath.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : invItems;

            return (
              <div
                key={wh.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Facility Header */}
                <div className="p-5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-xs">
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

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:pr-4">
                      <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Total Stock
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {wh.total_on_hand.toLocaleString()} units
                      </span>
                    </div>

                    <div className="text-right sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:pr-4">
                      <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Facility Valuation
                      </span>
                      <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        ₹{(wh.total_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
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
                        title="Edit Warehouse Facility"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-section Navigation Tabs */}
                <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setWarehouseTabs((prev) => ({ ...prev, [wh.id]: 'products' }))}
                      className={`pb-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
                        currentTab === 'products'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Warehouse Products</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {invItems.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setWarehouseTabs((prev) => ({ ...prev, [wh.id]: 'bins' }))}
                      className={`pb-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
                        currentTab === 'bins'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Storage Bins</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {wh.locations.length}
                      </span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {currentTab === 'products'
                      ? `Inventory live valuation: ₹${(wh.total_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : 'Compound paths for internal stock routes'}
                  </span>
                </div>

                {/* TAB CONTENT: WAREHOUSE PRODUCTS */}
                {currentTab === 'products' ? (
                  <div className="p-5">
                    {filteredProducts.length === 0 ? (
                      <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        <Package className="w-9 h-9 text-slate-400 mx-auto stroke-[1.5]" />
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {searchTerm ? 'No matching products in this facility' : 'No products currently stored in this warehouse'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                          Receive inbound stock or create an internal transfer to allocate products to this facility.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-4 min-w-[240px]">Product & Photos</th>
                              <th className="py-2.5 px-3">Bin Location</th>
                              <th className="py-2.5 px-3 text-right">On Hand</th>
                              <th className="py-2.5 px-3 text-right">Reserved</th>
                              <th className="py-2.5 px-3 text-right">Free Stock</th>
                              <th className="py-2.5 px-3 text-right min-w-[120px]">Unit Cost</th>
                              <th className="py-2.5 px-3 text-right min-w-[120px]">Total Valuation</th>
                              <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredProducts.map((item) => (
                              <tr
                                key={`${item.productId}-${item.locationId}`}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                {/* Product Column with Photos */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-3">
                                    {/* Dual Photo Thumbnail Container */}
                                    {item.imageUrl || item.imageUrl2 ? (
                                      <div
                                        className="relative group cursor-pointer shrink-0 flex items-center"
                                        onClick={() => setSelectedPhotoProduct(item)}
                                        title="Click to view full photos in lightbox"
                                      >
                                        {/* Photo 1 */}
                                        {item.imageUrl ? (
                                          <img
                                            src={item.imageUrl}
                                            alt={item.productName}
                                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:scale-105 transition-transform"
                                          />
                                        ) : (
                                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                                            <ImageIcon className="w-4 h-4" />
                                          </div>
                                        )}

                                        {/* Photo 2 (mini stacked) */}
                                        {item.imageUrl2 ? (
                                          <div className="relative -ml-3">
                                            <img
                                              src={item.imageUrl2}
                                              alt={`${item.productName} 2`}
                                              className="w-7 h-7 object-cover rounded-md border-2 border-white dark:border-slate-900 shadow-2xs"
                                            />
                                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-indigo-600 text-[9px] font-bold text-white rounded-full leading-none">
                                              2
                                            </span>
                                          </div>
                                        ) : (
                                          item.imageUrl && (
                                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-slate-700 text-[9px] font-bold text-white rounded-full leading-none">
                                              1
                                            </span>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => handleEditProduct(item)}
                                        className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 cursor-pointer transition shrink-0 group"
                                        title="No photos uploaded. Click to upload photos."
                                      >
                                        <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <span className="text-[8px] font-medium mt-0.5 leading-none">+Photo</span>
                                      </div>
                                    )}

                                    {/* Name and Meta */}
                                    <div className="min-w-0">
                                      <button
                                        onClick={() => setInspectingProductId(item.productId)}
                                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left truncate block max-w-[200px]"
                                        title={item.productName}
                                      >
                                        {item.productName}
                                      </button>
                                      <div className="flex items-center space-x-1.5 mt-0.5">
                                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                          {item.sku}
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                          {item.category}
                                        </span>
                                        {item.imageUrl && item.imageUrl2 && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                                            2 Photos
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Storage Bin */}
                                <td className="py-3 px-3">
                                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                                    {item.locationPath}
                                  </span>
                                </td>

                                {/* On Hand */}
                                <td className="py-3 px-3 text-right">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                    {item.onHand}
                                  </span>{' '}
                                  <span className="text-[10px] text-slate-400">{item.uom}</span>
                                </td>

                                {/* Reserved */}
                                <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                                  {item.reserved}
                                </td>

                                {/* Free Stock */}
                                <td className="py-3 px-3 text-right">
                                  <span
                                    className={`font-mono font-semibold ${
                                      item.onHand - item.reserved > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {item.onHand - item.reserved}
                                  </span>
                                </td>

                                {/* Unit Cost with Actual / Approx Badge */}
                                <td className="py-3 px-3 text-right">
                                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                    ₹{item.unitCost.toFixed(2)}
                                  </div>
                                  <div>
                                    {!item.isApproxCost ? (
                                      <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        Actual Cost
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                        title={`Category default approximation for ${item.category}`}
                                      >
                                        Approx ({item.category})
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Valuation */}
                                <td className="py-3 px-3 text-right">
                                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                    ₹{item.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      onClick={() => setInspectingProductId(item.productId)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                      title="View Product Detail & Movement History"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    {canManageLocations && (
                                      <>
                                        <button
                                          onClick={() => handleAdjustProduct(item)}
                                          className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                          title="Quick Reconcile Count"
                                        >
                                          <SlidersHorizontal className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          onClick={() => handleEditProduct(item)}
                                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                          title="Edit Product, Photos & Cost"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  /* TAB CONTENT: STORAGE BINS */
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dual Photo Lightbox Modal */}
      {selectedPhotoProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoProduct(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedPhotoProduct.productName}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    {selectedPhotoProduct.sku}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedPhotoProduct.category} &bull; Stored in{' '}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedPhotoProduct.locationPath}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPhotoProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Body: Photos */}
            <div className="p-6 bg-slate-950/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Photo 1 Container */}
                <div className="flex flex-col items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Photo 1 (Primary)
                  </span>
                  {selectedPhotoProduct.imageUrl ? (
                    <img
                      src={selectedPhotoProduct.imageUrl}
                      alt={`${selectedPhotoProduct.productName} Photo 1`}
                      className="w-full h-64 object-contain rounded-lg bg-slate-50 dark:bg-slate-950"
                    />
                  ) : (
                    <div className="w-full h-64 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-12 h-12 stroke-[1.2]" />
                      <span className="text-xs mt-2">No primary photo</span>
                    </div>
                  )}
                </div>

                {/* Photo 2 Container */}
                <div className="flex flex-col items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Photo 2 (Secondary / Angle)
                  </span>
                  {selectedPhotoProduct.imageUrl2 ? (
                    <img
                      src={selectedPhotoProduct.imageUrl2}
                      alt={`${selectedPhotoProduct.productName} Photo 2`}
                      className="w-full h-64 object-contain rounded-lg bg-slate-50 dark:bg-slate-950"
                    />
                  ) : (
                    <div className="w-full h-64 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-12 h-12 stroke-[1.2]" />
                      <span className="text-xs mt-2">No secondary photo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Valuation & Cost Summary Strip */}
              <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium">On Hand</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">
                    {selectedPhotoProduct.onHand} {selectedPhotoProduct.uom}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium">Reserved</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">
                    {selectedPhotoProduct.reserved} {selectedPhotoProduct.uom}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium">Unit Cost</span>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">
                      ₹{selectedPhotoProduct.unitCost.toFixed(2)}
                    </span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                        !selectedPhotoProduct.isApproxCost
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {!selectedPhotoProduct.isApproxCost ? 'Actual' : 'Approx'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 font-medium">Warehouse Valuation</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm font-mono">
                    ₹{selectedPhotoProduct.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Lightbox Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Supports up to 2 high-resolution product photos.
              </span>
              <div className="flex items-center space-x-2">
                {canManageLocations && (
                  <button
                    onClick={() => {
                      const prod = selectedPhotoProduct;
                      setSelectedPhotoProduct(null);
                      handleEditProduct(prod);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center space-x-1.5 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Product & Photos</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPhotoProduct(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        productId={inspectingProductId}
        isOpen={inspectingProductId !== null}
        onClose={() => setInspectingProductId(null)}
        onAdjust={(prod) => {
          setInspectingProductId(null);
          setAdjustingProduct(prod);
        }}
      />

      {/* Product Form Modal (Edit Product & Photos) */}
      <ProductFormModal
        isOpen={editingProduct !== null}
        product={editingProduct}
        categories={categories}
        onClose={() => setEditingProduct(null)}
        onSuccess={(_saved, _isEdit) => {
          setEditingProduct(null);
          showToast('Product Updated', 'Product details, photos, and unit cost saved.', 'success');
          fetchWarehouses(true);
        }}
      />

      {/* Quick Adjust Modal (Reconcile Stock) */}
      <QuickAdjustModal
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onSuccess={(result) => {
          setAdjustingProduct(null);
          showToast(
            'Stock Reconciled',
            `Reconciled ${result.productName} to ${result.countedQuantity} (${result.delta >= 0 ? '+' : ''}${result.delta}).`,
            'success'
          );
          fetchWarehouses(true);
        }}
      />
    </div>
  );
};
