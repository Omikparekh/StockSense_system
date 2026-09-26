import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppView =
  | 'dashboard'
  | 'stock'
  | 'receipts'
  | 'deliveries'
  | 'transfers'
  | 'adjustments'
  | 'stock-history'
  | 'warehouses'
  | 'locations';

export interface WarehouseOption {
  id: number;
  name: string;
  shortCode: string;
}

interface NavigationContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeWarehouse: WarehouseOption;
  setActiveWarehouse: (wh: WarehouseOption) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: (count: number) => void;
}

const defaultWarehouse: WarehouseOption = {
  id: 1,
  name: 'Main Warehouse',
  shortCode: 'WH',
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeWarehouse, setActiveWarehouse] = useState<WarehouseOption>(defaultWarehouse);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3);

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
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,
        unreadNotificationsCount,
        setUnreadNotificationsCount,
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
