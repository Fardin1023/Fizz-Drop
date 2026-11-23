import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Gift,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Package,
  Layers,
  ArrowRight,
  ClipboardList,
  Store,
  DollarSign,
  Truck,
  Sparkles,
  ChevronRight,
  Clock,
  Trash2,
  Edit2,
} from 'lucide-react';

interface FreeStockAllocation {
  id: number;
  offer_id?: number;
  offer_title?: string;
  district_id: number;
  district_name: string;
  division_name: string;
  product_id: number;
  product_name: string;
  sku?: string;
  category?: string;
  offered_cases: number;
  supplied_cases: number;
  remaining_cases: number;
  unit_value: number;
  total_offered_value: number;
  total_supplied_value: number;
  remaining_value: number;
  status: string;
  notes?: string;
  created_at: string;
}

interface FreeStockTransaction {
  id: number;
  free_stock_id?: number;
  offer_id?: number;
  offer_title?: string;
  requisition_code: string;
  district_id?: number;
  district_name?: string;
  outlet_id: number;
  outlet_name: string;
  supplier_id?: number;
  supplier_name?: string;
  product_id: number;
  product_name: string;
  cases_supplied: number;
  unit_value: number;
  total_value: number;
  status: string;
  transaction_date: string;
}

interface FreeStockMetrics {
  total_allocations: number;
  total_transactions: number;
  total_offered_cases: number;
  total_supplied_cases: number;
  total_remaining_cases: number;
  total_offered_value: number;
  total_supplied_value: number;
  total_remaining_value: number;
  district_breakdown: Array<{
    district_name: string;
    offered_cases: number;
    supplied_cases: number;
    offered_value: number;
    supplied_value: number;
  }>;
  product_breakdown: Array<{
    product_name: string;
    offered_cases: number;
    supplied_cases: number;
    offered_value: number;
    supplied_value: number;
  }>;
}

interface DistrictOption {
  id: number;
  name: string;
  division: string;
}

interface ProductOption {
  product_id: number;
  brand: string;
  flavor_variant: string;
  size_volume?: string;
  outlet_price?: number;
  category?: string;
}

