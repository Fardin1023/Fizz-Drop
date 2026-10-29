import React, { useState, useEffect } from 'react';
import { ShoppingBag, Heart, AlertCircle, PackageX } from 'lucide-react';
import SectionsHeading from './SectionsHeading/SectionsHeading';
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';
import heroImg from '../../assets/img/hero-image.png';

export interface ProductItem {
  id: number;
  product_id?: number;
  name: string;
  brand: string;
  category: string;
  volume: string;
  price: number;
  base_price?: number;
  imageUrl?: string;
  image_url?: string;
  isNew?: boolean;
  stockQuantity: number;
}

interface NewArrivalsProps {
  branchId?: number | string;
  onAddToCart?: (product: ProductItem) => void;
  onAddToWishlist?: (product: ProductItem) => void;
}

const getBrandFallback = (brand: string): string => {
  const b = (brand || '').toLowerCase();
  if (b.includes('pepsi')) return pepsiImg;
  if (b.includes('7up') || b.includes('seven')) return sevenUpImg;
  if (b.includes('dew') || b.includes('mountain')) return dewImg;
  if (b.includes('mirinda')) return mirindaImg;
  if (b.includes('slice')) return sliceImg;
  if (b.includes('aquafina') || b.includes('water')) return aquafinaImg;
  return heroImg;
};

const NewArrivals: React.FC<NewArrivalsProps> = ({
  branchId,
  onAddToCart,
  onAddToWishlist,
}) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = branchId
          ? `http://localhost:8080/api/products/new-arrivals?branchId=${branchId}`
          : 'http://localhost:8080/api/products/new-arrivals';

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to load drops: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Resilient normalization for Spring Boot & MySQL models
        const normalized: ProductItem[] = (Array.isArray(data) ? data : []).map((p: any) => {
          const rawPrice = p.price ?? p.base_price ?? p.basePrice ?? 0;
          const parsedPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;
          const brandName = p.brand || 'FizzDrop';
          const variant = p.flavor_variant || p.flavorVariant || '';
          const fullName = p.name || (variant ? `${brandName} ${variant}` : brandName);
          const rawStock = p.stockQuantity ?? p.total_stock ?? p.totalStock ?? p.branch_stock ?? p.branchStock;
          const finalStock = (typeof rawStock === 'number' && rawStock > 0) ? rawStock : 45;
          const img = p.imageUrl || p.image_url || p.image || '';

          return {
            id: p.id ?? p.product_id ?? p.productId ?? Math.random(),
            product_id: p.product_id ?? p.productId ?? p.id,
            name: fullName,
            brand: brandName,
            category: p.category || 'Beverage',
            volume: p.volume || p.size_volume || p.sizeVolume || '250ml',
            price: parsedPrice,
            base_price: parsedPrice,
            imageUrl: img && img.trim().length > 10 ? img : getBrandFallback(brandName),
            image_url: img && img.trim().length > 10 ? img : getBrandFallback(brandName),
            isNew: p.isNew ?? true,
            stockQuantity: finalStock,
          };
        });

        setProducts(normalized);
      } catch (err: any) {
        setError(err.message || 'Unable to connect to the backend server');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewArrivals();
  }, [branchId]);

  return (
    <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* 1. Header always renders */}
      <SectionsHeading
        badge="Fresh Off The Truck"
        title="New Drops & Flavors"
        subtitle="The latest ice-cold arrivals, limited seasonal cans, and exclusive drops just hit the shelves."
        actionText="View All Drops"
        actionHref="/beverages"
      />

      {/* 2. Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 flex flex-col justify-between h-[360px] animate-pulse"
            >
              <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-36 w-3/4 mx-auto bg-zinc-200 dark:bg-zinc-800 rounded-2xl my-4" />
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Server Error Display */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Could not fetch live drops from database
          </p>
          <p className="text-xs text-zinc-500 mt-1">{error}</p>
        </div>
      )}

      {/* 4. Empty State (When database returns 0 rows) */}
      {!loading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800 text-center">
          <PackageX className="w-8 h-8 text-zinc-400 mb-2" />
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            No new arrivals found
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            New inventory entries from your backend will show up here automatically.
          </p>
        </div>
      )}

      {/* 5. Dynamic Products Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const inStock = product.stockQuantity > 0;
            const priceVal = typeof product.price === 'number' ? product.price : parseFloat(product.price as any) || 0;

            return (
              <div
                key={product.id}
                className="group relative rounded-3xl bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 p-5 flex flex-col justify-between hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300"
              >
                {/* Badges & Wishlist */}
                <div className="flex items-center justify-between w-full z-10">
                  {product.isNew ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                      NEW
                    </span>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={() => onAddToWishlist && onAddToWishlist(product)}
                    className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 transition-colors shadow-sm cursor-pointer"
                    aria-label="Add to wishlist"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>

                {/* Product Image Stage */}
                <div className="relative h-52 flex items-center justify-center my-3 overflow-hidden">
                  <div className="absolute w-28 h-28 rounded-full bg-indigo-500/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-44 object-contain drop-shadow-md group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300"
                  />
                </div>

                {/* Product Meta & Price */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      {product.brand}
                    </span>
                    <span>{product.volume}</span>
                  </div>

                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <div>
                      <span className="text-xs text-zinc-400">BDT</span>{' '}
                      <span className="font-oswald text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {priceVal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={() => onAddToCart && onAddToCart(product)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        inStock
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 active:scale-95 cursor-pointer'
                          : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{inStock ? 'Add' : 'Out of Stock'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default NewArrivals;
