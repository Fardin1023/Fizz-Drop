import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Warehouse,
  Trash2,
  RefreshCw,
  TrendingDown,
  Layers,
  Truck,
  Calendar,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProductFormModal } from './ProductFormModal';
import { SupplyStockModal } from './SupplyStockModal';

interface Product {
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
  total_stock: number;
  created_date?: string;
}

interface Branch {
  branch_id: number;
  branch_name: string;
}

interface Stats {
  totalProducts: number;
  lowStockCount: number;
  pendingRestocks: number;
  totalBranches: number;
  dbStatus?: {
    connected: boolean;
    engine: string;
  };
}

export const ProductManagement: React.FC = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyTargetProd, setSupplyTargetProd] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, statRes, branchRes] = await Promise.all([
        fetch('http://localhost:8080/api/products'),
        fetch('http://localhost:8080/api/admin/stats'),
        fetch('http://localhost:8080/api/outlets'),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      if (statRes.ok) {
        const statData = await statRes.json();
        setStats(statData);
      }
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        const formatted = (Array.isArray(branchData) ? branchData : []).map((o: any) => ({
          branch_id: o.outlet_id ?? o.branch_id ?? o.outletId,
          branch_name: o.outlet_name ?? o.branch_name ?? o.outletName ?? 'Outlet',
          location_address: o.location_address ?? o.locationAddress ?? '',
          contact_phone: o.contact_phone ?? o.contactPhone ?? '',
          status: o.status ?? 'Active',
        }));
        setBranches(formatted);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch(`http://localhost:8080/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete product');
        return;
      }

      setActionMsg(`Deleted ${name} successfully.`);
      setTimeout(() => setActionMsg(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error communicating with server');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.flavor_variant.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    const matchesBrand = selectedBrand === 'ALL' || p.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchesCategory = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesBranch =
      selectedBranch === 'ALL' ||
      ((p as any).available_outlets &&
        (p as any).available_outlets.some(
          (ao: any) =>
            String(ao.outlet_id) === String(selectedBranch) ||
            ao.outlet_name?.toLowerCase() === selectedBranch.toLowerCase()
        ));

    return matchesSearch && matchesBrand && matchesCategory && matchesBranch;
  });

  const uniqueBrands = ['ALL', ...Array.from(new Set(products.map((p) => p.brand)))];
  const uniqueCategories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionMsg && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-zinc-400 hover:text-zinc-200">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Products</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-oswald text-zinc-900 dark:text-zinc-50">
              {stats?.totalProducts ?? products.length}
            </span>
            <span className="text-xs text-zinc-400 font-medium">SKUs cataloged</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Alerts
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-oswald text-amber-600 dark:text-amber-400">
              {stats?.lowStockCount ?? 0}
            </span>
            <span className="text-xs text-zinc-400 font-medium">branches below 20 qty</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Restock Requests</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-oswald text-zinc-900 dark:text-zinc-50">
              {stats?.pendingRestocks ?? 0}
            </span>
            <span className="text-xs text-zinc-400 font-medium">pending approval</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Database Outlets</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-oswald text-zinc-900 dark:text-zinc-50">
              {branches.length}
            </span>
            <span className="text-xs text-zinc-400 font-medium">available in database</span>
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Filters & "Add Product" */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, brand, flavor, or category..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {/* Brand Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>Brand: {b}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>Category: {c}</option>
            ))}
          </select>

          {/* Branch / Outlet Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
            <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent py-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={String(b.branch_id)}>
                  Branch: {b.branch_name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            title="Refresh Catalog Data"
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Supply Stock to Outlet CTA */}
          <button
            onClick={() => {
              setSupplyTargetProd(null);
              setIsSupplyModalOpen(true);
            }}
            className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Truck className="w-4 h-4" />
            <span>Supply Stock to Outlet</span>
          </button>

          {/* Primary "Add Product" CTA */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Input Product Details</span>
          </button>
        </div>
      </div>

      {/* Active Branch Filter Banner */}
      {selectedBranch !== 'ALL' && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>
              Filtered by Branch:{' '}
              <strong className="text-blue-950 dark:text-white font-bold">
                {branches.find((b) => String(b.branch_id) === String(selectedBranch))?.branch_name ||
                  `Branch #${selectedBranch}`}
              </strong>
            </span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
              ({filteredProducts.length} matching products stocked at this hub)
            </span>
          </div>
          <button
            onClick={() => setSelectedBranch('ALL')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 cursor-pointer"
          >
            <span>Show All Branches</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Packaging & Vol</th>
                <th className="py-3.5 px-4">Base Price</th>
                <th className="py-3.5 px-4">Branch Inventory</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No products matching the criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.brand} className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{p.brand.substring(0, 2)}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {p.brand} {p.flavor_variant}
                          </span>
                          <span className="block text-[11px] text-zinc-400">
                            Category: {p.category}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            <Calendar className="w-3 h-3 text-cyan-600 shrink-0" />
                            <span>Exp: <strong className="font-mono text-zinc-700 dark:text-zinc-200">{p.expiry_date || '2027-04-15'}</strong></span>
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {p.sku}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span>{p.packaging}</span>
                      <span className="text-zinc-400"> • {p.size_volume}</span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      ৳{(parseFloat(String(p.base_price ?? (p as any).basePrice ?? '0')) || 0).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              p.total_stock < 20
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {p.total_stock} total in stock
                          </span>
                          {p.total_stock < 20 && (
                            <span className="text-[10px] text-amber-500 font-semibold uppercase">
                              Low Stock
                            </span>
                          )}
                        </div>

                        {/* Live Database Outlets Stock Breakdown */}
                        <div className="flex flex-wrap gap-1">
                          {(p as any).available_outlets && (p as any).available_outlets.length > 0 ? (
                            (p as any).available_outlets.map((ao: any) => {
                              const isSelectedBranch =
                                selectedBranch !== 'ALL' &&
                                (String(ao.outlet_id) === String(selectedBranch) ||
                                  ao.outlet_name?.toLowerCase() === selectedBranch.toLowerCase());

                              return (
                                <span
                                  key={ao.outlet_id}
                                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                                    isSelectedBranch
                                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border-blue-400 font-bold ring-2 ring-blue-500/30 shadow-xs'
                                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700/60'
                                  }`}
                                >
                                  <span className="font-semibold">{ao.outlet_name}:</span>
                                  <strong className={isSelectedBranch ? 'text-blue-700 dark:text-blue-300' : 'text-emerald-600 dark:text-emerald-400'}>
                                    {ao.stock_quantity}
                                  </strong>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No outlet stock allocated</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSupplyTargetProd(p.product_id);
                            setIsSupplyModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          title="Supply / Allocate stock to a specific outlet"
                        >
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Supply</span>
                        </button>

                        <button
                          onClick={() => handleDelete(p.product_id, `${p.brand} ${p.flavor_variant}`)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete product from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
          <span>Role: Central Supplier (Authorized)</span>
        </div>
      </div>

      {/* Add Product Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProductCreated={fetchData}
        branches={branches}
      />

      {/* Supplier Stock Supply Modal */}
      <SupplyStockModal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        onSupplied={() => {
          setActionMsg('Inventory dispatched to franchise outlet successfully!');
          setTimeout(() => setActionMsg(null), 3000);
          fetchData();
        }}
        products={products as any}
        outlets={branches.map((b) => ({
          outlet_id: b.branch_id,
          outlet_name: b.branch_name,
        }))}
        initialProductId={supplyTargetProd}
        initialOutletId={selectedBranch !== 'ALL' ? Number(selectedBranch) : null}
      />
    </div>
  );
};
