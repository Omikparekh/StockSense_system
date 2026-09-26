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
  Building2,
  User,
  Check,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ThemeToggle } from '../ui/ThemeToggle';

interface TopNavProps {
  onToggleMobileMenu: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const {
    currentView,
    setCurrentView,
    activeWarehouse,
    setActiveWarehouse,
    availableWarehouses,
    setIsCommandPaletteOpen,
    setIsNotificationsOpen,
    unreadNotificationsCount,
    setIsProfileModalOpen,
  } = useNavigation();

  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);

  const operationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const warehouseDropdownRef = useRef<HTMLDivElement>(null);

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
      if (warehouseDropdownRef.current && !warehouseDropdownRef.current.contains(event.target as Node)) {
        setIsWarehouseDropdownOpen(false);
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

  const isOperationActive = ['receipts', 'deliveries', 'transfers', 'adjustments', 'suppliers'].includes(currentView);
  const isSettingsActive = ['warehouses', 'locations'].includes(currentView);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-subtle transition-colors duration-200">
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
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">StockSense</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {/* 1. Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
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
                    ? 'bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>Operations</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isOperationsOpen && (
                <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-elevated py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => handleNavClick('receipts')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    <div className="text-left">
                      <div className="font-semibold">Receipts</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Inbound orders (WH/IN/...)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('suppliers')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Building2 className="w-4 h-4 text-teal-600" />
                    <div className="text-left">
                      <div className="font-semibold">Suppliers & Vendors</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Partner directory & procurement</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('deliveries')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <div className="text-left">
                      <div className="font-semibold">Deliveries</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Outbound dispatch (WH/OUT/...)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('transfers')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                    <div className="text-left">
                      <div className="font-semibold">Internal Transfers</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Location balance (WH/INT/...)</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={() => handleNavClick('adjustments')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-rose-600" />
                    <div className="text-left">
                      <div className="font-semibold">Stock Adjustments</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Reconcile counts (WH/ADJ/...)</div>
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
                  ? 'bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              Stock
            </button>

            {/* 4. Stock History */}
            <button
              onClick={() => handleNavClick('stock-history')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentView === 'stock-history'
                  ? 'bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
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
                    ? 'bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>Settings</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isSettingsOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-elevated py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Configuration
                  </div>
                  <button
                    onClick={() => handleNavClick('warehouses')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Warehouse className="w-4 h-4 text-slate-500" />
                    <span>Warehouses</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('locations')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
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
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search Shortcut */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search operations...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Active Warehouse Dropdown Switcher */}
          <div className="relative hidden lg:block" ref={warehouseDropdownRef}>
            <button
              onClick={() => setIsWarehouseDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-2xs group"
              title="Switch Active Facility / Warehouse"
            >
              <Warehouse className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {activeWarehouse.name}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-750 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                {activeWarehouse.shortCode}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {isWarehouseDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-elevated py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Switch Facility</span>
                  <span className="font-mono text-[9px]">{availableWarehouses.length} options</span>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {availableWarehouses.map((wh) => {
                    const isSelected = activeWarehouse.id === wh.id;
                    return (
                      <button
                        key={wh.id}
                        onClick={() => {
                          setActiveWarehouse(wh);
                          setIsWarehouseDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                          ) : (
                            <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{wh.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          isSelected 
                            ? 'bg-brand-200/60 dark:bg-brand-800 text-brand-800 dark:text-brand-200' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {wh.shortCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-1">
                  <button
                    onClick={() => {
                      setIsWarehouseDropdownOpen(false);
                      handleNavClick('warehouses');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    <span>Manage all facilities &rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative border-l border-slate-200 dark:border-slate-800 pl-3" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-xs">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">{user?.name}</div>
                <div className="text-[10px] font-mono text-brand-600 dark:text-brand-400 capitalize">
                  {user?.role.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-elevated py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
                  <div className="mt-1">
                    <Badge variant="ready">{user?.role.toUpperCase()}</Badge>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4 text-brand-600" />
                    <span>My Profile & Account</span>
                  </button>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
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
            className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
