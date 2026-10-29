import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Store,
  Package,
  Check,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export interface OutletOption {
  outlet_id: number;
  outlet_name: string;
  location_address?: string;
  contact_phone?: string;
  status?: string;
}

export interface ProductOption {
  product_id: number;
  brand: string;
  flavor_variant: string;
  sku?: string;
  base_price?: number | string;
  image_url?: string;
  total_stock?: number;
  available_outlets?: Array<{
    outlet_id: number;
    stock_quantity: number;
  }>;
}

interface SupplyStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplied: () => void;
  products: ProductOption[];
  outlets: OutletOption[];
  initialProductId?: number | null;
  initialOutletId?: number | null;
}

export const SupplyStockModal: React.FC<SupplyStockModalProps> = ({
  isOpen,
  onClose,
  onSupplied,
  products,
  outlets,
  initialProductId = null,
  initialOutletId = null,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number | string>(
    initialProductId || (products.length > 0 ? products[0].product_id : '')
  );
  const [selectedOutletId, setSelectedOutletId] = useState<number | string>(
    initialOutletId || (outlets.length > 0 ? outlets[0].outlet_id : '')
  );
  const [quantity, setQuantity] = useState<number>(50);
  const [mode, setMode] = useState<'ADD' | 'SET'>('ADD');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialProductId) setSelectedProductId(initialProductId);
    if (initialOutletId) setSelectedOutletId(initialOutletId);
  }, [initialProductId, initialOutletId, isOpen]);

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].product_id);
    }
    if (!selectedOutletId && outlets.length > 0) {
      setSelectedOutletId(outlets[0].outlet_id);
    }
  }, [products, outlets]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => String(p.product_id) === String(selectedProductId));
  const currentOutlet = outlets.find((o) => String(o.outlet_id) === String(selectedOutletId));

  // Find current stock at the selected outlet
  const existingStockAtOutlet = currentProduct?.available_outlets?.find(
    (a) => String(a.outlet_id) === String(selectedOutletId)
  )?.stock_quantity ?? 0;

  const resultingStock = mode === 'ADD' 
    ? existingStockAtOutlet + (Number(quantity) || 0) 
    : (Number(quantity) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const qty = Number(quantity);
    if (!selectedProductId) {
      setError('Please select a product.');
      return;
    }
    if (!selectedOutletId) {
      setError('Please select a franchise outlet.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError('Supply quantity must be a positive number greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:8080/api/inventory/supply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outlet_id: Number(selectedOutletId),
          product_id: Number(selectedProductId),
          quantity: qty,
          mode,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to dispatch inventory to outlet');
      }

      setSuccessMsg(
        `Successfully supplied ${qty} units to ${currentOutlet?.outlet_name || 'outlet'}!`
      );

      setTimeout(() => {
        onSupplied();
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-blue-900/15 overflow-hidden transition-all duration-300 transform scale-100"
      >
        {/* Top Header Glow Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-oswald text-lg font-bold uppercase tracking-tight text-zinc-900">
                Supplier Stock Allocation
              </h3>
              <p className="text-xs text-slate-500">
                Dispatch specific inventory amounts to physical franchise outlets
              </p>
            </div>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* 1. Select Product */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                Select Beverage Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.brand} {p.flavor_variant} (SKU: {p.sku || `FD-${p.product_id}`}) • Total: {p.total_stock ?? 0} units
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Outlet (Filtered to database only) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                Target Franchise Outlet (From Database)
              </label>
              {outlets.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  No franchise outlets registered in the database yet. Add outlets in Superadmin first.
                </div>
              ) : (
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {outlets.map((o) => (
                    <option key={o.outlet_id} value={o.outlet_id}>
                      {o.outlet_name} — {o.location_address || 'City Center'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Current Stock vs Resulting Stock Telemetry */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Current Outlet Stock
                </span>
                <span className="font-mono text-sm font-bold text-zinc-800">
                  {existingStockAtOutlet} units
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-blue-600 block tracking-wider flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3" />
                  New Projected Stock
                </span>
                <span className="font-mono text-sm font-bold text-blue-700">
                  {resultingStock} units
                </span>
              </div>
            </div>

            {/* 3. Quantity to Supply & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Quantity to Supply
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
                    Units
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Supply Action Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMode('ADD')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'ADD'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + Add to Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('SET')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'SET'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    = Override Total
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Quantity Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quick Qty:</span>
              {[25, 50, 100, 200].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    quantity === q
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  +{q}
                </button>
              ))}
            </div>

            {/* 4. Memo / Shipment Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Shipment Reference / Memo (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Weekly Restock Batch #409, Truck Delivery"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || outlets.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching to Outlet...</span>
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch {quantity} Units to Outlet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
