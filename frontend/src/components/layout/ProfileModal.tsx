import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { api, ApiError } from '../../services/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  X,
  User,
  Shield,
  KeyRound,
  Building,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { activeWarehouse, availableWarehouses, setActiveWarehouse } = useNavigation();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'permissions'>('profile');

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      const res = await api.put<any>('/auth/profile', {
        name: name.trim(),
        email: email.trim(),
      });
      setProfileSuccess(res.message || 'Profile updated successfully.');
      // Update local storage user if needed
      try {
        const stored = localStorage.getItem('stocksense_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.name = name.trim();
          parsed.email = email.trim();
          localStorage.setItem('stocksense_user', JSON.stringify(parsed));
        }
      } catch {}
    } catch (err: any) {
      if (err instanceof ApiError) {
        setProfileError(err.message);
      } else {
        setProfileError('Failed to update profile information.');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await api.put<any>('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Failed to update password. Please check your current password.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50/80 dark:bg-[#161616] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-base shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5]">
                  {user?.name || 'User Account'}
                </h3>
                <Badge variant="ready">{user?.role.toUpperCase()}</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#A5A5A5] mt-0.5">
                Login ID: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{user?.loginId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F5F5] rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 border-b border-slate-200 dark:border-white/[0.08] flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'profile'
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-[#F5F5F5]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'security'
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-[#F5F5F5]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Security & Password</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-3.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'permissions'
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-[#F5F5F5]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role Permissions</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start space-x-2 text-emerald-800 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1.5">
                    Login ID (Immutable System Username)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.loginId || ''}
                    className="w-full h-10 px-3.5 bg-slate-100 dark:bg-[#161616] border border-slate-200 dark:border-white/[0.06] rounded-xl text-slate-500 dark:text-slate-400 font-mono text-sm cursor-not-allowed"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-[#707070] mt-1.5 block">
                    Permanent username used for audit ledger logging and authentication.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Henderson"
                    className="w-full h-10 px-3.5 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex@stocksense.io"
                    className="w-full h-10 px-3.5 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                </div>

                {/* Active Facility Context */}
                <div className="p-4 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/[0.08] rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-[#F5F5F5] uppercase tracking-wider flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1.5 text-brand-500" />
                      Active Warehouse Facility
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/20">
                      {activeWarehouse.shortCode}
                    </span>
                  </div>
                  <select
                    value={activeWarehouse.id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const found = availableWarehouses.find((w) => w.id === id);
                      if (found) setActiveWarehouse(found);
                    }}
                    className="w-full h-9 px-3 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {availableWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.shortCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button type="submit" isLoading={profileLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start space-x-2 text-emerald-800 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1.5">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-10 px-3.5 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1.5">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3.5 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A5A5A5] uppercase tracking-wider mb-1.5">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3.5 border border-slate-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#0E0E0E] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button type="submit" isLoading={passwordLoading}>
                  Update Password
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4 text-xs">
              <div className="p-5 bg-slate-50 dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-brand-500" />
                  <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">
                    Assigned Role: <span className="uppercase text-brand-500">{user?.role}</span>
                  </span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-white/[0.06] text-slate-600 dark:text-slate-300">
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Inbound Receipts Validation (WH/IN/...)</span>
                    <Badge variant="ready">Allowed</Badge>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Outbound Deliveries Dispatch (WH/OUT/...)</span>
                    <Badge variant="ready">Allowed</Badge>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Internal Relocation Transfers (WH/INT/...)</span>
                    <Badge variant={user?.role === 'admin' || user?.role === 'inventory_manager' ? 'ready' : 'ready'}>
                      Allowed
                    </Badge>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Physical Stock Reconciliation & Audits</span>
                    <Badge variant={user?.role === 'admin' || user?.role === 'inventory_manager' ? 'ready' : 'waiting'}>
                      {user?.role === 'admin' || user?.role === 'inventory_manager' ? 'Full Access' : 'View Only'}
                    </Badge>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Multi-Warehouse Facility Management</span>
                    <Badge variant={user?.role === 'admin' ? 'ready' : 'cancelled'}>
                      {user?.role === 'admin' ? 'Admin Controlled' : 'Restricted'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
