import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Heart,
  Check,
  Zap,
  MapPin,
  ThermometerSnowflake,
  PackageCheck,
  Store,
  Phone,
  Calendar,
  CheckCircle2,
  CreditCard,
  Banknote,
  Smartphone,
  Sparkles,
  ArrowRight,
  Printer,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';
import {
  JACKET_PRESET_SVG,
  HELMET_PRESET_SVG,
  BIKE_PRESET_SVG,
  TSHIRT_PRESET_SVG,
} from '../../assets/merchandisePresets';
import { StripePaymentModal } from '../Payment/StripePaymentModal';

export interface AvailableOutlet {
  outlet_id: number;
  outlet_name: string;
  location_address: string;
  contact_phone?: string;
  status?: string;
  stock_quantity?: number;
  in_stock?: boolean;
}

export interface BeverageProduct {
  product_id: number;
  brand: string;
  flavor_variant: string;
  packaging?: string;
  size_volume?: string;
  sku?: string;
  base_price: number;
  supplier_price?: number;
  outlet_price?: number;
  retail_price?: number;
  category?: string;
  expiry_date?: string;
  image_url?: string;
  total_stock?: number;
  branch_stock?: number;
  available_outlets?: AvailableOutlet[];
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: BeverageProduct | null;
  onAddToCart?: (product: BeverageProduct, quantity: number) => void;
  onToggleWishlist?: (product: BeverageProduct) => void;
  isWishlisted?: boolean;
  branchName?: string;
  branchId?: number | string;
  onOrderSuccess?: (saleResult: any) => void;
}

// Brand helper images
const getFallbackImage = (brand: string, category?: string, flavor?: string): string => {
  const combined = ((brand || '') + ' ' + (category || '') + ' ' + (flavor || '')).toLowerCase();
  if (combined.includes('jacket')) return JACKET_PRESET_SVG;
  if (combined.includes('helmet')) return HELMET_PRESET_SVG;
  if (combined.includes('bike')) return BIKE_PRESET_SVG;
  if (combined.includes('tshirt') || combined.includes('t-shirt') || combined.includes('shirt')) return TSHIRT_PRESET_SVG;
  if (combined.includes('pepsi')) return pepsiImg;
  if (combined.includes('7up') || combined.includes('seven')) return sevenUpImg;
  if (combined.includes('dew') || combined.includes('mountain')) return dewImg;
  if (combined.includes('mirinda')) return mirindaImg;
  if (combined.includes('slice')) return sliceImg;
  if (combined.includes('aquafina') || combined.includes('water')) return aquafinaImg;
  return pepsiImg;
};

