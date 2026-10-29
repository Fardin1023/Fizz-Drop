import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Truck,
  RefreshCw,
  Boxes,
  Layers,
} from 'lucide-react';

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
}

interface SupplierAvailableProductsProps {
  onRequestStock: (productId?: number) => void;
}

export const SupplierAvailableProducts: React.FC<SupplierAvailableProductsProps> = ({
  onRequestStock,
}) => {
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchAvailableProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
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

        {/* Quick Requisition Button */}
        <button
          type="button"
          onClick={() => onRequestStock()}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
        >
          <Truck className="w-4 h-4 text-white" />
          <span>Request Stock (New Requisition)</span>
        </button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Available Beverages
            </span>
            <span className="text-2xl font-black font-oswald text-zinc-900 mt-1 block">
              {products.length}
            </span>
            <span className="text-[11px] text-slate-500">Provided by Superadmin</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Central Depot Stock
            </span>
            <span className="text-2xl font-black font-oswald text-indigo-700 mt-1 block">
              {totalCentralCases.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500">Total cases in central inventory</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Product Categories
            </span>
            <span className="text-2xl font-black font-oswald text-cyan-700 mt-1 block">
              {categories.filter((c) => c !== 'ALL').length}
            </span>
            <span className="text-[11px] text-slate-500">Segments ready to order</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
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
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Packaging & Size</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Wholesale Price</th>
                  <th className="py-3.5 px-4 text-center">Central Availability</th>
                  <th className="py-3.5 px-4 text-right">Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const centralStock = p.central_stock || p.total_stock || 0;
                  const isAvailable = centralStock > 0;
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
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-zinc-900 text-xs">
                          ৳{Number(p.base_price).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">per case/unit</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border inline-block ${
                            isAvailable
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-amber-700 bg-amber-50 border-amber-200'
                          }`}
                        >
                          {centralStock.toLocaleString()} cases
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                          {isAvailable ? 'In Central Warehouse' : 'Awaiting Superadmin Restock'}
                        </span>
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
    </div>
  );
};

export default SupplierAvailableProducts;
