import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { dashboardService, DashboardKPIs } from '../../services/dashboard.service';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  ShieldCheck,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  SlidersHorizontal,
  Clock,
  AlertCircle,
  CheckCircle2,
  Boxes,
  TrendingUp,
  History,
  RotateCw,
  ArrowRight,
  AlertTriangle,
  ArrowUpRight,
  IndianRupee
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentView, activeWarehouse } = useNavigation();

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const warehouseId = activeWarehouse?.id !== 0 ? activeWarehouse?.id : null;
      const res = await dashboardService.fetchDashboardKPIs(warehouseId);
      if (res.success) {
        setKpis(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeWarehouse?.id]);

  // Rapid sync: auto-refresh every 12 seconds and on tab visibility change
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 12000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeWarehouse?.id]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authenticated Session Active</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              <span>Facility: {activeWarehouse?.id === 0 ? 'All Facilities' : `${activeWarehouse?.name} (${activeWarehouse?.shortCode})`}</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Good morning, {user?.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {activeWarehouse?.id === 0
              ? 'Aggregated live operations and inventory analytics across all warehouse facilities.'
              : `Live operations overview filtered specifically for ${activeWarehouse?.name} (${activeWarehouse?.shortCode}).`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboard()}
            disabled={loading}
            className="text-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          <Badge variant="ready" dot>
            Role: {user?.role.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Operational Action Cards (Strictly wireframe layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Card */}
        <Card className="space-y-4 border-l-4 border-l-emerald-500 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
              <PackagePlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Inbound Receipts</span>
            </div>
            <Badge variant="ready">WH/IN/00001</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentView('receipts')}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold text-sm shadow-sm"
            >
              {loading ? '...' : kpis?.receipts.to_receive ?? 0} To Receive / Process
            </Button>

            {/* Wireframe sub-metrics */}
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: {kpis?.receipts.late ?? 0} operations</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <span>Operations (Today): {kpis?.receipts.today ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Completed: {kpis?.receipts.done ?? 0}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery Card */}
        <Card className="space-y-4 border-l-4 border-l-indigo-500 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
              <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Outbound Deliveries</span>
            </div>
            <Badge variant="waiting">WH/OUT/00001</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentView('deliveries')}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold text-sm shadow-sm"
            >
              {loading ? '...' : kpis?.deliveries.to_deliver ?? 0} To Deliver / Dispatch
            </Button>

            {/* Wireframe sub-metrics */}
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: {kpis?.deliveries.late ?? 0} operation(s)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Waiting: {kpis?.deliveries.waiting ?? 0} (Stock Unavailable)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ready to Pack: {kpis?.deliveries.ready ?? 0}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Internal Transfers & Stock Adjustments Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-3 border-l-4 border-l-amber-500 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Internal Transfers</span>
            </div>
            <Badge variant="draft">WH/INT/00001</Badge>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Move inventory between warehouse locations (e.g. WH/Stock &rarr; WH/Output) with zero-sum company balance neutrality.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('transfers')}
              className="text-xs whitespace-nowrap font-medium ml-2"
            >
              {kpis?.transfers.in_progress ?? 0} In Progress &rarr;
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 border-l-4 border-l-purple-500 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <SlidersHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Stock Adjustments</span>
            </div>
            <Badge variant="neutral">WH/ADJ/00001</Badge>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Directly reconcile physical shelf count against system records and commit auditable gains/losses.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('adjustments')}
              className="text-xs whitespace-nowrap font-medium ml-2"
            >
              Audit Count &rarr;
            </Button>
          </div>
        </Card>
      </div>

      {/* Inventory Health Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Catalog Items</span>
            <Boxes className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis?.inventory.total_products ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Active product SKUs</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total On-Hand</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {Number(kpis?.inventory.total_units || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Total units stored</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Inventory Value</span>
            <IndianRupee className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            ₹{Number(kpis?.inventory.total_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Calculated valuation</div>
        </Card>

        <div
          className="p-4 rounded-xl space-y-1 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-950/50 transition-colors shadow-card"
          onClick={() => setCurrentView('stock')}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Warning</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200">
            {kpis?.inventory.low_stock_count ?? 0}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
            <span>Needs replenishment</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        <div
          className="p-4 rounded-xl space-y-1 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 cursor-pointer hover:bg-rose-100/70 dark:hover:bg-rose-950/50 transition-colors shadow-card"
          onClick={() => setCurrentView('stock')}
        >
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200">
            {kpis?.inventory.out_of_stock_count ?? 0}
          </div>
          <div className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium">
            <span>Zero inventory balance</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Live Activity Feeds: Recent Operations & Stock Moves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Operations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card overflow-hidden transition-colors">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
              <PackagePlus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Recent Operations Stream</span>
            </div>
            <button
              onClick={() => setCurrentView('receipts')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading operations...</div>
            ) : !kpis?.recent_operations || kpis.recent_operations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No operations recorded yet.</div>
            ) : (
              kpis.recent_operations.map((op) => (
                <div key={op.id} className="p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{op.reference}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        op.operation_type === 'IN'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : op.operation_type === 'OUT'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      }`}>
                        {op.operation_type}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {op.partner_name || 'Internal Transfer'} &bull; {op.warehouse_name || 'Main WH'}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      op.status === 'Done'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : op.status === 'Ready'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        : op.status === 'Waiting'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {op.status}
                    </span>
                    <div className="text-[10px] text-slate-400">Date: {op.scheduled_date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Stock Movement Ledger Entries */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card overflow-hidden transition-colors">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
              <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Audit Ledger Activity</span>
            </div>
            <button
              onClick={() => setCurrentView('stock-history')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading audit ledger...</div>
            ) : !kpis?.recent_stock_moves || kpis.recent_stock_moves.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No stock movements logged yet.</div>
            ) : (
              kpis.recent_stock_moves.map((m) => (
                <div key={m.id} className="p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{m.product_name}</span>
                      <span className="font-mono text-[11px] text-slate-400">{m.sku}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span className="truncate max-w-[100px]">{m.from_location}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[100px]">{m.to_location}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`font-mono font-bold text-xs ${
                      m.operation_type === 'OUT' 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {m.operation_type === 'OUT' ? '-' : '+'}{m.quantity} {m.uom}
                    </span>
                    <div className="text-[10px] text-slate-400">{formatDate(m.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
