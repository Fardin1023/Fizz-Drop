import React, { useState, useEffect } from 'react';
import {
  Coins,
  MapPin,
  Save,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight,
  TrendingUp,
  Store,
  Truck,
  Users,
  ShieldCheck,
  Check,
  Globe,
  Percent,
} from 'lucide-react';

export interface DistrictSummary {
  id: number;
  name: string;
  division: string;
  priced_products_count: number;
  total_products_count: number;
  is_fully_priced: boolean;
}

export interface DistrictProductPriceItem {
  id?: number;
  district_id: number;
  product_id: number;
  supplier_price: number;
  outlet_price: number;
  retail_price: number;
  product_name?: string;
  brand?: string;
  flavor_variant?: string;
  sku?: string;
  category?: string;
  packaging?: string;
  size_volume?: string;
  image_url?: string;
  central_stock?: number;
  district_name?: string;
  division_name?: string;
}

interface DistrictPricingStudioProps {
  initialDistrictId?: number;
}

export const DistrictPricingStudio: React.FC<DistrictPricingStudioProps> = ({
  initialDistrictId = 1,
}) => {
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(initialDistrictId);
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [districtSearch, setDistrictSearch] = useState<string>('');

  const [pricingItems, setPricingItems] = useState<DistrictProductPriceItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(true);
  const [loadingPricing, setLoadingPricing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [actionAlert, setActionAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Copy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [copyTargetMode, setCopyTargetMode] = useState<'all' | 'selected'>('all');
  const [copySelectedDistricts, setCopySelectedDistricts] = useState<number[]>([]);
  const [copying, setCopying] = useState<boolean>(false);

  // Fetch all 64 districts
  const fetchDistricts = async () => {
    setLoadingDistricts(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/pricing/districts');
      if (res.ok) {
        const data = await res.json();
        setDistricts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load districts:', err);
    } finally {
      setLoadingDistricts(false);
    }
  };

  // Fetch pricing for selected district
  const fetchDistrictPricing = async (districtId: number) => {
    setLoadingPricing(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/pricing/district/${districtId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.pricing) ? data.pricing : [];
        setPricingItems(list);
      } else {
        setPricingItems([]);
      }
    } catch (err) {
      console.error(`Failed to load pricing for district #${districtId}:`, err);
      setPricingItems([]);
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (selectedDistrictId) {
      fetchDistrictPricing(selectedDistrictId);
    }
  }, [selectedDistrictId]);

  // Handle price input changes
  const handlePriceChange = (
    productId: number,
    field: 'supplier_price' | 'outlet_price' | 'retail_price',
    value: string
  ) => {
    const num = parseFloat(value);
    const parsed = isNaN(num) ? 0 : num;

    setPricingItems((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          return {
            ...item,
            [field]: parsed,
          };
        }
        return item;
      })
    );
  };

  // Quick markup calculation helper (e.g. set 15% margin on top of supplier price)
  const applyQuickMarkup = (productId: number, tier: 'outlet' | 'retail', percentage: number) => {
    setPricingItems((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          if (tier === 'outlet') {
            const newOutlet = Number((item.supplier_price * (1 + percentage / 100)).toFixed(2));
            return {
              ...item,
              outlet_price: newOutlet,
            };
          } else {
            const base = item.outlet_price > 0 ? item.outlet_price : item.supplier_price;
            const newRetail = Number((base * (1 + percentage / 100)).toFixed(2));
            return {
              ...item,
              retail_price: newRetail,
            };
          }
        }
        return item;
      })
    );
  };

  // Save district pricing (all products)
  const handleSavePricing = async () => {
    if (!selectedDistrictId || pricingItems.length === 0) return;

    setSaving(true);
    setActionAlert(null);

    try {
      const payload = pricingItems.map((item) => ({
        product_id: item.product_id,
        supplier_price: item.supplier_price,
        outlet_price: item.outlet_price,
        retail_price: item.retail_price,
      }));

      const res = await fetch(`http://localhost:8080/api/v1/pricing/district/${selectedDistrictId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update district pricing');
      }

      const data = await res.json().catch(() => ({}));
      const activeDist = districts.find((d) => d.id === selectedDistrictId);
      setActionAlert({
        text: data.message || `Successfully allotted 3-tier pricing for ${pricingItems.length} products in ${activeDist?.name || 'selected'} district! Saved in the database and applied to all suppliers and outlets.`,
        type: 'success',
      });
      fetchDistricts();

      // Broadcast real-time pricing update to all active supplier & outlet tabs
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'PRICE_UPDATED',
          district_id: selectedDistrictId,
          district_name: activeDist?.name,
          timestamp: Date.now(),
        });
        bc.close();
      } catch (e) {}

      setTimeout(() => setActionAlert(null), 6000);
    } catch (err: any) {
      setActionAlert({
        text: err.message || 'Error saving district pricing',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Save single product pricing for this district
  const handleSaveSingleProduct = async (item: DistrictProductPriceItem) => {
    if (!selectedDistrictId) return;

    setSavingProductId(item.product_id);
    setActionAlert(null);

    try {
      const payload = [{
        product_id: item.product_id,
        supplier_price: item.supplier_price,
        outlet_price: item.outlet_price,
        retail_price: item.retail_price,
      }];

      const res = await fetch(`http://localhost:8080/api/v1/pricing/district/${selectedDistrictId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update product pricing');
      }

      const activeDist = districts.find((d) => d.id === selectedDistrictId);
      setActionAlert({
        text: `Saved & applied pricing for ${item.brand} ${item.flavor_variant} in ${activeDist?.name || 'District'}! Saved in database and applied to all regional suppliers and outlets.`,
        type: 'success',
      });
      fetchDistricts();

      // Real-time broadcast
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'PRICE_UPDATED',
          district_id: selectedDistrictId,
          district_name: activeDist?.name,
          product_id: item.product_id,
          timestamp: Date.now(),
        });
        bc.close();
      } catch (e) {}

      setTimeout(() => setActionAlert(null), 5000);
    } catch (err: any) {
      setActionAlert({
        text: err.message || 'Error saving product pricing',
        type: 'error',
      });
    } finally {
      setSavingProductId(null);
    }
  };

  // Copy pricing to other districts
  const handleCopyPricing = async () => {
    if (!selectedDistrictId) return;

    setCopying(true);
    try {
      const payload: any = {
        from_district_id: selectedDistrictId,
      };

      if (copyTargetMode === 'all') {
        payload.all = true;
      } else {
        if (copySelectedDistricts.length === 0) {
          alert('Please select at least one target district to copy pricing.');
          setCopying(false);
          return;
        }
        payload.target_district_ids = copySelectedDistricts;
      }

      const res = await fetch('http://localhost:8080/api/v1/pricing/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to copy district pricing');
      }

      const data = await res.json();
      setIsCopyModalOpen(false);
      setActionAlert({
        text: data.message || 'Successfully copied pricing across target districts!',
        type: 'success',
      });
      fetchDistricts();

      // Real-time broadcast
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'PRICE_UPDATED',
          from_district_id: selectedDistrictId,
          timestamp: Date.now(),
        });
        bc.close();
      } catch (e) {}

      setTimeout(() => setActionAlert(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Error copying pricing');
    } finally {
      setCopying(false);
    }
  };

  // Divisions filter
  const divisions = ['ALL', ...Array.from(new Set(districts.map((d) => d.division).filter(Boolean)))];

  const filteredDistricts = districts.filter((d) => {
    const matchesDiv = selectedDivision === 'ALL' || d.division.toLowerCase() === selectedDivision.toLowerCase();
    const matchesSearch = d.name.toLowerCase().includes(districtSearch.toLowerCase());
    return matchesDiv && matchesSearch;
  });

  const activeDistrictObj = districts.find((d) => d.id === selectedDistrictId);

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {actionAlert && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="leading-relaxed">{actionAlert.text}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              SUPERADMIN DISTRICT PRICING CONTROL
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono font-semibold text-slate-600">
              64 Districts Multi-Tier Echelon
            </span>
          </div>
          <h2 className="font-oswald text-xl sm:text-2xl font-black text-zinc-900 uppercase tracking-tight mt-1">
            District-Level Stock & Product Pricing Allotment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
            Allot and adjust 3-tier pricing for each individual district in Bangladesh. Define the fixed price at which Superadmin sells to Suppliers, the fixed wholesale price Suppliers sell to Outlets, and the consumer retail MRP.
          </p>
        </div>

        {/* Global Studio Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCopyModalOpen(true)}
            className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-slate-300 shadow-2xs"
            title="Copy pricing from this district to other districts nationwide"
          >
            <Copy className="w-4 h-4 text-slate-600" />
            <span>Copy Pricing to Other Districts</span>
          </button>

          <button
            type="button"
            onClick={handleSavePricing}
            disabled={saving || loadingPricing}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
            <span>{saving ? 'Allotting Pricing...' : `Save & Allot for ${activeDistrictObj?.name || 'District'}`}</span>
          </button>
        </div>
      </div>

      {/* District Selector & Division Filters */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                Target District
              </span>
              <span className="font-oswald text-base font-black text-zinc-900 tracking-tight">
                {activeDistrictObj?.name || 'Select District'} ({activeDistrictObj?.division || 'Division'})
              </span>
            </div>
          </div>

          {/* District Search & Dropdown */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                placeholder="Search 64 districts..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <select
              value={selectedDistrictId}
              onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 focus:outline-none cursor-pointer"
            >
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.division}) - {d.priced_products_count} SKUs
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Division Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2.5">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Division:
          </span>
          {divisions.map((div) => {
            const isSelected = selectedDivision.toLowerCase() === div.toLowerCase();
            return (
              <button
                key={div}
                type="button"
                onClick={() => setSelectedDivision(div)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {div}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Tier Multi-Echelon Information Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tier 1 */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black font-oswald text-xs">
            T1
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-blue-800 block">
              Tier 1: Superadmin → Supplier
            </span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5">
              Fixed Buy Rate
            </span>
            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
              Suppliers in {activeDistrictObj?.name} purchase inventory batches from Superadmin at this exact fixed price.
            </span>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black font-oswald text-xs">
            T2
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-indigo-800 block">
              Tier 2: Supplier → Outlet
            </span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5">
              Fixed Wholesale Rate
            </span>
            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
              Suppliers sell to retail franchise outlets and SOs in {activeDistrictObj?.name} at this exact rate.
            </span>
          </div>
        </div>

        {/* Tier 3 */}
        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 font-black font-oswald text-xs">
            T3
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-purple-800 block">
              Tier 3: Outlet → Customer
            </span>
            <span className="text-xs font-bold text-zinc-900 block mt-0.5">
              Fixed Retail MRP
            </span>
            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
              Outlets sell bottles and cans to walk-in consumers in {activeDistrictObj?.name} at this maximum retail price.
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Matrix Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {loadingPricing ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <span className="font-mono">Loading district pricing matrix for {activeDistrictObj?.name}...</span>
          </div>
        ) : pricingItems.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <Coins className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-oswald text-lg font-bold text-zinc-800 uppercase">
              No Product Records Found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Register products in the Master Catalog to manage their district pricing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Beverage Product</th>
                  <th className="py-3.5 px-4">SKU / Specs</th>
                  <th className="py-3.5 px-4 bg-blue-50/50 text-blue-900 border-x border-blue-100">
                    Tier 1: Supplier Buy Rate (৳)
                  </th>
                  <th className="py-3.5 px-4 bg-indigo-50/50 text-indigo-900 border-r border-indigo-100">
                    Tier 2: Outlet Wholesale Rate (৳)
                  </th>
                  <th className="py-3.5 px-4 bg-purple-50/50 text-purple-900 border-r border-purple-100">
                    Tier 3: Consumer Retail MRP (৳)
                  </th>
                  <th className="py-3.5 px-4 text-center">Calculated Margins</th>
                  <th className="py-3.5 px-4 text-right">Presets & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pricingItems.map((item) => {
                  const supPrice = Number(item.supplier_price || 0);
                  const outPrice = Number(item.outlet_price || 0);
                  const retPrice = Number(item.retail_price || 0);

                  const supplierMargin = outPrice - supPrice;
                  const supplierMarginPct = supPrice > 0 ? ((supplierMargin / supPrice) * 100).toFixed(1) : '0';

                  const outletMargin = retPrice - outPrice;
                  const outletMarginPct = outPrice > 0 ? ((outletMargin / outPrice) * 100).toFixed(1) : '0';

                  const hasWarning = supplierMargin < 0 || outletMargin < 0;

                  return (
                    <tr key={item.product_id} className={`hover:bg-slate-50/80 transition-colors ${hasWarning ? 'bg-amber-50/30' : ''}`}>
                      {/* Product Name & Brand */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.brand || 'Drink'}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <span className="font-oswald font-bold text-xs text-indigo-700">
                                {(item.brand || 'FD').substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 block text-xs">
                              {item.brand} {item.flavor_variant}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Product ID #{item.product_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* SKU & Packaging */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[10px] block w-fit">
                          {item.sku}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-1">
                          {item.packaging} • {item.size_volume}
                        </span>
                      </td>

                      {/* Tier 1: Superadmin -> Supplier */}
                      <td className="py-3 px-4 bg-blue-50/20 border-x border-blue-100/60">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-blue-600">
                            ৳
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={item.supplier_price}
                            onChange={(e) => handlePriceChange(item.product_id, 'supplier_price', e.target.value)}
                            aria-label={`Supplier buy price for ${item.brand} ${item.flavor_variant}`}
                            className="w-28 pl-7 pr-2 py-1.5 rounded-lg border border-blue-300 font-mono font-bold text-xs text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                      </td>

                      {/* Tier 2: Supplier -> Outlet */}
                      <td className="py-3 px-4 bg-indigo-50/20 border-r border-indigo-100/60">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-indigo-600">
                            ৳
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={item.outlet_price}
                            onChange={(e) => handlePriceChange(item.product_id, 'outlet_price', e.target.value)}
                            aria-label={`Outlet wholesale price for ${item.brand} ${item.flavor_variant}`}
                            className="w-28 pl-7 pr-2 py-1.5 rounded-lg border border-indigo-300 font-mono font-bold text-xs text-indigo-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>
                      </td>

                      {/* Tier 3: Outlet -> Customer */}
                      <td className="py-3 px-4 bg-purple-50/20 border-r border-purple-100/60">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-purple-600">
                            ৳
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={item.retail_price}
                            onChange={(e) => handlePriceChange(item.product_id, 'retail_price', e.target.value)}
                            aria-label={`Customer retail MRP for ${item.brand} ${item.flavor_variant}`}
                            className="w-28 pl-7 pr-2 py-1.5 rounded-lg border border-purple-300 font-mono font-bold text-xs text-purple-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                          />
                        </div>
                      </td>

                      {/* Calculated Margins */}
                      <td className="py-3 px-4 text-center">
                        <div className="space-y-1 text-left inline-block">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span className="text-slate-400">Supplier:</span>
                            <span
                              className={`font-bold px-1.5 py-0.2 rounded border ${
                                supplierMargin >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              +৳{supplierMargin.toFixed(2)} ({supplierMarginPct}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span className="text-slate-400">Outlet:</span>
                            <span
                              className={`font-bold px-1.5 py-0.2 rounded border ${
                                outletMargin >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              +৳{outletMargin.toFixed(2)} ({outletMarginPct}%)
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Presets & Save Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => applyQuickMarkup(item.product_id, 'outlet', 15)}
                            className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Set outlet wholesale rate to 15% above supplier buy rate"
                          >
                            +15% T2
                          </button>
                          <button
                            type="button"
                            onClick={() => applyQuickMarkup(item.product_id, 'retail', 15)}
                            className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Set retail MRP to 15% above outlet rate"
                          >
                            +15% T3
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSingleProduct(item)}
                            disabled={savingProductId === item.product_id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs disabled:opacity-50"
                            title={`Save allotted pricing for ${item.brand} in ${activeDistrictObj?.name || 'this district'}`}
                          >
                            {savingProductId === item.product_id ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-white" />
                            ) : (
                              <Save className="w-3 h-3 text-white" />
                            )}
                            <span>Save</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Copy Pricing Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-emerald-600" />
                <h3 className="font-oswald text-lg font-bold text-zinc-900 uppercase">
                  Copy Pricing from {activeDistrictObj?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Replicate the 3-tier multi-echelon pricing from <strong>{activeDistrictObj?.name}</strong> to other districts in Bangladesh.
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all hover:bg-slate-50">
                <input
                  type="radio"
                  name="copyMode"
                  checked={copyTargetMode === 'all'}
                  onChange={() => setCopyTargetMode('all')}
                  className="w-4 h-4 text-emerald-600"
                />
                <div>
                  <span className="font-bold text-xs text-zinc-900 block">
                    All 64 Districts Nationwide
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Apply this exact pricing schedule to every regional logistics hub in Bangladesh.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all hover:bg-slate-50">
                <input
                  type="radio"
                  name="copyMode"
                  checked={copyTargetMode === 'selected'}
                  onChange={() => setCopyTargetMode('selected')}
                  className="w-4 h-4 text-emerald-600"
                />
                <div>
                  <span className="font-bold text-xs text-zinc-900 block">
                    Choose Specific Target Districts
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Select one or more districts to receive these prices.
                  </span>
                </div>
              </label>
            </div>

            {copyTargetMode === 'selected' && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 grid grid-cols-2 gap-1.5">
                {districts
                  .filter((d) => d.id !== selectedDistrictId)
                  .map((d) => {
                    const isChecked = copySelectedDistricts.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer border ${
                          isChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : 'hover:bg-slate-50 border-slate-100 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCopySelectedDistricts((prev) => [...prev, d.id]);
                            } else {
                              setCopySelectedDistricts((prev) => prev.filter((id) => id !== d.id));
                            }
                          }}
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                        <span>{d.name}</span>
                      </label>
                    );
                  })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyPricing}
                disabled={copying}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {copying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{copying ? 'Copying...' : 'Confirm Copy Pricing'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistrictPricingStudio;
