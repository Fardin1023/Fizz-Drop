import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Store,
  Package,
  Check,
  AlertCircle,
  TrendingUp,
  PackageX,
  ShieldAlert,
  ArrowRight,
  AlertOctagon,
} from 'lucide-react';
import { ZeroStockAlertModal, type ZeroStockAlertData } from '../../components/Alerts/ZeroStockAlertModal';
import { groupOutletsByFranchise } from '../../utils/franchiseUtils';

export interface OutletOption {
  outlet_id: number;
  outlet_name: string;
  franchise_name?: string;
  branch_name?: string;
  location_address?: string;
  city?: string;
  area?: string;
  contact_phone?: string;
  status?: string;
  division_name?: string;
}

export interface ProductOption {
  product_id: number;
  brand: string;
  flavor_variant: string;
  category?: string;
  sku?: string;
  base_price?: number | string;
  image_url?: string;
  total_stock?: number;
  central_stock?: number;
  supplier_stock?: number;
  available_outlets?: Array<{
    outlet_id: number;
    stock_quantity: number;
  }>;
}

interface SupplyStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplied?: () => void;
  onSuccess?: () => void;
  onRequestStock?: (productId?: number) => void;
  products?: ProductOption[];
  outlets: OutletOption[];
  initialProductId?: number | null;
  initialOutletId?: number | null;
  userId?: number;
}

