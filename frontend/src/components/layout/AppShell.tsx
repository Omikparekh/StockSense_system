import React, { useState } from 'react';
import { useNavigation, AppView } from '../../context/NavigationContext';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { ChevronRight } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentView, setCurrentView } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getBreadcrumbs = (): { label: string; view?: AppView }[] => {
    switch (currentView) {
      case 'dashboard':
        return [{ label: 'Dashboard' }];
      case 'receipts':
        return [{ label: 'Operations', view: 'dashboard' }, { label: 'Receipts' }];
      case 'deliveries':
        return [{ label: 'Operations', view: 'dashboard' }, { label: 'Deliveries' }];
      case 'transfers':
        return [{ label: 'Operations', view: 'dashboard' }, { label: 'Internal Transfers' }];
      case 'adjustments':
        return [{ label: 'Operations', view: 'dashboard' }, { label: 'Stock Adjustments' }];
      case 'stock':
        return [{ label: 'Inventory', view: 'dashboard' }, { label: 'Stock Levels' }];
      case 'stock-history':
        return [{ label: 'Inventory', view: 'dashboard' }, { label: 'Stock Move History' }];
      case 'warehouses':
        return [{ label: 'Settings', view: 'dashboard' }, { label: 'Warehouses' }];
      case 'locations':
        return [{ label: 'Settings', view: 'dashboard' }, { label: 'Locations' }];
      default:
        return [{ label: 'Dashboard' }];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Application Header */}
      <TopNav onToggleMobileMenu={() => setMobileMenuOpen(true)} />

      {/* Sub-header Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/80 py-2 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center space-x-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                {crumb.view ? (
                  <button
                    onClick={() => setCurrentView(crumb.view!)}
                    className="hover:text-brand-600 transition-colors font-medium"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-800">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      {/* Page Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Slide-over Mobile Navigation */}
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Notifications Drawer */}
      <NotificationDrawer />
    </div>
  );
};
