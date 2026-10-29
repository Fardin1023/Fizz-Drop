import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Plus,
  Minus,
  Truck,
  Send,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Printer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { broadcastRealtimeEvent } from '../../utils/broadcast';
import { InvoiceModal, type InvoiceData } from '../../components/Invoice/InvoiceModal';
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';

const getBrandImage = (brand: string): string => {
  const b = (brand || '').toLowerCase();
  if (b.includes('pepsi')) return pepsiImg;
  if (b.includes('7up') || b.includes('seven')) return sevenUpImg;
  if (b.includes('dew') || b.includes('mountain')) return dewImg;
  if (b.includes('mirinda')) return mirindaImg;
  if (b.includes('slice')) return sliceImg;
  if (b.includes('aquafina') || b.includes('water')) return aquafinaImg;
  return pepsiImg;
};

interface ProductCatalogItem {
  product_id: number;
  brand: string;
  flavor_variant: string;
  packaging: string;
  size_volume: string;
  sku: string;
  base_price: number | string;
  category: string;
  expiry_date?: string;
  image_url?: string;
  total_stock?: number;
}

interface SupplierRequestStockProps {
  onRequisitionSubmitted?: (requisitionCode: string) => void;
  onNavigateToSettings?: () => void;
  initialProductId?: number;
}

