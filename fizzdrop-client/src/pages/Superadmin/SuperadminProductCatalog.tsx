import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Boxes,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProductFormModal } from '../Admin/ProductFormModal';

interface ProductRecord {
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

export const SuperadminProductCatalog: React.FC = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchCatalogAndBranches = async () => {
    setLoading(true);
    try {
      const [prodRes, branchRes] = await Promise.all([
        fetch('http://localhost:8080/api/products'),
        fetch('http://localhost:8080/api/outlets'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      } else {
        setProducts([]);
      }

      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(Array.isArray(branchData) ? branchData : []);
      }
    } catch (err) {
      console.error('Error fetching master products catalog:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogAndBranches();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${name}" from the master database?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (res.ok) {
        setActionMsg({ text: `Removed "${name}" from master catalog.`, type: 'success' });
        setTimeout(() => setActionMsg(null), 3500);
        fetchCatalogAndBranches();
      } else {
        const errData = await res.json().catch(() => ({}));
        setActionMsg({
          text: errData.error || 'Failed to remove product.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error communicating with backend API', type: 'error' });
    }
  };

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
      {/* Action Notification Alert */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button
            onClick={() => setActionMsg(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Telemetry Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              CENTRAL PRODUCT MASTER
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono font-semibold text-slate-600">
              Superadmin Stock Provisioning
            </span>
          </div>
          <h2 className="font-oswald text-xl sm:text-2xl font-black text-zinc-900 uppercase tracking-tight mt-1">
            Master Products & Central Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Input and manage beverage product specifications, SKUs, wholesale pricing, and central depot stock. Regional suppliers request stock directly from this catalog.
          </p>
        </div>

        {/* Primary CTA: Input Product Details */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Input Product Details</span>
        </button>
      </div>

      {/* Telemetry Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Total Cataloged SKUs
            </span>
            <span className="text-2xl font-black font-oswald text-zinc-900 mt-1 block">
              {products.length}
            </span>
            <span className="text-[11px] text-slate-500">Live products in database</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Central Stock Pool
            </span>
            <span className="text-2xl font-black font-oswald text-indigo-700 mt-1 block">
              {totalCentralCases.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500">Cases available for supplier requisitions</span>
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
            <span className="text-[11px] text-slate-500">Active beverage segments</span>
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
            placeholder="Search by SKU, brand, flavor, or category..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
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

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchCatalogAndBranches}
            title="Refresh Central Products"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Catalog Table & Clean Zero-Data Empty State */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <span className="font-mono">Loading master product catalog from database...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-oswald text-lg font-bold text-zinc-800 uppercase">
                {products.length === 0
                  ? 'Master Product Catalog is Empty'
                  : 'No Products Match Your Search'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {products.length === 0
                  ? 'No products exist in the database yet. As Superadmin, click "Input Product Details" to register the first beverage product with its central stock.'
                  : 'Try clearing your search keyword or selecting "Category: ALL" to view the registered products.'}
              </p>
            </div>
            {products.length === 0 && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Input Product Details Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Beverage Product</th>
                  <th className="py-3.5 px-4">SKU Token</th>
                  <th className="py-3.5 px-4">Packaging & Size</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Wholesale Price</th>
                  <th className="py-3.5 px-4 text-center">Superadmin Central Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const centralStock = p.central_stock || p.total_stock || 0;
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
                        <span className="font-mono font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                          {centralStock.toLocaleString()} cases
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                          Available for Suppliers
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(p.product_id, `${p.brand} ${p.flavor_variant}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Permanently remove product from master catalog"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Superadmin Product Input Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProductCreated={fetchCatalogAndBranches}
        branches={branches}
      />
    </div>
  );
};

export default SuperadminProductCatalog;
