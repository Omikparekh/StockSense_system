import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { LoginCard } from './components/auth/LoginCard';
import { SignupCard } from './components/auth/SignupCard';
import { OtpVerificationModal } from './components/auth/OtpVerificationModal';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { AppShell } from './components/layout/AppShell';
import { StockView } from './components/products/StockView';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import {
  Boxes,
  ShieldCheck,
  PackagePlus,
  Truck,
  ArrowRightLeft,
  SlidersHorizontal,
  History,
  Warehouse,
  MapPin,
  Clock,
  AlertCircle,
  Plus,
  Filter,
} from 'lucide-react';

const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentView } = useNavigation();

  return (
    <div className="space-y-6">
      {/* Welcome Banner matching section 10 of prompt */}
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
            Here's what's happening with your inventory today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="ready" dot>
            Role: {user?.role.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Operational KPI Action Cards strictly from diagram wireframe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Card from wireframe */}
        <Card className="space-y-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <PackagePlus className="w-5 h-5 text-emerald-600" />
              <span>Receipts</span>
            </div>
            <Badge variant="ready">WH/IN/00001</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentView('receipts')}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              150 To Receive / Process
            </Button>

            {/* Wireframe sub-metrics */}
            <div className="space-y-1 text-xs text-slate-600 border-l border-slate-200 pl-4">
              <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: 4 operations</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span>Operations (Today): 12</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <span>Waiting: 2 vendor dispatches</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery Card from wireframe */}
        <Card className="space-y-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <Truck className="w-5 h-5 text-indigo-600" />
              <span>Deliveries</span>
            </div>
            <Badge variant="waiting">WH/OUT/00001</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentView('deliveries')}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              40 To Deliver / Dispatch
            </Button>

            {/* Wireframe sub-metrics */}
            <div className="space-y-1 text-xs text-slate-600 border-l border-slate-200 pl-4">
              <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Late: 1 operation</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span>Operations (Today): 8</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Waiting: 3 (Stock Unavailable)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Internal Transfer & Reconciliation row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span>Internal Transfers</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentView('transfers')}>
              Open Transfers
            </Button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Move inventory between warehouse locations (e.g. WH/Stock to WH/Production). Total company balance remains constant.
          </p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <SlidersHorizontal className="w-4 h-4 text-rose-600" />
              <span>Stock Adjustments</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentView('adjustments')}>
              Reconcile Count
            </Button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Directly reconcile physical stock count with system quantity and automatically commit auditable deltas.
          </p>
        </Card>
      </div>
    </div>
  );
};

const PlaceholderOperationalView: React.FC<{
  title: string;
  subtitle: string;
  codePrefix: string;
  icon: React.ReactNode;
}> = ({ title, subtitle, codePrefix, icon }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-600">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              <Badge variant="ready">{codePrefix}</Badge>
            </div>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-3.5 h-3.5 mr-1" /> Filter
          </Button>
          <Button size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Operation
          </Button>
        </div>
      </div>

      {/* Wireframe placeholder table card */}
      <Card className="p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          {icon}
        </div>
        <h3 className="font-bold text-sm text-slate-800">{title} Engine Active</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Operational workflow scaffolding loaded. Products and line items will be populated in subsequent phases.
        </p>
      </Card>
    </div>
  );
};

const ViewRouter: React.FC = () => {
  const { currentView } = useNavigation();

  switch (currentView) {
    case 'dashboard':
      return <DashboardView />;
    case 'receipts':
      return (
        <PlaceholderOperationalView
          title="Inbound Receipts"
          subtitle="Vendor delivery reception, destination bin assignment, and inventory increments"
          codePrefix="WH/IN/00001"
          icon={<PackagePlus className="w-6 h-6" />}
        />
      );
    case 'deliveries':
      return (
        <PlaceholderOperationalView
          title="Outbound Deliveries"
          subtitle="Customer dispatch, reservation evaluation, and automatic Waiting / Ready status logic"
          codePrefix="WH/OUT/00001"
          icon={<Truck className="w-6 h-6" />}
        />
      );
    case 'transfers':
      return (
        <PlaceholderOperationalView
          title="Internal Transfers"
          subtitle="Bin-to-bin and location-to-location internal shifting"
          codePrefix="WH/INT/00001"
          icon={<ArrowRightLeft className="w-6 h-6" />}
        />
      );
    case 'adjustments':
      return (
        <PlaceholderOperationalView
          title="Stock Adjustments"
          subtitle="Reconciliation of recorded vs physical counts with delta logging"
          codePrefix="WH/ADJ/00001"
          icon={<SlidersHorizontal className="w-6 h-6" />}
        />
      );
    case 'stock':
      return <StockView />;
    case 'stock-history':
      return (
        <PlaceholderOperationalView
          title="Stock Move History"
          subtitle="Auditable immutable ledger recording every item movement line by line"
          codePrefix="Audit Ledger"
          icon={<History className="w-6 h-6" />}
        />
      );
    case 'warehouses':
      return (
        <PlaceholderOperationalView
          title="Warehouses Management"
          subtitle="Multi-warehouse facilities and address configurations (Admin only)"
          codePrefix="Warehouses"
          icon={<Warehouse className="w-6 h-6" />}
        />
      );
    case 'locations':
      return (
        <PlaceholderOperationalView
          title="Locations Management"
          subtitle="Hierarchical sub-locations (WH/Stock, WH/Output, Racks)"
          codePrefix="Locations"
          icon={<MapPin className="w-6 h-6" />}
        />
      );
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
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
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
};

export default App;
