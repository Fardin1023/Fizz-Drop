import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PackageX,
  Truck,
  ArrowRight,
  X,
  ShieldAlert,
  Boxes,
  Store,
} from 'lucide-react';

export interface ZeroStockAlertData {
  productName: string;
  productId?: number;
  outletName?: string;
  category?: string;
  sku?: string;
}

interface ZeroStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestStock?: (productId?: number) => void;
  data: ZeroStockAlertData | null;
}

export const ZeroStockAlertModal: React.FC<ZeroStockAlertModalProps> = ({
  isOpen,
  onClose,
  onRequestStock,
  data,
}) => {
  const [shakeKey, setShakeKey] = useState(0);

  // Trigger shake effect whenever modal opens or re-triggered
  useEffect(() => {
    if (isOpen) {
      setShakeKey((k) => k + 1);
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        key={shakeKey}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border-2 border-rose-500/80 shadow-2xl overflow-hidden animate-pop-bounce animate-pulse-glow"
      >
        {/* Top Warning Strip */}
        <div className="h-2.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          title="Close alert"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 text-center">
          {/* Animated Pulsing Alert Icon */}
          <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
            {/* Outer expanding ring */}
            <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
            <span className="absolute -inset-1 rounded-full bg-rose-500/10 animate-pulse" />
            
            {/* Main Icon Badge */}
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
              <PackageX className="w-8 h-8 animate-bounce" />
            </div>

            {/* Warning tag */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs border-2 border-white dark:border-zinc-900 font-black text-xs">
              !
            </div>
          </div>

          {/* Heading */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Dispatch Prohibited</span>
          </div>

          <h3 className="font-oswald text-2xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
            No Stocks, Cannot Dispatch!
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
            You currently hold <strong className="text-rose-600 dark:text-rose-400 font-bold">0 units / cases</strong> of this beverage in your regional depot. Physical stock cannot be dispatched to franchise outlets until stock is replenished.
          </p>

          {/* Detailed Telemetry Box */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/90 dark:border-zinc-700/80 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-slate-400" />
                Target Product:
              </span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[190px]">
                {data.productName}
              </span>
            </div>

            {data.sku && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400 font-medium">SKU:</span>
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {data.sku}
                </span>
              </div>
            )}

            {data.outletName && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  Target Outlet:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[190px]">
                  {data.outletName}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Your Depot Inventory:
              </span>
              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                0 Cases Available
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel & Return
            </button>

            {onRequestStock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestStock(data.productId);
                }}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Request Stock</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
