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
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { currentView, setCurrentView, activeWarehouse } = useNavigation();
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs md:hidden animate-in fade-in duration-150">
      <div className="absolute inset-y-0 left-0 max-w-full flex pr-10">
        <div className="w-screen max-w-xs bg-white shadow-elevated border-r border-slate-200 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
                  <Boxes className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-slate-900">StockSense</span>
              </div>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warehouse context badge */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs text-slate-600 font-medium">
              <Warehouse className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeWarehouse.name} ({activeWarehouse.shortCode})</span>
            </div>

            {/* Links */}
            <div className="p-3 space-y-4">
              <div>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Main
                </div>
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    currentView === 'dashboard' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              </div>

              <div>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Operations
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('receipts')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'receipts' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    <span>Receipts</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('deliveries')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'deliveries' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>Deliveries</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('transfers')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'transfers' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                    <span>Internal Transfers</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('adjustments')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'adjustments' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-rose-600" />
                    <span>Stock Adjustments</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Inventory
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('stock')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'stock' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Stock Levels</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('stock-history')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'stock-history' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Stock Move History</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Configuration
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('warehouses')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'warehouses' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Warehouse className="w-4 h-4" />
                    <span>Warehouses</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('locations')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === 'locations' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
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
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-xs text-slate-900">{user?.name}</div>
                <div className="text-[10px] text-slate-500">{user?.email}</div>
              </div>
              <Badge variant="ready">{user?.role.toUpperCase()}</Badge>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
