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
  UserCheck,
  MapPin,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { ZeroStockAlertModal, type ZeroStockAlertData } from '../../components/Alerts/ZeroStockAlertModal';
import { groupOutletsByFranchise } from '../../utils/franchiseUtils';

export interface SalesOfficerOption {
  id: number;
  officer_code: string;
  name: string;
  email?: string;
  phone: string;
  supplier_id: number;
  city: string;
  assigned_area: string;
  status: string;
  outlet_count?: number;
}

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
  outlets?: OutletOption[];
  salesOfficers?: SalesOfficerOption[];
  initialProductId?: number | null;
  initialOutletId?: number | null;
  initialOfficerId?: number | null;
  userId?: number;
}

export const SupplyStockModal: React.FC<SupplyStockModalProps> = ({
  isOpen,
  onClose,
  onSupplied,
  onSuccess,
  onRequestStock,
  products = [],
  outlets = [],
  salesOfficers = [],
  initialProductId = null,
  initialOutletId = null,
  initialOfficerId = null,
  userId = 4,
}) => {
  const [internalProducts, setInternalProducts] = useState<ProductOption[]>(products);
  const effectiveProducts = internalProducts.length > 0 ? internalProducts : products;
  const [internalOfficers, setInternalOfficers] = useState<SalesOfficerOption[]>(salesOfficers);

  const [selectedProductId, setSelectedProductId] = useState<number | string>(
    initialProductId || (effectiveProducts.length > 0 ? effectiveProducts[0].product_id : '')
  );
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | string>(
    initialOfficerId || (internalOfficers.length > 0 ? internalOfficers[0].id : '')
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
      // Fetch products
      fetch(`http://localhost:8080/api/products?userId=${userId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setInternalProducts(data);
          }
        })
        .catch(() => {});

      // Fetch Sales Officers assigned to this supplier
      fetch(`http://localhost:8080/api/v1/supplier/sales-officers?userId=${userId}`)
        .then((r) => r.json())
        .then((data) => {
          const list = data?.sales_officers || data;
          if (Array.isArray(list) && list.length > 0) {
            setInternalOfficers(list);
            if (!initialOfficerId && (!selectedOfficerId || selectedOfficerId === '')) {
              setSelectedOfficerId(list[0].id);
            }
          }
        })
        .catch(() => {});
    } else if (products.length > 0) {
      setInternalProducts(products);
    }
  }, [isOpen, userId, products]);

  useEffect(() => {
    if (initialProductId) setSelectedProductId(initialProductId);
    if (initialOfficerId) setSelectedOfficerId(initialOfficerId);
    if (initialOutletId) setSelectedOutletId(initialOutletId);
  }, [initialProductId, initialOfficerId, initialOutletId, isOpen]);

  useEffect(() => {
    if (effectiveProducts.length > 0) {
      const exists = effectiveProducts.some((p) => String(p.product_id) === String(selectedProductId));
      if (!exists) {
        setSelectedProductId(effectiveProducts[0].product_id);
      }
    }
    if (internalOfficers.length > 0) {
      const exists = internalOfficers.some((so) => String(so.id) === String(selectedOfficerId));
      if (!exists && (!selectedOfficerId || selectedOfficerId === '')) {
        setSelectedOfficerId(internalOfficers[0].id);
      }
    }
  }, [effectiveProducts, internalOfficers, selectedProductId, selectedOfficerId]);

  if (!isOpen) return null;

  const currentProduct = effectiveProducts.find((p) => String(p.product_id) === String(selectedProductId));
  const currentOfficer = internalOfficers.find((so) => String(so.id) === String(selectedOfficerId));
  const availableDepotStock = currentProduct?.supplier_stock ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const qty = Number(quantity);
    if (!selectedProductId) {
      setError('Please select a beverage product.');
      return;
    }
    if (!selectedOfficerId && internalOfficers.length > 0) {
      setError('Please select a Sales Officer.');
      return;
    }

    // Zero-Stock Alert Trigger: If supplier has 0 stock in depot
    if (availableDepotStock <= 0) {
      setZeroStockAlertData({
        productName: `${currentProduct?.brand || 'Beverage'} ${currentProduct?.flavor_variant || ''}`,
        productId: currentProduct?.product_id,
        outletName: currentOfficer ? `Sales Officer: ${currentOfficer.name} (${currentOfficer.assigned_area})` : 'Target Territory',
        category: currentProduct?.category,
        sku: currentProduct?.sku,
      });
      setIsZeroStockAlertOpen(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setError('No stocks available in your regional depot, so cannot dispatch to Sales Officer.');
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
      const payload: Record<string, any> = {
        product_id: Number(selectedProductId),
        quantity: qty,
        mode,
        notes: notes.trim() || undefined,
        user_id: userId || 4,
      };

      if (selectedOfficerId) {
        payload.sales_officer_id = Number(selectedOfficerId);
      }
      if (selectedOutletId) {
        payload.outlet_id = Number(selectedOutletId);
      }

      const res = await fetch('http://localhost:8080/api/inventory/supply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to dispatch inventory to Sales Officer');
      }

      setSuccessMsg(
        `Successfully dispatched ${qty} units to Sales Officer ${currentOfficer?.name || 'Assigned Officer'} (${currentOfficer?.assigned_area || 'Zone'})!`
      );

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
                Wholesale Supply to Sales Officer
              </h3>
              <p className="text-xs text-slate-500">
                Dispatch beverage stock directly to your Superadmin-assigned Sales Officer for their designated area
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
                    You currently have <strong>0 stock</strong> for this item in your regional depot. Please request stock from Superadmin before dispatching.
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

            {/* 2. Target Sales Officer (Assigned by Superadmin) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Target Sales Officer & Assigned Area
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Superadmin Assigned
                </span>
              </label>
              {internalOfficers.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  No Sales Officers assigned to your Hub yet. Superadmin assigns Sales Officers for your allocated areas.
                </div>
              ) : (
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {internalOfficers.map((so) => (
                    <option key={so.id} value={so.id}>
                      👮 {so.name} ({so.officer_code}) • Area: {so.assigned_area}, {so.city} ({so.outlet_count || 0} Outlets)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Sales Officer & Territory Info Banner */}
            {currentOfficer && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Territory Area
                  </span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    {currentOfficer.assigned_area}, {currentOfficer.city}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Officer Contact
                  </span>
                  <span className="font-mono text-slate-700 text-[11px] font-semibold">
                    {currentOfficer.phone}
                  </span>
                </div>
              </div>
            )}

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

            {/* 3. Quantity to Supply & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Quantity to Dispatch
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={availableDepotStock > 0 ? availableDepotStock : 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Enter case quantity"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">cases</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Stock Action
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'ADD' | 'SET')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="ADD">➕ Add to Territory Allocation</option>
                  <option value="SET">🔄 Set Exact Area Allocation</option>
                </select>
              </div>
            </div>

            {/* 4. Notes / Dispatch Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Dispatch Remarks / Gate Pass (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Batch 402 - Direct Wholesale Delivery to Sales Officer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableDepotStock <= 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                availableDepotStock <= 0
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 active:scale-95'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch to Sales Officer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Embedded Zero Stock Warning Modal */}
      <ZeroStockAlertModal
        isOpen={isZeroStockAlertOpen}
        onClose={() => setIsZeroStockAlertOpen(false)}
        onRequestStock={(productId) => {
          setIsZeroStockAlertOpen(false);
          onClose();
          if (onRequestStock) onRequestStock(productId);
        }}
        data={zeroStockAlertData}
      />
    </div>
  );
};
