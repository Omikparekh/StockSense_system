import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginCard } from './components/auth/LoginCard';
import { SignupCard } from './components/auth/SignupCard';
import { OtpVerificationModal } from './components/auth/OtpVerificationModal';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { Badge } from './components/ui/Badge';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import {
  Boxes,
  LogOut,
  ShieldCheck,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  Warehouse,
} from 'lucide-react';

const AuthenticatedDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">StockSense</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 rounded">
                  Phase 2 — Auth & Roles
                </span>
              </div>
              <p className="text-xs text-slate-500">Centralized SaaS Inventory Platform</p>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs">
              <Warehouse className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium">Main Warehouse (WH)</span>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xs">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <div className="font-semibold text-slate-900 leading-tight">{user?.name}</div>
                <div className="text-[11px] font-mono text-brand-600 capitalize">
                  {user?.role.replace('_', ' ')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-slate-500 hover:text-rose-600"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authenticated Session Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Good morning, {user?.name}
            </h1>
            <p className="text-sm text-slate-600">
              Here is what is happening with your warehouse inventory today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="ready" dot>
              Role: {user?.role.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Operational Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <PackagePlus className="w-4 h-4 text-emerald-600" />
                <h3>Receipts (Inbound)</h3>
              </div>
              <Badge variant="ready">WH/IN/00001</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Vendor delivery acceptance with atomic inventory increments and move ledger updates.
            </p>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Truck className="w-4 h-4 text-indigo-600" />
                <h3>Deliveries (Outbound)</h3>
              </div>
              <Badge variant="waiting">WH/OUT/00001</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Customer dispatch with automated stock availability checks (Ready vs Waiting).
            </p>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                <h3>Internal Transfers</h3>
              </div>
              <Badge variant="neutral">WH/INT/00001</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Location-to-location shifting (e.g. WH/Stock to WH/Production) with net company neutrality.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-slate-50 to-slate-50 pointer-events-none" />

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

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        email={pendingEmail}
        purpose="signup"
        devOtpCode={devOtp}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
      />

      {/* Forgot Password Modal */}
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
            <Boxes className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading StockSense...
          </p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedDashboard /> : <AuthScreen />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
