import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { LoginCard } from './components/auth/LoginCard';
import { SignupCard } from './components/auth/SignupCard';
import { OtpVerificationModal } from './components/auth/OtpVerificationModal';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { AppShell } from './components/layout/AppShell';
import { StockView } from './components/products/StockView';
import { WarehouseView } from './components/warehouses/WarehouseView';
import { ReceiptsView } from './components/operations/ReceiptsView';
import { DeliveriesView } from './components/operations/DeliveriesView';
import { TransfersView } from './components/operations/TransfersView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { DashboardView } from './components/dashboard/DashboardView';
import { StockHistoryView } from './components/history/StockHistoryView';
import { AdjustmentsView } from './components/history/AdjustmentsView';
import { Boxes } from 'lucide-react';

const ViewRouter: React.FC = () => {
  const { currentView } = useNavigation();

  switch (currentView) {
    case 'dashboard':
      return <DashboardView />;
    case 'receipts':
      return <ReceiptsView />;
    case 'suppliers':
      return <SuppliersView />;
    case 'deliveries':
      return <DeliveriesView />;
    case 'transfers':
      return <TransfersView />;
    case 'adjustments':
      return <AdjustmentsView />;
    case 'stock':
      return <StockView />;
    case 'stock-history':
      return <StockHistoryView />;
    case 'warehouses':
    case 'locations':
      return <WarehouseView />;
    default:
      return <DashboardView />;
  }
};

const AuthScreen: React.FC = () => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);

  const handleOtpRequired = (email: string, devOtpCode?: string) => {
    setPendingEmail(email);
    setDevOtp(devOtpCode);
    setOtpModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-slate-50 to-slate-50 dark:from-indigo-950/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Auth Screen Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {view === 'login' ? (
          <LoginCard
            onSwitchToSignup={() => setView('signup')}
            onOpenForgotPassword={() => setForgotPasswordOpen(true)}
          />
        ) : (
          <SignupCard
            onSwitchToLogin={() => setView('login')}
            onOtpRequired={handleOtpRequired}
          />
        )}
      </div>

      <OtpVerificationModal
        email={pendingEmail}
        purpose="signup"
        devOtpCode={devOtp}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
      />

      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        onSuccess={() => setView('login')}
      />
    </div>
  );
};

export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
            <Boxes className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Loading StockSense...
          </p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <AppShell>
      <ViewRouter />
    </AppShell>
  ) : (
    <AuthScreen />
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
