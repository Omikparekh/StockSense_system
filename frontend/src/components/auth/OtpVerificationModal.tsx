import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Mail, CheckCircle2, AlertCircle, Copy } from 'lucide-react';

interface OtpVerificationModalProps {
  email: string;
  purpose: 'signup' | 'password_reset';
  devOtpCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  email,
  purpose,
  devOtpCode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { verifyOtp } = useAuth();
  const [otpCode, setOtpCode] = useState(devOtpCode || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyOtp(email, otpCode, purpose);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDevOtp = () => {
    if (devOtpCode) {
      setOtpCode(devOtpCode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 items-center justify-center text-brand-600 dark:text-brand-400 mb-1">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Email Verification Required</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A 6-digit security code was dispatched to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>
          </p>
        </div>

        {/* Development simulation banner */}
        {devOtpCode && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200">
            <div>
              <span className="font-semibold block">Simulated OTP Code:</span>
              <code className="text-sm font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300">{devOtpCode}</code>
            </div>
            <button
              type="button"
              onClick={handleUseDevOtp}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50"
            >
              <Copy className="w-3 h-3" /> Auto-fill
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 text-center">
              6-Digit OTP Code
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="••••••"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[0.5em] text-2xl font-mono py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="w-1/2" isLoading={loading}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Verify OTP
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
