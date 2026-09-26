import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { Bell, X, AlertTriangle, CheckCircle2, Truck, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  severity: 'warning' | 'info' | 'success';
  read: boolean;
  linkView?: any;
}

export const NotificationDrawer: React.FC = () => {
  const { isNotificationsOpen, setIsNotificationsOpen, setUnreadNotificationsCount, setCurrentView } = useNavigation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Low Stock Alert',
      message: 'Steel Rods have reached the reorder threshold (8 units remaining in WH/Stock).',
      time: '10m ago',
      severity: 'warning',
      read: false,
      linkView: 'stock',
    },
    {
      id: '2',
      title: 'Delivery Ready for Validation',
      message: 'Delivery WH/OUT/00001 stock availability verified. Ready for final dispatch.',
      time: '25m ago',
      severity: 'info',
      read: false,
      linkView: 'deliveries',
    },
    {
      id: '3',
      title: 'Internal Transfer Completed',
      message: 'Transfer WH/INT/00001 (50 Industrial Bolts) moved to WH/Output.',
      time: '1h ago',
      severity: 'success',
      read: false,
      linkView: 'stock-history',
    },
  ]);

  if (!isNotificationsOpen) return null;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotificationsCount(0);
  };

  const handleItemClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    if (item.linkView) {
      setCurrentView(item.linkView);
      setIsNotificationsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white shadow-elevated border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-brand-600">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-sm text-slate-900">Notifications</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-800"
              >
                Mark read
              </button>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  item.read
                    ? 'bg-white border-slate-200/80 opacity-75'
                    : 'bg-slate-50/80 border-slate-200 shadow-xs hover:border-brand-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {item.severity === 'warning' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {item.severity === 'info' && <Truck className="w-3.5 h-3.5 text-indigo-500" />}
                    {item.severity === 'success' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{item.time}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <Badge variant={item.severity === 'warning' ? 'warning' : item.severity === 'info' ? 'ready' : 'done'}>
                    {item.severity.toUpperCase()}
                  </Badge>
                  <span className="inline-flex items-center gap-0.5 text-brand-600 font-medium">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
            Real-time inventory alerts active
          </div>
        </div>
      </div>
    </div>
  );
};