export const SupplierRequestStock: React.FC<SupplierRequestStockProps> = ({
  onRequisitionSubmitted,
  onNavigateToSettings,
  initialProductId,
}) => {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Quantities selected: productId -> quantity
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [urgency, setUrgency] = useState<'LOW' | 'NORMAL' | 'CRITICAL'>('NORMAL');
  const [remarks, setRemarks] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CORPORATE_BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [submittedRequisition, setSubmittedRequisition] = useState<InvoiceData | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profRes, prodRes] = await Promise.all([
        fetch(`http://localhost:8080/api/v1/supplier/profile?userId=${user?.user_id || 4}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch('http://localhost:8080/api/products'),
      ]);

      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
        if (profData.default_payment_method) {
          setPaymentMethod(profData.default_payment_method);
        }
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
    } catch (err) {
      console.error('Error fetching requisition catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialProductId && products.some((p) => p.product_id === initialProductId)) {
      setQuantities((prev) => ({
        ...prev,
        [initialProductId]: prev[initialProductId] || 10,
      }));
    }
  }, [initialProductId, products]);

  const handleQtyChange = (productId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleManualQty = (productId: number, val: string) => {
    const num = parseInt(val, 10);
    const safe = isNaN(num) ? 0 : Math.max(0, num);
    setQuantities((prev) => {
      if (safe === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: safe };
    });
  };

  const selectedEntries = Object.entries(quantities).map(([pId, qty]) => {
    const prod = products.find((p) => p.product_id === Number(pId));
    return {
      product: prod,
      quantity: qty,
    };
  }).filter((e) => e.product && e.quantity > 0);

  const totalCasesRequested = selectedEntries.reduce((sum, e) => sum + e.quantity, 0);

  const subtotal = selectedEntries.reduce(
    (sum, e) => sum + (Number(e.product!.base_price || 48) * e.quantity),
    0
  );
  const vatAmount = subtotal * 0.05;
  const grandTotal = subtotal + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEntries.length === 0) {
      setErrorMsg('Please select at least one beverage line and quantity before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        urgency,
        supplier_remarks: remarks,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        items: selectedEntries.map((e) => ({
          product_id: e.product!.product_id,
          requested_quantity: e.quantity,
        })),
      };

      const res = await fetch(`http://localhost:8080/api/v1/supplier/requisitions?userId=${user?.user_id || 4}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit stock requisition.');
      }

      const created = await res.json();
      setSubmittedRequisition(created);
      setSuccessMsg(`Requisition ${created.requisition_code} submitted successfully with PENDING status! Tax Invoice is available below.`);
      setQuantities({});
      setRemarks('');
      setUrgency('NORMAL');

      // Broadcast real-time alert to Superadmin
      broadcastRealtimeEvent({
        type: 'NEW_REQUISITION',
        recipientRole: 'SUPERADMIN',
        title: `New Stock Requisition: ${created.requisition_code}`,
        message: `Supplier submitted a requisition ticket for ${totalCasesRequested} cases (${selectedEntries.length} SKUs). Payment Method: ${paymentMethod.replace(/_/g, ' ')}.`,
        referenceCode: created.requisition_code,
        referenceId: created.id,
      });

      // Allow user to download invoice right away or navigate
      if (onRequisitionSubmitted) {
        setTimeout(() => onRequisitionSubmitted(created.requisition_code), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.brand.toLowerCase().includes(term) ||
      p.flavor_variant.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term);
    const matchesCat = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-500 font-semibold">Loading product requisition catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Pinned Operating District Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                LOCKED REGION
              </span>
              <h2 className="font-oswald text-base font-bold text-zinc-900 uppercase tracking-tight">
                Operating Territory: <strong className="text-blue-600">{profile?.district_name || 'Dhaka'}</strong> ({profile?.division_name || 'Dhaka'} Division)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Depot: <span className="font-semibold text-zinc-700">{profile?.business_name || 'Central Beverage Depot'}</span> • Address: {profile?.depot_address || 'Central Hub'}
            </p>
          </div>
        </div>

        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Change Depot Territory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Left Column = Product Picker Grid (2/3); Right Column = Requisition Summary & Commit (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Product Search & Counter Grid */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filter Bar */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by brand, flavor, or SKU..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-800 font-medium focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Product Cards Grid or Zero-Data Empty State */}
          {filteredProducts.length === 0 ? (
            <div className="py-16 px-4 rounded-3xl bg-white border border-slate-200/90 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-oswald text-base font-bold text-zinc-800 uppercase">
                  {products.length === 0
                    ? 'No Products Available from Superadmin'
                    : 'No Products Match Your Filter'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {products.length === 0
                    ? 'The central product catalog is currently empty. Once Superadmin registers products and central warehouse stock, they will appear here for you to order.'
                    : 'Try searching with another keyword or resetting the category filter.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredProducts.map((p) => {
              const displayImg = p.image_url || getBrandImage(p.brand);
              const qty = quantities[p.product_id] || 0;
              const isSelected = qty > 0;

              return (
                <div
                  key={p.product_id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={displayImg}
                        alt={p.brand}
                        className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getBrandImage(p.brand);
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
                          {p.brand}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {p.packaging} • {p.size_volume}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-zinc-900 truncate mt-0.5">
                        {p.brand} {p.flavor_variant}
                      </h3>

                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="font-oswald font-bold text-blue-700">
                          ৳{Number(p.base_price || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          SKU: {p.sku}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Counter Control */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Request Cases:
                    </span>

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(p.product_id, -10)}
                        className="w-7 h-7 rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-90"
                        title="Subtract 10 cases"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={qty || ''}
                        onChange={(e) => handleManualQty(p.product_id, e.target.value)}
                        placeholder="0"
                        className="w-12 text-center text-xs font-mono font-bold bg-transparent text-zinc-900 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleQtyChange(p.product_id, 10)}
                        className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-90"
                        title="Add 10 cases"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Right Column: Requisition Summary, Urgency Selector & Submission */}
        <div className="space-y-4">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-sm space-y-4 sticky top-20"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-oswald text-base font-bold uppercase text-zinc-900 tracking-tight flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Requisition Order Summary
              </h3>
              <p className="text-[11px] text-slate-500">
                Destination: <strong className="text-zinc-800">{profile?.district_name || 'Dhaka'} Depot</strong>
              </p>
            </div>

            {/* Selected Items List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedEntries.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <Package className="w-6 h-6 mx-auto opacity-50" />
                  <p className="text-xs">No beverages selected yet.</p>
                  <p className="text-[10px] text-slate-400">Use the (+) buttons on the left to add requested quantities.</p>
                </div>
              ) : (
                selectedEntries.map((e) => (
                  <div
                    key={e.product!.product_id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-zinc-900 truncate">
                        {e.product!.brand} {e.product!.flavor_variant}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {e.product!.size_volume} • {e.product!.packaging}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-lg shrink-0">
                      {e.quantity} cases
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Total Counter Box */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
                  Total Requisition
                </span>
                <span className="text-[11px] text-blue-600 font-medium">
                  {selectedEntries.length} unique SKU lines
                </span>
              </div>
              <span className="font-oswald text-2xl font-black text-blue-700">
                {totalCasesRequested} <span className="text-xs font-sans font-bold">cases</span>
              </span>
            </div>

            {/* Commercial Payment Method Selection */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Consignment Payment Method *</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'CORPORATE_BANK_TRANSFER', label: 'Bank Wire / EFT', desc: 'Dutch-Bangla / BRAC' },
                  { id: 'BKASH_MERCHANT', label: 'bKash B2B', desc: 'Merchant Direct' },
                  { id: 'NET_30_CREDIT', label: 'Net-30 Terms', desc: 'Corporate Credit' },
                  { id: 'COMPANY_CHEQUE', label: 'Company Cheque', desc: 'On Depot Delivery' },
                ].map((pm) => (
                  <label
                    key={pm.id}
                    className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethod === pm.id
                        ? 'bg-indigo-50/80 ring-2 ring-indigo-500 border-indigo-400 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{pm.label}</span>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.id}
                        checked={paymentMethod === pm.id}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">{pm.desc}</span>
                  </label>
                ))}
              </div>

              {/* Payment Reference Input */}
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Optional Bank Slip # / Cheque # / TrxID..."
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {/* Live Financial Breakdown Box */}
            {selectedEntries.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Merchandise Subtotal:</span>
                  <span className="font-mono font-bold">৳ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Wholesale VAT (5% Mushak):</span>
                  <span className="font-mono font-bold">৳ {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-indigo-950 border-t border-indigo-200/80 pt-1.5">
                  <span>Estimated Total:</span>
                  <span className="font-mono text-indigo-600 font-black">
                    ৳ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Urgency Radio Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                Logistics Urgency *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'LOW', label: 'Low', desc: 'Buffer', color: 'border-slate-200 text-slate-700' },
                  { id: 'NORMAL', label: 'Standard', desc: 'Routine', color: 'border-blue-300 text-blue-700 bg-blue-50' },
                  { id: 'CRITICAL', label: 'Critical', desc: 'Stock-Out', color: 'border-rose-300 text-rose-700 bg-rose-50' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all flex flex-col justify-center ${
                      urgency === opt.id
                        ? 'ring-2 ring-blue-500 bg-blue-50/80 border-blue-400 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={opt.id}
                      checked={urgency === opt.id}
                      onChange={() => setUrgency(opt.id as any)}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[9px] font-mono opacity-70">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Supplier Remarks */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                Supplier Operations Remarks
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Specific delivery window, offload bay, or emergency shortage note..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            {/* Submit Requisition CTA */}
            <button
              type="submit"
              disabled={submitting || selectedEntries.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting to Superadmin...' : 'Commit Stock Requisition'}</span>
            </button>

            {/* Immediate Download Invoice Action if just submitted */}
            {submittedRequisition && (
              <button
                type="button"
                onClick={() => setIsInvoiceOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>View & Download Tax Invoice ({submittedRequisition.requisition_code})</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Downloadable Tax Invoice Modal */}
      <InvoiceModal
        invoice={submittedRequisition}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};

export default SupplierRequestStock;
