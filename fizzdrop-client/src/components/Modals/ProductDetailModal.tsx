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
} from 'lucide-react';
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';

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
}

// Brand helper images
const getFallbackImage = (brand: string): string => {
  const b = (brand || '').toLowerCase();
  if (b.includes('pepsi')) return pepsiImg;
  if (b.includes('7up') || b.includes('seven')) return sevenUpImg;
  if (b.includes('dew') || b.includes('mountain')) return dewImg;
  if (b.includes('mirinda')) return mirindaImg;
  if (b.includes('slice')) return sliceImg;
  if (b.includes('aquafina') || b.includes('water')) return aquafinaImg;
  return pepsiImg;
};

// Brand styling accents
const getBrandTheme = (brand: string) => {
  const b = (brand || '').toLowerCase();
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
}) => {
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [fallbackOutlets, setFallbackOutlets] = useState<AvailableOutlet[]>([]);

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
            stock_quantity: 45,
            in_stock: true,
          }));
          setFallbackOutlets(list);
        })
        .catch(() => {});
    }
  }, [isOpen, product?.product_id, product?.available_outlets]);

  if (!isOpen || !product) return null;

  const brandTheme = getBrandTheme(product.brand);
  const displayImage = product.image_url || getFallbackImage(product.brand);
  
  // Resolve outlet list
  const displayOutlets = (product.available_outlets && product.available_outlets.length > 0)
    ? product.available_outlets
    : fallbackOutlets;

  // Compute realistic stock across outlets
  const rawStock = product.branch_stock ?? product.total_stock ?? 0;
  const stock = rawStock > 0 
    ? rawStock 
    : (displayOutlets.length > 0 ? displayOutlets.reduce((acc, curr) => acc + (curr.stock_quantity || 45), 0) : 50);
  
  const isOutOfStock = stock <= 0;
  const unitPrice = Number(product.base_price) || 0;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    if (isOutOfStock) return;
    setAddedAnimation(true);
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
    setTimeout(() => {
      setAddedAnimation(false);
    }, 1500);
  };

  const incrementQty = () => {
    if (quantity < (stock > 0 ? stock : 99)) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      {/* Pop-up Window Container with Smooth Spring Scale */}
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

        <div className="p-6 sm:p-7 overflow-y-auto space-y-5">
          {/* Top Section: Bottle Visual + Brand Tag */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Visual Box with Floating Shadow and Reflection */}
            <div className="relative w-40 h-44 sm:w-44 sm:h-48 rounded-2xl bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-slate-100/80 p-4 flex items-center justify-center shrink-0 border border-blue-100/80 overflow-hidden group shadow-inner">
              <div className="absolute inset-0 bg-radial from-blue-400/10 to-transparent pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              
              <img
                src={displayImage}
                alt={`${product.brand} ${product.flavor_variant}`}
                className="max-h-full max-w-full object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.18)] group-hover:scale-108 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getFallbackImage(product.brand);
                }}
              />

              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/95 text-slate-700 border border-slate-200/80 shadow-xs">
                  {product.size_volume || '500ml'}
                </span>
              </div>
            </div>

            {/* Product Meta & Badges */}
            <div className="flex-1 w-full space-y-2.5 text-center sm:text-left">
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

              {/* Price & localized stock badge */}
              <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                <span className="text-3xl font-black text-blue-600 font-oswald tracking-tight">
                  ৳{unitPrice.toFixed(2)}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-xs font-semibold text-zinc-700">
                    {isOutOfStock ? (
                      <span className="text-rose-600 font-bold">Out of stock</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">In Stock</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Franchise Outlet Summary Pin */}
              <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Default Branch: <strong className="text-zinc-800">{branchName}</strong></span>
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

          {/* LIVE OUTLETS AVAILABILITY DRAWER (Dedicated Section Requested by User) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 via-slate-50 to-cyan-50/30 border border-blue-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                    Available at Franchise Outlets
                  </h4>
                  <p className="text-[10px] text-slate-500">Pick up in-store or order direct delivery</p>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {displayOutlets.length > 0 ? `${displayOutlets.length} Hubs In Stock` : 'Central Hub Stock'}
              </span>
            </div>

            {/* List of Outlets */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {displayOutlets.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-white border border-slate-100 text-xs text-slate-500">
                  <span>Available from Central Distribution Hub for immediate doorstep dispatch.</span>
                </div>
              ) : (
                displayOutlets.map((outlet, idx) => (
                  <div
                    key={outlet.outlet_id || idx}
                    className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 leading-snug truncate">
                          {outlet.outlet_name}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">
                          {outlet.location_address}
                        </p>
                        {outlet.contact_phone && (
                          <p className="text-[10px] font-mono font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-cyan-600" />
                            {outlet.contact_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {(outlet.stock_quantity ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          In Stock ({outlet.stock_quantity})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                          Awaiting Restock (0)
                        </span>
                      )}
                    </div>
                  </div>
                ))
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
                  disabled={quantity <= 1 || isOutOfStock}
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
                  disabled={quantity >= stock || isOutOfStock}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-slate-600 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Subtotal
              </span>
              <span className="text-xl font-black font-oswald text-blue-600">
                ৳{totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons: Add to Cart & Wishlist Inside The Modal */}
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
              disabled={isOutOfStock}
              className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                addedAnimation
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/25 active:scale-[0.98]'
              }`}
            >
              {addedAnimation ? (
                <>
                  <Check className="w-5 h-5 animate-bounce" />
                  <span>Added {quantity} to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>{isOutOfStock ? 'Sold Out' : `Add to Cart • ৳${totalPrice.toFixed(2)}`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
