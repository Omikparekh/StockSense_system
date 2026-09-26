import React, { useState, useEffect, useMemo } from 'react';
import { ProductWithStock, ProductsApiResponse } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { QuickAdjustModal } from './QuickAdjustModal';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import {
  Package,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Scale,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  Download,
  AlertCircle
} from 'lucide-react';

export const StockView: React.FC = () => {
  const { user } = useAuth();
  const { activeWarehouse } = useNavigation();
  const canManageCatalog = user?.role === 'admin' || user?.role === 'inventory_manager';
  const canDeleteProduct = user?.role === 'admin';

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Sorting
  const [sortField, setSortField] = useState<keyof ProductWithStock>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals & Drawers state
  const [adjustingProduct, setAdjustingProduct] = useState<ProductWithStock | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspectingProductId, setInspectingProductId] = useState<number | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [activeWarehouse]);

  const fetchProducts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const endpoint = activeWarehouse.id !== 0 ? `/products?warehouse_id=${activeWarehouse.id}` : '/products';
      const res = await api.get<ProductsApiResponse>(endpoint);
      setProducts(res.data.products);
      setCategories(res.data.categories || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory stock.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSort = (field: keyof ProductWithStock) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === 'All' || p.category === selectedCategory;
        const matchesStatus =
          selectedStatus === 'all' || p.stock_status === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sortDirection === 'asc'
          ? (Number(aVal) || 0) - (Number(bVal) || 0)
          : (Number(bVal) || 0) - (Number(aVal) || 0);
      });
  }, [products, searchTerm, selectedCategory, selectedStatus, sortField, sortDirection]);

  // Counts by status
  const counts = useMemo(() => {
    return {
      all: products.length,
      in_stock: products.filter(p => p.stock_status === 'in_stock').length,
      low_stock: products.filter(p => p.stock_status === 'low_stock').length,
      out_of_stock: products.filter(p => p.stock_status === 'out_of_stock').length,
    };
  }, [products]);

  // Reconciliation success callback
  const handleAdjustSuccess = (result: {
    reference: string;
    productName: string;
    previousQuantity: number;
    countedQuantity: number;
    delta: number;
  }) => {
    showToast(
      'Stock Reconciled Successfully',
      `${result.reference}: ${result.productName} adjusted from ${result.previousQuantity} to ${result.countedQuantity} (${result.delta >= 0 ? '+' : ''}${result.delta}).`,
      'success'
    );
    fetchProducts(true);
  };

  // Create/Edit product success
  const handleProductSaved = (_saved: any, isEdit: boolean) => {
    showToast(
      isEdit ? 'Product Updated' : 'Product Created',
      `Catalog entry ${isEdit ? 'updated' : 'created'} successfully.`,
      'success'
    );
    fetchProducts(true);
  };

  // Delete product
  const handleDeleteProduct = async (product: ProductWithStock) => {
    if (!window.confirm(`Are you sure you want to delete product "${product.name}" (${product.sku})? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/products/${product.id}`);
      showToast('Product Deleted', `Removed "${product.name}" from catalog.`, 'success');
      fetchProducts(true);
    } catch (err: any) {
      showToast('Cannot Delete Product', err.message || 'Product deletion failed.', 'error');
    }
  };

  const showToast = (title: string, desc: string, type: 'success' | 'error') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Export to CSV helper
  const exportToCsv = () => {
    const headers = ['SKU', 'Name', 'Category', 'UoM', 'Reorder Level', 'On Hand', 'Reserved', 'Free Stock', 'Status'];
    const rows = filteredProducts.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.uom}"`,
      p.reorder_level,
      p.on_hand,
      p.reserved,
      p.free_stock,
      p.stock_status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stocksense_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Stock Inventory</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {filteredProducts.length} items
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time physical on-hand, reserved allocations, and in-table stock reconciliation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchProducts()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
            title="Refresh Stock Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportToCsv}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center space-x-1.5 transition"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {canManageCatalog && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Status Pills */}
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
              All Items ({counts.all})
            </button>

            <button
              onClick={() => setSelectedStatus('in_stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'in_stock'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>In Stock ({counts.in_stock})</span>
            </button>

            <button
              onClick={() => setSelectedStatus('low_stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'low_stock'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Low Stock ({counts.low_stock})</span>
            </button>

            <button
              onClick={() => setSelectedStatus('out_of_stock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                selectedStatus === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Out of Stock ({counts.out_of_stock})</span>
            </button>
          </div>

          {/* View Mode Toggle (List vs Kanban Grid) */}
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
              title="Kanban Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search products by SKU or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 pl-3 pr-8 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Stock Content */}
      {loading ? (
        <div className="py-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading inventory catalog and stock balances...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Error Loading Stock</h4>
            <p className="mt-1">{error}</p>
            <button
              onClick={() => fetchProducts()}
              className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No products match your criteria</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Try adjusting your search keywords, category filters, or register a new product into the catalog.
            </p>
          </div>
          {canManageCatalog && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* ERP Table View (Matching wireframe) */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition" onClick={() => handleSort('name')}>
                    <div className="flex items-center space-x-1">
                       <span>Product & SKU</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right">Reorder Lvl</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition" onClick={() => handleSort('on_hand')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>On Hand</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Reserved</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition" onClick={() => handleSort('free_stock')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>Free to Use</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => setInspectingProductId(p.id)}
                              className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition block"
                            >
                              {p.name}
                            </button>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {p.category}
                        </span>
                      </td>

                      {/* UoM */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {p.uom}
                      </td>

                      {/* Reorder Level */}
                      <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                        {p.reorder_level}
                      </td>

                      {/* On Hand */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {p.on_hand}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{p.uom}</span>
                      </td>

                      {/* Reserved */}
                      <td className="py-3 px-3 text-right">
                        {p.reserved > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                            {p.reserved}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Free Stock */}
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold text-sm ${p.free_stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {p.free_stock}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{p.uom}</span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {p.stock_status === 'in_stock' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            In Stock
                          </span>
                        ) : p.stock_status === 'low_stock' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 mr-1" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 mr-1" />
                            Out of Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Quick Adjust Button */}
                          <button
                            onClick={() => setAdjustingProduct(p)}
                            title="Quick Adjust Physical Count"
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                          >
                            <Scale className="w-4 h-4" />
                          </button>

                          {/* View Detail Button */}
                          <button
                            onClick={() => setInspectingProductId(p.id)}
                            title="View Locations & History"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          {canManageCatalog && (
                            <button
                              onClick={() => setEditingProduct(p)}
                              title="Edit Product"
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDeleteProduct && (
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              title="Delete Product"
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {p.sku}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer" onClick={() => setInspectingProductId(p.id)}>
                      {p.name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {p.category}
                  </span>
                </div>

                {/* Stock Health Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Inventory Level</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {p.on_hand} / {p.reorder_level * 2} {p.uom}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        p.stock_status === 'in_stock'
                          ? 'bg-emerald-500'
                          : p.stock_status === 'low_stock'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (p.on_hand / (p.reorder_level * 2 || 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Reserved</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{p.reserved}</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Free Stock</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{p.free_stock}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setInspectingProductId(p.id)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </button>
                <button
                  onClick={() => setAdjustingProduct(p)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Quick Adjust</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Adjust Reconciliation Modal */}
      <QuickAdjustModal
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onSuccess={handleAdjustSuccess}
      />

      {/* Product Form Modal (Create or Edit) */}
      <ProductFormModal
        isOpen={isCreateOpen || !!editingProduct}
        product={editingProduct}
        categories={categories}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={handleProductSaved}
      />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        productId={inspectingProductId}
        isOpen={!!inspectingProductId}
        onClose={() => setInspectingProductId(null)}
        onAdjust={(prod) => {
          setInspectingProductId(null);
          setAdjustingProduct(prod);
        }}
      />
    </div>
  );
};
