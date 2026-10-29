import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Truck,
  RefreshCw,
  Boxes,
  Layers,
  Store,
  Warehouse,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SupplyStockModal, type OutletOption } from './SupplyStockModal';

interface AvailableProduct {
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
  central_stock?: number;
  supplier_stock?: number;
  depot_breakdown?: Array<{
    district_id: number;
    district_name: string;
    stock: number;
  }>;
  available_outlets?: Array<{
    outlet_id: number;
    outlet_name?: string;
    stock_quantity: number;
  }>;
}

interface SupplierAvailableProductsProps {
  onRequestStock: (productId?: number) => void;
}

export const SupplierAvailableProducts: React.FC<SupplierAvailableProductsProps> = ({
  onRequestStock,
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Supply Stock to Outlet Modal state
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState<boolean>(false);
  const [targetProduct, setTargetProduct] = useState<number | null>(null);

  const fetchAvailableProducts = async () => {
    setLoading(true);
    try {
      const userId = user?.user_id || 4;
      const [prodRes, outletRes] = await Promise.all([
        fetch(`http://localhost:8080/api/products?userId=${userId}`),
        fetch('http://localhost:8080/api/outlets'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      } else {
        setProducts([]);
      }

      if (outletRes.ok) {
        const outletData = await outletRes.json();
        const formatted = (Array.isArray(outletData) ? outletData : []).map((o: any) => ({
          outlet_id: o.outlet_id ?? o.branch_id ?? o.outletId,
          outlet_name: o.outlet_name ?? o.branch_name ?? o.outletName ?? 'Outlet',
          location_address: o.location_address ?? o.locationAddress ?? '',
          contact_phone: o.contact_phone ?? o.contactPhone ?? '',
          status: o.status ?? 'Active',
        }));
        setOutlets(formatted);
      }
    } catch (err) {
      console.error('Error fetching available products from superadmin:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableProducts();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filteredProducts = products.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (p.brand || '').toLowerCase().includes(term) ||
      (p.flavor_variant || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term);

    const matchesCategory =
      selectedCategory === 'ALL' ||
      (p.category || '').toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const totalCentralCases = products.reduce((sum, p) => sum + (p.central_stock || p.total_stock || 0), 0);
  const totalSupplierCases = products.reduce((sum, p) => sum + (p.supplier_stock || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              CENTRAL BEVERAGE CATALOG
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono font-semibold text-slate-600">
              Supplied by Superadmin
            </span>
          </div>
          <h2 className="font-oswald text-xl sm:text-2xl font-black text-zinc-900 uppercase tracking-tight mt-1">
            Available Products for Requisition
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Explore products and inventory provisioned by Superadmin. Regional suppliers can request batches for their territory logistics hubs.
          </p>
        </div>

        {/* Quick Requisition & Supply Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTargetProduct(null);
              setIsSupplyModalOpen(true);
            }}
            className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
            title="Allocate and deliver stock to specific retail franchise outlets"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Supply Stock to Outlets</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestStock()}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
          >
            <Truck className="w-4 h-4 text-white" />
            <span>Request Stock (New Requisition)</span>
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Supplier's Own Depot Stock */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border border-emerald-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Your Depot Stock (Holding)
            </span>
            <span className="text-2xl font-black font-oswald text-emerald-900 mt-1 block">
              {totalSupplierCases.toLocaleString()} <span className="text-xs font-sans font-bold text-emerald-700">cases</span>
            </span>
            <span className="text-[11px] text-emerald-700/90">Physical inventory across your depots</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
            <Warehouse className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Superadmin Central Pool */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Central Depot Stock
            </span>
            <span className="text-2xl font-black font-oswald text-indigo-700 mt-1 block">
              {totalCentralCases.toLocaleString()} <span className="text-xs font-sans font-bold text-indigo-500">cases</span>
            </span>
            <span className="text-[11px] text-slate-500">Available from Superadmin</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Product Categories */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Product Categories
            </span>
            <span className="text-2xl font-black font-oswald text-purple-700 mt-1 block">
              {categories.filter((c) => c !== 'ALL').length} <span className="text-xs font-sans font-bold text-purple-500">segments</span>
            </span>
            <span className="text-[11px] text-slate-500">Active beverage groups</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Total SKUs */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Available Beverages
            </span>
            <span className="text-2xl font-black font-oswald text-zinc-900 mt-1 block">
              {products.length} <span className="text-xs font-sans font-bold text-slate-500">items</span>
            </span>
            <span className="text-[11px] text-slate-500">Catalog items in system</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-2">
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by brand, flavor, SKU, or category..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={fetchAvailableProducts}
              title="Refresh Available Products"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Visual Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Tag className="w-3 h-3 text-indigo-500" /> Filter by Category:
          </span>
          {categories.map((cat) => {
            const count = cat === 'ALL'
              ? products.length
              : products.filter((p) => (p.category || '').toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs font-bold ring-2 ring-slate-900/20'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <span className="font-mono">Connecting to central database catalog...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-oswald text-lg font-bold text-zinc-800 uppercase">
                {products.length === 0
                  ? 'No Products Available from Superadmin Yet'
                  : 'No Products Match Your Filter'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {products.length === 0
                  ? 'The Superadmin has not added any beverage products to the central catalog yet. Once products are entered in Superadmin Hub, they will appear here for you to request stock.'
                  : 'Try adjusting your search terms or selecting "Category: ALL" to view the full beverage list.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Beverage Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Packaging & Size</th>
                  <th className="py-3.5 px-4">Wholesale Price</th>
                  <th className="py-3.5 px-4 text-center bg-emerald-50/70 border-x border-emerald-100 text-emerald-950 font-black">
                    Your Depot Stock (Holding)
                  </th>
                  <th className="py-3.5 px-4 text-center">Superadmin Central Stock</th>
                  <th className="py-3.5 px-4">Outlets Stock Distribution</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const centralStock = p.central_stock || p.total_stock || 0;
                  const isAvailable = centralStock > 0;
                  const hasSupplierStock = (p.supplier_stock || 0) > 0;

                  return (
                    <tr key={p.product_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.brand}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <span className="font-oswald font-bold text-xs text-indigo-700">
                                {p.brand.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block text-xs">
                              {p.brand} {p.flavor_variant}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Product ID #{p.product_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                          <Tag className="w-2.5 h-2.5 text-purple-500" />
                          {p.category || 'Beverage'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[11px]">
                          {p.sku}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-zinc-800 block text-xs">
                          {p.packaging}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {p.size_volume}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-zinc-900 text-xs">
                          ৳{Number(p.base_price).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">per case/unit</span>
                      </td>

                      {/* Your Depot Stock (Supplier Holding) */}
                      <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100/60">
                        {hasSupplierStock ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-bold text-xs px-3 py-1 rounded-xl bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              {p.supplier_stock!.toLocaleString()} cases
                            </span>
                            {p.depot_breakdown && p.depot_breakdown.some((d) => d.stock > 0) && (
                              <div className="flex flex-wrap gap-1 justify-center max-w-[190px]">
                                {p.depot_breakdown
                                  .filter((d) => d.stock > 0)
                                  .map((d) => (
                                    <span
                                      key={d.district_id}
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white border border-emerald-200 text-emerald-700 font-semibold"
                                    >
                                      {d.district_name}: {d.stock}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                              0 cases (Depot Empty)
                            </span>
                            <button
                              type="button"
                              onClick={() => onRequestStock(p.product_id)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline mt-0.5 cursor-pointer"
                            >
                              + Request Stock
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border inline-block ${
                            isAvailable
                              ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                              : 'text-amber-700 bg-amber-50 border-amber-200'
                          }`}
                        >
                          {centralStock.toLocaleString()} cases
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                          {isAvailable ? 'In Central Warehouse' : 'Awaiting Superadmin Restock'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1 max-w-[260px]">
                          <div className="flex flex-wrap gap-1">
                            {p.available_outlets && p.available_outlets.length > 0 ? (
                              p.available_outlets.map((ao) => (
                                <span
                                  key={ao.outlet_id}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md border bg-slate-50 border-slate-200 text-slate-700"
                                >
                                  <span className="font-semibold truncate max-w-[90px]">{ao.outlet_name}:</span>
                                  <strong className={ao.stock_quantity > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                                    {ao.stock_quantity}
                                  </strong>
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No outlet stock allocated</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetProduct(p.product_id);
                              setIsSupplyModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                          >
                            <Store className="w-3 h-3 text-indigo-500" />
                            <span>Supply / Adjust Outlets</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onRequestStock(p.product_id)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 ml-auto transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Place a stock requisition for this beverage"
                        >
                          <Truck className="w-3.5 h-3.5 text-white" />
                          <span>Request Stock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Outlet Stock Allocation & Supply Modal */}
      <SupplyStockModal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        onSupplied={fetchAvailableProducts}
        products={products as any}
        outlets={outlets}
        initialProductId={targetProduct}
        userId={user?.user_id || 4}
      />
    </div>
  );
};

export default SupplierAvailableProducts;
