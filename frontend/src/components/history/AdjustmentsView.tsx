import React, { useState, useEffect, useCallback } from 'react';
import { historyService, StockHistoryItem } from '../../services/history.service';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  SlidersHorizontal,
  Plus,
  Search,
  RotateCw,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  User,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const REASON_OPTIONS = [
  'Physical cycle count discrepancy',
  'Damaged / expired inventory write-off',
  'Found unrecorded surplus stock',
  'Supplier shipment discrepancy reconciliation',
  'Internal quality sample / scrap',
  'Other / custom reason',
];

export const AdjustmentsView: React.FC = () => {
  const [items, setItems] = useState<StockHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('');
  const [countedQty, setCountedQty] = useState<number>(0);
  const [reason, setReason] = useState<string>(REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await historyService.fetchAdjustments({
        page,
        limit: 20,
        search: search.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });

      if (res.success) {
        setItems(res.data);
        setTotalPages(res.meta.totalPages || 1);
        setTotalCount(res.meta.total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load adjustments.');
    } finally {
      setLoading(false);
    }
  }, [page, search, fromDate, toDate]);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  // Load products and locations for the modal
  const openNewAuditModal = async () => {
    try {
      setModalError(null);
      setModalOpen(true);
      const [prodRes, whRes] = await Promise.all([
        api.get<any>('/products?limit=100'),
        api.get<any>('/warehouses/locations'),
      ]);

      const prods = prodRes.data || [];
      const locs = whRes.data || [];

      setProductsList(prods);
      setLocationsList(locs);

      if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
        setCountedQty(prods[0].on_hand || 0);
      }
      if (locs.length > 0) {
        const stockLoc = locs.find((l: any) => l.path === 'WH/Stock');
        setSelectedLocationId(stockLoc ? stockLoc.id : locs[0].id);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to load products/locations.');
    }
  };

  const selectedProduct = productsList.find((p) => p.id === Number(selectedProductId));
  const currentRecordedQty = selectedProduct ? Number(selectedProduct.on_hand) || 0 : 0;
  const delta = countedQty - currentRecordedQty;

  const handleProductChange = (prodId: number) => {
    setSelectedProductId(prodId);
    const prod = productsList.find((p) => p.id === prodId);
    if (prod) {
      setCountedQty(prod.on_hand || 0);
    }
  };

  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setModalError('Please select a product to audit.');
      return;
    }
    if (countedQty < 0) {
      setModalError('Physical counted quantity cannot be negative.');
      return;
    }

    const finalReason = reason === 'Other / custom reason'
      ? (customReason.trim() || 'Physical inventory audit reconciliation')
      : reason;

    try {
      setSubmitting(true);
      setModalError(null);

      const res = await historyService.createAdjustment({
        product_id: Number(selectedProductId),
        location_id: selectedLocationId ? Number(selectedLocationId) : undefined,
        counted_quantity: Number(countedQty),
        reason: finalReason,
      });

      if (res.success) {
        setSuccessToast(`Stock adjusted successfully (${res.data.reference}). Delta: ${res.data.delta >= 0 ? '+' : ''}${res.data.delta} ${res.data.uom}`);
        setModalOpen(false);
        setTimeout(() => setSuccessToast(null), 5000);
        loadAdjustments();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to record stock adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Metrics calculation
  const gainCount = items.filter((i) => i.to_location.includes('Stock') || !i.from_location.includes('Stock')).length;
  const lossCount = items.length - gainCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-600 dark:text-purple-400">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Physical Stock Adjustments</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono">
                WH/ADJ/00001
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reconcile physical counts vs system records with auditable gain/loss ledger logging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAdjustments}
            disabled={loading}
            className="text-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openNewAuditModal}
            className="text-xs font-semibold bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Physical Audit
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3 shadow-card">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Adjustments Executed</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border-l-4 border-l-emerald-500 shadow-card">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{gainCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Inventory Gains (Surplus)</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border-l-4 border-l-rose-500 shadow-card">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-400">{lossCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Inventory Losses (Damage / Scrap)</div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 transition-colors">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search reference (WH/ADJ), product, SKU, or audit reason..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Recorded Physical Audit Adjustments ({totalCount} entries)</span>
          </div>
          <span className="text-slate-400 dark:text-slate-500">Page {page} of {totalPages}</span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Adjustment Ref</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Target Location</th>
                <th className="py-3 px-4 text-right">Reconciliation Delta</th>
                <th className="py-3 px-4">Auditor / User</th>
                <th className="py-3 px-4">Audit Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                    <span>Loading physical audit history...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No physical adjustments recorded yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Click "+ New Physical Audit" above to record a physical cycle count.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isGain = row.to_location.includes('Stock');

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          {row.reference}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{formatDate(row.created_at)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                          {row.product_name}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {row.sku}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                          {isGain ? row.to_location : row.from_location}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          isGain
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                        }`}>
                          {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isGain ? '+' : '-'}{Number(row.quantity).toLocaleString()} {row.uom}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="font-medium">{row.user_name || 'Staff'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2" title={row.notes || ''}>
                          {row.notes || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} adjustments
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="text-xs"
              >
                Previous
              </Button>
              <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Physical Audit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-modal max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up transition-colors">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">New Physical Count Audit</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Record physical shelf inventory and calculate delta</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAudit} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Product Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) &mdash; On Hand: {p.on_hand} {p.uom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Storage Location
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-[11px]"
                >
                  {locationsList.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.path} ({loc.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Comparison & Delta Preview Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Current Recorded Stock:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {currentRecordedQty} {selectedProduct?.uom || 'Units'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Physical Counted Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={countedQty}
                    onChange={(e) => setCountedQty(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Computed Delta:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      delta > 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : delta < 0
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {delta > 0 ? `+${delta} (Gain)` : delta < 0 ? `${delta} (Loss)` : '0 (No Change)'} {selectedProduct?.uom || 'Units'}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Adjustment Justification <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {reason === 'Other / custom reason' && (
                  <input
                    type="text"
                    placeholder="Specify detailed reason for adjustment..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    required
                    className="w-full mt-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 font-semibold"
                >
                  {submitting ? 'Recording Audit...' : 'Commit Adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
