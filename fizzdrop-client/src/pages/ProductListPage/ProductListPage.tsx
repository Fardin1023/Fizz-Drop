import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  ShoppingBag,
  Heart,
  Eye,
  MapPin,
  RefreshCw,
  ArrowUpDown,
  PackageX,
  PlusCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductDetailModal, { type BeverageProduct } from '../../components/Modals/ProductDetailModal';
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';

interface ProductListPageProps {
  branchId?: number | string;
  onAddToCart?: (product?: any) => void;
}

const BRANDS = ['All Brands', 'Pepsi', 'Mountain Dew', '7Up', 'Mirinda', 'Slice', 'Aquafina', 'FizzDrop'];
const CATEGORIES = ['All Categories', 'Sparkling Soda', 'Energy Drink', 'Fruit Juice', 'Purified Water'];

// Fallback images matching brand for live products that don't have custom images
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

const ProductListPage: React.FC<ProductListPageProps> = ({ branchId, onAddToCart }) => {
  const [products, setProducts] = useState<BeverageProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBrand, setSelectedBrand] = useState<string>('All Brands');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'stock'>('featured');
  const [branchName, setBranchName] = useState<string>('All Outlets & Hubs');
  const [totalOutlets, setTotalOutlets] = useState<number>(2);

  // Pop-up details modal state
  const [selectedProduct, setSelectedProduct] = useState<BeverageProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Wishlist state (persisted in localStorage)
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('fizzdrop_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch live products from backend API (ZERO seed data fallback)
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const endpoint = branchId
        ? `http://localhost:8080/api/products?branchId=${branchId}`
        : 'http://localhost:8080/api/products';

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Failed to fetch beverages from backend:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branch details if branchId is provided, and total outlets count
  useEffect(() => {
    const fetchBranchInfo = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/outlets');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            setTotalOutlets(list.length);
          }
          if (branchId) {
            const found = list.find((o: any) => String(o.outlet_id || o.branch_id) === String(branchId));
            if (found) {
              setBranchName(found.outlet_name || found.branch_name);
            }
          } else {
            setBranchName('All Outlets & Hubs');
          }
        }
      } catch (err) {
        if (branchId) setBranchName(`Outlet #${branchId}`);
      }
    };

    fetchBranchInfo();
    fetchProducts();
  }, [branchId]);

  // Wishlist toggler
  const handleToggleWishlist = (p: BeverageProduct) => {
    setWishlist((prev) => {
      const exists = prev.includes(p.product_id);
      const next = exists ? prev.filter((id) => id !== p.product_id) : [...prev, p.product_id];
      try {
        localStorage.setItem('fizzdrop_wishlist', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Open the small animated pop up window with product details
  const handleOpenDetailModal = (product: BeverageProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Brand filter
        if (selectedBrand !== 'All Brands' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
          return false;
        }
        // Category filter
        if (
          selectedCategory !== 'All Categories' &&
          (p.category || '').toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            p.brand.toLowerCase().includes(q) ||
            p.flavor_variant.toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.base_price - b.base_price;
        if (sortBy === 'price-desc') return b.base_price - a.base_price;
        if (sortBy === 'stock') {
          const sA = a.branch_stock ?? a.total_stock ?? 0;
          const sB = b.branch_stock ?? b.total_stock ?? 0;
          return sB - sA;
        }
        return b.product_id - a.product_id;
      });
  }, [products, selectedBrand, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50/60 text-zinc-900 flex flex-col pb-24 selection:bg-blue-500/20">
      
      {/* 1. Cool & Catchy Hero Header Matching Homepage Theme (Light, Refreshing, Ice-Cold) */}
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-sky-50/50 to-white py-14 px-4 sm:px-6 lg:px-8 border-b border-blue-100/70">
        
        {/* Ambient Glowing Color Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-12 left-10 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl animate-pulse" />
          <div className="absolute top-12 right-16 w-80 h-80 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100/80 text-blue-700 border border-blue-200/80 flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                The Beverage Vault • 2026 Collection
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-200/70 text-slate-700">
                100% Chilled Drops
              </span>
            </div>

            <h1 className="font-oswald text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-zinc-900 leading-none">
              Explore Cool <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500">Beverages</span>
            </h1>

            <p className="text-sm text-zinc-600 leading-relaxed max-w-xl">
              Freshly dispatched carbonated sodas, crisp energy elixirs, and fruit blends. Synchronized live with franchise branch inventory databases.
            </p>

            {/* Active Branch Inventory Locator */}
            <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Active Store Outlet:{' '}
                <strong className="text-blue-700 font-bold">{branchName}</strong>
              </span>
            </div>
          </div>

          {/* Quick Stats Pill Matching Homepage Cards */}
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-blue-100/80 p-4 rounded-3xl shrink-0 shadow-lg shadow-blue-500/5">
            <div className="text-center px-4 border-r border-slate-100">
              <span className="block font-oswald text-3xl font-extrabold text-blue-600">
                {products.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Total Drops
              </span>
            </div>
            <div className="text-center px-4 border-r border-slate-100">
              <span className="block font-oswald text-3xl font-extrabold text-emerald-600">
                {totalOutlets}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Outlets Live
              </span>
            </div>
            <div className="text-center px-4">
              <span className="block font-oswald text-3xl font-extrabold text-amber-500">
                {wishlist.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Wishlist
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Search, Filter & Sort Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 w-full">
        <div className="bg-white rounded-3xl border border-blue-100/80 p-4 shadow-xl shadow-blue-500/5 backdrop-blur-md space-y-3.5">
          
          {/* Top row: Search input & Sort dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flavors, brands (e.g. Pepsi, Mountain Dew, 7Up)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-zinc-700">
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent font-medium focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured Drops</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="stock">Availability</option>
                </select>
              </div>

              <button
                onClick={fetchProducts}
                className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors cursor-pointer"
                title="Refresh catalog from database"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Brand Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3 text-blue-600" /> Brands:
            </span>
            {BRANDS.map((brand) => {
              const isSelected = selectedBrand === brand;
              return (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-slate-100/90 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200'
                  }`}
                >
                  {brand}
                </button>
              );
            })}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Category:
            </span>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Product Catalog Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-oswald text-2xl font-bold uppercase tracking-tight text-zinc-900">
              {selectedBrand === 'All Brands' ? 'All Beverages' : `${selectedBrand} Selection`}
            </h2>
            <p className="text-xs text-zinc-500">
              Showing {filteredProducts.length} live drops available for checkout or branch pickup
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            Location: <strong className="text-blue-600">{branchName}</strong>
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-600">Syncing with live database...</span>
          </div>
        ) : products.length === 0 ? (
          /* Empty Catalog State: Clean, Cool & Inviting (Zero Seed Data) */
          <div className="py-20 px-6 text-center rounded-3xl bg-white border border-blue-100/90 shadow-lg shadow-blue-500/5 max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border border-blue-100 flex items-center justify-center shadow-inner">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 inline-block">
                Catalog Ready For Drops
              </span>
              <h3 className="font-oswald text-3xl font-black uppercase tracking-tight text-zinc-900">
                No Seed Data • Awaiting Manual Inventory
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                Dummy seed data has been removed. Products inputted by the supplier from the Admin Dashboard will appear here immediately with real-time stock and images.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Go to Supplier Dashboard to Add Products</span>
              </Link>

              <button
                onClick={fetchProducts}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-zinc-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check for New Products</span>
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Filter Mismatch State */
          <div className="py-16 text-center rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm">
            <PackageX className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="font-bold text-base text-zinc-900">No matching beverages found</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Try adjusting your search query or reset the brand and category filters.
            </p>
            <button
              onClick={() => {
                setSelectedBrand('All Brands');
                setSelectedCategory('All Categories');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Products Grid: Cool & Catchy White Card Aesthetics matching Homepage */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const displayImg = product.image_url || getBrandImage(product.brand);
              const isWish = wishlist.includes(product.product_id);
              const stock = product.branch_stock ?? product.total_stock ?? 0;
              const isOutOfStock = stock <= 0;
              const inStockOutlets = (product.available_outlets || []).filter((ao: any) => (ao.stock_quantity ?? 0) > 0);

              return (
                <div
                  key={product.product_id}
                  className="group relative rounded-3xl bg-white border border-slate-200/90 hover:border-blue-400/60 p-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  {/* Top Badges & Wishlist Button */}
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {product.brand}
                    </span>

                    {/* Wishlist Heart on Card */}
                    <button
                      type="button"
                      onClick={() => handleToggleWishlist(product)}
                      className={`p-2 rounded-full transition-transform active:scale-90 cursor-pointer ${
                        isWish
                          ? 'bg-rose-50 text-rose-500 shadow-xs'
                          : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100'
                      }`}
                      title={isWish ? 'Remove from wishlist' : 'Save to wishlist'}
                    >
                      <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  {/* Product Bottle Image Area */}
                  <div className="relative h-48 w-full flex items-center justify-center p-3 my-2 rounded-2xl bg-gradient-to-b from-blue-50/40 via-sky-50/20 to-slate-50/50 border border-slate-100 overflow-hidden">
                    <div className="absolute inset-0 bg-radial from-blue-400/10 to-transparent rounded-full group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                    
                    <img
                      src={displayImg}
                      alt={`${product.brand} ${product.flavor_variant}`}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getBrandImage(product.brand);
                      }}
                    />

                    {/* Volume Pill */}
                    <span className="absolute bottom-1 right-2 text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/90 text-slate-700 font-bold border border-slate-200/80 shadow-xs">
                      {product.size_volume || '500ml'}
                    </span>
                  </div>

                  {/* Product Information */}
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{product.category || 'Sparkling'}</span>
                      <span className={`font-bold ${isOutOfStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isOutOfStock ? 'Out of stock' : 'In Stock'}
                      </span>
                    </div>

                    <h3 className="font-oswald text-lg font-bold uppercase tracking-tight text-zinc-900 truncate group-hover:text-blue-600 transition-colors">
                      {product.brand} {product.flavor_variant}
                    </h3>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="font-oswald text-2xl font-black text-blue-600">
                        ৳{Number(product.base_price ?? (product as any).basePrice ?? 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-slate-400">
                        {product.packaging || 'Bottle'}
                      </span>
                    </div>

                    {/* Outlet Availability Tag & Expiry */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {inStockOutlets.length > 0 ? (
                          <span>In Stock at <strong className="text-zinc-800">{inStockOutlets.length} Outlets</strong></span>
                        ) : (
                          <span className="text-amber-700 font-semibold text-[10px]">Awaiting Supplier Restock</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100 font-bold">
                        Exp: {product.expiry_date || '2027-04'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: "View Details" (Modal Trigger) & Quick Add */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    {/* The Prominent Pop-Up Trigger Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(product)}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100/90 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-blue-200/60 shadow-xs active:scale-[0.98]"
                      title="View full product details in popup"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Details</span>
                    </button>

                    {/* Quick Add to Cart Button */}
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => {
                        if (onAddToCart) onAddToCart(product);
                      }}
                      className="p-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
                      title="Quick add 1 to cart"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. Small Animated Pop-Up Window for Product Details */}
      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onAddToCart={(p, qty) => {
          if (onAddToCart) onAddToCart({ ...p, quantity: qty });
        }}
        onToggleWishlist={(p) => handleToggleWishlist(p)}
        isWishlisted={selectedProduct ? wishlist.includes(selectedProduct.product_id) : false}
        branchName={branchName}
      />
    </div>
  );
};

export default ProductListPage;
