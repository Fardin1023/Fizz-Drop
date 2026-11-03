import React from 'react';
import { X, Printer, CheckCircle, Store, Calendar, CreditCard, Sparkles, Hash } from 'lucide-react';

export interface ReceiptData {
  saleCode: string;
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  productName: string;
  quantitySold: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  customerNotes?: string;
  timestamp: string;
  remainingStock?: number;
}

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Top Decorative Emerald Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="inline-flex p-3 rounded-2xl bg-white/15 backdrop-blur-md mb-2 shadow-inner ring-1 ring-white/20">
            <CheckCircle className="w-8 h-8 text-white animate-bounce" />
          </div>
          <h2 className="text-xl font-black tracking-tight">SALE COMPLETED!</h2>
          <p className="text-xs text-emerald-100 font-medium">Customer receipt generated & stock deducted</p>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Receipt Design */}
        <div className="p-6 space-y-5 bg-gradient-to-b from-white to-slate-50/50">
          {/* Store Info */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>{receipt.outletName}</span>
            </div>
            {receipt.outletAddress && (
              <p className="text-[11px] text-slate-500 mt-0.5">{receipt.outletAddress}</p>
            )}
            {receipt.outletPhone && (
              <p className="text-[10px] text-slate-400 font-mono">Hotline: {receipt.outletPhone}</p>
            )}
          </div>

          {/* Transaction Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-mono">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-slate-800">{receipt.saleCode}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>{new Date(receipt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Line Item Table */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex justify-between px-1">
              <span>Item Description</span>
              <span>Total</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100/70 border border-slate-200/80">
              <div>
                <p className="text-sm font-bold text-slate-900">{receipt.productName}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {receipt.quantitySold} unit(s) × ৳{Number(receipt.unitPrice).toFixed(2)}
                </p>
              </div>
              <p className="text-base font-black text-slate-900 font-mono">
                ৳{Number(receipt.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Total & Payment Summary */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Payment Mode:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                <CreditCard className="w-3 h-3" />
                {receipt.paymentMethod}
              </span>
            </div>

            {receipt.customerNotes && (
              <div className="flex justify-between items-center text-xs text-slate-500 italic">
                <span>Notes:</span>
                <span>{receipt.customerNotes}</span>
              </div>
            )}

            {receipt.remainingStock !== undefined && (
              <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                <span>Remaining Shelf Stock:</span>
                <span className="font-bold text-slate-700">{receipt.remainingStock} units</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-black text-slate-900 pt-2 border-t border-dashed border-slate-300">
              <span>Total Paid:</span>
              <span className="text-emerald-600 font-mono">৳{Number(receipt.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={handlePrint}
              type="button"
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Thermal Receipt</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
