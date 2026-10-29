import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Store,
  MapPin,
  RefreshCw,
  Search,
  Plus,
  Truck,
  TrendingUp,
  Package,
  Calendar,
} from 'lucide-react';
import { SupplyStockModal, type ProductOption, type OutletOption } from './SupplyStockModal';
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

interface OutletAllocation {
  outlet_id: number;
  outlet_name: string;
  location_address?: string;
  contact_phone?: string;
  stock_quantity: number;
  status?: string;
  last_updated?: string;
}

interface ProductDistribution {
  product_id: number;
  brand: string;
  flavor_variant: string;
  sku: string;
  base_price: number;
  expiry_date?: string;
  image_url?: string;
  total_stock: number;
  outlet_allocations: OutletAllocation[];
}

export const StockDistributionView: React.FC = () => {
  const [distribution, setDistribution] = useState<ProductDistribution[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('ALL');
  
  // Supply Stock Modal state
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState<boolean>(false);
  const [targetProduct, setTargetProduct] = useState<number | null>(null);
  const [targetOutlet, setTargetOutlet] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [distRes, outRes] = await Promise.all([
        fetch('http://localhost:8080/api/inventory/distribution'),
        fetch('http://localhost:8080/api/outlets'),
      ]);

      if (distRes.ok) {
        const distData = await distRes.json();
        setDistribution(Array.isArray(distData) ? distData : []);
      }
      if (outRes.ok) {
        const outData = await outRes.json();
        const normalized: OutletOption[] = (Array.isArray(outData) ? outData : []).map((o: any) => ({
          outlet_id: o.outlet_id ?? o.outletId,
          outlet_name: o.outlet_name ?? o.outletName ?? 'Outlet',
          location_address: o.location_address ?? o.locationAddress ?? '',
          contact_phone: o.contact_phone ?? o.contactPhone ?? '',
          status: o.status ?? 'Active',
        }));
        setOutlets(normalized);
      }
    } catch (err) {
      console.error('Error fetching stock distribution:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalUnitsAcrossNetwork = distribution.reduce((acc, p) => acc + (p.total_stock || 0), 0);

  const filtered = distribution.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.brand.toLowerCase().includes(term) ||
      p.flavor_variant.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term);

    const matchesOutlet =
      selectedOutletFilter === 'ALL' ||
      p.outlet_allocations.some(
        (a) => String(a.outlet_id) === String(selectedOutletFilter) && a.stock_quantity > 0
      );

    return matchesSearch && matchesOutlet;
  });

  // Prepare product options for modal
  const productOptions: ProductOption[] = distribution.map((p) => ({
    product_id: p.product_id,
    brand: p.brand,
    flavor_variant: p.flavor_variant,
    sku: p.sku,
    base_price: p.base_price,
    image_url: p.image_url,
    total_stock: p.total_stock,
    available_outlets: p.outlet_allocations.map((a) => ({
      outlet_id: a.outlet_id,
      stock_quantity: a.stock_quantity,
    })),
  }));

  const handleOpenSupply = (prodId?: number, outId?: number) => {
    setTargetProduct(prodId ?? null);
    setTargetOutlet(outId ?? null);
    setIsSupplyModalOpen(true);
  };

  const handleSupplied = () => {
    setActionMsg('Franchise stock updated successfully!');
    setTimeout(() => setActionMsg(null), 3000);
    fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Total Network Stock
            </span>
            <span className="font-oswald text-2xl font-black text-blue-600">
              {totalUnitsAcrossNetwork} units
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Dispatched to all hubs</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Active Database Outlets
            </span>
            <span className="font-oswald text-2xl font-black text-zinc-900">
              {outlets.length} Hubs
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Physical retail stores</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Catalog SKUs Supplied
            </span>
            <span className="font-oswald text-2xl font-black text-indigo-600">
              {distribution.length} SKUs
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Beverage variants</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Average Units Per Hub
            </span>
            <span className="font-oswald text-2xl font-black text-cyan-600">
              {outlets.length > 0 ? Math.round(totalUnitsAcrossNetwork / outlets.length) : 0} units
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Evenly balanced stock</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand, SKU, flavor variant..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Outlet Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedOutletFilter}
            onChange={(e) => setSelectedOutletFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="ALL">All Franchise Outlets ({outlets.length})</option>
            {outlets.map((o) => (
              <option key={o.outlet_id} value={o.outlet_id}>
                {o.outlet_name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Stock Counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenSupply(undefined, selectedOutletFilter !== 'ALL' ? Number(selectedOutletFilter) : undefined)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Supply Stock to Outlet</span>
          </button>
        </div>
      </div>

      {/* Active Branch Filter Banner */}
      {selectedOutletFilter !== 'ALL' && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span>
              Showing Stock for Branch:{' '}
              <strong className="text-blue-950 font-bold">
                {outlets.find((o) => String(o.outlet_id) === String(selectedOutletFilter))?.outlet_name ||
                  `Branch #${selectedOutletFilter}`}
              </strong>
            </span>
            <span className="text-[11px] text-blue-600 font-mono">
              ({filtered.length} products currently allocated)
            </span>
          </div>
          <button
            onClick={() => setSelectedOutletFilter('ALL')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Show All Branches</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Main Stock Allocation Table */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider font-mono">
              Franchise Stock & Supplier Allocation Matrix
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            Showing {filtered.length} of {distribution.length} Products
          </span>
        </div>

        {loading && distribution.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <span className="font-mono">Loading inventory distribution across outlets...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-zinc-700">No stock allocations found.</p>
            <p className="text-[11px] text-slate-400">
              Click "Supply Stock to Outlet" to dispatch product units to franchise stores.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4 text-center">Total Dispatched</th>
                  <th className="py-3 px-4">Stock Breakdown by Outlet (From Database)</th>
                  <th className="py-3 px-4 text-right">Quick Supply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((prod) => {
                  const displayImg = prod.image_url || getBrandImage(prod.brand);

                  return (
                    <tr key={prod.product_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                            <img
                              src={displayImg}
                              alt={prod.brand}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getBrandImage(prod.brand);
                              }}
                            />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block font-oswald text-sm">
                              {prod.brand} {prod.flavor_variant}
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-slate-400 block">
                              SKU: {prod.sku || `FD-${prod.product_id}`}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5">
                              <Calendar className="w-2.5 h-2.5 text-cyan-600" />
                              <span>Exp: <strong className="text-zinc-700">{prod.expiry_date || '2027-04-15'}</strong></span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4">
                        <span className="font-oswald text-sm font-bold text-blue-600">
                          ৳{Number(prod.base_price || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Total Dispatched */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-blue-50 text-blue-700 border border-blue-200">
                          {prod.total_stock} units
                        </span>
                      </td>

                      {/* Outlet Allocations */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {prod.outlet_allocations.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">No outlets assigned</span>
                          ) : (
                            prod.outlet_allocations.map((alloc) => {
                              const isSelectedBranch =
                                selectedOutletFilter !== 'ALL' &&
                                String(alloc.outlet_id) === String(selectedOutletFilter);

                              return (
                                <div
                                  key={alloc.outlet_id}
                                  className={`px-2.5 py-1.5 rounded-xl border shadow-2xs flex items-center gap-2 transition-all ${
                                    isSelectedBranch
                                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/30'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 text-[11px] text-zinc-800 font-semibold">
                                    <MapPin className={`w-3 h-3 shrink-0 ${isSelectedBranch ? 'text-blue-700 font-bold' : 'text-blue-600'}`} />
                                    <span className={isSelectedBranch ? 'font-bold text-blue-950' : ''}>{alloc.outlet_name}:</span>
                                  </div>
                                  <span
                                    className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded border ${
                                      isSelectedBranch
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    }`}
                                  >
                                    {alloc.stock_quantity} units
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Quick Supply Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            handleOpenSupply(
                              prod.product_id,
                              selectedOutletFilter !== 'ALL' ? Number(selectedOutletFilter) : undefined
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1.5 ml-auto transition-all cursor-pointer active:scale-95"
                          title="Supply stock to a franchise outlet"
                        >
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Supply</span>
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

      {/* Modal */}
      <SupplyStockModal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        onSupplied={handleSupplied}
        products={productOptions}
        outlets={outlets}
        initialProductId={targetProduct}
        initialOutletId={targetOutlet}
      />
    </div>
  );
};

export default StockDistributionView;
