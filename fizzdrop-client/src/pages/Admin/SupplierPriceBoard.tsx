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
  ShieldAlert,
  Sparkles,
  Info,
  Building,
  CheckCircle2,
  Package,
  Layers,
  MapPin,
  Check,
  Building2,
  TableProperties,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface PricingItem {
  id: number;
  district_id: number;
  product_id: number;
  supplier_price: number;
  outlet_price: number;
  retail_price: number;
  district_name?: string;
  division_name?: string;
  product_name?: string;
  brand?: string;
  flavor_variant?: string;
  sku?: string;
  category?: string;
  packaging?: string;
  size_volume?: string;
  image_url?: string;
  central_stock?: number;
  updated_at?: string;
}

export interface AssignedDistrict {
  id: number;
  name: string;
  division: string;
  is_primary?: boolean;
}

export interface SupplierBoardData {
  district_id: number;
  district_name: string;
  division_name: string;
  supplier_user_id: number;
  supplier_id?: number;
  business_name: string;
  depot_address: string;
  primary_district_id?: number;
  selected_district_id?: number;
  assigned_districts?: AssignedDistrict[];
  multi_district_pricing?: Record<
    string,
    Record<
      string,
      {
        supplier_price: number;
        outlet_price: number;
        retail_price: number;
        district_id?: number;
      }
    >
  >;
  is_supplier_locked: boolean;
  total_products: number;
  pricing: PricingItem[];
}

export interface SupplierPriceBoardProps {
  userId?: number;
  supplierId?: number;
  onRequestStock?: (productId: number) => void;
}

