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
        className="relative w-full max-w-md bg-white rounded-3xl border border-[#E2C799] shadow-2xl overflow-hidden animate-scale-up"
      >
        <div className="h-2.5 w-full bg-gradient-to-r from-[#FFD18D] via-[#FDECAD] to-[#F7E6C9]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF4EB] hover:bg-[#F7E6C9] text-[#2D2319] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFD18D] text-[#2D2319] flex items-center justify-center shadow-md shadow-[#FFD18D]/30">
              <Sliders className="w-5 h-5 text-[#78350F]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#2D2319] tracking-tight">Adjust Shelf Stock</h3>
              <p className="text-xs text-[#6B5440]">
                {product.brand} {product.flavor_variant}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#F6DBD4] border border-[#E29D94] text-[#7C2D12] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-[#FAF4EB] border border-[#E2C799] flex items-center justify-between text-xs">
            <span className="text-[#6B5440] font-bold uppercase">Current Recorded Stock:</span>
            <span className="text-base font-black text-[#2D2319] font-mono">{product.stock_quantity} units</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#6B5440]">
              Actual Verified Count (Units)
            </label>
            <input
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full py-2.5 px-4 font-mono font-black text-lg rounded-2xl border border-[#E2C799] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#FFD18D]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#6B5440]">
              Adjustment Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full py-2 px-3.5 rounded-xl border border-[#E2C799] bg-[#FAF4EB]/60 text-[#2D2319] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD18D]"
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
              className="py-2.5 px-4 rounded-xl border border-[#E2C799] hover:bg-[#FAF4EB] text-[#433022] font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#2D2319]/20 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-[#FDECAD]/30 border-t-[#FDECAD] rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#FFD18D]" />
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
