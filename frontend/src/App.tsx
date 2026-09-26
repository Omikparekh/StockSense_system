import React, { useEffect, useState } from 'react';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { Card } from './components/ui/Card';
import { api } from './services/api';
import { ApiHealthResponse } from './types';
import {
  Boxes,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
  ArrowRightLeft,
  Layers,
  Sparkles,
} from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<ApiHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.checkHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Backend not connected yet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">StockSense</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 rounded">
                  Phase 1 — Foundation
                </span>
              </div>
              <p className="text-xs text-slate-500">Modern Inventory Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <Badge variant="neutral" dot>Checking Backend...</Badge>
            ) : health ? (
              <Badge variant="done" dot>Backend Online ({health.database})</Badge>
            ) : (
              <Badge variant="waiting" dot>Backend Standby</Badge>
            )}
            <Button size="sm" variant="outline" onClick={fetchHealth} isLoading={loading}>
              Check Connection
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Hero Banner */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-card relative overflow-hidden">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>ERP-Grade Architecture & Design Token System</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              High-Precision Stock Flow & Auditable Ledger
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              StockSense is built strictly according to your wireframe architecture diagram:
              featuring deterministic sequence codes (<code className="font-mono text-brand-700 bg-brand-50 px-1 py-0.5 rounded text-xs font-semibold">WH/IN/00001</code>, <code className="font-mono text-brand-700 bg-brand-50 px-1 py-0.5 rounded text-xs font-semibold">WH/OUT/00001</code>), 
              automatic stock availability checking (<code className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-xs font-semibold">Waiting</code> / <code className="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded text-xs font-semibold">Ready</code>), and direct in-table stock reconciliation.
            </p>
          </div>
        </div>

        {/* Design System Preview */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Phase 1 Design System Tokens</h2>
              <p className="text-xs text-slate-500">Centralized UI components, responsive typography, and operational state tokens.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Operational States Badge Preview */}
            <Card className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Layers className="w-4 h-4 text-brand-600" />
                <h3>Diagram State Machine Tokens</h3>
              </div>
              <p className="text-xs text-slate-500">Accurate to the wireframe workflow states:</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="draft" dot>Draft</Badge>
                <Badge variant="waiting" dot>Waiting</Badge>
                <Badge variant="ready" dot>Ready</Badge>
                <Badge variant="done" dot>Done</Badge>
                <Badge variant="cancelled" dot>Cancelled</Badge>
              </div>
            </Card>

            {/* Sequence Code Engine Preview */}
            <Card className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <PackagePlus className="w-4 h-4 text-emerald-600" />
                <h3>Sequence Numbering Patterns</h3>
              </div>
              <p className="text-xs text-slate-500">[Warehouse] / [Operation] / [Sequence]:</p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-600">Receipts</span>
                  <span className="font-semibold text-emerald-700">WH/IN/00001</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-600">Deliveries</span>
                  <span className="font-semibold text-indigo-700">WH/OUT/00001</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-600">Transfers</span>
                  <span className="font-semibold text-amber-700">WH/INT/00001</span>
                </div>
              </div>
            </Card>

            {/* In-Table Reconciliation Preview */}
            <Card className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                <h3>Stock Reconciliation Trigger</h3>
              </div>
              <p className="text-xs text-slate-500">Live difference calculator:</p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Recorded System Stock:</span>
                  <span className="font-bold">100 units</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Physical Stock Count:</span>
                  <span className="font-bold">97 units</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1.5">
                  <span>Difference:</span>
                  <span>-3 units (Audited)</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Backend Connection Status Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Backend & Database Infrastructure</h2>
          <Card>
            {loading ? (
              <div className="py-6 text-center text-slate-500 text-sm">
                Connecting to backend API...
              </div>
            ) : health ? (
              <div className="flex items-center gap-4 text-emerald-700 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-600" />
                <div className="text-sm">
                  <p className="font-semibold">Backend Connected & Fully Healthy</p>
                  <p className="text-xs text-emerald-600">
                    Version: {health.version} | Database Engine: {health.database} | Timestamp: {health.timestamp}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-amber-800 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <AlertCircle className="w-6 h-6 flex-shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-semibold">FastAPI Backend Standby</p>
                  <p className="text-xs text-amber-700">
                    {error || 'Backend will respond once started via uvicorn app.main:app --reload'}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
};

export default App;
