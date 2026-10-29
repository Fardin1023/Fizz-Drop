import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  CheckCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { AppNotification } from '../../types/notification';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onSelectNotification?: (notification: AppNotification) => void;
  isScrolled?: boolean;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
  isScrolled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return `${Math.floor(diffHrs / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-all duration-200 cursor-pointer ${
          isScrolled ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
        } ${isOpen ? 'bg-blue-50 text-blue-600 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white'}`}
        title="View Notifications"
        aria-label="Notifications"
      >
        <Bell className={`transition-all duration-300 ${isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />

        {/* Unread Ping Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-mono font-bold text-white shadow-xs animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-blue-500/10 z-[130] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-oswald text-sm font-bold uppercase tracking-tight text-zinc-900">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-mono">No notifications yet</p>
                <span className="text-[10px] text-slate-400 block">
                  Requisition updates will appear here in real time.
                </span>
              </div>
            ) : (
              notifications.map((n) => {
                const isApproved = n.type === 'APPROVED';
                const isPartial = n.type === 'PARTIALLY_APPROVED';
                const isRejected = n.type === 'REJECTED';
                const isNewReq = n.type === 'NEW_REQUISITION';

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) onMarkAsRead(n.id);
                      if (onSelectNotification) onSelectNotification(n);
                      setIsOpen(false);
                    }}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      !n.is_read
                        ? 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-700'
                          : isRejected
                          ? 'bg-rose-100 text-rose-700'
                          : isPartial
                          ? 'bg-amber-100 text-amber-700'
                          : isNewReq
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isApproved ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isRejected ? (
                        <XCircle className="w-4 h-4" />
                      ) : isPartial ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : isNewReq ? (
                        <Truck className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-semibold text-xs truncate ${
                            !n.is_read ? 'text-zinc-900 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {n.message}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(n.created_at)}
                        </span>
                        {n.reference_code && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-zinc-700 border border-slate-200">
                            {n.reference_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-600" />
              Real-time synchronization active
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
