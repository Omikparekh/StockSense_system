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
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentView } = useNavigation();

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.fetchDashboardKPIs();
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
  }, []);

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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authenticated Session Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Good morning, {user?.name}
          </h1>
          <p className="text-sm text-slate-600">
            Here is your live operations overview across warehouse facilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
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
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Operational Action Cards (Strictly wireframe layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Card */}
        <Card className="space-y-4 border-l-4 border-l-emerald-500 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <PackagePlus className="w-5 h-5 text-emerald-600" />
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
            <div className="space-y-1 text-xs text-slate-600 border-l border-slate-200 pl-4">
              <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: {kpis?.receipts.late ?? 0} operations</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span>Operations (Today): {kpis?.receipts.today ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Completed: {kpis?.receipts.done ?? 0}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery Card */}
        <Card className="space-y-4 border-l-4 border-l-indigo-500 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <Truck className="w-5 h-5 text-indigo-600" />
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
            <div className="space-y-1 text-xs text-slate-600 border-l border-slate-200 pl-4">
              <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: {kpis?.deliveries.late ?? 0} operation(s)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Waiting: {kpis?.deliveries.waiting ?? 0} (Stock Unavailable)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span>Internal Transfers</span>
            </div>
            <Badge variant="draft">WH/INT/00001</Badge>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
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

        <Card className="space-y-3 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <SlidersHorizontal className="w-4 h-4 text-purple-600" />
              <span>Stock Adjustments</span>
            </div>
            <Badge variant="neutral">WH/ADJ/00001</Badge>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Catalog Items</span>
            <Boxes className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpis?.inventory.total_products ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Active product SKUs</div>
        </Card>

        <Card className="p-4 space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total On-Hand</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {Number(kpis?.inventory.total_units || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Total units across locations</div>
        </Card>

        <Card
          className="p-4 space-y-1 bg-amber-50/50 border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
          onClick={() => setCurrentView('stock')}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Warning</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {kpis?.inventory.low_stock_count ?? 0}
          </div>
          <div className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
            <span>Needs replenishment</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </Card>

        <Card
          className="p-4 space-y-1 bg-rose-50/50 border border-rose-200 cursor-pointer hover:bg-rose-50 transition-colors"
          onClick={() => setCurrentView('stock')}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-900">
            {kpis?.inventory.out_of_stock_count ?? 0}
          </div>
          <div className="text-[11px] text-rose-700 flex items-center gap-1 font-medium">
            <span>Zero inventory balance</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </Card>
      </div>

      {/* Live Activity Feeds: Recent Operations & Stock Moves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Operations */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <PackagePlus className="w-4 h-4 text-slate-600" />
              <span>Recent Operations Stream</span>
            </div>
            <button
              onClick={() => setCurrentView('receipts')}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading operations...</div>
            ) : !kpis?.recent_operations || kpis.recent_operations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No operations recorded yet.</div>
            ) : (
              kpis.recent_operations.map((op) => (
                <div key={op.id} className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{op.reference}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        op.operation_type === 'IN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : op.operation_type === 'OUT'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {op.operation_type}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {op.partner_name || 'Internal Transfer'} &bull; {op.warehouse_name || 'Main WH'}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      op.status === 'Done'
                        ? 'bg-emerald-100 text-emerald-800'
                        : op.status === 'Ready'
                        ? 'bg-blue-100 text-blue-800'
                        : op.status === 'Waiting'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
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
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <History className="w-4 h-4 text-slate-600" />
              <span>Audit Ledger Activity</span>
            </div>
            <button
              onClick={() => setCurrentView('stock-history')}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading audit ledger...</div>
            ) : !kpis?.recent_stock_moves || kpis.recent_stock_moves.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No stock movements logged yet.</div>
            ) : (
              kpis.recent_stock_moves.map((m) => (
                <div key={m.id} className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{m.product_name}</span>
                      <span className="font-mono text-[11px] text-slate-400">{m.sku}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span className="truncate max-w-[100px]">{m.from_location}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[100px]">{m.to_location}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`font-mono font-bold text-xs ${
                      m.operation_type === 'OUT' ? 'text-rose-600' : 'text-emerald-600'
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
