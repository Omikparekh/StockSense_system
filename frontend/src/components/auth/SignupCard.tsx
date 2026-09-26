import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Boxes, AlertCircle } from 'lucide-react';

interface SignupCardProps {
  onSwitchToLogin: () => void;
  onOtpRequired: (email: string, devOtpCode?: string) => void;
}

export const SignupCard: React.FC<SignupCardProps> = ({
  onSwitchToLogin,
  onOtpRequired,
}) => {
  const { signup } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'warehouse_staff' | 'inventory_manager'>('warehouse_staff');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await signup({
        loginId: loginId.trim(),
        email: email.trim(),
        name: name.trim() || loginId.trim(),
        password,
        confirmPassword,
        role,
      });

      if (res.requiresOtp) {
        onOtpRequired(res.email, res.devOtpCode);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#101010] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-elevated dark:shadow-glow-orange/5 p-8 sm:p-10 space-y-6 text-slate-900 dark:text-slate-100 transition-colors relative z-10 backdrop-blur-md">
      {/* Brand Icon & Heading matching wireframe */}
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-amber-500 items-center justify-center text-slate-950 font-bold shadow-glow-orange mb-1">
          <Boxes className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create an Account</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your details below. A 6-digit OTP will be dispatched to verify your email.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Enter Login ID"
          placeholder="e.g. jmiller or staff_alex"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          required
        />

        <Input
          label="Enter Email ID"
          type="email"
          placeholder="e.g. alex@stocksense.io"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Full Name (Optional)"
          placeholder="e.g. Alex Henderson"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Operational Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('warehouse_staff')}
              className={`p-2.5 text-xs font-medium rounded-xl border text-left transition-all ${
                role === 'warehouse_staff'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-semibold ring-1 ring-brand-500/50'
                  : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#151515] hover:border-slate-300 dark:hover:border-white/[0.15] text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="font-bold">Warehouse Staff</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Receipts & pick/pack operations</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('inventory_manager')}
              className={`p-2.5 text-xs font-medium rounded-xl border text-left transition-all ${
                role === 'inventory_manager'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-semibold ring-1 ring-brand-500/50'
                  : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#151515] hover:border-slate-300 dark:hover:border-white/[0.15] text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="font-bold">Inventory Manager</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Transfers, audits & reorders</div>
            </button>
          </div>
        </div>

        <Input
          label="Enter Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full mt-2" size="lg" isLoading={loading}>
          Sign up
        </Button>
      </form>

      {/* Switch to Sign in */}
      <div className="text-center pt-2 border-t border-slate-100 dark:border-white/[0.06]">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-brand-500 dark:text-brand-400 hover:text-brand-400 dark:hover:text-brand-300 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
