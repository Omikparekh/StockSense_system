import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Copy } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [emailOrLoginId, setEmailOrLoginId] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrLoginId.trim()) {
      setError('Please provide your email address or Login ID.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await forgotPassword(emailOrLoginId.trim());
      setTargetEmail(res.email || emailOrLoginId.trim());
      setDevOtp(res.devOtpCode);
      if (res.devOtpCode) {
        setOtpCode(res.devOtpCode);
      }
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await resetPassword({
        email: targetEmail,
        otpCode,
        newPassword,
        confirmPassword,
      });
      setSuccessMessage('Password reset successfully. You can now log in with your new password.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 items-center justify-center text-amber-600 dark:text-amber-400 mb-1">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === 'request' ? 'Reset Your Password' : 'Enter Reset Verification Code'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 'request'
              ? 'Enter your Login ID or registered email. An OTP reset code will be generated.'
              : `Code sent to ${targetEmail}. Set your new password below.`}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 'reset' && devOtp && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200">
            <div>
              <span className="font-semibold block">Simulated Reset OTP:</span>
              <code className="text-sm font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300">{devOtp}</code>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(devOtp)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50"
            >
              <Copy className="w-3 h-3" /> Auto-fill
            </button>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input
              label="Email Address or Login ID"
              placeholder="e.g. admin or staff_alex"
              value={emailOrLoginId}
              onChange={(e) => setEmailOrLoginId(e.target.value)}
              required
              autoFocus
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="w-1/2" isLoading={loading}>
                Send Code
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                6-Digit Reset Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={() => setStep('request')}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
              <Button type="submit" className="w-1/2" isLoading={loading}>
                Set Password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
