import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  AlertCircle,
  Package,
  ArrowRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { SaleReceiptModal, type ReceiptData } from './SaleReceiptModal';

export interface OutletProductItem {
  product_id: number;
  brand: string;
  flavor_variant: string;
  packaging?: string;
  size_volume?: string;
  sku?: string;
  base_price?: number | string;
  supplier_price?: number | string;
  outlet_price?: number | string;
  retail_price?: number | string;
  category?: string;
  image_url?: string;
  stock_quantity: number;
  status: string;
}

interface OutletSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletId: number;
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  products: OutletProductItem[];
  initialProductId?: number | null;
  onSaleCompleted?: () => void;
}

export const OutletSaleModal: React.FC<OutletSaleModalProps> = ({
  isOpen,
  onClose,
  outletId,
  outletName,
  outletAddress,
  outletPhone,
  products,
  initialProductId = null,
  onSaleCompleted,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number | string>(
    initialProductId || (products.length > 0 ? products[0].product_id : '')
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'bKash / MFS'>('Cash');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal State
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].product_id);
    }
  }, [initialProductId, products]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => String(p.product_id) === String(selectedProductId));
  const availableStock = currentProduct?.stock_quantity ?? 0;
  const retailPrice = Number(currentProduct?.retail_price || currentProduct?.base_price || 25);
  const wholesaleCost = Number(currentProduct?.outlet_price || (currentProduct?.base_price ? Number(currentProduct.base_price) * 1.15 : 20));
  const unitPrice = retailPrice;
  const totalAmount = unitPrice * (Number(quantity) || 0);
  const remainingStock = Math.max(0, availableStock - (Number(quantity) || 0));
  const outletUnitMargin = Math.max(0, retailPrice - wholesaleCost);
  const totalOutletProfit = outletUnitMargin * (Number(quantity) || 0);

  const handleQuickQty = (qtyToAdd: number) => {
    setQuantity((prev) => Math.min(availableStock > 0 ? availableStock : 999, Math.max(1, prev + qtyToAdd)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (!selectedProductId) {
      setError('Please select a beverage product.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError('Sale quantity must be at least 1 unit.');
      return;
    }
    if (qty > availableStock) {
      setError(`Cannot sell ${qty} units: Only ${availableStock} units available on the shelf!`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8080/api/inventory/outlet/${outletId}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(selectedProductId),
          quantity: qty,
          payment_method: paymentMethod,
          customer_notes: customerNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to record outlet sale');
      }

      // Generate Receipt
      setReceipt({
        saleCode: data.sale_code || `SL-${Date.now()}`,
        outletName,
        outletAddress,
        outletPhone,
        productName: data.product_name || `${currentProduct?.brand} ${currentProduct?.flavor_variant}`,
        quantitySold: qty,
        unitPrice,
        totalAmount,
        paymentMethod,
        customerNotes: customerNotes.trim() || undefined,
        timestamp: new Date().toISOString(),
        remainingStock: data.remaining_stock ?? remainingStock,
      });

      setShowReceipt(true);
      if (onSaleCompleted) onSaleCompleted();
    } catch (err: any) {
      setError(err.message || 'Error processing transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E2C799] shadow-2xl overflow-hidden animate-scale-up"
        >
          {/* Top Bar Glow */}
          <div className="h-2.5 w-full bg-gradient-to-r from-[#FFD18D] via-[#FDECAD] to-[#F7E6C9]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#FAF4EB] hover:bg-[#F7E6C9] text-[#2D2319] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFD18D] text-[#2D2319] flex items-center justify-center shadow-md shadow-[#FFD18D]/30">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#2D2319] tracking-tight flex items-center gap-2">
                  <span>POINT OF SALE</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#F5F1BB] text-[#365314] border border-[#D9D384]">
                    Counter Sale
                  </span>
                </h3>
                <p className="text-xs text-[#6B5440]">
                  Record counter sale at <span className="font-semibold text-[#2D2319]">{outletName}</span>
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-[#F6DBD4] border border-[#E29D94] text-[#7C2D12] text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Product Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#6B5440] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#78350F]" />
                <span>Select Beverage Product</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setQuantity(1);
                  setError(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E2C799] bg-[#FAF4EB]/60 hover:bg-[#FAF4EB] text-[#2D2319] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFD18D] transition-all cursor-pointer"
              >
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.brand} {p.flavor_variant} ({p.packaging || 'Bottle'} {p.size_volume || '250ml'}) — On Shelf: {p.stock_quantity} units (৳{Number(p.base_price || 25).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Stock & Price Display Card */}
            <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B5440]">Current Shelf Stock</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-2xl font-black ${availableStock > 0 ? 'text-[#2D2319]' : 'text-[#B91C1C]'}`}>
                    {availableStock}
                  </span>
                  <span className="text-xs text-[#6B5440] font-medium">units</span>
                  {availableStock <= 15 && availableStock > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFD18D] text-[#78350F] font-bold border border-[#E2C799]">
                      Low Stock
                    </span>
                  )}
                  {availableStock === 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F6DBD4] text-[#7C2D12] font-bold border border-[#E29D94]">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#78350F]">Retail MRP (Tier 3)</p>
                <p className="text-xl font-black text-[#2D2319] font-mono mt-0.5">
                  ৳{unitPrice.toFixed(2)}
                </p>
                {outletUnitMargin > 0 && (
                  <span className="text-[10px] font-mono font-bold text-[#6B5440] block">
                    (Margin: +৳{outletUnitMargin.toFixed(2)}/u)
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Stepper & Quick Pills */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-wider text-[#6B5440]">
                  Sale Quantity (Units)
                </label>
                <span className="text-xs text-[#6B5440] font-mono">
                  Remaining After Sale: <strong className={remainingStock < 5 ? 'text-[#B45309]' : 'text-[#2D2319]'}>{remainingStock}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-2xl border border-[#E2C799] bg-[#FAF4EB] hover:bg-[#F7E6C9] text-[#2D2319] font-black text-lg transition-all cursor-pointer flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={availableStock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 py-2.5 px-4 text-center font-black text-lg rounded-2xl border border-[#E2C799] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#FFD18D] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  disabled={quantity >= availableStock}
                  className="w-11 h-11 rounded-2xl border border-[#E2C799] bg-[#FAF4EB] hover:bg-[#F7E6C9] disabled:opacity-40 text-[#2D2319] font-black text-lg transition-all cursor-pointer flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#6B5440] uppercase font-bold mr-1">Quick Add:</span>
                {[1, 2, 6, 12, 24].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickQty(amt)}
                    disabled={availableStock < amt}
                    className="px-2.5 py-1 text-xs rounded-xl bg-[#FAF4EB] hover:bg-[#FFD18D] hover:text-[#2D2319] text-[#433022] font-bold border border-[#E2C799]/60 transition-all disabled:opacity-30 cursor-pointer"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#6B5440]">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'Card', label: 'Card / POS', icon: CreditCard },
                  { id: 'bKash / MFS', label: 'bKash / MFS', icon: Smartphone },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMethod === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMethod(mode.id as any)}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#2D2319] bg-[#FFD18D] text-[#2D2319] ring-2 ring-[#FFD18D]/40'
                          : 'border-[#E2C799] bg-[#FAF4EB] hover:bg-[#F7E6C9] text-[#433022]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#2D2319]' : 'text-[#6B5440]'}`} />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Notes (Optional) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#6B5440] uppercase tracking-wider">
                Customer Name / Bill Note (Optional)
              </label>
              <input
                type="text"
                placeholder="Walk-in customer, takeaway..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E2C799] bg-[#FAF4EB]/60 text-[#2D2319] placeholder:text-[#6B5440]/60 focus:outline-none focus:ring-2 focus:ring-[#FFD18D]"
              />
            </div>

            {/* Total Due Banner */}
            <div className="p-3.5 rounded-2xl bg-[#2D2319] text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#F7E6C9] uppercase tracking-wider font-bold">Total Bill Payable (Retail)</p>
                <p className="text-xs text-[#FFD18D] font-medium">
                  {totalOutletProfit > 0 ? `Outlet Profit: +৳${totalOutletProfit.toFixed(2)}` : 'Includes all taxes'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#FFD18D] font-mono">
                  ৳{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-2xl border border-[#E2C799] hover:bg-[#FAF4EB] text-[#433022] font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || availableStock <= 0}
                className="flex-1 py-3 px-5 rounded-2xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2D2319]/25 disabled:opacity-40 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-[#FDECAD]/30 border-t-[#FDECAD] rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#FFD18D]" />
                    <span>Complete Sale (৳{totalAmount.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <SaleReceiptModal
        isOpen={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          onClose();
        }}
        receipt={receipt}
      />
    </>
  );
};
