import React, { useState } from 'react';
import { X, Sliders, Check, AlertCircle, Package } from 'lucide-react';
import { type OutletProductItem } from './OutletSaleModal';

interface OutletAdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletId: number;
  product: OutletProductItem | null;
  onUpdated: () => void;
}

export const OutletAdjustStockModal: React.FC<OutletAdjustStockModalProps> = ({
  isOpen,
  onClose,
  outletId,
  product,
  onUpdated,
}) => {
  const [newStock, setNewStock] = useState<number>(product?.stock_quantity ?? 0);
  const [reason, setReason] = useState<string>('Physical Stock Audit');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (product) setNewStock(product.stock_quantity);
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`http://localhost:8080/api/inventory/outlet/${outletId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.product_id,
          quantity: Number(newStock),
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stock');

      onUpdated();
      onClose();
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
        className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scale-up"
      >
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Adjust Shelf Stock</h3>
              <p className="text-xs text-slate-500">
                {product.brand} {product.flavor_variant}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase">Current Recorded Stock:</span>
            <span className="text-base font-black text-slate-800 font-mono">{product.stock_quantity} units</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Actual Verified Count (Units)
            </label>
            <input
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full py-2.5 px-4 font-mono font-black text-lg rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Adjustment Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full py-2 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
            >
              <option value="Physical Stock Audit">Physical Shelf Stock Audit</option>
              <option value="Damage / Leakage Write-off">Damaged / Broken Bottles</option>
              <option value="Direct Supplier Restock">Direct Supplier Handover</option>
              <option value="Shelf Restock Adjustment">Backroom to Shelf Transfer</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Update Stock Count</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
