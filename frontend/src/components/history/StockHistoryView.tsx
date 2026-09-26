import React, { useState, useEffect, useCallback } from 'react';
import { historyService, StockHistoryItem } from '../../services/history.service';
import { Button } from '../ui/Button';
import {
  History,
  Search,
  Filter,
  Download,
  ArrowRight,
  RotateCw,
  Calendar,
  User,
  AlertCircle,
  Layers,
} from 'lucide-react';

const OP_BADGES: Record<string, { label: string; variant: 'ready' | 'waiting' | 'draft' | 'neutral' | 'danger'; bg: string; text: string }> = {
  IN: { label: 'Receipt (IN)', variant: 'ready', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60', text: 'text-emerald-700 dark:text-emerald-300' },
  OUT: { label: 'Delivery (OUT)', variant: 'waiting', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60', text: 'text-indigo-700 dark:text-indigo-300' },
  INT: { label: 'Internal (INT)', variant: 'draft', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60', text: 'text-amber-700 dark:text-amber-300' },
  ADJ: { label: 'Adjustment (ADJ)', variant: 'neutral', bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60', text: 'text-purple-700 dark:text-purple-300' },
};

export const StockHistoryView: React.FC = () => {
  const [items, setItems] = useState<StockHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedOp, setSelectedOp] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [exporting, setExporting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await historyService.fetchStockHistory({
        page,
        limit: 20,
        operation_type: selectedOp !== 'ALL' ? selectedOp : undefined,
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
      setError(err.message || 'Failed to load stock movement ledger.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedOp, search, fromDate, toDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await historyService.downloadCsv();
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Stock Move History</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit-grade log of every movement, transfer, delivery, receipt, and count adjustment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loading}
            className="text-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
        {/* Operation Type Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Type:
          </span>
          {[
            { id: 'ALL', label: 'All Operations' },
            { id: 'IN', label: 'Inbound Receipts (IN)' },
            { id: 'OUT', label: 'Outbound Deliveries (OUT)' },
            { id: 'INT', label: 'Internal Transfers (INT)' },
            { id: 'ADJ', label: 'Adjustments (ADJ)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedOp(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedOp === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search reference, product, SKU, locations, or notes..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Audit Trail Entries ({totalCount} recorded movements)</span>
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
                <th className="py-3 px-4">Reference & Type</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Route (From &rarr; To)</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading audit ledger records...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No stock movements found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Validate a receipt, delivery, or perform an inventory adjustment to generate ledger records.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const badgeInfo = OP_BADGES[row.operation_type] || OP_BADGES.IN;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Reference & Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            {row.reference}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.bg}`}>
                            {row.operation_type}
                          </span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{formatDate(row.created_at)}</span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={row.product_name}>
                          {row.product_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{row.sku}</span>
                          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                          <span className="text-slate-400 dark:text-slate-500">{row.category}</span>
                        </div>
                      </td>

                      {/* Route From -> To */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 max-w-[140px] truncate" title={row.from_location}>
                            {row.from_location}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 max-w-[140px] truncate" title={row.to_location}>
                            {row.to_location}
                          </span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`font-bold font-mono text-sm ${
                          row.operation_type === 'OUT' 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : row.operation_type === 'IN' 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {row.operation_type === 'OUT' ? '-' : row.operation_type === 'IN' ? '+' : ''}
                          {Number(row.quantity).toLocaleString()} {row.uom}
                        </span>
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="font-medium">{row.user_name || 'System Staff'}</span>
                        </div>
                      </td>

                      {/* Audit Notes */}
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
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} movements
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
    </div>
  );
};
