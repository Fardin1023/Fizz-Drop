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
        {/* Top Decorative Warm Peach Header */}
        <div className="bg-gradient-to-r from-[#FFD18D] via-[#FDECAD] to-[#F7E6C9] p-6 text-[#2D2319] text-center relative overflow-hidden border-b border-[#E2C799]">
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/20 blur-xl pointer-events-none" />
          <div className="inline-flex p-3 rounded-2xl bg-[#2D2319]/10 backdrop-blur-md mb-2 shadow-inner ring-1 ring-[#E2C799]">
            <CheckCircle className="w-8 h-8 text-[#78350F] animate-bounce" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-[#2D2319]">SALE COMPLETED!</h2>
          <p className="text-xs text-[#433022] font-medium">Customer receipt generated & stock deducted</p>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#2D2319]/10 hover:bg-[#2D2319]/20 text-[#2D2319] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Receipt Design */}
        <div className="p-6 space-y-5 bg-gradient-to-b from-white to-[#FAF4EB]/50">
          {/* Store Info */}
          <div className="text-center border-b border-dashed border-[#E2C799] pb-4">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#2D2319]">
              <Store className="w-4 h-4 text-[#78350F]" />
              <span>{receipt.outletName}</span>
            </div>
            {receipt.outletAddress && (
              <p className="text-[11px] text-[#6B5440] mt-0.5">{receipt.outletAddress}</p>
            )}
            {receipt.outletPhone && (
              <p className="text-[10px] text-[#6B5440] font-mono">Hotline: {receipt.outletPhone}</p>
            )}
          </div>

          {/* Transaction Metadata */}
          <div className="flex items-center justify-between text-xs text-[#2D2319] bg-[#FAF4EB] p-2.5 rounded-xl border border-[#E2C799]/60 font-mono">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#78350F]" />
              <span className="font-bold text-[#2D2319]">{receipt.saleCode}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#6B5440]">
              <Calendar className="w-3 h-3" />
              <span>{new Date(receipt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Line Item Table */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#78350F] flex justify-between px-1">
              <span>Item Description</span>
              <span>Total</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2C799]">
              <div>
                <p className="text-sm font-bold text-[#2D2319]">{receipt.productName}</p>
                <p className="text-xs text-[#6B5440] font-mono">
                  {receipt.quantitySold} unit(s) × ৳{Number(receipt.unitPrice).toFixed(2)}
                </p>
              </div>
              <p className="text-base font-black text-[#2D2319] font-mono">
                ৳{Number(receipt.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Total & Payment Summary */}
          <div className="space-y-2 pt-2 border-t border-[#E2C799]">
            <div className="flex justify-between items-center text-xs text-[#433022]">
              <span>Payment Mode:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F5F1BB] text-[#365314] font-bold border border-[#D9D384] text-[11px]">
                <CreditCard className="w-3 h-3" />
                {receipt.paymentMethod}
              </span>
            </div>

            {receipt.customerNotes && (
              <div className="flex justify-between items-center text-xs text-[#6B5440] italic">
                <span>Notes:</span>
                <span>{receipt.customerNotes}</span>
              </div>
            )}

            {receipt.remainingStock !== undefined && (
              <div className="flex justify-between items-center text-xs text-[#6B5440] font-mono">
                <span>Remaining Shelf Stock:</span>
                <span className="font-bold text-[#2D2319]">{receipt.remainingStock} units</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-black text-[#2D2319] pt-2 border-t border-dashed border-[#E2C799]">
              <span>Total Paid:</span>
              <span className="text-[#2D2319] font-mono">৳{Number(receipt.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={handlePrint}
              type="button"
              className="flex-1 py-3 px-4 rounded-xl border border-[#E2C799] bg-white hover:bg-[#FAF4EB] text-[#2D2319] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#78350F]" />
              <span>Print Thermal Receipt</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="flex-1 py-3 px-4 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#2D2319]/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FFD18D]" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
