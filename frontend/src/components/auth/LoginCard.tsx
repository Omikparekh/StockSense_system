import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Boxes, KeyRound, AlertCircle } from 'lucide-react';

interface LoginCardProps {
  onSwitchToSignup: () => void;
  onOpenForgotPassword: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  onSwitchToSignup,
  onOpenForgotPassword,
}) => {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setError('Please enter your Login ID and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(loginId.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (user: string, pass: string) => {
    setLoginId(user);
    setPassword(pass);
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-elevated p-8 sm:p-10 space-y-6 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Brand Icon & Heading matching wireframe */}
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center text-white shadow-md shadow-brand-500/20 mb-1">
          <Boxes className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign in to StockSense</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your valid Login ID and password to access the inventory console.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Login ID or Email"
          placeholder="e.g. admin or john@stocksense.io"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          autoComplete="username"
          required
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={onOpenForgotPassword}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full mt-2" size="lg" isLoading={loading}>
          Sign in
        </Button>
      </form>

      {/* Demo Credentials Helper for Multi-laptop reviewers */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
          <KeyRound className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>Instant Evaluator Credentials</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span>Admin: <code className="font-mono text-slate-900 dark:text-white font-semibold">admin</code> / <code className="font-mono text-slate-900 dark:text-white font-semibold">AdminPassword123!</code></span>
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('admin', 'AdminPassword123!')}
            className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 uppercase tracking-wider"
          >
            Auto-fill
          </button>
        </div>
      </div>

      {/* Switch to Signup */}
      <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};
