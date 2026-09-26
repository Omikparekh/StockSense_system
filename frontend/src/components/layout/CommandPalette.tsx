import React, { useState, useEffect, useRef } from 'react';
import { useNavigation, AppView } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
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
  Building2,
  User,
  X,
  Sun,
  Moon,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  view?: AppView;
  action?: () => void;
  icon: React.ReactNode;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setCurrentView,
    availableWarehouses,
    setActiveWarehouse,
    setIsProfileModalOpen,
  } = useNavigation();
  const { isDark, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const warehouseItems: PaletteItem[] = availableWarehouses.map((wh) => ({
    id: `switch-wh-${wh.id}`,
    title: `Switch Facility: ${wh.name}`,
    subtitle: `Set active warehouse scope to [${wh.shortCode}]`,
    category: 'Warehouses',
    action: () => setActiveWarehouse(wh),
    icon: <Warehouse className="w-4 h-4 text-brand-600" />,
  }));

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
      id: 'suppliers',
      title: 'Suppliers & Vendors',
      subtitle: 'Supplier directory, vendor contacts, and procurement partners',
      category: 'Operations',
      view: 'suppliers',
      icon: <Building2 className="w-4 h-4 text-teal-600" />,
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
      subtitle: 'Reconcile recorded quantity with physical count (WH/ADJ/00001)',
      category: 'Operations',
      view: 'adjustments',
      icon: <SlidersHorizontal className="w-4 h-4 text-purple-600" />,
    },
    {
      id: 'stock',
      title: 'Stock Availability Table',
      subtitle: 'Inventory catalog, on-hand, free stock, reorder levels',
      category: 'Inventory',
      view: 'stock',
      icon: <Boxes className="w-4 h-4 text-sky-600" />,
    },
    {
      id: 'stock-history',
      title: 'Stock Move History',
      subtitle: 'Audit ledger of item movements and CSV exports',
      category: 'Inventory',
      view: 'stock-history',
      icon: <History className="w-4 h-4 text-slate-600" />,
    },
    {
      id: 'warehouses',
      title: 'Warehouses Configuration',
      subtitle: 'Facility buildings and company configurations',
      category: 'Settings',
      view: 'warehouses',
      icon: <Warehouse className="w-4 h-4 text-teal-600" />,
    },
    {
      id: 'locations',
      title: 'Locations Configuration',
      subtitle: 'Hierarchical paths (WH/Stock, WH/Output)',
      category: 'Settings',
      view: 'locations',
      icon: <MapPin className="w-4 h-4 text-teal-600" />,
    },
    ...warehouseItems,
    {
      id: 'profile',
      title: 'My Profile & Account Settings',
      subtitle: 'Update account details, security credentials, and view role permissions',
      category: 'Preferences',
      action: () => setIsProfileModalOpen(true),
      icon: <User className="w-4 h-4 text-brand-600" />,
    },
    {
      id: 'theme-toggle',
      title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: `Toggle application theme (current: ${isDark ? 'Dark' : 'Light'})`,
      category: 'Preferences',
      action: () => toggleTheme(),
      icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />,
    },
  ];

  // Filter items by search query
  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Global key listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const handleSelect = (item: PaletteItem) => {
    if (item.action) {
      item.action();
    } else if (item.view) {
      setCurrentView(item.view);
    }
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
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated overflow-hidden transition-colors">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search operations... (e.g. receipts, theme, stock)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No operations or destinations found matching "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-brand-50/80 dark:bg-brand-950/60 text-brand-900 dark:text-brand-200'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-subtle">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{item.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs font-mono">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs font-mono">↵</kbd> Select</span>
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xs font-mono">ESC</kbd> Close
          </div>
        </div>
      </div>
    </div>
  );
};
