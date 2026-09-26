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
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#070707]/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.35)] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand & Main ERP Navigation Tabs */}
        <div className="flex items-center gap-3 xl:gap-6 shrink-0">
          {/* Logo */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A1F] via-[#FF6A2A] to-[#FF8A4C] flex items-center justify-center text-black font-extrabold shadow-[0_0_20px_rgba(255,90,31,0.35)] group-hover:shadow-[0_0_28px_rgba(255,90,31,0.55)] group-hover:scale-105 transition-all duration-300">
              <Boxes className="w-5 h-5 text-black stroke-[2.4]" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-950 dark:text-[#F5F5F5] group-hover:text-white transition-colors">
                StockSense
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#FF5A1F]/15 text-[#FF8A4C] border border-[#FF5A1F]/30 text-[9px] font-mono font-black uppercase tracking-widest shadow-2xs">
                AI
              </span>
            </div>
          </div>

          {/* Desktop Nav Rail (Visible on lg 1024px and above) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.07] shadow-2xs shrink-0">
            {/* 1. Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`relative h-8 px-2.5 xl:px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                currentView === 'dashboard'
                  ? 'bg-white dark:bg-[#181818] text-slate-950 dark:text-[#F5F5F5] font-bold shadow-xs border border-black/[0.06] dark:border-white/[0.1]'
                  : 'text-[#666666] dark:text-[#909090] hover:text-black dark:hover:text-[#F5F5F5] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              }`}
            >
              {currentView === 'dashboard' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_#FF5A1F]" />
              )}
              <span>Dashboard</span>
            </button>

            {/* 2. Operations Dropdown */}
            <div className="relative shrink-0" ref={operationsRef}>
              <button
                onClick={() => {
                  setIsOperationsOpen((prev) => !prev);
                  setIsSettingsOpen(false);
                }}
                className={`relative h-8 px-2.5 xl:px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                  isOperationActive
                    ? 'bg-white dark:bg-[#181818] text-slate-950 dark:text-[#F5F5F5] font-bold shadow-xs border border-black/[0.06] dark:border-white/[0.1]'
                    : 'text-[#666666] dark:text-[#909090] hover:text-black dark:hover:text-[#F5F5F5] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                {isOperationActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_#FF5A1F]" />
                )}
                <span>Operations</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isOperationsOpen ? 'rotate-180 text-[#FF5A1F]' : ''}`} />
              </button>

              {isOperationsOpen && (
                <div className="absolute left-0 top-full mt-2 w-68 bg-white/95 dark:bg-[#101010]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-2xl p-1.5 z-50 animate-scale-in">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#707070] border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
                    Logistics & Audits
                  </div>
                  <button
                    onClick={() => handleNavClick('receipts')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Receipts</div>
                      <div className="text-[10px] text-[#888888] dark:text-[#707070]">Inbound vendor stock (WH/IN/...)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('suppliers')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Suppliers & Vendors</div>
                      <div className="text-[10px] text-[#888888] dark:text-[#707070]">Partner procurement directory</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('deliveries')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Deliveries</div>
                      <div className="text-[10px] text-[#888888] dark:text-[#707070]">Outbound customer dispatch (WH/OUT/...)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('transfers')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Internal Transfers</div>
                      <div className="text-[10px] text-[#888888] dark:text-[#707070]">Inter-bin balance (WH/INT/...)</div>
                    </div>
                  </button>

                  <div className="border-t border-black/[0.06] dark:border-white/[0.08] my-1" />

                  <button
                    onClick={() => handleNavClick('adjustments')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Stock Adjustments</div>
                      <div className="text-[10px] text-[#888888] dark:text-[#707070]">Audit counts & gains/loss</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Stock */}
            <button
              onClick={() => handleNavClick('stock')}
              className={`relative h-8 px-2.5 xl:px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                currentView === 'stock'
                  ? 'bg-white dark:bg-[#181818] text-slate-950 dark:text-[#F5F5F5] font-bold shadow-xs border border-black/[0.06] dark:border-white/[0.1]'
                  : 'text-[#666666] dark:text-[#909090] hover:text-black dark:hover:text-[#F5F5F5] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              }`}
            >
              {currentView === 'stock' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_#FF5A1F]" />
              )}
              <span>Stock</span>
            </button>

            {/* 4. Stock History (responsive label) */}
            <button
              onClick={() => handleNavClick('stock-history')}
              className={`relative h-8 px-2.5 xl:px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                currentView === 'stock-history'
                  ? 'bg-white dark:bg-[#181818] text-slate-950 dark:text-[#F5F5F5] font-bold shadow-xs border border-black/[0.06] dark:border-white/[0.1]'
                  : 'text-[#666666] dark:text-[#909090] hover:text-black dark:hover:text-[#F5F5F5] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              }`}
            >
              {currentView === 'stock-history' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_#FF5A1F]" />
              )}
              <span className="hidden xl:inline">Stock History</span>
              <span className="xl:hidden">History</span>
            </button>

            {/* 5. Settings / Facilities Dropdown */}
            <div className="relative shrink-0" ref={settingsRef}>
              <button
                onClick={() => {
                  setIsSettingsOpen((prev) => !prev);
                  setIsOperationsOpen(false);
                }}
                className={`relative h-8 px-2.5 xl:px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                  isSettingsActive
                    ? 'bg-white dark:bg-[#181818] text-slate-950 dark:text-[#F5F5F5] font-bold shadow-xs border border-black/[0.06] dark:border-white/[0.1]'
                    : 'text-[#666666] dark:text-[#909090] hover:text-black dark:hover:text-[#F5F5F5] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                {isSettingsActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_#FF5A1F]" />
                )}
                <span>Facilities</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180 text-[#FF5A1F]' : ''}`} />
              </button>

              {isSettingsOpen && (
                <div className="absolute left-0 top-full mt-2 w-60 bg-white/95 dark:bg-[#101010]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-2xl p-1.5 z-50 animate-scale-in">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#707070] border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
                    Facility Hierarchy
                  </div>
                  <button
                    onClick={() => handleNavClick('warehouses')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <Warehouse className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Warehouses & Products</div>
                      <div className="text-[10px] text-[#888888] dark:text-[#707070]">Facility locations & quotas</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('locations')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-[#A5A5A5] shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Storage Bins</div>
                      <div className="text-[10px] text-[#888888] dark:text-[#707070]">Compound aisle/rack/shelf codes</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
          {/* Quick Search Shortcut Command Bar */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center justify-center gap-2 h-9 px-2.5 xl:px-3 bg-black/[0.03] dark:bg-[#121212] hover:bg-black/[0.06] dark:hover:bg-[#171717] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#FF5A1F]/40 rounded-xl transition-all duration-200 text-xs text-[#707070] dark:text-[#A5A5A5] shadow-xs group shrink-0"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-[#707070] group-hover:text-[#FF5A1F] transition-colors shrink-0" />
            <span className="hidden xl:inline font-medium text-[#707070] dark:text-[#A5A5A5] group-hover:text-[#111111] dark:group-hover:text-[#F5F5F5] transition-colors">
              Search ERP...
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-[#888888] dark:text-[#A5A5A5] bg-black/[0.04] dark:bg-[#181818] border border-black/[0.08] dark:border-white/[0.1] rounded-md shadow-2xs font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Active Warehouse Dropdown Switcher */}
          <div className="relative hidden sm:block shrink-0" ref={warehouseDropdownRef}>
            <button
              onClick={() => setIsWarehouseDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 sm:gap-2 h-9 px-2.5 xl:px-3 bg-black/[0.03] dark:bg-[#121212] hover:bg-black/[0.06] dark:hover:bg-[#171717] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#FF5A1F]/40 rounded-xl text-xs font-medium text-slate-800 dark:text-[#F5F5F5] transition-all duration-200 shadow-xs group shrink-0"
              title="Switch Active Facility / Warehouse"
            >
              <Warehouse className="w-3.5 h-3.5 text-[#FF5A1F] group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-semibold max-w-[120px] truncate text-slate-900 dark:text-[#F5F5F5] hidden xl:inline">
                {activeWarehouse.name}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[10px] font-mono font-bold text-[#FF8A4C]">
                {activeWarehouse.shortCode}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#707070] group-hover:text-[#A5A5A5] transition-transform duration-200 shrink-0 ${isWarehouseDropdownOpen ? 'rotate-180 text-[#FF5A1F]' : ''}`} />
            </button>

            {isWarehouseDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-68 bg-white/95 dark:bg-[#101010]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] rounded-2xl shadow-2xl p-1.5 z-50 animate-scale-in">
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#707070] flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
                  <span>Switch Facility Scope</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06]">{availableWarehouses.length} locations</span>
                </div>
                <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                  {availableWarehouses.map((wh) => {
                    const isSelected = activeWarehouse.id === wh.id;
                    return (
                      <button
                        key={wh.id}
                        onClick={() => {
                          setActiveWarehouse(wh);
                          setIsWarehouseDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-[#FF5A1F]/15 text-[#FF8A4C] font-bold border border-[#FF5A1F]/30'
                            : 'text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                          ) : (
                            <Warehouse className="w-3.5 h-3.5 text-[#707070] shrink-0" />
                          )}
                          <span className="truncate">{wh.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          isSelected
                            ? 'bg-[#FF5A1F]/20 text-[#FF8A4C] font-bold'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#707070]'
                        }`}>
                          {wh.shortCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-black/[0.06] dark:border-white/[0.08] mt-1 pt-1 px-1">
                  <button
                    onClick={() => {
                      setIsWarehouseDropdownOpen(false);
                      handleNavClick('warehouses');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-[#FF8A4C] hover:underline"
                  >
                    <span>Manage all facilities &rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Light / Dark Mode Toggle */}
          <div className="shrink-0">
            <ThemeToggle />
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/[0.03] dark:bg-[#121212] hover:bg-black/[0.06] dark:hover:bg-[#171717] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#FF5A1F]/30 text-[#707070] dark:text-[#A5A5A5] hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-all relative shadow-xs shrink-0"
            title="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF5A1F] ring-2 ring-white dark:ring-[#121212] shadow-[0_0_6px_#FF5A1F] animate-pulse" />
            )}
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 hidden sm:block shrink-0" />

          {/* User Profile Dropdown */}
          <div className="relative shrink-0" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 h-9 px-1.5 xl:px-2.5 bg-black/[0.03] dark:bg-[#121212] hover:bg-black/[0.06] dark:hover:bg-[#171717] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#FF5A1F]/30 rounded-xl transition-all shadow-xs group shrink-0"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#FF5A1F] to-[#FF8A4C] flex items-center justify-center text-black font-extrabold text-[11px] shadow-[0_0_8px_rgba(255,90,31,0.35)] shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden xl:block text-left text-xs leading-none">
                <div className="font-semibold text-slate-900 dark:text-[#F5F5F5] truncate max-w-[95px]">
                  {user?.name}
                </div>
                <div className="text-[9px] font-mono font-bold text-[#FF8A4C] uppercase tracking-wider mt-0.5">
                  {user?.role.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#707070] group-hover:text-[#A5A5A5] transition-transform duration-200 shrink-0 ${isProfileOpen ? 'rotate-180 text-[#FF5A1F]' : ''}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-[#101010]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] rounded-2xl shadow-2xl p-2 z-50 animate-scale-in">
                <div className="px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="font-semibold text-xs text-slate-900 dark:text-[#F5F5F5]">{user?.name}</div>
                  <div className="text-[11px] text-[#888888] dark:text-[#707070] truncate">{user?.email}</div>
                  <div className="mt-1.5">
                    <Badge variant="ai">{user?.role.toUpperCase()}</Badge>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#F5F5F5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-[#FF5A1F]" />
                    <span>My Profile & Account</span>
                  </button>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu (Visible on < lg, i.e. mobile and tablet) */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-black/[0.03] dark:bg-[#121212] hover:bg-black/[0.06] dark:hover:bg-[#171717] border border-black/[0.08] dark:border-white/[0.1] text-[#707070] dark:text-[#A5A5A5] hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-all shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
