import React, { useState, useEffect } from 'react';
import { X, Truck, Check, AlertCircle, Package, Flame, Clock } from 'lucide-react';
import { type OutletProductItem } from './OutletSaleModal';

interface OutletRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletId: number;
  outletName: string;
  products: OutletProductItem[];
  preSalesOfficer?: {
    id: number;
    name: string;
    code: string;
    phone?: string;
    sub_route?: string;
  } | null;
  initialProductId?: number | null;
  onSubmitted?: () => void;
}

export const OutletRequisitionModal: React.FC<OutletRequisitionModalProps> = ({
  isOpen,
  onClose,
  outletId,
  outletName,
  products,
  preSalesOfficer = null,
  initialProductId = null,
  onSubmitted,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number | string>(
    initialProductId || (products.length > 0 ? products[0].product_id : '')
  );
  const [quantity, setQuantity] = useState<number>(50);
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].product_id);
    }
  }, [initialProductId, products]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => String(p.product_id) === String(selectedProductId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const qty = Number(quantity);
    if (!selectedProductId) {
      setError('Please select a beverage product.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid order quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8080/api/inventory/outlet/${outletId}/requisitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(selectedProductId),
          quantity: qty,
          urgency,
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit requisition');

      setSuccessMsg(data.message || 'Order placed with Route Pre-Sales Officer!');
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E2C799] shadow-2xl overflow-hidden animate-scale-up"
      >
        <div className="h-2.5 w-full bg-gradient-to-r from-[#FFD18D] via-[#FDECAD] to-[#F7E6C9]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF4EB] hover:bg-[#F7E6C9] text-[#2D2319] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD18D] text-[#2D2319] flex items-center justify-center shadow-md shadow-[#FFD18D]/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2D2319] tracking-tight">ORDER BEVERAGE STOCK</h3>
              <p className="text-xs text-[#6B5440]">
                Order stock via Route Pre-Sales Officer (PSR) for <span className="font-semibold text-[#2D2319]">{outletName}</span>
              </p>
            </div>
          </div>

          {preSalesOfficer && (
            <div className="p-3 rounded-2xl bg-[#F7E6C9]/70 border border-[#E2C799] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2D2319] text-[#FDECAD] font-bold flex items-center justify-center text-[11px] shadow-sm">
                  PSR
                </div>
                <div>
                  <p className="font-bold text-[#2D2319]">
                    Route Officer: <span className="text-[#78350F]">{preSalesOfficer.name}</span> ({preSalesOfficer.code})
                  </p>
                  <p className="text-[11px] text-[#6B5440]">
                    Sub-Route: <span className="font-medium text-[#2D2319]">{preSalesOfficer.sub_route || 'Territory Sub-Route'}</span> {preSalesOfficer.phone ? `• 📞 ${preSalesOfficer.phone}` : ''}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFD18D] text-[#2D2319] border border-[#E2C799]">
                Exclusive Field Link
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-[#F6DBD4] border border-[#E29D94] text-[#7C2D12] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#F5F1BB] border border-[#D9D384] text-[#365314] text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-[#365314]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Product Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#6B5440] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#78350F]" />
              <span>Beverage Product Needed</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E2C799] bg-[#FAF4EB]/60 text-[#2D2319] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFD18D]"
            >
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.brand} {p.flavor_variant} ({p.packaging} {p.size_volume}) — Current Stock: {p.stock_quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#6B5440]">
              Units / Cases to Request
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full py-2.5 px-4 font-mono font-black text-lg rounded-2xl border border-[#E2C799] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#FFD18D]"
            />
            <div className="flex items-center gap-1.5 pt-1">
              {[25, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setQuantity(amt)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-[#FAF4EB] hover:bg-[#FFD18D] text-[#2D2319] font-bold border border-[#E2C799]/60 transition-all cursor-pointer"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Wholesale Pricing Preview */}
          {currentProduct && (
            <div className="p-3 rounded-2xl bg-[#F5F1BB]/50 border border-[#D9D384] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#78350F] block tracking-wider">
                  Wholesale Unit Rate (Tier 2)
                </span>
                <span className="font-mono text-sm font-bold text-[#2D2319]">
                  ৳{(Number((currentProduct as any)?.outlet_price || (currentProduct as any)?.base_price || 0)).toFixed(2)} / unit
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#78350F] block tracking-wider">
                  Estimated Order Cost
                </span>
                <span className="font-mono text-sm font-bold text-[#2D2319]">
                  ৳{((Number((currentProduct as any)?.outlet_price || (currentProduct as any)?.base_price || 0)) * (Number(quantity) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Urgency */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#6B5440]">
              Delivery Urgency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'NORMAL', label: 'Normal', icon: Clock },
                { id: 'HIGH', label: 'High Priority', icon: Flame },
                { id: 'CRITICAL', label: 'Urgent Stock', icon: AlertCircle },
              ].map((u) => {
                const isSelected = urgency === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id as any)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2D2319] bg-[#FFD18D] text-[#2D2319] ring-2 ring-[#FFD18D]/40'
                        : 'border-[#E2C799] bg-[#FAF4EB] text-[#433022] hover:bg-[#F7E6C9]'
                    }`}
                  >
                    <span>{u.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#6B5440] uppercase tracking-wider">
              Notes for Route Pre-Sales Officer (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="E.g., Weekend shelf restock, urgent shop replenishment..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E2C799] bg-[#FAF4EB]/60 text-[#2D2319] placeholder:text-[#6B5440]/60 focus:outline-none focus:ring-2 focus:ring-[#FFD18D] resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-[#E2C799] hover:bg-[#FAF4EB] text-[#433022] font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2D2319]/25 cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-[#FDECAD]/30 border-t-[#FDECAD] rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#FFD18D]" />
                  <span>Send Order to Pre-Sales Officer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
