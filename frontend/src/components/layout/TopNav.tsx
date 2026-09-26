import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, AppView } from '../../context/NavigationContext';
import {
  Boxes,
  ChevronDown,
  Search,
  Bell,
  Warehouse,
  LogOut,
  Menu,
  SlidersHorizontal,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  MapPin,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface TopNavProps {
  onToggleMobileMenu: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const {
    currentView,
    setCurrentView,
    activeWarehouse,
    setIsCommandPaletteOpen,
    setIsNotificationsOpen,
    unreadNotificationsCount,
  } = useNavigation();

  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const operationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (operationsRef.current && !operationsRef.current.contains(event.target as Node)) {
        setIsOperationsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    setIsOperationsOpen(false);
    setIsSettingsOpen(false);
    setIsProfileOpen(false);
  };

  const isOperationActive = ['receipts', 'deliveries', 'transfers', 'adjustments'].includes(currentView);
  const isSettingsActive = ['warehouses', 'locations'].includes(currentView);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Main ERP Navigation Tabs (Matching Wireframe) */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">StockSense</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {/* 1. Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-slate-100 text-brand-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>

            {/* 2. Operations Dropdown */}
            <div className="relative" ref={operationsRef}>
              <button
                onClick={() => {
                  setIsOperationsOpen((prev) => !prev);
                  setIsSettingsOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isOperationActive
                    ? 'bg-slate-100 text-brand-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Operations</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isOperationsOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-elevated py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => handleNavClick('receipts')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    <div className="text-left">
                      <div className="font-semibold">Receipts</div>
                      <div className="text-[10px] text-slate-400">Inbound orders (WH/IN/...)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('deliveries')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <div className="text-left">
                      <div className="font-semibold">Deliveries</div>
                      <div className="text-[10px] text-slate-400">Outbound dispatch (WH/OUT/...)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('transfers')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                    <div className="text-left">
                      <div className="font-semibold">Internal Transfers</div>
                      <div className="text-[10px] text-slate-400">Location balance (WH/INT/...)</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={() => handleNavClick('adjustments')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-rose-600" />
                    <div className="text-left">
                      <div className="font-semibold">Stock Adjustments</div>
                      <div className="text-[10px] text-slate-400">Reconcile counts (WH/ADJ/...)</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Stock */}
            <button
              onClick={() => handleNavClick('stock')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentView === 'stock'
                  ? 'bg-slate-100 text-brand-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Stock
            </button>

            {/* 4. Stock History */}
            <button
              onClick={() => handleNavClick('stock-history')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentView === 'stock-history'
                  ? 'bg-slate-100 text-brand-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Stock History
            </button>

            {/* 5. Settings Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => {
                  setIsSettingsOpen((prev) => !prev);
                  setIsOperationsOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isSettingsActive
                    ? 'bg-slate-100 text-brand-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Settings</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isSettingsOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-elevated py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Configuration
                  </div>
                  <button
                    onClick={() => handleNavClick('warehouses')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Warehouse className="w-4 h-4 text-slate-500" />
                    <span>Warehouses</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('locations')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>Locations</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Search Shortcut */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search operations...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Active Warehouse Tag */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
            <Warehouse className="w-3.5 h-3.5 text-slate-400" />
            <span>{activeWarehouse.name} ({activeWarehouse.shortCode})</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative border-l border-slate-200 pl-3" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xs">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <div className="font-semibold text-slate-900 leading-tight">{user?.name}</div>
                <div className="text-[10px] font-mono text-brand-600 capitalize">
                  {user?.role.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-elevated py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="font-semibold text-xs text-slate-900">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                  <div className="mt-1">
                    <Badge variant="ready">{user?.role.toUpperCase()}</Badge>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
