import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  Truck,
  TrendingUp,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Store,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Layers,
  Calendar,
  Building,
  Sparkles,
  BarChart3,
  BadgeDollarSign
} from 'lucide-react';

export interface SoldVsDispatchedSummary {
  total_sold_units: number;
  total_sold_value: number;
  total_dispatched_units: number;
  total_dispatched_value: number;
  pending_outlet_dispatch_units: number;
  fulfillment_rate_pct: number;
}

export interface ProductBreakdownItem {
  product_id: number;
  brand: string;
  flavor_variant: string;
  product_name: string;
  sku: string;
  image_url?: string;
  sold_quantity: number;
  sold_value: number;
  dispatched_quantity: number;
  dispatched_value: number;
  remaining_quantity: number;
  fulfillment_pct: number;
  depot_stock: number;
}

export interface OfficerBreakdownItem {
  sales_officer_id: number;
  name: string;
  code: string;
  assigned_area: string;
  phone: string;
  sold_quantity: number;
  sold_value: number;
  dispatched_quantity: number;
  dispatched_value: number;
  remaining_quantity: number;
  fulfillment_pct: number;
}

export interface DispatchLedgerItem {
  id: number;
  sales_officer_id: number;
  outlet_id: number;
  product_id: number;
  quantity: number;
  cost_price?: number;
  sale_price?: number;
  total_revenue?: number;
  profit_earned?: number;
  notes?: string;
  distribution_date: string;
  outlet_name?: string;
  branch_name?: string;
  area?: string;
  sub_route?: string;
  brand?: string;
  flavor_variant?: string;
  sku?: string;
}

interface SupplierStockSalesTrackingProps {
  userId?: number;
  onNavigateToRequisitions?: () => void;
}

