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
        className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scale-up"
      >
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-blue-600" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">ORDER BEVERAGE STOCK</h3>
              <p className="text-xs text-slate-500">
                Order stock via Route Pre-Sales Officer (PSR) for <span className="font-semibold text-slate-700">{outletName}</span>
              </p>
            </div>
          </div>

          {preSalesOfficer && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
                  PSR
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    Route Officer: <span className="text-orange-700">{preSalesOfficer.name}</span> ({preSalesOfficer.code})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sub-Route: <span className="font-medium text-slate-700">{preSalesOfficer.sub_route || 'Territory Sub-Route'}</span> {preSalesOfficer.phone ? `• 📞 ${preSalesOfficer.phone}` : ''}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                Exclusive Field Link
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Product Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Beverage Product Needed</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Units / Cases to Request
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full py-2.5 px-4 font-mono font-black text-lg rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="flex items-center gap-1.5 pt-1">
              {[25, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setQuantity(amt)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 font-bold border border-slate-200/60 transition-all cursor-pointer"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Wholesale Pricing Preview */}
          {currentProduct && (
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-700 block tracking-wider">
                  Wholesale Unit Rate (Tier 2)
                </span>
                <span className="font-mono text-sm font-bold text-indigo-950">
                  ৳{(Number((currentProduct as any)?.outlet_price || (currentProduct as any)?.base_price || 0)).toFixed(2)} / unit
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block tracking-wider">
                  Estimated Order Cost
                </span>
                <span className="font-mono text-sm font-bold text-indigo-900">
                  ৳{((Number((currentProduct as any)?.outlet_price || (currentProduct as any)?.base_price || 0)) * (Number(quantity) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Urgency */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Delivery Urgency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'NORMAL', label: 'Normal', icon: Clock, color: 'text-slate-600 border-slate-200' },
                { id: 'HIGH', label: 'High Priority', icon: Flame, color: 'text-amber-700 border-amber-300 bg-amber-50' },
                { id: 'CRITICAL', label: 'Urgent Out-of-Stock', icon: AlertCircle, color: 'text-rose-700 border-rose-300 bg-rose-50' },
              ].map((u) => {
                const isSelected = urgency === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id as any)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Notes for Route Pre-Sales Officer (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="E.g., Weekend shelf restock, urgent shop replenishment..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 hover:from-orange-700 hover:to-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
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
