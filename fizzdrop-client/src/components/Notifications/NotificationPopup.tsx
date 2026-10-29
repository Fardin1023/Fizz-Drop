import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';
import type { AppNotification } from '../../types/notification';

interface NotificationPopupProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onAction?: (notification: AppNotification) => void;
  autoDismissMs?: number;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  onDismiss,
  onAction,
  autoDismissMs = 8000,
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (isPaused) return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoDismissMs) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification, autoDismissMs, isPaused, onDismiss]);

  if (!notification) return null;

  const isSuperadminRecipient = notification.recipient_role === 'SUPERADMIN';
  const isApproved = notification.type === 'APPROVED';
  const isPartial = notification.type === 'PARTIALLY_APPROVED';
  const isRejected = notification.type === 'REJECTED';
  const isNewReq = notification.type === 'NEW_REQUISITION';

  // Format relative time
  const getTimeString = () => {
    try {
      const created = new Date(notification.created_at);
      return created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div
      className="fixed top-20 right-4 sm:right-6 z-[120] w-[calc(100vw-2rem)] sm:w-96 animate-fade-in transition-all duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="assertive"
    >
      <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl shadow-blue-500/15 p-4 sm:p-5 ring-4 ring-blue-500/10 transition-all hover:shadow-blue-500/25 hover:border-blue-300">
        
        {/* Subtle Tech Glow Accents */}
        <div
          className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40 ${
            isApproved
              ? 'bg-emerald-400'
              : isRejected
              ? 'bg-rose-400'
              : isPartial
              ? 'bg-amber-400'
              : 'bg-cyan-400'
          }`}
        />

        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                isApproved
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : isRejected
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isPartial
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : isRejected ? (
                <XCircle className="w-5 h-5 text-rose-600" />
              ) : isPartial ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : isNewReq ? (
                <Truck className="w-5 h-5 text-blue-600 animate-pulse" />
              ) : (
                <Bell className="w-5 h-5 text-indigo-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1 ${
                    isApproved
                      ? 'bg-emerald-100 text-emerald-800'
                      : isRejected
                      ? 'bg-rose-100 text-rose-800'
                      : isPartial
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {isApproved
                    ? 'STOCK PERMITTED'
                    : isRejected
                    ? 'STOCK DISALLOWED'
                    : isPartial
                    ? 'PARTIAL ALLOCATION'
                    : isNewReq
                    ? 'NEW REQUISITION'
                    : 'SYSTEM NOTIFICATION'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{getTimeString()}</span>
              </div>

              <h4 className="font-oswald text-sm font-bold uppercase text-zinc-900 mt-1 leading-tight tracking-tight">
                {notification.title}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Content */}
        <div className="mt-2.5 text-xs text-slate-600 leading-relaxed relative z-10 pl-11">
          <p>{notification.message}</p>

          {notification.reference_code && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-zinc-800 font-mono text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Tracking: {notification.reference_code}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 relative z-10 pl-11">
          <span className="text-[10px] text-slate-400 font-medium">
            {isPaused ? 'Auto-dismiss paused' : 'Auto-dismisses shortly'}
          </span>

          <button
            type="button"
            onClick={() => {
              if (onAction) onAction(notification);
              onDismiss();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <span>{isSuperadminRecipient ? 'Review Ticket' : 'View Requisitions'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              isApproved
                ? 'bg-emerald-500'
                : isRejected
                ? 'bg-rose-500'
                : isPartial
                ? 'bg-amber-500'
                : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