// Brand styling accents
const getBrandTheme = (brand: string, category?: string) => {
  const b = ((brand || '') + ' ' + (category || '')).toLowerCase();
  if (b.includes('merchandise') || b.includes('jacket') || b.includes('helmet') || b.includes('bike') || b.includes('tshirt')) {
    return {
      gradient: 'from-purple-600 via-indigo-600 to-pink-500',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      glow: 'shadow-purple-500/20',
      tag: 'Official Merchandise & Gear',
    };
  }
  if (b.includes('pepsi')) {
    return {
      gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      glow: 'shadow-blue-500/20',
      tag: 'PepsiCo Official',
    };
  }
  if (b.includes('dew') || b.includes('mountain')) {
    return {
      gradient: 'from-lime-500 via-emerald-600 to-teal-600',
      badge: 'bg-lime-50 text-lime-700 border-lime-200',
      glow: 'shadow-lime-500/20',
      tag: 'High Energy Dew',
    };
  }
  if (b.includes('7up') || b.includes('seven')) {
    return {
      gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      glow: 'shadow-emerald-500/20',
      tag: 'Crisp Lemon-Lime',
    };
  }
  if (b.includes('mirinda')) {
    return {
      gradient: 'from-amber-500 via-orange-600 to-red-500',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
      glow: 'shadow-orange-500/20',
      tag: 'Bold Orange Fizz',
    };
  }
  if (b.includes('slice')) {
    return {
      gradient: 'from-amber-400 via-yellow-500 to-orange-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      glow: 'shadow-amber-500/20',
      tag: 'Thick Alphonso Mango',
    };
  }
  return {
    gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    glow: 'shadow-blue-500/20',
    tag: 'Chilled Reserve',
  };
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false,
  branchName = 'All Outlets & Hubs',
  branchId,
  onOrderSuccess,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [fallbackOutlets, setFallbackOutlets] = useState<AvailableOutlet[]>([]);

  // Selected Outlet for customer purchase
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);

  // Order workflow states: 'details' -> 'checkout' -> 'success'
  const [orderStage, setOrderStage] = useState<'details' | 'checkout' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'bKash / MFS'>('Card');
  const [isStripeModalOpen, setIsStripeModalOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [saleReceipt, setSaleReceipt] = useState<any | null>(null);

  // Fetch registered outlets if product doesn't bundle them directly
  useEffect(() => {
    if (isOpen && (!product?.available_outlets || product.available_outlets.length === 0)) {
      fetch('http://localhost:8080/api/outlets')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const list: AvailableOutlet[] = (Array.isArray(data) ? data : []).map((o: any) => ({
            outlet_id: o.outlet_id ?? o.outletId,
            outlet_name: o.outlet_name ?? o.outletName ?? 'Franchise Outlet',
            location_address: o.location_address ?? o.locationAddress ?? 'City Center',
            contact_phone: o.contact_phone ?? o.contactPhone ?? '',
            status: o.status ?? 'Active',
            stock_quantity: 0,
            in_stock: false,
          }));
          setFallbackOutlets(list);
        })
        .catch(() => {});
    }
  }, [isOpen, product?.product_id, product?.available_outlets]);

  // Pre-select outlet based on branchId, branchName, or first in-stock outlet
  useEffect(() => {
    if (!isOpen || !product) {
      setOrderStage('details');
      setSaleReceipt(null);
      setOrderError(null);
      setQuantity(1);
      return;
    }

    const hubs = (product.available_outlets && product.available_outlets.length > 0)
      ? product.available_outlets
      : fallbackOutlets;

    if (hubs.length === 0) return;

    // 1. Try matching passed branchId
    if (branchId) {
      const matchId = hubs.find((h) => String(h.outlet_id) === String(branchId) && (h.stock_quantity ?? 0) > 0);
      if (matchId) {
        setSelectedOutletId(matchId.outlet_id);
        return;
      }
    }

    // 2. Try matching passed branchName
    if (branchName && branchName !== 'All Outlets & Hubs') {
      const matchName = hubs.find(
        (h) => h.outlet_name.toLowerCase().includes(branchName.toLowerCase()) && (h.stock_quantity ?? 0) > 0
      );
      if (matchName) {
        setSelectedOutletId(matchName.outlet_id);
        return;
      }
    }

    // 3. Fallback to first in-stock outlet
    const firstInStock = hubs.find((h) => (h.stock_quantity ?? 0) > 0);
    if (firstInStock) {
      setSelectedOutletId(firstInStock.outlet_id);
    } else {
      setSelectedOutletId(hubs[0].outlet_id);
    }
  }, [isOpen, product, branchId, branchName, fallbackOutlets]);

  if (!isOpen || !product) return null;

  const brandTheme = getBrandTheme(product.brand, product.category);
  const displayImage = product.image_url || getFallbackImage(product.brand, product.category, product.flavor_variant);

  // Resolve outlet list
  const allOutlets = (product.available_outlets && product.available_outlets.length > 0)
    ? product.available_outlets
    : fallbackOutlets;

  // Selected outlet object
  const selectedOutlet = allOutlets.find((o) => o.outlet_id === selectedOutletId) || allOutlets[0] || null;
  const selectedOutletStock = selectedOutlet?.stock_quantity ?? 0;
  const isSelectedOutletOutOfStock = selectedOutletStock <= 0;

  // Filter to hubs where stock > 0
  const availableHubs = allOutlets.filter(
    (outlet) => (outlet.stock_quantity !== undefined ? outlet.stock_quantity > 0 : Boolean(outlet.in_stock))
  );

  // Pricing: Tier 3 Customer Retail Price (MRP)
  const unitPrice = Number(product.retail_price ?? product.base_price ?? (product as any).basePrice ?? 0);
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    if (isSelectedOutletOutOfStock) return;
    setAddedAnimation(true);
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
    setTimeout(() => {
      setAddedAnimation(false);
    }, 1500);
  };

  const incrementQty = () => {
    const maxLimit = selectedOutletStock > 0 ? selectedOutletStock : 99;
    if (quantity < maxLimit) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  // Submit order to selected outlet
  const handlePlaceOrder = async () => {
    if (!selectedOutletId) {
      setOrderError('Please select a franchise outlet to fulfill your order.');
      return;
    }
    if (isSelectedOutletOutOfStock) {
      setOrderError('Selected outlet has insufficient stock for this product.');
      return;
    }
    if (quantity > selectedOutletStock) {
      setOrderError(`Only ${selectedOutletStock} units available at ${selectedOutlet?.outlet_name}.`);
      return;
    }

    if (paymentMethod === 'Card') {
      setIsStripeModalOpen(true);
      return;
    }

    setOrderSubmitting(true);
    setOrderError(null);

    try {
      const orderNotesFormatted = [
        customerName ? `Customer: ${customerName}` : '',
        customerPhone ? `Phone: ${customerPhone}` : '',
        customerNotes ? `Notes: ${customerNotes}` : '',
      ]
        .filter(Boolean)
        .join(' | ') || 'Customer Web Order (Pickup / Direct)';

      const res = await fetch(`http://localhost:8080/api/inventory/outlet/${selectedOutletId}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.product_id,
          quantity: quantity,
          payment_method: paymentMethod,
          customer_notes: orderNotesFormatted,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Failed to complete order checkout with outlet');
      }

      // Success! Update local outlet stock
      if (selectedOutlet) {
        selectedOutlet.stock_quantity = Math.max(0, (selectedOutlet.stock_quantity ?? quantity) - quantity);
        if (selectedOutlet.stock_quantity === 0) {
          selectedOutlet.in_stock = false;
        }
      }

      // Broadcast real-time event across browser tabs/windows
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'CUSTOMER_PURCHASE',
          outlet_id: selectedOutletId,
          outlet_name: selectedOutlet?.outlet_name,
          product_id: product.product_id,
          product_name: `${product.brand} ${product.flavor_variant}`,
          quantity: quantity,
          unit_price: unitPrice,
          total_amount: totalPrice,
          payment_method: paymentMethod,
          sale_code: data.sale_code,
          timestamp: new Date().toISOString(),
        });
        bc.close();
      } catch (ignored) {}

      try {
        localStorage.setItem(
          'fizzdrop_last_sale_event',
          JSON.stringify({
            outlet_id: selectedOutletId,
            timestamp: Date.now(),
          })
        );
      } catch (ignored) {}

      setSaleReceipt(data);
      setOrderStage('success');

      if (onOrderSuccess) onOrderSuccess(data);
      if (onAddToCart) onAddToCart(product, quantity);
    } catch (err: any) {
      setOrderError(err.message || 'An error occurred while placing order. Please try again.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      {/* Pop-up Window Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-3xl border border-blue-100 shadow-2xl shadow-blue-900/20 overflow-hidden transition-all duration-300 transform scale-100 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Top Decorative Cool Gradient Glow Bar */}
        <div className={`h-2.5 w-full bg-gradient-to-r ${brandTheme.gradient} shrink-0`} />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shadow-xs"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* STAGE 1: PRODUCT DETAILS & OUTLET SELECTION */}
        {orderStage === 'details' && (
          <div className="p-6 sm:p-7 overflow-y-auto space-y-5">
            {/* Top Section: Bottle Visual + Brand Tag */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Visual Box with Floating Shadow and Reflection */}
              <div className="relative w-36 h-40 sm:w-40 sm:h-44 rounded-2xl bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-slate-100/80 p-4 flex items-center justify-center shrink-0 border border-blue-100/80 overflow-hidden group shadow-inner">
                <div className="absolute inset-0 bg-radial from-blue-400/10 to-transparent pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <img
                  src={displayImage}
                  alt={`${product.brand} ${product.flavor_variant}`}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.18)] group-hover:scale-108 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getFallbackImage(product.brand, product.category, product.flavor_variant);
                  }}
                />
                <div className="absolute bottom-2 left-2 right-2 text-center">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/95 text-slate-700 border border-slate-200/80 shadow-xs">
                    {product.size_volume || '500ml'}
                  </span>
                </div>
              </div>

              {/* Product Meta & Badges */}
              <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${brandTheme.badge}`}>
                    {product.brand}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {product.category || 'Beverage'}
                  </span>
                </div>

                <div>
                  <h3 className="font-oswald text-2xl font-bold uppercase tracking-tight text-zinc-900 leading-tight">
                    {product.brand} {product.flavor_variant}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span className="font-mono text-[11px] text-slate-400">SKU: {product.sku || `FD-${product.product_id}`}</span>
                    <span>•</span>
                    <span>{product.packaging || 'PET Bottle'}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100">
                      <Calendar className="w-3 h-3 text-cyan-600" />
                      Exp: {product.expiry_date || '2027-04-15'}
                    </span>
                  </p>
                </div>

                {/* Retail Price (Tier 3 Customer MRP) & Stock Status */}
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                  <div>
                    <span className="text-3xl font-black text-blue-600 font-oswald tracking-tight">
                      ৳{unitPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] block font-medium text-slate-400 -mt-1">Retail Price (MRP)</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                    <span
                      className={`w-2 h-2 rounded-full ${isSelectedOutletOutOfStock ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}
                    />
                    <span className="text-xs font-semibold text-zinc-700">
                      {isSelectedOutletOutOfStock ? (
                        <span className="text-rose-600 font-bold">Out of stock at chosen outlet</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">{selectedOutletStock} in stock</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Specifications Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-blue-50/40 border border-blue-100/70 text-center">
              <div className="space-y-0.5">
                <ThermometerSnowflake className="w-4 h-4 mx-auto text-blue-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Serve At</span>
                <span className="text-xs font-bold font-mono text-zinc-900">3°C - 5°C</span>
              </div>
              <div className="space-y-0.5 border-l border-blue-100 sm:border-x">
                <Zap className="w-4 h-4 mx-auto text-amber-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Carbonation</span>
                <span className="text-xs font-bold text-zinc-900">High Fizz</span>
              </div>
              <div className="space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0">
                <PackageCheck className="w-4 h-4 mx-auto text-emerald-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Authenticity</span>
                <span className="text-xs font-bold text-zinc-900">100% Genuine</span>
              </div>
              <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-blue-100 pt-2 sm:pt-0">
                <Calendar className="w-4 h-4 mx-auto text-cyan-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Best Before</span>
                <span className="text-xs font-bold font-mono text-zinc-900">{product.expiry_date || '2027-04-15'}</span>
              </div>
            </div>

            {/* INTERACTIVE OUTLET SELECTOR (Customer selects which outlet to buy from) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/30 border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                      Select Franchise Outlet to Buy From
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Choose an outlet with available stock for real-time order routing
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {availableHubs.length} {availableHubs.length === 1 ? 'Hub in Stock' : 'Hubs in Stock'}
                </span>
              </div>

              {/* Outlets Radio/Card List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {allOutlets.length === 0 ? (
                  <div className="p-3.5 text-center rounded-xl bg-white border border-slate-200/90 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Currently unavailable at franchise outlets.</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Please check back soon after regional supplier restocks.</p>
                  </div>
                ) : (
                  allOutlets.map((outlet) => {
                    const isSelected = selectedOutletId === outlet.outlet_id;
                    const stockQty = outlet.stock_quantity ?? 0;
                    const inStock = stockQty > 0;

                    return (
                      <div
                        key={outlet.outlet_id}
                        onClick={() => {
                          setSelectedOutletId(outlet.outlet_id);
                          if (quantity > stockQty && stockQty > 0) {
                            setQuantity(stockQty);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-400/20'
                            : inStock
                            ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300'
                            : 'bg-slate-50/80 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="min-w-0 flex items-start gap-2.5">
                          {/* Radio Selector */}
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-zinc-900 leading-snug truncate">
                                {outlet.outlet_name}
                              </p>
                              {isSelected && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-600 text-white">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug line-clamp-1 mt-0.5">
                              {outlet.location_address}
                            </p>
                            {outlet.contact_phone && (
                              <p className="text-[10px] font-mono font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-blue-600" />
                                {outlet.contact_phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stock Quantity Badge */}
                        <div className="text-right shrink-0">
                          {inStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {stockQty} in stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              0 stock
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quantity Stepper & Price Calculation */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Quantity:
                </span>

                <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={decrementQty}
                    disabled={quantity <= 1 || isSelectedOutletOutOfStock}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-slate-600 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-9 text-center font-mono font-bold text-sm text-zinc-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={incrementQty}
                    disabled={quantity >= (selectedOutletStock > 0 ? selectedOutletStock : 1) || isSelectedOutletOutOfStock}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-slate-600 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Order Total
                </span>
                <span className="text-2xl font-black font-oswald text-blue-600">
                  ৳{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons: Add to Cart, Wishlist, and Order Direct from Outlet */}
            <div className="flex items-center gap-3 pt-1">
              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => onToggleWishlist && onToggleWishlist(product)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center group ${
                  isWishlisted
                    ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isWishlisted ? 'fill-rose-500 text-rose-500' : ''
                  }`}
                />
              </button>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={isSelectedOutletOutOfStock}
                className={`px-4 py-3.5 rounded-2xl font-bold text-xs border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5`}
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-slate-600" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              {/* Primary Direct Order Button (Proceed to Outlet Checkout) */}
              <button
                type="button"
                onClick={() => setOrderStage('checkout')}
                disabled={isSelectedOutletOutOfStock || !selectedOutletId}
                className="flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm text-white shadow-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>
                  {isSelectedOutletOutOfStock
                    ? 'Out of Stock'
                    : `Order from Outlet • ৳${totalPrice.toFixed(2)}`}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: CHECKOUT & PAYMENT SELECTION */}
        {orderStage === 'checkout' && (
          <div className="p-6 sm:p-7 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900">Complete Outlet Order</h4>
                  <p className="text-[11px] text-slate-500">Confirm pickup/delivery details & payment</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOrderStage('details')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                ← Back
              </button>
            </div>

            {/* Error banner */}
            {orderError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Summary Box */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Product:</span>
                <span className="font-bold text-zinc-900">
                  {quantity}x {product.brand} {product.flavor_variant} ({product.size_volume || '500ml'})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Fulfilling Outlet:</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  {selectedOutlet?.outlet_name}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Outlet Location:</span>
                <span className="text-[11px] text-slate-600 truncate max-w-[260px]">
                  {selectedOutlet?.location_address}
                </span>
              </div>

              <div className="pt-2 border-t border-blue-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Due (MRP):</span>
                <span className="text-2xl font-black font-oswald text-blue-600">৳{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Card', 'bKash / MFS'] as const).map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {method === 'Cash' && <Banknote className="w-4 h-4" />}
                      {method === 'Card' && <CreditCard className="w-4 h-4" />}
                      {method === 'bKash / MFS' && <Smartphone className="w-4 h-4" />}
                      <span>{method}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Contact Details */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Customer Details (For Outlet Pickup / Verification)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Your Name (e.g. Asif Rahman)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                />
                <input
                  type="text"
                  placeholder="Phone (e.g. 017XXXXXXXX)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>
              <input
                type="text"
                placeholder="Order Notes / Delivery instructions (optional)"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            {/* Confirm & Place Order Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={orderSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {orderSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Routing Order to Outlet...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>Confirm Order & Pay ৳{totalPrice.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: ORDER SUCCESS & DIGITAL RECEIPT */}
        {orderStage === 'success' && saleReceipt && (
          <div className="p-6 sm:p-7 overflow-y-auto space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Order Placed Successfully
              </span>
              <h3 className="font-oswald text-2xl font-bold uppercase text-zinc-900 mt-1">
                Thank You for Your Order!
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your purchase has been recorded and shelf stock updated at the outlet.
              </p>
            </div>

            {/* Printable Receipt Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-sans">
                <div>
                  <p className="font-bold text-zinc-900">{saleReceipt.outlet_name || selectedOutlet?.outlet_name}</p>
                  <p className="text-[11px] text-slate-500">{selectedOutlet?.location_address}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                    {saleReceipt.sale_code}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Product:</span>
                <span className="font-bold text-zinc-900">{saleReceipt.product_name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Quantity Sold:</span>
                <span className="font-bold text-zinc-900">{saleReceipt.quantity_sold} units</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Unit Retail Price:</span>
                <span className="font-bold text-zinc-900">৳{Number(saleReceipt.unit_price).toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Payment Method:</span>
                <span className="font-bold text-emerald-700">{saleReceipt.payment_method}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold font-sans">
                <span className="text-zinc-800">Total Paid:</span>
                <span className="text-xl font-oswald text-blue-600">৳{Number(saleReceipt.total_amount).toFixed(2)}</span>
              </div>

              <div className="text-[10px] text-slate-400 pt-1 border-t border-dashed border-slate-200 flex items-center justify-between">
                <span>Remaining Shelf Stock: {saleReceipt.remaining_stock} units</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Stripe Elements Modal for Customer Checkout */}
      {selectedOutletId && product && (
        <StripePaymentModal
          isOpen={isStripeModalOpen}
          onClose={() => setIsStripeModalOpen(false)}
          amount={totalPrice}
          paymentType="CONSUMER_ORDER"
          title={`Order: ${product.brand} ${product.flavor_variant}`}
          description={`Customer Order for ${quantity}x ${product.brand} at ${selectedOutlet?.outlet_name || 'Outlet'}`}
          referenceId={`ORD-${Date.now().toString().slice(-6)}`}
          metadata={{
            outlet_id: String(selectedOutletId),
            product_id: String(product.product_id),
            quantity: String(quantity),
          }}
          payloadData={{
            outlet_id: selectedOutletId,
            product_id: product.product_id,
            quantity: quantity,
          }}
          onSuccess={(confirmData) => {
            if (selectedOutlet) {
              selectedOutlet.stock_quantity = Math.max(0, (selectedOutlet.stock_quantity ?? quantity) - quantity);
              if (selectedOutlet.stock_quantity === 0) {
                selectedOutlet.in_stock = false;
              }
            }
            setSaleReceipt({
              sale_code: confirmData.sale_code || 'SL-STRIPE-' + Date.now().toString().slice(-6),
              outlet_name: selectedOutlet?.outlet_name || 'Authorized Franchise Hub',
              outlet_address: selectedOutlet?.location_address || 'Regional Logistics Hub',
              product_name: `${product.brand} ${product.flavor_variant}`,
              quantity: quantity,
              unit_price: unitPrice,
              total_amount: totalPrice,
              payment_method: 'Stripe Card (Verified)',
              remaining_stock: Math.max(0, (selectedOutlet?.stock_quantity ?? quantity) - quantity),
            });
            setOrderStage('success');
            if (onAddToCart) onAddToCart(product, quantity);
          }}
        />
      )}
    </div>
  );
};

export default ProductDetailModal;