export const SupplyStockModal: React.FC<SupplyStockModalProps> = ({
  isOpen,
  onClose,
  onSupplied,
  onSuccess,
  onRequestStock,
  products = [],
  outlets,
  initialProductId = null,
  initialOutletId = null,
  userId = 4,
}) => {
  const [internalProducts, setInternalProducts] = useState<ProductOption[]>(products);
  const effectiveProducts = internalProducts.length > 0 ? internalProducts : products;
  const groupedFranchises = React.useMemo(() => groupOutletsByFranchise(outlets), [outlets]);

  const [selectedProductId, setSelectedProductId] = useState<number | string>(
    initialProductId || (effectiveProducts.length > 0 ? effectiveProducts[0].product_id : '')
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

  // Animated Zero-Stock Alert Modal state
  const [isZeroStockAlertOpen, setIsZeroStockAlertOpen] = useState<boolean>(false);
  const [zeroStockAlertData, setZeroStockAlertData] = useState<ZeroStockAlertData | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetch(`http://localhost:8080/api/products?userId=${userId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setInternalProducts(data);
          }
        })
        .catch(() => {});
    } else if (products.length > 0) {
      setInternalProducts(products);
    }
  }, [isOpen, userId, products]);

  useEffect(() => {
    if (initialProductId) setSelectedProductId(initialProductId);
    if (initialOutletId) setSelectedOutletId(initialOutletId);
  }, [initialProductId, initialOutletId, isOpen]);

  useEffect(() => {
    if (effectiveProducts.length > 0) {
      const exists = effectiveProducts.some((p) => String(p.product_id) === String(selectedProductId));
      if (!exists) {
        setSelectedProductId(effectiveProducts[0].product_id);
      }
    }
    if (outlets.length > 0) {
      const exists = outlets.some((o) => String(o.outlet_id) === String(selectedOutletId));
      if (!exists) {
        setSelectedOutletId(outlets[0].outlet_id);
      }
    }
  }, [effectiveProducts, outlets, selectedProductId, selectedOutletId]);

  if (!isOpen) return null;

  const currentProduct = effectiveProducts.find((p) => String(p.product_id) === String(selectedProductId));
  const currentOutlet = outlets.find((o) => String(o.outlet_id) === String(selectedOutletId));
  const availableDepotStock = currentProduct?.supplier_stock ?? 0;

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

    // Zero-Stock Alert Trigger: If supplier has 0 stock in depot
    if (availableDepotStock <= 0) {
      setZeroStockAlertData({
        productName: `${currentProduct?.brand || 'Beverage'} ${currentProduct?.flavor_variant || ''}`,
        productId: currentProduct?.product_id,
        outletName: currentOutlet?.outlet_name,
        category: currentProduct?.category,
        sku: currentProduct?.sku,
      });
      setIsZeroStockAlertOpen(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setError('No stocks available in your regional depot, so cannot dispatch to outlets.');
      return;
    }

    if (qty > availableDepotStock) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setError(`Cannot dispatch ${qty} units: Your regional depot only has ${availableDepotStock} cases in stock.`);
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
          user_id: userId || 4,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to dispatch inventory to outlet');
      }

      setSuccessMsg(
        `Successfully supplied ${qty} units to ${currentOutlet?.outlet_name || 'outlet'}!`
      );

      // Broadcast real-time dispatch notification to Outlet tabs
      try {
        const channel = new BroadcastChannel('fizzdrop_realtime_events');
        channel.postMessage({
          recipientRole: 'OUTLET',
          recipientUserId: Number(selectedOutletId),
          title: `Stock Dispatched: ${data.product_name || selectedProduct?.brand || 'Beverage Product'}`,
          message: `Regional Supplier dispatched ${qty} units to ${currentOutlet?.outlet_name || 'your outlet'}. Added to shelf stock!`,
          type: 'APPROVED',
          referenceCode: `DISPATCH-${selectedOutletId}`,
          referenceId: Number(selectedOutletId),
        });
        setTimeout(() => channel.close(), 100);
      } catch (e) {}

      setTimeout(() => {
        if (onSupplied) onSupplied();
        if (onSuccess) onSuccess();
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
        className={`relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-blue-900/15 overflow-hidden transition-all duration-300 transform scale-100 ${
          isShaking ? 'animate-shake ring-4 ring-rose-500/40' : ''
        }`}
      >
        {/* Top Header Glow Bar */}
        <div className={`h-2 w-full transition-all duration-300 ${
          availableDepotStock <= 0 
            ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 animate-pulse'
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500'
        }`} />

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
            <div className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md transition-all ${
              availableDepotStock <= 0
                ? 'bg-gradient-to-tr from-rose-600 to-red-600 shadow-rose-500/30'
                : 'bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-blue-500/20'
            }`}>
              {availableDepotStock <= 0 ? (
                <PackageX className="w-5 h-5 animate-bounce" />
              ) : (
                <Truck className="w-5 h-5" />
              )}
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
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 animate-pulse" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Persistent Animated Zero-Stock Banner if Depot has 0 Stock */}
          {availableDepotStock <= 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-300 text-rose-900 text-xs shadow-md shadow-rose-500/10 animate-shake">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 animate-pulse">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-oswald uppercase font-bold text-xs text-rose-950 tracking-wider">
                      Zero Stock Alert — Cannot Dispatch
                    </span>
                    <span className="font-mono text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 uppercase tracking-widest animate-pulse">
                      0 Cases
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-rose-800 leading-snug">
                    You currently have <strong>0 stock</strong> for this item in your regional depot. Please request stock from Superadmin before dispatching to outlets.
                  </p>
                  {onRequestStock && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestStock(currentProduct?.product_id);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                    >
                      <Truck className="w-3 h-3" />
                      <span>Request Stock from Superadmin</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
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
                {effectiveProducts.map((p) => (
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {groupedFranchises.map((group) => (
                    <optgroup
                      key={group.franchiseName}
                      label={`🏢 ${group.franchiseName} (${group.totalBranches} ${group.totalBranches === 1 ? 'Branch' : 'Branches'})`}
                    >
                      {group.branches.map((o) => (
                        <option key={o.outlet_id} value={o.outlet_id}>
                          {o.branch_name || o.outlet_name} — {o.city ? `${o.city}${o.area ? ` • ${o.area}` : ''}` : o.location_address || 'City Center'}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Supplier Depot Stock & Category Information Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/90 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Your Available Depot Stock
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                    Category: {currentProduct?.category || 'Beverage'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-oswald text-xl font-black text-emerald-800 block">
                  {(currentProduct?.supplier_stock ?? 0).toLocaleString()} <span className="text-xs font-sans font-bold">cases</span>
                </span>
                <span className="text-[9px] text-emerald-600 font-mono">
                  {(currentProduct?.supplier_stock ?? 0) > 0 ? 'In Regional Depot' : 'Empty (Request Stock)'}
                </span>
              </div>
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

            {/* 3-Tier Pricing Preview: Wholesale to Outlet & Supplier Profit */}
            {currentProduct && (() => {
              const buyRate = Number((currentProduct as any).supplier_price || (currentProduct as any).base_price || 0);
              const sellRate = Number((currentProduct as any).outlet_price || (currentProduct as any).base_price || 0);
              const qty = Number(quantity) || 0;
              const dispatchTotal = sellRate * qty;
              const profitTotal = (sellRate - buyRate) * qty;

              return (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 border border-indigo-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 font-mono">
                      Multi-Tier Commercial Settlement
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                      Tier 2 Wholesale
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <div className="p-2 rounded-xl bg-white/80 border border-blue-100">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Supplier Cost</span>
                      <span className="font-mono font-bold text-slate-700 text-xs">৳{buyRate.toFixed(2)}/u</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 border border-indigo-100">
                      <span className="text-[9px] text-indigo-600 block uppercase font-bold">Wholesale Sell</span>
                      <span className="font-mono font-bold text-indigo-900 text-xs">৳{sellRate.toFixed(2)}/u</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 border border-emerald-100">
                      <span className="text-[9px] text-emerald-600 block uppercase font-bold">Supplier Profit</span>
                      <span className="font-mono font-bold text-emerald-700 text-xs">+{((sellRate - buyRate)).toFixed(2)}/u</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-indigo-100 text-slate-700">
                    <span className="text-[11px] font-semibold">Total Wholesale Bill to Outlet:</span>
                    <div className="text-right">
                      <span className="font-mono font-black text-sm text-indigo-900">
                        ৳{dispatchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {profitTotal > 0 && (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 block">
                          (Net Supplier Profit: +৳{profitTotal.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

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
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                availableDepotStock <= 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 animate-pulse active:scale-95'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-500/20 active:scale-95'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={availableDepotStock <= 0 ? 'No stocks in depot - Click to view alert' : undefined}
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching to Outlet...</span>
                </>
              ) : availableDepotStock <= 0 ? (
                <>
                  <PackageX className="w-4 h-4 animate-bounce" />
                  <span>Cannot Dispatch (0 Stock)</span>
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

      {/* Animated Pop-in Zero-Stock Alert Modal */}
      <ZeroStockAlertModal
        isOpen={isZeroStockAlertOpen}
        onClose={() => setIsZeroStockAlertOpen(false)}
        onRequestStock={onRequestStock}
        data={zeroStockAlertData}
      />
    </div>
  );
};
