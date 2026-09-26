import React from 'react';
import { useNavigation, AppView } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  LayoutDashboard,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  SlidersHorizontal,
  Boxes,
  History,
  Warehouse,
  MapPin,
  LogOut,
  Building2,
  User,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ThemeToggle } from '../ui/ThemeToggle';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const {
    currentView,
    setCurrentView,
    activeWarehouse,
    setActiveWarehouse,
    availableWarehouses,
    setIsProfileModalOpen,
  } = useNavigation();
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md md:hidden animate-in fade-in duration-200">
      <div className="absolute inset-y-0 left-0 max-w-full flex pr-10">
        <div className="w-screen max-w-xs bg-white dark:bg-[#0D0D0D] shadow-2xl border-r border-slate-200 dark:border-white/[0.08] flex flex-col justify-between transition-colors duration-200">
          <div>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-black font-extrabold text-sm shadow-[0_0_15px_rgba(255,90,31,0.3)]">
                  <Boxes className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-slate-900 dark:text-[#F5F5F5]">StockSense</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F5F5] rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warehouse switcher dropdown */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-white/[0.08] space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#707070]">
                Active Facility
              </label>
              <div className="relative">
                <select
                  value={activeWarehouse.id}
                  onChange={(e) => {
                    const selected = availableWarehouses.find(w => w.id === Number(e.target.value));
                    if (selected) setActiveWarehouse(selected);
                  }}
                  className="w-full h-9 pl-8 pr-3 text-xs font-semibold bg-white dark:bg-[#0E0E0E] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-800 dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {availableWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.shortCode})
                    </option>
                  ))}
                </select>
                <Warehouse className="w-3.5 h-3.5 text-brand-500 absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Links */}
            <div className="p-3 space-y-4">
              {/* Dashboard */}
              <div>
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentView === 'dashboard'
                      ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              </div>

              {/* Operations */}
              <div>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#707070]">
                  Operations
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('receipts')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'receipts'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-500" />
                    <span>Receipts (WH/IN/...)</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('suppliers')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'suppliers'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <span>Suppliers & Vendors</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('deliveries')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'deliveries'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-indigo-400" />
                    <span>Deliveries (WH/OUT/...)</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('transfers')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'transfers'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <span>Internal Transfers (WH/INT/...)</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('adjustments')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'adjustments'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-rose-400" />
                    <span>Stock Adjustments</span>
                  </button>
                </div>
              </div>

              {/* Inventory */}
              <div>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#707070]">
                  Inventory
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('stock')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'stock'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Stock Levels</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('stock-history')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'stock-history'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Move History</span>
                  </button>
                </div>
              </div>

              {/* Settings */}
              <div>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#707070]">
                  Configuration
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('warehouses')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'warehouses'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Warehouse className="w-4 h-4" />
                    <span>Warehouses</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('locations')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentView === 'locations'
                        ? 'bg-brand-500/10 text-brand-500 font-bold border border-brand-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Locations</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User profile footer */}
          <div className="p-4 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#121212]">
            {/* Theme Toggle row */}
            <div className="flex items-center justify-between py-2 px-1 mb-3 border-b border-slate-200 dark:border-white/[0.06] text-xs">
              <span className="text-slate-600 dark:text-[#A5A5A5] font-medium">Appearance</span>
              <ThemeToggle showLabel />
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-xs text-slate-900 dark:text-[#F5F5F5]">{user?.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#707070]">{user?.email}</div>
              </div>
              <Badge variant="ready">{user?.role.toUpperCase()}</Badge>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsProfileModalOpen(true);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-[#F5F5F5] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl transition-colors"
              >
                <User className="w-3.5 h-3.5 text-brand-500" />
                <span>My Profile & Account</span>
              </button>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
