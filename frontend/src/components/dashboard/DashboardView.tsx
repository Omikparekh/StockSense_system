import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { dashboardService, DashboardKPIs } from '../../services/dashboard.service';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AIConstellationBackground } from '../ui/AIConstellationBackground';
import {
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
  IndianRupee,
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
      {/* Cinematic Hero / Operations Overview Banner with Constellation Network Background */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0A0A0A] border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-all duration-300 min-h-[220px]">
        {/* Constellation Mesh Network Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-3xl">
          <AIConstellationBackground height="100%" className="w-full h-full" />
          {/* Subtle gradient overlays to guarantee 100% text contrast and readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/30 dark:from-[#0A0A0A]/95 dark:via-[#0A0A0A]/75 dark:to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/40 dark:from-[#0A0A0A]/50 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="ai" dot>
              AI Telemetry Active
            </Badge>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-black/[0.04] dark:bg-white/[0.05] text-[#666666] dark:text-[#A5A5A5] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xs">
              <span>Facility: <strong className="text-slate-900 dark:text-[#F5F5F5]">{activeWarehouse?.id === 0 ? 'All Facilities' : `${activeWarehouse?.name} (${activeWarehouse?.shortCode})`}</strong></span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 dark:text-[#F5F5F5] tracking-tight">
            Good morning, {user?.name}
          </h1>
          <p className="text-sm text-[#666666] dark:text-[#A5A5A5] leading-relaxed">
            {activeWarehouse?.id === 0
              ? 'Multi-facility autonomous inventory orchestration, real-time Rupee (₹) valuation, and active dispatch pipelines.'
              : `Scoped live operations overview, storage bin balances, and audit stream for ${activeWarehouse?.name} (${activeWarehouse?.shortCode}).`}
          </p>
        </div>

        {/* Right Action & Telemetry Status */}
        <div className="relative z-10 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDashboard()}
              disabled={loading}
              className="text-xs bg-white/60 dark:bg-black/40 backdrop-blur-sm border-slate-300 dark:border-white/[0.12] hover:border-brand-500/50"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#FF5A1F]' : ''}`} />
              Refresh Telemetry
            </Button>

            <Badge variant="ready" dot>
              Role: {user?.role.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Operational Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Card */}
        <Card className="space-y-4 border-l-4 border-l-emerald-500 hover:shadow-glow-subtle transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-[#F5F5F5]">
              <PackagePlus className="w-5 h-5 text-emerald-500" />
              <span>Inbound Receipts</span>
            </div>
            <Badge variant="ready">WH/IN/00001</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentView('receipts')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              {loading ? '...' : kpis?.receipts.to_receive ?? 0} To Receive / Process
            </Button>

            {/* Wireframe sub-metrics */}
            <div className="space-y-1 text-xs text-[#666666] dark:text-[#A5A5A5] border-l border-slate-200 dark:border-white/[0.08] pl-4">
              <div className="flex items-center gap-1.5 text-rose-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: {kpis?.receipts.late ?? 0} operations</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <span>Operations (Today): {kpis?.receipts.today ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Completed: {kpis?.receipts.done ?? 0}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery Card */}
        <Card className="space-y-4 border-l-4 border-l-indigo-500 hover:shadow-glow-subtle transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-[#F5F5F5]">
              <Truck className="w-5 h-5 text-indigo-400" />
              <span>Outbound Deliveries</span>
            </div>
            <Badge variant="waiting">WH/OUT/00001</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentView('deliveries')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.25)]"
            >
              {loading ? '...' : kpis?.deliveries.to_deliver ?? 0} To Deliver / Dispatch
            </Button>

            {/* Wireframe sub-metrics */}
            <div className="space-y-1 text-xs text-[#666666] dark:text-[#A5A5A5] border-l border-slate-200 dark:border-white/[0.08] pl-4">
              <div className="flex items-center gap-1.5 text-rose-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: {kpis?.deliveries.late ?? 0} operation(s)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Waiting: {kpis?.deliveries.waiting ?? 0} (Stock Unavailable)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ready to Pack: {kpis?.deliveries.ready ?? 0}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Internal Transfers & Stock Adjustments Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-3 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-[#F5F5F5]">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span>Internal Transfers</span>
            </div>
            <Badge variant="draft">WH/INT/00001</Badge>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[#666666] dark:text-[#A5A5A5] leading-relaxed max-w-sm">
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

        <Card className="space-y-3 border-l-4 border-l-[#FF5A1F]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-[#F5F5F5]">
              <SlidersHorizontal className="w-4 h-4 text-[#FF5A1F]" />
              <span>Stock Adjustments</span>
            </div>
            <Badge variant="ai">WH/ADJ/00001</Badge>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[#666666] dark:text-[#A5A5A5] leading-relaxed max-w-sm">
              Directly reconcile physical shelf count against system records and commit auditable gains/losses.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('adjustments')}
              className="text-xs whitespace-nowrap font-medium ml-2 border-[#FF5A1F]/30 hover:border-[#FF5A1F] text-[#FF8A4C]"
            >
              Audit Count &rarr;
            </Button>
          </div>
        </Card>
      </div>

      {/* Inventory Health Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-[#888888] dark:text-[#707070]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Catalog Items</span>
            <Boxes className="w-4 h-4 text-[#FF5A1F]" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F5F5F5]">
            {kpis?.inventory.total_products ?? 0}
          </div>
          <div className="text-[11px] text-[#666666] dark:text-[#A5A5A5]">Active product SKUs</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-[#888888] dark:text-[#707070]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total On-Hand</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F5F5F5] font-mono">
            {Number(kpis?.inventory.total_units || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-[#666666] dark:text-[#A5A5A5]">Total units stored</div>
        </Card>

        <Card className="p-4 space-y-1 border-[#FF5A1F]/20 dark:border-[#FF5A1F]/30 bg-gradient-to-br from-transparent to-[#FF5A1F]/[0.03]">
          <div className="flex items-center justify-between text-[#888888] dark:text-[#707070]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Inventory Value</span>
            <IndianRupee className="w-4 h-4 text-[#FF5A1F]" />
          </div>
          <div className="text-2xl font-black text-[#FF5A1F] dark:text-[#FF8A4C] font-mono">
            ₹{Number(kpis?.inventory.total_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#666666] dark:text-[#A5A5A5]">Calculated live valuation</div>
        </Card>

        <div
          className="p-4 rounded-2xl space-y-1 bg-amber-500/[0.06] border border-amber-500/20 cursor-pointer hover:bg-amber-500/[0.1] transition-all shadow-card"
          onClick={() => setCurrentView('stock')}
        >
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {kpis?.inventory.low_stock_count ?? 0}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
            <span>Needs replenishment</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        <div
          className="p-4 rounded-2xl space-y-1 bg-rose-500/[0.06] border border-rose-500/20 cursor-pointer hover:bg-rose-500/[0.1] transition-all shadow-card"
          onClick={() => setCurrentView('stock')}
        >
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Out of Stock</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {kpis?.inventory.out_of_stock_count ?? 0}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
            <span>Zero balance items</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Live Activity Feeds: Recent Operations & Stock Moves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Operations */}
        <div className="bg-white dark:bg-[#101010] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-card overflow-hidden transition-colors">
          <div className="p-5 bg-black/[0.02] dark:bg-[#151515] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-[#F5F5F5]">
              <PackagePlus className="w-4 h-4 text-[#FF5A1F]" />
              <span>Recent Operations Stream</span>
            </div>
            <button
              onClick={() => setCurrentView('receipts')}
              className="text-xs text-[#FF8A4C] font-semibold hover:text-[#FF6A2A] flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#707070]">Loading telemetry...</div>
            ) : !kpis?.recent_operations || kpis.recent_operations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#707070]">No operations recorded yet.</div>
            ) : (
              kpis.recent_operations.map((op) => (
                <div key={op.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-[#F5F5F5]">{op.reference}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        op.operation_type === 'IN'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : op.operation_type === 'OUT'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                      }`}>
                        {op.operation_type}
                      </span>
                    </div>
                    <div className="text-[#666666] dark:text-[#A5A5A5] text-[11px]">
                      {op.partner_name || 'Internal Transfer'} &bull; {op.warehouse_name || 'Main WH'}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      op.status === 'Done'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : op.status === 'Ready'
                        ? 'bg-blue-500/15 text-blue-400'
                        : op.status === 'Waiting'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-white/[0.06] text-[#A5A5A5]'
                    }`}>
                      {op.status}
                    </span>
                    <div className="text-[10px] text-[#707070]">Date: {op.scheduled_date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Stock Movement Ledger Entries */}
        <div className="bg-white dark:bg-[#101010] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-card overflow-hidden transition-colors">
          <div className="p-5 bg-black/[0.02] dark:bg-[#151515] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-[#F5F5F5]">
              <History className="w-4 h-4 text-[#FF5A1F]" />
              <span>Audit Ledger Activity</span>
            </div>
            <button
              onClick={() => setCurrentView('stock-history')}
              className="text-xs text-[#FF8A4C] font-semibold hover:text-[#FF6A2A] flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#707070]">Loading audit ledger...</div>
            ) : !kpis?.recent_stock_moves || kpis.recent_stock_moves.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#707070]">No stock movements logged yet.</div>
            ) : (
              kpis.recent_stock_moves.map((m) => (
                <div key={m.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">{m.product_name}</span>
                      <span className="font-mono text-[11px] text-[#707070]">{m.sku}</span>
                    </div>
                    <div className="text-[11px] text-[#666666] dark:text-[#A5A5A5] flex items-center gap-1">
                      <span className="truncate max-w-[100px]">{m.from_location}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-[#707070] shrink-0" />
                      <span className="truncate max-w-[100px]">{m.to_location}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`font-mono font-bold text-xs ${
                      m.operation_type === 'OUT' 
                        ? 'text-rose-500' 
                        : 'text-emerald-500'
                    }`}>
                      {m.operation_type === 'OUT' ? '-' : '+'}{m.quantity} {m.uom}
                    </span>
                    <div className="text-[10px] text-[#707070]">{formatDate(m.created_at)}</div>
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