export const SupplierPriceBoard: React.FC<SupplierPriceBoardProps> = ({
  userId,
  supplierId,
  onRequestStock,
}) => {
  const { user, token } = useAuth();
  const effectiveUserId = userId || user?.user_id || 4;

  const [boardData, setBoardData] = useState<SupplierBoardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [updateAlert, setUpdateAlert] = useState<string | null>(null);

  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [isMultiDistrictView, setIsMultiDistrictView] = useState<boolean>(false);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [activeSupplierId, setActiveSupplierId] = useState<number | null>(supplierId || null);

  // Fetch all suppliers for selection (especially for superadmin or multi-supplier management)
  useEffect(() => {
    fetch('http://localhost:8080/api/v1/suppliers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllSuppliers(data);
          const current = data.find((s) => s.user_id === effectiveUserId || s.id === supplierId);
          if (current && !activeSupplierId) {
            setActiveSupplierId(current.id);
          }
        }
      })
      .catch((e) => console.warn('Could not load all suppliers:', e));
  }, [effectiveUserId, supplierId]);

  const fetchPriceBoard = async (distIdOverride?: number, suppIdOverride?: number, silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const activeDist = distIdOverride !== undefined ? distIdOverride : selectedDistrictId;
      const activeSup = suppIdOverride !== undefined ? suppIdOverride : activeSupplierId;

      let url = `http://localhost:8080/api/v1/pricing/supplier/board?userId=${effectiveUserId}`;
      if (activeSup) {
        url += `&supplierId=${activeSup}`;
      }
      if (activeDist) {
        url += `&districtId=${activeDist}`;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Failed to fetch territory price board.');
      }

      const data: SupplierBoardData = await res.json();
      setBoardData(data);
      if (selectedDistrictId === null && data.district_id) {
        setSelectedDistrictId(data.district_id);
      }
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Error fetching price board:', err);
      if (!boardData) {
        setErrorMsg('Unable to load territory price board. Please check backend connection.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPriceBoard();
  }, [effectiveUserId, activeSupplierId]);

  const handleSelectDistrict = (distId: number) => {
    setSelectedDistrictId(distId);
    setIsMultiDistrictView(false);
    fetchPriceBoard(distId, undefined, false);
  };

  const handleSelectSupplier = (supId: number) => {
    setActiveSupplierId(supId);
    setSelectedDistrictId(null);
    setIsMultiDistrictView(false);
    fetchPriceBoard(undefined, supId, false);
  };

  // Real-time listener for price updates
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('fizzdrop_realtime_events');
      bc.onmessage = (event) => {
        const d = event.data;
        if (d && (d.type === 'PRICE_UPDATED' || d.type === 'DISTRICT_PRICING')) {
          const targetDistId = Number(d.district_id || d.referenceId);
          const isAssigned = boardData?.assigned_districts?.some(
            (ad) => Number(ad.id) === targetDistId
          );
          if (isAssigned || !targetDistId || targetDistId === Number(selectedDistrictId)) {
            fetchPriceBoard(selectedDistrictId || undefined, undefined, true);
            setUpdateAlert(
              `Price Board Updated: New official rates applied for ${
                d.district_name || 'your assigned territory'
              }!`
            );
            setTimeout(() => setUpdateAlert(null), 6000);
          }
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported:', err);
    }

    const handleCustomPriceEvent = (e: any) => {
      fetchPriceBoard(selectedDistrictId || undefined, undefined, true);
      setUpdateAlert('Price Board Updated: New official rates loaded in real-time!');
      setTimeout(() => setUpdateAlert(null), 6000);
    };

    window.addEventListener('fizzdrop_price_updated', handleCustomPriceEvent);

    // Fallback polling every 20 seconds to ensure zero latency
    const interval = setInterval(() => {
      fetchPriceBoard(selectedDistrictId || undefined, undefined, true);
    }, 20000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('fizzdrop_price_updated', handleCustomPriceEvent);
      clearInterval(interval);
    };
  }, [boardData?.assigned_districts, selectedDistrictId, activeSupplierId]);

  const categories = useMemo(() => {
    if (!boardData?.pricing) return ['all'];
    const cats = Array.from(
      new Set(boardData.pricing.map((p) => p.category).filter(Boolean))
    ) as string[];
    return ['all', ...cats];
  }, [boardData]);

  const filteredItems = useMemo(() => {
    if (!boardData?.pricing) return [];
    return boardData.pricing.filter((item) => {
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
  }, [boardData, searchQuery, selectedCategory]);

  // Overall Statistics for this supplier's currently selected district
  const stats = useMemo(() => {
    if (!boardData?.pricing || boardData.pricing.length === 0) {
      return {
        totalProducts: 0,
        avgBuyPrice: 0,
        avgOutletPrice: 0,
        avgRetailPrice: 0,
        avgMarginPercent: 0,
      };
    }
    const count = boardData.pricing.length;
    const totalBuy = boardData.pricing.reduce((sum, p) => sum + Number(p.supplier_price || 0), 0);
    const totalOutlet = boardData.pricing.reduce((sum, p) => sum + Number(p.outlet_price || 0), 0);
    const totalRetail = boardData.pricing.reduce((sum, p) => sum + Number(p.retail_price || 0), 0);

    const avgBuy = totalBuy / count;
    const avgOutlet = totalOutlet / count;
    const avgMargin = avgBuy > 0 ? ((avgOutlet - avgBuy) / avgBuy) * 100 : 0;

    return {
      totalProducts: count,
      avgBuyPrice: avgBuy,
      avgOutletPrice: avgOutlet,
      avgRetailPrice: totalRetail / count,
      avgMarginPercent: avgMargin,
    };
  }, [boardData]);

  const assignedDistricts = boardData?.assigned_districts || [];
  const currentDistrictName = boardData?.district_name || 'Assigned District';
  const currentDivisionName = boardData?.division_name || 'Territory';

  if (loading && !boardData) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 bg-[#DEFDEF] rounded-2xl animate-pulse border border-[#BFC8C5]" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#DEFDEF] rounded-xl animate-pulse border border-[#BFC8C5]" />
          ))}
        </div>
        <div className="h-64 bg-[#DEFDEF] rounded-2xl animate-pulse border border-[#BFC8C5]" />
      </div>
    );
  }

  return (
    <div className="supplier-theme space-y-6 pb-12">
      {/* Live Auto-Update Toast */}
      {updateAlert && (
        <div className="fixed top-24 right-4 sm:right-8 z-[140] animate-bounce">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#DEFDEF] text-[#15221C] border-2 border-[#15221C] shadow-2xl backdrop-blur-md">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <Sparkles className="w-5 h-5 text-emerald-800 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#15221C]">
                Real-Time Sync Notice
              </p>
              <p className="text-xs font-medium text-[#1E2E27]">{updateAlert}</p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Switcher (Available when multiple suppliers exist or for superadmin) */}
      {allSuppliers.length > 1 && (
        <div className="bg-[#DEFDEF] rounded-2xl p-4 border border-[#BFC8C5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#15221C]" />
            <span className="text-xs font-black uppercase tracking-wide text-[#15221C]">
              Managing Supplier Profile:
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {allSuppliers.map((s) => {
              const isSelected = activeSupplierId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSupplier(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#15221C] text-white border-[#15221C] shadow-xs'
                      : 'bg-white text-[#15221C] border-[#BFC8C5] hover:bg-[#C8F1E8]'
                  }`}
                >
                  {s.business_name}
                  <span className="ml-1.5 text-[10px] opacity-80 font-mono">
                    ({s.district_name || 'Territory'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero Header Banner strictly styled in Supplier theme */}
      <div className="bg-[#DEFDEF] rounded-2xl p-5 sm:p-6 border border-[#BFC8C5] shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFE8BD] text-[#15221C] text-xs font-black border border-[#BFC8C5] shadow-xs">
                <Tag className="w-3.5 h-3.5 text-[#15221C]" />
                TERRITORY PRICE BOARD
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#C8F1E8] text-[#15221C] text-xs font-mono font-bold border border-[#BFC8C5]">
                📍 {currentDistrictName} District
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#EEF9FA] text-[#384640] text-xs font-medium border border-[#BFC8C5]">
                Division: {currentDivisionName}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#DEFDEF] text-[#15221C] text-[11px] font-bold border border-[#BFC8C5]">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-800" />
                {assignedDistricts.length} Assigned Districts Under Contract
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#15221C] tracking-tight uppercase">
              {currentDistrictName} District Official Price Board
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5852] max-w-3xl leading-relaxed">
              Official multi-echelon commercial pricing allotted for your regional depot in{' '}
              <strong>{currentDistrictName} District</strong>. All wholesale stock orders from
              Superadmin and dispatches to Sales Officers & Outlets within {currentDistrictName} strictly
              execute at these approved rates.
            </p>
          </div>

          {/* Action & Sync Controls */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="text-[11px] font-mono font-bold text-[#15221C]">
                LIVE AUTO-SYNC: ON
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#4A5852]">
              Synced: {lastSyncTime.toLocaleTimeString()}
            </div>
            <button
              onClick={() => fetchPriceBoard(undefined, undefined, false)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FFE8BD] hover:bg-[#FADECF] text-[#15221C] text-xs font-bold border border-[#BFC8C5] shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing Rates...' : 'Refresh Board'}</span>
            </button>
          </div>
        </div>

        {/* Territory Details Notice */}
        <div className="mt-4 pt-3 border-t border-[#BFC8C5]/70 flex flex-wrap items-center justify-between text-xs text-[#384640] gap-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#15221C]" />
            <span>
              Allotted Supplier:{' '}
              <strong className="text-[#15221C]">
                {boardData?.business_name || 'Regional Supplier Ltd.'}
              </strong>
            </span>
            <span className="text-[#BFC8C5]">•</span>
            <span>
              Depot:{' '}
              <span className="font-mono text-[#15221C]">
                {boardData?.depot_address || 'Regional Territory Depot'}
              </span>
            </span>
          </div>
          <div className="text-[11px] text-[#4A5852] font-semibold">
            * Select any of your assigned districts below to inspect that territory's official rates.
          </div>
        </div>
      </div>

      {/* Assigned Districts Territory Switcher Bar */}
      {assignedDistricts.length > 0 && (
        <div className="bg-[#DEFDEF] rounded-2xl p-4 sm:p-5 border-2 border-[#15221C]/20 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#15221C]" />
              <h2 className="text-xs sm:text-sm font-black uppercase text-[#15221C] tracking-wide">
                Assigned Districts for {boardData?.business_name} ({assignedDistricts.length} Districts)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMultiDistrictView(!isMultiDistrictView)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isMultiDistrictView
                    ? 'bg-[#15221C] text-white border-[#15221C] shadow-xs'
                    : 'bg-white text-[#15221C] border-[#BFC8C5] hover:bg-[#C8F1E8]'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>
                  {isMultiDistrictView ? 'Exit District Matrix' : 'Compare All Districts (Matrix)'}
                </span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#4A5852]">
            Superadmin assigns specific product pricing per district. Click any district below to
            view the updated prices for that particular district:
          </p>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {assignedDistricts.map((dist) => {
              const isSelected = !isMultiDistrictView && selectedDistrictId === dist.id;
              return (
                <button
                  key={dist.id}
                  type="button"
                  onClick={() => handleSelectDistrict(dist.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFE8BD] text-[#15221C] border-2 border-[#15221C] shadow-md scale-105'
                      : 'bg-white text-[#15221C] border-[#BFC8C5] hover:bg-[#C8F1E8] hover:border-[#15221C]'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-[#15221C]' : 'text-slate-400'}`} />
                  <span>{dist.name}</span>
                  {dist.is_primary && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-[#C8F1E8] text-[#15221C] font-bold">
                      ★ Primary
                    </span>
                  )}
                  {isSelected && <Check className="w-3 h-3 text-[#15221C] stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total SKUs */}
        <div className="bg-[#DEFDEF] rounded-2xl p-4 border border-[#BFC8C5] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5852]">
              Priced SKUs in {currentDistrictName}
            </span>
            <div className="text-2xl font-black text-[#15221C]">
              {stats.totalProducts} <span className="text-xs font-normal text-[#4A5852]">SKUs</span>
            </div>
            <span className="text-[10px] text-emerald-800 font-bold block">
              100% Territory Coverage
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#C8F1E8] border border-[#BFC8C5] text-[#15221C]">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Average Inbound Buy Cost */}
        <div className="bg-[#DEFDEF] rounded-2xl p-4 border border-[#BFC8C5] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5852]">
              Your Buy Rate ({currentDistrictName})
            </span>
            <div className="text-2xl font-black text-[#15221C]">৳{stats.avgBuyPrice.toFixed(2)}</div>
            <span className="text-[10px] text-[#4A5852] block">Cost from Superadmin HQ</span>
          </div>
          <div className="p-3 rounded-xl bg-[#FFE8BD] border border-[#BFC8C5] text-[#15221C]">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Average Wholesale Sell Price */}
        <div className="bg-[#DEFDEF] rounded-2xl p-4 border border-[#BFC8C5] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5852]">
              Your Sell Rate ({currentDistrictName})
            </span>
            <div className="text-2xl font-black text-[#15221C]">
              ৳{stats.avgOutletPrice.toFixed(2)}
            </div>
            <span className="text-[10px] text-[#4A5852] block">Supply to Outlets & SOs</span>
          </div>
          <div className="p-3 rounded-xl bg-[#C8F1E8] border border-[#BFC8C5] text-[#15221C]">
            <Store className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Average Profit Margin */}
        <div className="bg-[#DEFDEF] rounded-2xl p-4 border border-[#BFC8C5] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5852]">
              Gross Margin ({currentDistrictName})
            </span>
            <div className="text-2xl font-black text-emerald-800">
              +{stats.avgMarginPercent.toFixed(1)}%
            </div>
            <span className="text-[10px] text-[#4A5852] block">Average Spread per Case</span>
          </div>
          <div className="p-3 rounded-xl bg-[#FADECF] border border-[#BFC8C5] text-[#7D2828]">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#DEFDEF] rounded-2xl p-4 border border-[#BFC8C5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A5852]" />
          <input
            type="text"
            placeholder="Search products by brand, flavor variant, SKU or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#BFC8C5] text-xs font-medium text-[#15221C] placeholder-[#4A5852] focus:outline-none focus:ring-2 focus:ring-[#15221C]"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer border ${
                  isSelected
                    ? 'bg-[#FFE8BD] text-[#15221C] border-[#15221C] shadow-xs'
                    : 'bg-[#EEF9FA] text-[#384640] border-[#BFC8C5] hover:bg-[#C8F1E8]'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-District Comparison Matrix View */}
      {isMultiDistrictView ? (
        <div className="bg-[#DEFDEF] rounded-2xl border border-[#BFC8C5] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#BFC8C5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-[#15221C]" />
              <h2 className="text-sm font-bold text-[#15221C] uppercase tracking-wide">
                Multi-District Comparison Matrix across {assignedDistricts.length} Assigned Districts
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#4A5852]">
              Rates in BDT (৳) • Showing Buy Rate & Sell Rate per District
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EEF9FA] border-b border-[#BFC8C5] text-[11px] font-black uppercase text-[#4A5852]">
                  <th className="py-3 px-4 min-w-[220px]">Product</th>
                  <th className="py-3 px-3">SKU</th>
                  {assignedDistricts.map((d) => (
                    <th
                      key={d.id}
                      className={`py-3 px-3 text-center min-w-[130px] ${
                        selectedDistrictId === d.id ? 'bg-[#FFE8BD]/60 font-black' : ''
                      }`}
                    >
                      <div className="text-[11px] text-[#15221C] font-black">{d.name}</div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {d.is_primary ? '★ Primary' : d.division}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BFC8C5]/60 text-xs">
                {filteredItems.map((item) => (
                  <tr key={item.id || item.product_id} className="hover:bg-[#EEF9FA] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#15221C]">
                        {item.product_name || `${item.brand} ${item.flavor_variant}`}
                      </div>
                      <div className="text-[10px] text-slate-500">{item.size_volume || 'Standard'}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-600">
                      {item.sku || `SKU-${item.product_id}`}
                    </td>
                    {assignedDistricts.map((d) => {
                      const distPricing =
                        boardData?.multi_district_pricing?.[String(d.id)]?.[String(item.product_id)];
                      const buy = distPricing
                        ? distPricing.supplier_price
                        : selectedDistrictId === d.id
                        ? item.supplier_price
                        : 0;
                      const sell = distPricing
                        ? distPricing.outlet_price
                        : selectedDistrictId === d.id
                        ? item.outlet_price
                        : 0;

                      return (
                        <td
                          key={d.id}
                          className={`py-3 px-3 text-center ${
                            selectedDistrictId === d.id ? 'bg-[#FFE8BD]/30' : ''
                          }`}
                        >
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-xs text-[#15221C]">
                              Buy: ৳{Number(buy || 0).toFixed(2)}
                            </span>
                            <span className="font-mono text-[10px] text-emerald-800 font-semibold">
                              Sell: ৳{Number(sell || 0).toFixed(2)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Single District Price Board Table */
        <div className="bg-[#DEFDEF] rounded-2xl border border-[#BFC8C5] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#BFC8C5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#15221C]" />
              <h2 className="text-sm font-bold text-[#15221C] uppercase tracking-wide">
                Official Price Matrix for {currentDistrictName} District ({filteredItems.length} Products)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#4A5852]">
              Currency: BDT (৳) per Wholesale Unit/Case
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-[#4A5852]">
              <Info className="w-8 h-8 mx-auto text-[#BFC8C5] mb-2" />
              <p className="text-sm font-bold text-[#15221C]">No products found matching filters</p>
              <p className="text-xs text-[#4A5852] mt-1">
                Try clearing your search query or selecting a different category.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#EEF9FA] border-b border-[#BFC8C5] text-[11px] font-black uppercase text-[#4A5852]">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category & SKU</th>
                    <th className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFE8BD] text-[#15221C] border border-[#BFC8C5]">
                        1. Your Buy Cost
                      </span>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#C8F1E8] text-[#15221C] border border-[#BFC8C5]">
                        2. Your Sell Rate
                      </span>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#DEFDEF] text-[#15221C] border border-[#BFC8C5]">
                        3. Retail MRP
                      </span>
                    </th>
                    <th className="py-3 px-4 text-center">Your Margin</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BFC8C5]/60 text-xs">
                  {filteredItems.map((item) => {
                    const buyPrice = Number(item.supplier_price || 0);
                    const sellPrice = Number(item.outlet_price || 0);
                    const retailPrice = Number(item.retail_price || 0);
                    const marginTaka = sellPrice - buyPrice;
                    const marginPercent = buyPrice > 0 ? (marginTaka / buyPrice) * 100 : 0;

                    return (
                      <tr
                        key={item.id || item.product_id}
                        className="hover:bg-[#EEF9FA] transition-colors"
                      >
                        {/* Product Name & Visual */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="w-10 h-10 object-contain rounded-lg bg-white border border-[#BFC8C5] p-1 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white border border-[#BFC8C5] flex items-center justify-center text-[#15221C] shrink-0 font-bold">
                                {item.brand?.charAt(0) || 'P'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-sm text-[#15221C]">
                                {item.product_name || `${item.brand} ${item.flavor_variant}`}
                              </div>
                              <div className="text-[11px] text-[#4A5852] flex items-center gap-2 mt-0.5">
                                <span>{item.packaging || 'Can/Bottle'}</span>
                                <span>•</span>
                                <span>{item.size_volume || 'Standard'}</span>
                              </div>
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  📍 {currentDistrictName} Rate
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & SKU */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#C8F1E8] text-[#15221C] text-[10px] font-bold border border-[#BFC8C5]">
                            {item.category || 'General'}
                          </span>
                          <div className="text-[10px] font-mono text-[#4A5852] mt-1">
                            {item.sku || `SKU-${item.product_id}`}
                          </div>
                        </td>

                        {/* 1. Supplier Buy Cost */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-sm font-black font-mono text-[#15221C] bg-[#FFE8BD] px-2.5 py-0.5 rounded-lg border border-[#BFC8C5]">
                              ৳{buyPrice.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-[#4A5852] mt-0.5">From Superadmin</span>
                          </div>
                        </td>

                        {/* 2. Supplier Outlet Sell Price */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-sm font-black font-mono text-[#15221C] bg-[#C8F1E8] px-2.5 py-0.5 rounded-lg border border-[#BFC8C5]">
                              ৳{sellPrice.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-[#4A5852] mt-0.5">To Outlets & SO</span>
                          </div>
                        </td>

                        {/* 3. Retail Consumer MRP */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-sm font-black font-mono text-[#15221C] bg-white px-2.5 py-0.5 rounded-lg border border-[#BFC8C5]">
                              ৳{retailPrice.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-[#4A5852] mt-0.5">Consumer MRP</span>
                          </div>
                        </td>

                        {/* Your Margin */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-bold text-emerald-800 bg-[#DEFDEF] px-2 py-0.5 rounded-md border border-[#BFC8C5]">
                              +৳{marginTaka.toFixed(2)} ({marginPercent.toFixed(1)}%)
                            </span>
                            <span className="text-[9px] text-[#4A5852] mt-0.5">Gross Spread</span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          {onRequestStock ? (
                            <button
                              type="button"
                              onClick={() => onRequestStock(item.product_id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFE8BD] hover:bg-[#FADECF] text-[#15221C] text-xs font-bold border border-[#BFC8C5] shadow-xs cursor-pointer transition-all"
                            >
                              <span>Order Stock</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-[#C8F1E8] px-2 py-1 rounded-lg border border-[#BFC8C5]">
                              ACTIVE RATE
                            </span>
                          )}
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
    </div>
  );
};
