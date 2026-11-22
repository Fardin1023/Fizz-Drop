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
  PackageCheck,
  Zap,
} from 'lucide-react';
import type { AppNotification } from '../../types/notification';
import { getNotificationDestination } from '../../utils/notificationRouter';

interface NotificationPopupProps {
  notification: AppNotification | null;
  onDismiss?: () => void;
  onClose?: () => void;
  onAction?: (notification: AppNotification) => void;
  autoDismissMs?: number;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  onDismiss,
  onClose,
  onAction,
  autoDismissMs = 8000,
}) => {
  const handleClose = onDismiss || onClose || (() => {});
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isResponding, setIsResponding] = useState<'ACCEPT' | 'DENY' | null>(null);
  const [responseMsg, setResponseMsg] = useState<string | null>(null);

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
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification, autoDismissMs, isPaused, onDismiss]);

  if (!notification) return null;

  const isSuperadminRecipient = notification.recipient_role === 'SUPERADMIN';
  const isStockOffer = notification.type === 'STOCK_OFFER_RECEIVED';
  const isDirectDispatch = notification.type === 'DIRECT_DISPATCH' || notification.type === 'DIRECT_SUPPLY';
  const isApproved = notification.type === 'APPROVED';
  const isPriceUpdated = notification.type === 'PRICE_UPDATED' || notification.type === 'DISTRICT_PRICING';
  const isPartial = notification.type === 'PARTIALLY_APPROVED';
  const isRejected = notification.type === 'REJECTED';
  const isNewReq = notification.type === 'NEW_REQUISITION';
  const isSOReq = notification.type === 'SALES_OFFICER_REQUISITION';
  const destination = getNotificationDestination(notification);

  const handleRespondOffer = async (action: 'ACCEPT' | 'DENY') => {
    setIsResponding(action);
    try {
      const code = notification.reference_code || notification.reference_id;
      const res = await fetch(`http://localhost:8080/api/v1/delivery/stock-offers/${code}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResponseMsg(action === 'ACCEPT' ? '✓ Stock Accepted!' : '✕ Stock Denied');
        try {
          const ch = new BroadcastChannel('fizzdrop_realtime_events');
          ch.postMessage({
            type: 'STOCK_OFFER_RESPONDED',
            action,
            code,
            outlet_id: notification.recipient_user_id,
          });
          ch.close();
        } catch (ignored) {}
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Error responding to stock offer from popup:', err);
    } finally {
      setIsResponding(null);
    }
  };

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
            isStockOffer
              ? 'bg-purple-400'
              : isPriceUpdated
              ? 'bg-teal-400'
              : isApproved
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
                isStockOffer
                  ? 'bg-purple-50 text-purple-600 border border-purple-200'
                  : isDirectDispatch
                  ? 'bg-purple-50 text-purple-600 border border-purple-200'
                  : isPriceUpdated
                  ? 'bg-teal-50 text-teal-600 border border-teal-200'
                  : isApproved
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : isRejected
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isPartial
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}
            >
              {isStockOffer ? (
                <Zap className="w-5 h-5 text-purple-600" />
              ) : isDirectDispatch ? (
                <PackageCheck className="w-5 h-5 text-purple-600" />
              ) : isPriceUpdated ? (
                <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
              ) : isApproved ? (
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
                    isStockOffer
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : isDirectDispatch
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : isPriceUpdated
                      ? 'bg-teal-100 text-teal-800 border border-teal-200'
                      : isApproved
                      ? 'bg-emerald-100 text-emerald-800'
                      : isRejected
                      ? 'bg-rose-100 text-rose-800'
                      : isPartial
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {isStockOffer
                    ? 'IN-TRANSIT STOCK OFFER'
                    : isDirectDispatch
                    ? 'DIRECT SHIPMENT (UNREQUESTED)'
                    : isPriceUpdated
                    ? 'DISTRICT PRICING ALLOTTED'
                    : isApproved
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
            onClick={handleClose}
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

        {/* Action Button Row */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 relative z-10 pl-11">
          <span className="text-[10px] text-slate-400 font-medium">
            {isPaused ? 'Auto-dismiss paused' : 'Auto-dismisses shortly'}
          </span>

          {isStockOffer ? (
            <div className="flex items-center gap-2">
              {responseMsg ? (
                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  responseMsg.includes('Accepted') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {responseMsg}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleRespondOffer('ACCEPT')}
                    disabled={isResponding !== null}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isResponding === 'ACCEPT' ? 'Accepting...' : 'Accept Stock'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondOffer('DENY')}
                    disabled={isResponding !== null}
                    className="px-3.5 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isResponding === 'DENY' ? 'Denying...' : 'Deny Stock'}</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onAction) onAction(notification);
                handleClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              <span>Open {destination.label}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
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
