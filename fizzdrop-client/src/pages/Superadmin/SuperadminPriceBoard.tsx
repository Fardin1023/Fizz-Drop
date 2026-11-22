import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Coins,
  Store,
  Tag,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Info,
  Building,
  CheckCircle2,
  Package,
  Layers,
  Percent,
  MapPin,
  SlidersHorizontal,
  TableProperties,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PricingItem {
  id: number;
  product_id: number;
  supplier_price: number;
  outlet_price: number;
  retail_price: number;
  updated_at?: string;
  product_name?: string;
  brand?: string;
  flavor_variant?: string;
  sku?: string;
  category?: string;
  packaging?: string;
  size_volume?: string;
  image_url?: string;
}

interface DistrictBoardSummary {
  district_id: number;
  district_name: string;
  division_name: string;
  priced_count: number;
  pricing: PricingItem[];
}

interface SuperadminPriceBoardProps {
  onOpenPricingStudio?: (districtId: number) => void;
}

const BANGLADESH_DIVISIONS = [
  'All Divisions',
  'Dhaka',
  'Chittagong',
  'Rajshahi',
  'Khulna',
  'Barisal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

export const SuperadminPriceBoard: React.FC<SuperadminPriceBoardProps> = ({
  onOpenPricingStudio,
}) => {
  const { token } = useAuth();

  const [districtsData, setDistrictsData] = useState<DistrictBoardSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [updateAlert, setUpdateAlert] = useState<string | null>(null);

  // Filters & Selection
  const [selectedDivision, setSelectedDivision] = useState<string>('All Divisions');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(1); // Default to Dhaka
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'district-detail' | 'matrix'>('district-detail');

  const fetchAllDistrictsBoard = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/pricing/board/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Failed to fetch multi-district price board.');
      }

      const data: DistrictBoardSummary[] = await res.json();
      setDistrictsData(data);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Error fetching board all:', err);
      if (districtsData.length === 0) {
        setErrorMsg('Unable to load master district price board. Please check backend connection.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllDistrictsBoard();
  }, []);

  // Real-time automatic updates
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('fizzdrop_realtime_events');
      bc.onmessage = (event) => {
        const d = event.data;
        if (d && (d.type === 'PRICE_UPDATED' || d.type === 'DISTRICT_PRICING')) {
          fetchAllDistrictsBoard(true);
          const distName = d.district_name || 'District';
          setUpdateAlert(`Price Board Updated: New commercial rates applied for ${distName} in real-time!`);
          setTimeout(() => setUpdateAlert(null), 6000);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported:', err);
    }

    const handleCustomPriceEvent = () => {
      fetchAllDistrictsBoard(true);
      setUpdateAlert('Price Board Updated: New official rates loaded in real-time!');
      setTimeout(() => setUpdateAlert(null), 6000);
    };

    window.addEventListener('fizzdrop_price_updated', handleCustomPriceEvent);

    const interval = setInterval(() => {
      fetchAllDistrictsBoard(true);
    }, 15000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('fizzdrop_price_updated', handleCustomPriceEvent);
      clearInterval(interval);
    };
  }, []);

  // Filter districts by Division
  const filteredDistricts = useMemo(() => {
    return districtsData.filter((d) => {
      if (selectedDivision === 'All Divisions') return true;
      return d.division_name?.toLowerCase() === selectedDivision.toLowerCase();
    });
  }, [districtsData, selectedDivision]);

  // Active Selected District
  const activeDistrict = useMemo(() => {
    return districtsData.find((d) => d.district_id === selectedDistrictId) || districtsData[0];
  }, [districtsData, selectedDistrictId]);

  // Categories available
  const categories = useMemo(() => {
    const cats = new Set<string>();
    districtsData.forEach((d) => {
      d.pricing?.forEach((p) => {
        if (p.category) cats.add(p.category);
      });
    });
    return ['all', ...Array.from(cats)];
  }, [districtsData]);

  // Filter products for active district
  const filteredPricing = useMemo(() => {
    if (!activeDistrict?.pricing) return [];
    return activeDistrict.pricing.filter((item) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        selectedCategory === 'all' ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchSearch && matchCat;
    });
  }, [activeDistrict, searchQuery, selectedCategory]);

  // Overall Statistics across all 64 districts
  const masterStats = useMemo(() => {
    const totalDistricts = districtsData.length;
    let totalPricedEntries = 0;
    districtsData.forEach((d) => {
      totalPricedEntries += d.pricing?.length || 0;
    });
    return {
      totalDistricts,
      totalPricedEntries,
      activeDistrictCount: filteredDistricts.length,
    };
  }, [districtsData, filteredDistricts]);

  if (loading && districtsData.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Real-time Update Alert Banner */}
      {updateAlert && (
        <div className="fixed top-24 right-4 sm:right-8 z-[140] animate-bounce">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#FFF9F0] text-[#101B14] shadow-2xl border-2 border-[#B8CBBE] ring-4 ring-[#CFE0D2]/50">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <Sparkles className="w-5 h-5 text-emerald-800 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-900">Live Auto-Update</p>
              <p className="text-xs font-medium text-[#101B14]">{updateAlert}</p>
            </div>
          </div>
        </div>
      )}

      {/* Superadmin Price Board Header */}
      <div className="bg-[#F2E6D5] text-[#101B14] rounded-3xl p-6 sm:p-7 shadow-sm border border-[#D9CBB8] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#CFE0D2] text-[#101B14] text-xs font-black border border-[#B8CBBE] shadow-2xs">
                <Tag className="w-3.5 h-3.5 text-[#101B14]" />
                SUPERADMIN MASTER PRICE BOARD
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#DEFDEF] text-[#122018] text-xs font-mono font-bold border border-[#B8CBBE] shadow-2xs">
                <span>🌐</span>
                <span>64 Districts Multi-Echelon Matrix</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E6EBF1] text-[#101B14] text-[11px] font-bold border border-[#C7D0DB] shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#101B14]" />
                <span>Database Synchronized</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#101B14]">
              National Commercial Pricing Board (All 64 Districts)
            </h1>
            <p className="text-xs sm:text-sm text-[#535E56] leading-relaxed font-medium">
              Superadmin central command for reviewing multi-tier wholesale and consumer pricing across all divisions and territories in Bangladesh. Changes saved in the District Pricing Studio automatically update this board in real time.
            </p>
          </div>

          {/* Sync Status & Studio Jump */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-[#CFE0D2] px-3 py-1.5 rounded-xl border border-[#B8CBBE]">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 status-dot-green" />
              </span>
              <span className="text-xs font-mono font-bold text-[#101B14]">
                REAL-TIME AUTO-SYNC: ON
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchAllDistrictsBoard(false)}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFF9F0] hover:bg-white text-[#101B14] text-xs font-bold border border-[#D9CBB8] shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#101B14] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              {onOpenPricingStudio && (
                <button
                  type="button"
                  onClick={() => onOpenPricingStudio(selectedDistrictId)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B8CBBE] hover:bg-[#CFE0D2] text-[#101B14] text-xs font-bold border border-[#9EB4A4] shadow-xs transition-all cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-[#101B14]" />
                  <span className="text-[#101B14] font-bold">Edit in Pricing Studio</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 text-[#101B14]" />
                </button>
              )}
            </div>
            <span className="text-[10px] font-mono text-[#535E56]">
              Last Synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Division Switcher Filter Bar */}
      <div className="bg-[#FFF9F0] rounded-2xl p-4 border border-[#D9CBB8] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-[#535E56] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#101B14]" />
            Filter by Division (8 Divisions):
          </span>
          <span className="text-xs font-mono text-[#535E56]">
            Showing {filteredDistricts.length} of {districtsData.length} Districts
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {BANGLADESH_DIVISIONS.map((div) => {
            const isSelected = selectedDivision === div;
            return (
              <button
                key={div}
                type="button"
                onClick={() => setSelectedDivision(div)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#B8CBBE] text-[#101B14] border-[#9EB4A4] shadow-xs'
                    : 'bg-[#FFF9F0] text-[#535E56] border-[#D9CBB8] hover:bg-[#CFE0D2] hover:text-[#101B14]'
                }`}
              >
                <span className={isSelected ? 'text-[#101B14] font-bold' : 'text-[#535E56]'}>
                  {div}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* District Quick-Selector & Search Filter */}
      <div className="bg-[#FFF9F0] rounded-2xl p-4 border border-[#D9CBB8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* District Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[#101B14] whitespace-nowrap flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-800" />
            Active District Board:
          </label>
          <select
            value={selectedDistrictId}
            onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#D9CBB8] text-xs font-bold text-[#101B14] focus:outline-none focus:ring-2 focus:ring-[#B8CBBE] cursor-pointer min-w-[200px]"
          >
            {filteredDistricts.map((d) => (
              <option key={d.district_id} value={d.district_id}>
                {d.district_name} District ({d.division_name})
              </option>
            ))}
          </select>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-[#CFE0D2] text-[#101B14] font-mono font-bold border border-[#B8CBBE]">
            {activeDistrict?.pricing?.length || 0} Products Priced
          </span>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#535E56]" />
          <input
            type="text"
            placeholder="Search by brand, SKU, product or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#D9CBB8] text-xs font-medium text-[#101B14] placeholder-[#8C988F] focus:outline-none focus:ring-2 focus:ring-[#B8CBBE]"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#F2E6D5] p-1 rounded-xl border border-[#D9CBB8]">
          <button
            type="button"
            onClick={() => setViewMode('district-detail')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'district-detail'
                ? 'bg-[#FFF9F0] text-[#101B14] shadow-xs'
                : 'text-[#535E56] hover:text-[#101B14]'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>District Board</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-[#FFF9F0] text-[#101B14] shadow-xs'
                : 'text-[#535E56] hover:text-[#101B14]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All 64 Matrix</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DISTRICT BOARD VIEW */}
      {viewMode === 'district-detail' && (
        <div className="bg-[#FFF9F0] rounded-3xl border border-[#D9CBB8] shadow-sm overflow-hidden">
          {/* Header Bar */}
          <div className="p-5 border-b border-[#D9CBB8] bg-[#F2E6D5]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <h2 className="text-base font-bold text-[#101B14]">
                  {activeDistrict?.district_name} District Price Board
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#CFE0D2] text-[#101B14] font-mono font-bold border border-[#B8CBBE]">
                  Division: {activeDistrict?.division_name}
                </span>
              </div>
              <p className="text-xs text-[#535E56] mt-1 font-medium">
                Displaying 3-tier prices saved for {activeDistrict?.district_name}. Applied to all regional suppliers and retail outlets of this district.
              </p>
            </div>

            {onOpenPricingStudio && (
              <button
                type="button"
                onClick={() => onOpenPricingStudio(activeDistrict?.district_id || 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#CFE0D2] hover:bg-[#B8CBBE] text-[#101B14] text-xs font-bold border border-[#B8CBBE] transition-colors cursor-pointer shadow-2xs"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Adjust {activeDistrict?.district_name} Rates</span>
              </button>
            )}
          </div>

          {/* Table */}
          {filteredPricing.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-[#101B14]">No products found matching filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2E6D5]/70 border-b border-[#D9CBB8] text-[11px] font-black uppercase text-[#101B14]">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">SKU & Category</th>
                    <th className="py-3 px-4 text-center">Supplier Buy Price (৳)</th>
                    <th className="py-3 px-4 text-center">Outlet Supply Price (৳)</th>
                    <th className="py-3 px-4 text-center">Consumer Retail MRP (৳)</th>
                    <th className="py-3 px-4 text-center">Supplier Margin</th>
                    <th className="py-3 px-4 text-center">Outlet Margin</th>
                    <th className="py-3 px-4 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPricing.map((item) => {
                    const buyPrice = Number(item.supplier_price || 0);
                    const sellPrice = Number(item.outlet_price || 0);
                    const retailPrice = Number(item.retail_price || 0);
                    const supMarginTaka = sellPrice - buyPrice;
                    const supMarginPct = buyPrice > 0 ? (supMarginTaka / buyPrice) * 100 : 0;
                    const outMarginTaka = retailPrice - sellPrice;
                    const outMarginPct = sellPrice > 0 ? (outMarginTaka / sellPrice) * 100 : 0;

                    return (
                      <tr key={item.id || item.product_id} className="hover:bg-slate-50 transition-colors">
                        {/* Product */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-200 p-1 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shrink-0">
                                {item.brand?.charAt(0) || 'P'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-sm text-slate-900">
                                {item.product_name || `${item.brand} ${item.flavor_variant}`}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{item.packaging || 'Can/Bottle'}</span>
                                <span>•</span>
                                <span>{item.size_volume || 'Standard'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                            {item.category || 'Soft Drinks'}
                          </span>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">
                            {item.sku || `SKU-${item.product_id}`}
                          </div>
                        </td>

                        {/* Supplier Buy Price */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-mono font-black text-xs border border-amber-200">
                            ৳{buyPrice.toFixed(2)}
                          </span>
                        </td>

                        {/* Outlet Sell Price */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-black text-xs border border-emerald-200">
                            ৳{sellPrice.toFixed(2)}
                          </span>
                        </td>

                        {/* Retail Price */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-mono font-black text-xs border border-blue-200">
                            ৳{retailPrice.toFixed(2)}
                          </span>
                        </td>

                        {/* Supplier Margin */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                            +৳{supMarginTaka.toFixed(2)} ({supMarginPct.toFixed(1)}%)
                          </span>
                        </td>

                        {/* Outlet Margin */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-900 font-bold text-[11px]">
                            +৳{outMarginTaka.toFixed(2)} ({outMarginPct.toFixed(1)}%)
                          </span>
                        </td>

                        {/* Updated At */}
                        <td className="py-3 px-4 text-right">
                          <span className="text-[10px] font-mono text-slate-500">
                            {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ALL 64 DISTRICTS COMPARISON MATRIX */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cross-District Pricing Overview (64 Districts)
              </h2>
              <p className="text-xs text-slate-500">
                Compare commercial wholesale pricing cards across all territories. Click any card to deep dive or modify.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              Total Districts: {filteredDistricts.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDistricts.map((d) => {
              const count = d.pricing?.length || 0;
              const firstItem = d.pricing?.[0];

              return (
                <div
                  key={d.district_id}
                  onClick={() => {
                    setSelectedDistrictId(d.district_id);
                    setViewMode('district-detail');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md ${
                    selectedDistrictId === d.district_id
                      ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {d.district_name}
                      </div>
                      <span className="text-[11px] text-slate-500">Division: {d.division_name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-100 text-emerald-800">
                      {count} SKUs
                    </span>
                  </div>

                  {firstItem && (
                    <div className="mt-3 pt-2 border-t border-slate-100 text-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Sample Benchmark ({firstItem.brand}):
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-600">Buy: ৳{Number(firstItem.supplier_price).toFixed(2)}</span>
                        <span className="text-emerald-700 font-bold">Sell: ৳{Number(firstItem.outlet_price).toFixed(2)}</span>
                        <span className="text-blue-700">MRP: ৳{Number(firstItem.retail_price).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>View Full Board</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