export const SuperadminFreeStockManagement: React.FC = () => {
  const [allocations, setAllocations] = useState<FreeStockAllocation[]>([]);
  const [transactions, setTransactions] = useState<FreeStockTransaction[]>([]);
  const [metrics, setMetrics] = useState<FreeStockMetrics | null>(null);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Sub-tab: 'allocations' vs 'transactions'
  const [activeSubTab, setActiveSubTab] = useState<'allocations' | 'transactions'>('allocations');

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Allocate Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formDistrictId, setFormDistrictId] = useState<number | ''>('');
  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [formOfferedCases, setFormOfferedCases] = useState<number>(50);
  const [formUnitValue, setFormUnitValue] = useState<number>(15.00);
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchFreeStockData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch metrics
      const metricsRes = await fetch('http://localhost:8080/api/v1/free-stocks/metrics');
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // 2. Fetch allocations
      const allocRes = await fetch('http://localhost:8080/api/v1/free-stocks');
      if (allocRes.ok) {
        const allocData = await allocRes.json();
        setAllocations(allocData);
      }

      // 3. Fetch transactions
      const txRes = await fetch('http://localhost:8080/api/v1/free-stocks/transactions');
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }

      // 4. Fetch districts
      const distRes = await fetch('http://localhost:8080/api/v1/pricing/districts');
      if (distRes.ok) {
        const distData = await distRes.json();
        setDistricts(distData);
        if (distData.length > 0 && formDistrictId === '') {
          setFormDistrictId(distData[0].id);
        }
      }

      // 5. Fetch products
      const prodRes = await fetch('http://localhost:8080/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const list = Array.isArray(prodData) ? prodData : (prodData.products || []);
        setProducts(list);
        if (list.length > 0 && formProductId === '') {
          setFormProductId(list[0].product_id);
          if (list[0].outlet_price) {
            setFormUnitValue(Number(list[0].outlet_price));
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching free stocks data:', err);
      setError('Failed to load free stocks data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreeStockData();
  }, []);

  const handleProductChange = (prodId: number) => {
    setFormProductId(prodId);
    const prod = products.find((p) => p.product_id === prodId);
    if (prod && prod.outlet_price) {
      setFormUnitValue(Number(prod.outlet_price));
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDistrictId || !formProductId) {
      alert('Please select district and beverage product.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8080/api/v1/free-stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district_id: Number(formDistrictId),
          product_id: Number(formProductId),
          offered_cases: Number(formOfferedCases),
          unit_value: Number(formUnitValue),
          offer_title: formTitle.trim() || undefined,
          notes: formNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to allocate free stock.');
      }

      setSuccessMsg(data.message || 'Free stock allocated successfully!');
      setIsModalOpen(false);
      setFormNotes('');
      setFormTitle('');
      await fetchFreeStockData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error creating free stock allocation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllocation = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this free stock allocation record?')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/v1/free-stocks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAllocations((prev) => prev.filter((a) => a.id !== id));
        setSuccessMsg('Allocation removed successfully.');
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchFreeStockData();
      }
    } catch (err) {
      console.error('Error deleting allocation:', err);
    }
  };

  // Filtered allocations
  const filteredAllocations = allocations.filter((a) => {
    if (selectedDistrict !== 'ALL' && String(a.district_id) !== selectedDistrict) return false;
    if (selectedProduct !== 'ALL' && String(a.product_id) !== selectedProduct) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDist = a.district_name?.toLowerCase().includes(q);
      const matchProd = a.product_name?.toLowerCase().includes(q);
      const matchTitle = a.offer_title?.toLowerCase().includes(q);
      if (!matchDist && !matchProd && !matchTitle) return false;
    }
    return true;
  });

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    if (selectedDistrict !== 'ALL' && String(t.district_id) !== selectedDistrict) return false;
    if (selectedProduct !== 'ALL' && String(t.product_id) !== selectedProduct) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReq = t.requisition_code?.toLowerCase().includes(q);
      const matchOutlet = t.outlet_name?.toLowerCase().includes(q);
      const matchProd = t.product_name?.toLowerCase().includes(q);
      const matchTitle = t.offer_title?.toLowerCase().includes(q);
      if (!matchReq && !matchOutlet && !matchProd && !matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-[#2C251F]">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#FFFDF7] via-[#F4EFE6] to-[#EAE3D2] border border-[#D9CBB8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#324438] text-white rounded-xl shadow-md">
            <Boxes className="w-6 h-6 text-[#EBFFD8]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#101B14] flex items-center gap-2">
              Free Stocks Ledger & Promotional Inventory Tracker
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#324438] text-[#EBFFD8]">
                Admin Subsidy
              </span>
            </h1>
            <p className="text-xs text-[#5C5042] mt-0.5">
              Keep track of extra free stock offered through trade promotions vs. free cases supplied and dispatched to retail outlets, along with the total monetary value of subsidized stock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFreeStockData}
            title="Refresh"
            className="p-2.5 rounded-xl border border-[#D9CBB8] bg-white hover:bg-[#F4EFE6] text-[#324438] transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#324438] hover:bg-[#25332A] text-[#EBFFD8] font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Allocate Free Stock</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS (6 Key Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Offered Cases */}
        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#7A6E5D] tracking-wider">Offered Stock</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#101B14] mt-2">
            {metrics?.total_offered_cases || 0} <span className="text-xs font-bold text-gray-500">Cases</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Total cases budgeted</p>
        </div>

        {/* 2. Supplied Cases */}
        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#7A6E5D] tracking-wider">Supplied Stock</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 mt-2">
            {metrics?.total_supplied_cases || 0} <span className="text-xs font-bold text-gray-500">Cases</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Dispatched to outlets</p>
        </div>

        {/* 3. Remaining Cases */}
        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#7A6E5D] tracking-wider">Remaining Stock</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-900 mt-2">
            {metrics?.total_remaining_cases || 0} <span className="text-xs font-bold text-gray-500">Cases</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Available in offer pool</p>
        </div>

        {/* 4. Total Offered Value */}
        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#7A6E5D] tracking-wider">Total Value Offered</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#101B14] mt-2 font-mono">
            ৳{Number(metrics?.total_offered_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Total subsidy commitment</p>
        </div>

        {/* 5. Total Supplied Value */}
        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#7A6E5D] tracking-wider">Value Supplied</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-800 mt-2 font-mono">
            ৳{Number(metrics?.total_supplied_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Actual free stock funded</p>
        </div>

        {/* 6. Remaining Value */}
        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#7A6E5D] tracking-wider">Remaining Value</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-900 mt-2 font-mono">
            ৳{Number(metrics?.total_remaining_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Unclaimed subsidy pool</p>
        </div>
      </div>

      {/* DISTRICT & PRODUCT BREAKDOWN PANELS */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* District Breakdown Panel */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5DECF] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-[#101B14] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                Territory / District Breakdown
              </h3>
              <span className="text-[11px] font-bold text-gray-500">
                {metrics.district_breakdown.length} Districts Active
              </span>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {metrics.district_breakdown.map((d) => {
                const pct = d.offered_cases > 0 ? Math.min(100, Math.round((d.supplied_cases / d.offered_cases) * 100)) : 0;
                return (
                  <div key={d.district_name} className="p-3 rounded-xl bg-gray-50/80 border border-gray-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-gray-900">{d.district_name} District</strong>
                      <span className="font-bold text-emerald-800">
                        {d.supplied_cases} / {d.offered_cases} Cases Supplied ({pct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                      <span>Offered Value: ৳{Number(d.offered_value).toFixed(2)}</span>
                      <span className="text-emerald-700 font-bold">Supplied Value: ৳{Number(d.supplied_value).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Product Breakdown Panel */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5DECF] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-xs font-black uppercase text-[#101B14] flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-700" />
                Subsidized Product Breakdown
              </h3>
              <span className="text-[11px] font-bold text-gray-500">
                {metrics.product_breakdown.length} SKUs Subsidized
              </span>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {metrics.product_breakdown.map((p) => {
                const pct = p.offered_cases > 0 ? Math.min(100, Math.round((p.supplied_cases / p.offered_cases) * 100)) : 0;
                return (
                  <div key={p.product_name} className="p-3 rounded-xl bg-gray-50/80 border border-gray-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-gray-900">{p.product_name}</strong>
                      <span className="font-bold text-blue-800">
                        {p.supplied_cases} / {p.offered_cases} Cases Claimed ({pct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                      <span>Budgeted: ৳{Number(p.offered_value).toFixed(2)}</span>
                      <span className="text-blue-700 font-bold">Funded: ৳{Number(p.supplied_value).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#EBF5EE] border border-[#A4CCD9] text-[#1B4D3E] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SUB-TABS & FILTER BAR */}
      <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('allocations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'allocations'
                  ? 'bg-[#324438] text-[#EBFFD8] shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Free Stock Allocations Pool ({allocations.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'transactions'
                  ? 'bg-[#324438] text-[#EBFFD8] shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Supplied Free Stock Ledger ({transactions.length})</span>
            </button>
          </div>

          <div className="text-xs text-gray-500 font-semibold">
            {activeSubTab === 'allocations'
              ? `Showing ${filteredAllocations.length} of ${allocations.length} allocations`
              : `Showing ${filteredTransactions.length} of ${transactions.length} dispatches`}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'allocations'
                  ? 'Search by district, product, or scheme title...'
                  : 'Search by requisition code, outlet, or product...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D9CBB8] focus:border-[#324438]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#7A6E5D] uppercase">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D9CBB8] bg-white text-[#2C251F]"
            >
              <option value="ALL">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name} ({d.division})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#7A6E5D] uppercase">Product:</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D9CBB8] bg-white text-[#2C251F]"
            >
              <option value="ALL">All Products</option>
              {products.map((p) => (
                <option key={p.product_id} value={String(p.product_id)}>
                  {p.brand} {p.flavor_variant}
                </option>
              ))}
            </select>
          </div>

          {activeSubTab === 'allocations' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#7A6E5D] uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D9CBB8] bg-white text-[#2C251F]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="DEPLETED">Depleted</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT AREA: SUB-TAB 1: ALLOCATIONS POOL */}
      {activeSubTab === 'allocations' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DECF]">
              <RefreshCw className="w-8 h-8 text-[#324438] animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-[#7A6E5D]">Loading free stock allocations...</p>
            </div>
          ) : filteredAllocations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#D9CBB8]">
              <Boxes className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-700">No Free Stock Allocations Found</h3>
              <p className="text-xs text-gray-500 mt-1">
                Click "Allocate Free Stock" to create a new free stock pool for a district.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5DECF] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F2] text-[#7A6E5D] uppercase text-[10px] font-extrabold border-b border-[#E5DECF]">
                    <tr>
                      <th className="p-3.5">Territory & Scheme</th>
                      <th className="p-3.5">Free Product</th>
                      <th className="p-3.5 text-center">Offered</th>
                      <th className="p-3.5 text-center">Supplied</th>
                      <th className="p-3.5 text-center">Remaining</th>
                      <th className="p-3.5 text-right">Unit Value</th>
                      <th className="p-3.5 text-right">Total Offered Value</th>
                      <th className="p-3.5 text-right">Total Supplied Value</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredAllocations.map((alloc) => {
                      const pct = alloc.offered_cases > 0
                        ? Math.min(100, Math.round((alloc.supplied_cases / alloc.offered_cases) * 100))
                        : 0;

                      return (
                        <tr key={alloc.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 font-bold text-[#101B14]">
                              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                              {alloc.district_name} ({alloc.division_name})
                            </span>
                            <p className="text-[11px] text-gray-500 truncate max-w-xs mt-0.5">
                              {alloc.offer_title || 'Administrative Allocation'}
                            </p>
                          </td>

                          <td className="p-3.5">
                            <strong className="text-gray-900 block">{alloc.product_name}</strong>
                            <span className="text-[10px] text-gray-500 font-mono">
                              SKU: {alloc.sku || 'N/A'} • {alloc.category || 'Beverage'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center font-bold text-gray-900">
                            {alloc.offered_cases} cases
                          </td>

                          <td className="p-3.5 text-center font-bold text-emerald-700">
                            {alloc.supplied_cases} cases
                            <span className="block text-[10px] text-gray-400 font-normal">
                              ({pct}% claimed)
                            </span>
                          </td>

                          <td className="p-3.5 text-center font-bold text-amber-900">
                            {alloc.remaining_cases} cases
                          </td>

                          <td className="p-3.5 text-right font-mono text-gray-700">
                            ৳{Number(alloc.unit_value).toFixed(2)}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                            ৳{Number(alloc.total_offered_value).toFixed(2)}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                            ৳{Number(alloc.total_supplied_value).toFixed(2)}
                          </td>

                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                alloc.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {alloc.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleDeleteAllocation(alloc.id)}
                              title="Delete Allocation"
                              className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
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
            </div>
          )}
        </div>
      )}

      {/* CONTENT AREA: SUB-TAB 2: SUPPLIED TRANSACTIONS LEDGER */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DECF]">
              <RefreshCw className="w-8 h-8 text-[#324438] animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-[#7A6E5D]">Loading free stock transaction ledger...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#D9CBB8]">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-700">No Free Stock Dispatches Recorded Yet</h3>
              <p className="text-xs text-gray-500 mt-1">
                When retail outlets place orders based on active trade schemes, free stock delivery records will automatically populate here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5DECF] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F2] text-[#7A6E5D] uppercase text-[10px] font-extrabold border-b border-[#E5DECF]">
                    <tr>
                      <th className="p-3.5">Requisition Ticket</th>
                      <th className="p-3.5">Date & Time</th>
                      <th className="p-3.5">Recipient Outlet</th>
                      <th className="p-3.5">Supplier Depot</th>
                      <th className="p-3.5">Free Product Supplied</th>
                      <th className="p-3.5 text-center">Cases Supplied</th>
                      <th className="p-3.5 text-right">Unit Value</th>
                      <th className="p-3.5 text-right">Total Subsidized Value</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {tx.requisition_code}
                          </span>
                          {tx.offer_title && (
                            <p className="text-[10px] text-gray-500 truncate max-w-xs mt-1">
                              {tx.offer_title}
                            </p>
                          )}
                        </td>

                        <td className="p-3.5 text-gray-600 font-mono text-[11px]">
                          {new Date(tx.transaction_date).toLocaleString()}
                        </td>

                        <td className="p-3.5">
                          <strong className="text-gray-900 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-[#324438]" />
                            {tx.outlet_name}
                          </strong>
                          <span className="text-[10px] text-gray-500">
                            District: {tx.district_name || 'N/A'}
                          </span>
                        </td>

                        <td className="p-3.5 text-gray-700">
                          <span className="flex items-center gap-1 font-semibold">
                            <Truck className="w-3.5 h-3.5 text-emerald-700" />
                            {tx.supplier_name || 'Central Logistics Hub'}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-gray-900">
                          {tx.product_name}
                        </td>

                        <td className="p-3.5 text-center font-extrabold text-emerald-800">
                          {tx.cases_supplied} Cases FREE
                        </td>

                        <td className="p-3.5 text-right font-mono text-gray-600">
                          ৳{Number(tx.unit_value).toFixed(2)}
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-emerald-800">
                          ৳{Number(tx.total_value).toFixed(2)}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ALLOCATE FREE STOCK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#D9CBB8] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#324438] to-[#1E2D24] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/10 text-[#EBFFD8]">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Allocate Extra Free Stock</h3>
                  <p className="text-xs text-white/70">
                    Grant free beverage stock inventory to a specific district territory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAllocation} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Target District */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Target District *
                </label>
                <select
                  value={formDistrictId}
                  onChange={(e) => setFormDistrictId(Number(e.target.value))}
                  required
                  className="w-full p-2.5 text-xs rounded-xl border border-[#D9CBB8] bg-white text-gray-900 font-semibold focus:border-[#324438]"
                >
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.division} Division)
                    </option>
                  ))}
                </select>
              </div>

              {/* Free Stock Product */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Beverage Product (Free Stock) *
                </label>
                <select
                  value={formProductId}
                  onChange={(e) => handleProductChange(Number(e.target.value))}
                  required
                  className="w-full p-2.5 text-xs rounded-xl border border-[#D9CBB8] bg-white text-gray-900 font-semibold focus:border-[#324438]"
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand} {p.flavor_variant} ({p.size_volume || 'Standard'}) - Base: ৳{p.outlet_price || 15}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Offered Cases *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formOfferedCases}
                    onChange={(e) => setFormOfferedCases(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full p-2 text-xs rounded-lg border border-[#D9CBB8] text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Unit Value per Case (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formUnitValue}
                    onChange={(e) => setFormUnitValue(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2 text-xs rounded-lg border border-[#D9CBB8] text-gray-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Calculated Total Subsidy Box */}
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-purple-800 font-bold block">Total Subsidy Valuation:</span>
                  <span className="text-base font-black text-purple-950 font-mono">
                    ৳{(formOfferedCases * formUnitValue).toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Admin Funded
                </span>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Scheme Reference / Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Special Extra Stock Subsidy Grant"
                  className="w-full p-2 text-xs rounded-lg border border-[#D9CBB8] text-gray-900"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Administrative Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special instructions or commercial terms..."
                  className="w-full p-2 text-xs rounded-lg border border-[#D9CBB8] text-gray-900"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#324438] hover:bg-[#25332A] text-[#EBFFD8] font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Save Free Stock Allocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
