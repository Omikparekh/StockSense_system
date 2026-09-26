import React, { useState } from 'react';
import { useNavigation, AppView } from '../../context/NavigationContext';
import { AnnouncementBar } from './AnnouncementBar';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { ProfileModal } from './ProfileModal';
import { AIConstellationBackground } from '../ui/AIConstellationBackground';
import { ChevronRight } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentView, setCurrentView, isProfileModalOpen, setIsProfileModalOpen } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getBreadcrumbs = (): { label: string; view?: AppView }[] => {
    switch (currentView) {
      case 'dashboard':
        return [{ label: 'Dashboard' }];
      case 'receipts':
        return [{ label: 'Operations', view: 'dashboard' }, { label: 'Receipts' }];
      case 'suppliers':
        return [{ label: 'Operations', view: 'dashboard' }, { label: 'Suppliers & Vendors' }];
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
        return [{ label: 'Facilities', view: 'dashboard' }, { label: 'Warehouses & Products' }];
      case 'locations':
        return [{ label: 'Facilities', view: 'dashboard' }, { label: 'Storage Bins' }];
      default:
        return [{ label: 'Dashboard' }];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="relative min-h-screen bg-[#FAFAF8] dark:bg-[#050505] text-[#111111] dark:text-[#F5F5F5] flex flex-col font-sans selection:bg-[#FF5A1F] selection:text-white transition-colors duration-300 overflow-x-hidden">
      {/* Cinematic Ambient Atmosphere Lighting */}
      <div className="ambient-glow-header" />
      <div className="ambient-light-beam" />
      {/* Ambient Constellation Network Backdrop */}
      <div className="fixed top-0 right-0 w-full max-w-5xl h-96 pointer-events-none z-0 opacity-20 dark:opacity-25 overflow-hidden">
        <AIConstellationBackground height="100%" interactive={false} />
      </div>

      {/* Top Announcement Bar */}
      <AnnouncementBar onLearnMore={() => setCurrentView('dashboard')} />

      {/* Top Application Header */}
      <TopNav onToggleMobileMenu={() => setMobileMenuOpen(true)} />

      {/* Sub-header Breadcrumb Bar (rendered for deep subviews, keeping dashboard spacious and clean) */}
      {currentView !== 'dashboard' && (
        <div className="relative z-10 bg-white/60 dark:bg-[#070707]/60 backdrop-blur-md border-b border-black/[0.04] dark:border-white/[0.06] py-2.5 px-4 sm:px-6 lg:px-8 shadow-2xs transition-colors duration-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <nav className="flex items-center space-x-2 text-xs text-[#666666] dark:text-[#A5A5A5]">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#505050]" />}
                  {crumb.view ? (
                    <button
                      onClick={() => setCurrentView(crumb.view!)}
                      className="hover:text-[#FF5A1F] dark:hover:text-[#FF8A4C] transition-colors font-medium"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>
      )}


      {/* Page Content Viewport */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        {children}
      </main>

      {/* Slide-over Mobile Navigation */}
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Notifications Drawer */}
      <NotificationDrawer />

      {/* User Profile Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};
