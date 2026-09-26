import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { WarehousesApiResponse } from '../types';

export type AppView =
  | 'dashboard'
  | 'stock'
  | 'receipts'
  | 'deliveries'
  | 'transfers'
  | 'adjustments'
  | 'stock-history'
  | 'warehouses'
  | 'locations'
  | 'suppliers';

export interface WarehouseOption {
  id: number;
  name: string;
  shortCode: string;
  address?: string;
}

interface NavigationContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeWarehouse: WarehouseOption;
  setActiveWarehouse: (wh: WarehouseOption) => void;
  availableWarehouses: WarehouseOption[];
  refreshWarehouses: () => Promise<void>;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: (count: number) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ALL_WAREHOUSES_OPTION: WarehouseOption = {
  id: 0,
  name: 'All Facilities',
  shortCode: 'ALL',
};

const defaultWarehouse: WarehouseOption = {
  id: 1,
  name: 'Main Warehouse',
  shortCode: 'WH',
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeWarehouse, setActiveWarehouseState] = useState<WarehouseOption>(() => {
    try {
      const saved = localStorage.getItem('stocksense_active_warehouse');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultWarehouse;
  });
  const [availableWarehouses, setAvailableWarehouses] = useState<WarehouseOption[]>([
    ALL_WAREHOUSES_OPTION,
    defaultWarehouse,
  ]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const setActiveWarehouse = (wh: WarehouseOption) => {
    setActiveWarehouseState(wh);
    try {
      localStorage.setItem('stocksense_active_warehouse', JSON.stringify(wh));
    } catch {}
  };

  const refreshWarehouses = useCallback(async () => {
    try {
      const res = await api.get<WarehousesApiResponse>('/warehouses');
      if (res && res.data && Array.isArray(res.data)) {
        const mapped: WarehouseOption[] = res.data.map((w) => ({
          id: w.id,
          name: w.name,
          shortCode: w.short_code,
          address: w.address,
        }));
        setAvailableWarehouses([ALL_WAREHOUSES_OPTION, ...mapped]);

        // If active warehouse is not found among newly fetched and not 0, fallback
        setActiveWarehouseState((prev) => {
          if (prev.id === 0) return prev;
          const found = mapped.find((m) => m.id === prev.id);
          return found || mapped[0] || defaultWarehouse;
        });
      }
    } catch (err) {
      console.warn('[NavigationContext] Failed to load warehouses:', err);
    }
  }, []);

  useEffect(() => {
    refreshWarehouses();
  }, [refreshWarehouses]);

  // Global Ctrl+K / Cmd+K listener for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        setCurrentView,
        activeWarehouse,
        setActiveWarehouse,
        availableWarehouses,
        refreshWarehouses,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,
        unreadNotificationsCount,
        setUnreadNotificationsCount,
        isProfileModalOpen,
        setIsProfileModalOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
