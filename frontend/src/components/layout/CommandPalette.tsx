import React, { useState, useEffect, useRef } from 'react';
import { useNavigation, AppView } from '../../context/NavigationContext';
import {
  Search,
  LayoutDashboard,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  SlidersHorizontal,
  Boxes,
  History,
  Warehouse,
  MapPin,
  X,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  view: AppView;
  icon: React.ReactNode;
}

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, setCurrentView } = useNavigation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: PaletteItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'System overview, KPIs, and operational health status',
      category: 'Main',
      view: 'dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-brand-600" />,
    },
    {
      id: 'receipts',
      title: 'Receipts (Inbound Goods)',
      subtitle: 'Process vendor receipts (WH/IN/00001)',
      category: 'Operations',
      view: 'receipts',
      icon: <PackagePlus className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'deliveries',
      title: 'Delivery Orders (Outbound)',
      subtitle: 'Manage client deliveries with availability checks (WH/OUT/00001)',
      category: 'Operations',
      view: 'deliveries',
      icon: <Truck className="w-4 h-4 text-indigo-600" />,
    },
    {
      id: 'transfers',
      title: 'Internal Transfers',
      subtitle: 'Move inventory between locations (WH/INT/00001)',
      category: 'Operations',
      view: 'transfers',
      icon: <ArrowRightLeft className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'adjustments',
      title: 'Stock Adjustments',
      subtitle: 'Reconcile recorded quantity with physical count',
      category: 'Operations',
      view: 'adjustments',
      icon: <SlidersHorizontal className="w-4 h-4 text-rose-600" />,
    },
    {
      id: 'stock',
      title: 'Stock Availability Table',
      subtitle: 'Product catalog, on hand, and free stock levels',
      category: 'Inventory',
      view: 'stock',
      icon: <Boxes className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'history',
      title: 'Stock Move History',
      subtitle: 'Auditable ledger of every item movement',
      category: 'Inventory',
      view: 'stock-history',
      icon: <History className="w-4 h-4 text-purple-600" />,
    },
    {
      id: 'warehouses',
      title: 'Warehouses Configuration',
      subtitle: 'Manage physical warehouse facilities (Admin)',
      category: 'Settings',
      view: 'warehouses',
      icon: <Warehouse className="w-4 h-4 text-slate-600" />,
    },
    {
      id: 'locations',
      title: 'Locations Configuration',
      subtitle: 'Manage internal warehouse locations and paths (Admin)',
      category: 'Settings',
      view: 'locations',
      icon: <MapPin className="w-4 h-4 text-slate-600" />,
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const handleSelect = (view: AppView) => {
    setCurrentView(view);
    setIsCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex].view);
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-elevated overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search operations... (e.g. receipts, stock, transfer)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No operations or destinations found matching "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.view)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                  idx === selectedIndex ? 'bg-brand-50/80 text-brand-900' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-subtle">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500">{item.subtitle}</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-slate-100">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-xs font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-xs font-mono">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-xs font-mono">↵</kbd> Select</span>
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-xs font-mono">ESC</kbd> Close
          </div>
        </div>
      </div>
    </div>
  );
};