export const SupplierStockSalesTracking: React.FC<SupplierStockSalesTrackingProps> = ({
  userId = 4,
  onNavigateToRequisitions
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<SoldVsDispatchedSummary>({
    total_sold_units: 0,
    total_sold_value: 0,
    total_dispatched_units: 0,
    total_dispatched_value: 0,
    pending_outlet_dispatch_units: 0,
    fulfillment_rate_pct: 0,
  });
  const [products, setProducts] = useState<ProductBreakdownItem[]>([]);
  const [officers, setOfficers] = useState<OfficerBreakdownItem[]>([]);
  const [recentDispatches, setRecentDispatches] = useState<DispatchLedgerItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState<string>('ALL');
  const [viewTab, setViewTab] = useState<'products' | 'officers' | 'ledger'>('products');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/inventory/supplier/sold-vs-dispatched?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setSummary(data.summary);
        if (Array.isArray(data.product_breakdown)) setProducts(data.product_breakdown);
        if (Array.isArray(data.officer_breakdown)) setOfficers(data.officer_breakdown);
        if (Array.isArray(data.recent_dispatches)) setRecentDispatches(data.recent_dispatches);
      }
    } catch (e) {
      console.error('Failed to fetch sold vs dispatched statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Real-time synchronization via BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('fizzdrop_realtime_events');
      const handleMessage = (evt: MessageEvent) => {
        const data = evt.data;
        if (
          data &&
          (data.type === 'STOCK_DISPATCHED' ||
            data.type === 'SO_ORDER_DISPATCHED' ||
            data.type === 'PRICE_UPDATED' ||
            data.recipientRole === 'SUPPLIER')
        ) {
          fetchData();
        }
      };
      channel.addEventListener('message', handleMessage);
      return () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
      };
    } catch (e) {}
  }, [userId]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSearch;
    });
  }, [products, searchTerm]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return recentDispatches.filter((d) => {
      const matchSearch =
        (d.outlet_name && d.outlet_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.brand && d.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.area && d.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.sub_route && d.sub_route.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchOfficer =
        selectedOfficerFilter === 'ALL' ||
        String(d.sales_officer_id) === selectedOfficerFilter;
      return matchSearch && matchOfficer;
    });
  }, [recentDispatches, searchTerm, selectedOfficerFilter]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-7 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-blue-100 text-xs font-semibold mb-2.5 border border-white/20">
              <Boxes className="w-3.5 h-3.5 text-blue-300" />
              <span>Wholesale Sold Stock vs Outlet Dispatch Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-oswald tracking-tight uppercase">
              Stock Sales & Outlet Dispatch Tracking
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm max-w-2xl mt-1 leading-relaxed">
              Track wholesale stock sold to assigned Sales Officers and monitor the exact quantities that have been dispatched and delivered to retail outlet shelves.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition-all border border-white/25 shadow-sm cursor-pointer"
              title="Refresh tracking data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {onNavigateToRequisitions && (
              <button
                onClick={onNavigateToRequisitions}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Area Demands</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sold to Sales Officers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Wholesale Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-oswald text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary.total_sold_units.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-bold uppercase">Cases</span>
            </div>
            <div className="text-xs font-semibold text-blue-700 mt-1 flex items-center gap-1 font-mono">
              <BadgeDollarSign className="w-3.5 h-3.5 text-blue-600" />
              <span>৳{Number(summary.total_sold_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Wholesale volume sold to Sales Officers
            </p>
          </div>
        </div>

        {/* Card 2: Dispatched to Outlets */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Dispatched to Outlets
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-oswald text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
              {summary.total_dispatched_units.toLocaleString()} <span className="text-xs font-sans text-emerald-600 font-bold uppercase">Cases</span>
            </div>
            <div className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>৳{Number(summary.total_dispatched_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[10px] text-emerald-700/80 mt-1.5">
              Replenished on retail outlet shelves
            </p>
          </div>
        </div>

        {/* Card 3: Pending / In Custody Buffer */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Buffer / Pending Dispatch
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-oswald text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
              {summary.pending_outlet_dispatch_units.toLocaleString()} <span className="text-xs font-sans text-amber-600 font-bold uppercase">Cases</span>
            </div>
            <div className="text-xs font-semibold text-amber-700 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>In Sales Officer territory buffer</span>
            </div>
            <p className="text-[10px] text-amber-700/80 mt-1.5">
              Sold stock awaiting final field dispatch
            </p>
          </div>
        </div>

        {/* Card 4: Outlet Fulfillment Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-200/90 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Fulfillment Ratio
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-oswald text-2xl sm:text-3xl font-black text-purple-900 tracking-tight">
              {summary.fulfillment_rate_pct.toFixed(1)}%
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.fulfillment_rate_pct)}%` }}
              />
            </div>
            <p className="text-[10px] text-purple-700/80 mt-1.5">
              Percentage of sold stock reached outlets
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Filtering Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setViewTab('products')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'products'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Product Breakdown ({products.length})</span>
          </button>
          <button
            onClick={() => setViewTab('officers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'officers'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sales Officers ({officers.length})</span>
          </button>
          <button
            onClick={() => setViewTab('ledger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'ledger'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Outlet Dispatches ({recentDispatches.length})</span>
          </button>
        </div>

        {/* Search & Officer Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product, outlet, route..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>

          {viewTab === 'ledger' && (
            <select
              value={selectedOfficerFilter}
              onChange={(e) => setSelectedOfficerFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Sales Officers</option>
              {officers.map((o) => (
                <option key={o.sales_officer_id} value={String(o.sales_officer_id)}>
                  {o.name} ({o.assigned_area})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* VIEW TAB 1: Product-Wise Sold vs Dispatched */}
      {viewTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-oswald tracking-tight uppercase">
                Product-Wise Sold vs Dispatched Analysis
              </h2>
              <p className="text-xs text-slate-500">
                Detailed metrics of stock sold to sales officers vs quantities dispatched to outlets for each SKU.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
              {filteredProducts.length} Products Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-3 text-center">Depot Stock</th>
                  <th className="py-3 px-3 text-right">Sold to Officers</th>
                  <th className="py-3 px-3 text-right">Dispatched to Outlets</th>
                  <th className="py-3 px-3 text-right">Buffer Pending</th>
                  <th className="py-3 px-4">Fulfillment Ratio</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isFullyDispatched = p.sold_quantity > 0 && p.dispatched_quantity >= p.sold_quantity;
                    const isPartiallyDispatched = p.dispatched_quantity > 0 && p.dispatched_quantity < p.sold_quantity;
                    const isPending = p.sold_quantity > 0 && p.dispatched_quantity === 0;

                    return (
                      <tr key={p.product_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.brand} className="w-full h-full object-contain" />
                              ) : (
                                <Boxes className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">
                                {p.brand} <span className="font-medium text-slate-600">{p.flavor_variant}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                SKU: {p.sku || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${
                              p.depot_stock <= 10
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.depot_stock} cases
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-oswald text-sm font-black text-slate-800">
                            {p.sold_quantity.toLocaleString()}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ৳{Number(p.sold_value || 0).toLocaleString()}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-oswald text-sm font-black text-emerald-700">
                            {p.dispatched_quantity.toLocaleString()}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-600">
                            ৳{Number(p.dispatched_value || 0).toLocaleString()}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-oswald text-sm font-black text-amber-700">
                            {p.remaining_quantity.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">cases</div>
                        </td>

                        <td className="py-3 px-4 min-w-[140px]">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="font-bold text-slate-700">
                              {p.dispatched_quantity} / {p.sold_quantity || 1}
                            </span>
                            <span className="font-bold text-purple-700">
                              {p.fulfillment_pct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, p.fulfillment_pct)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {isFullyDispatched ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Delivered</span>
                            </span>
                          ) : isPartiallyDispatched ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>In Transit</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending SO</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">No Sales</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: Sales Officers Breakdown */}
      {viewTab === 'officers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {officers.map((o) => (
            <div
              key={o.sales_officer_id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">
                      {o.name}
                    </h3>
                    <div className="text-[11px] text-indigo-600 font-semibold mt-0.5 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      <span>{o.assigned_area} Territory</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                    {o.code}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3.5 text-center">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Sold</span>
                    <span className="font-oswald text-base font-black text-slate-800">
                      {o.sold_quantity}
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 block">Dispatched</span>
                    <span className="font-oswald text-base font-black text-emerald-800">
                      {o.dispatched_quantity}
                    </span>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-[9px] font-bold uppercase text-amber-700 block">Buffer</span>
                    <span className="font-oswald text-base font-black text-amber-800">
                      {o.remaining_quantity}
                    </span>
                  </div>
                </div>

                <div className="mt-3.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                    <span>Outlet Delivery Progress</span>
                    <span className="font-bold text-purple-700">{o.fulfillment_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, o.fulfillment_pct)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] text-slate-500">
                <span>Phone: {o.phone || 'N/A'}</span>
                <span className="font-mono font-semibold text-slate-700">
                  ৳{Number(o.sold_value || 0).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW TAB 3: Outlet Dispatches Audit Ledger */}
      {viewTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-oswald tracking-tight uppercase">
                Outlet Dispatch Audit Log
              </h2>
              <p className="text-xs text-slate-500">
                Live audit trail of product shipments released from sold depot stocks to retail outlets.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
              {filteredLedger.length} Dispatches Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Destination Outlet</th>
                  <th className="py-3 px-3">Route / Territory</th>
                  <th className="py-3 px-3 text-right">Dispatched Qty</th>
                  <th className="py-3 px-3 text-right">Revenue Value</th>
                  <th className="py-3 px-4">Dispatch Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No outlet dispatches recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {d.distribution_date ? new Date(d.distribution_date).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800">
                          {d.brand} {d.flavor_variant}
                        </span>
                        {d.sku && (
                          <div className="text-[10px] text-slate-400 font-mono">{d.sku}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{d.outlet_name || 'Retail Outlet'}</div>
                        <div className="text-[10px] text-slate-400">{d.branch_name || ''}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 font-medium">{d.area || 'Gulshan'}</div>
                        {d.sub_route && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {d.sub_route}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-oswald text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {d.quantity} cases
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        ৳{Number(d.total_revenue || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {d.notes || 'Dispatched for outlet restock'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierStockSalesTracking;
