import React, { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  MapPin,
  Package,
  Boxes,
  Bell,
  RefreshCw,
} from 'lucide-react';

interface TradeOffer {
  id: number;
  title: string;
  district_id: number;
  district_name: string;
  division_name: string;
  buy_product_id: number;
  buy_product_name: string;
  buy_quantity_cases: number;
  free_product_id: number;
  free_product_name: string;
  free_quantity_cases: number;
  free_item_type?: 'BEVERAGE' | 'MERCHANDISE' | string;
  description: string;
  status: string;
  created_at: string;
  buy_unit_price?: number;
  buy_product_volume?: string;
  buy_product_image?: string;
  free_unit_value?: number;
  free_product_volume?: string;
  free_product_image?: string;
  free_product_brand?: string;
  free_product_sku?: string;
  free_product_packaging?: string;
  free_merchandise_details?: any;
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
  base_price?: number;
  image_url?: string;
}

interface MerchandiseOption {
  merchandise_id: number;
  brand: string;
  item_type: string;
  name: string;
  sku: string;
  size_spec?: string;
  packaging?: string;
  price?: number;
  stock_quantity?: number;
  image_url?: string;
  description?: string;
  warranty_period?: string;
}

const getDistrictDisplayName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower === 'comilla') return 'Cumilla (Comilla)';
  if (lower === 'chittagong') return 'Chattogram (Chittagong)';
  if (lower === 'barisal') return 'Barishal (Barisal)';
  if (lower === 'jessore') return 'Jashore (Jessore)';
  if (lower === 'bogra') return 'Bogura (Bogra)';
  return name;
};

export const SuperadminOffersManagement: React.FC = () => {
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [merchandiseList, setMerchandiseList] = useState<MerchandiseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>('ALL');
  const [rewardTypeFilter, setRewardTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formDistrictId, setFormDistrictId] = useState<number | ''>('');
  const [formBuyProductId, setFormBuyProductId] = useState<number | ''>('');
  const [formBuyQty, setFormBuyQty] = useState<number>(10);
  const [formRewardType, setFormRewardType] = useState<'BEVERAGE' | 'MERCHANDISE'>('BEVERAGE');
  const [formFreeProductId, setFormFreeProductId] = useState<number | ''>('');
  const [formMerchandiseId, setFormMerchandiseId] = useState<number | ''>('');
  const [formFreeQty, setFormFreeQty] = useState<number>(1);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch trade offers
      const offersRes = await fetch('http://localhost:8080/api/v1/trade-offers');
      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setOffers(offersData);
      }

      // 2. Fetch districts
      const distRes = await fetch('http://localhost:8080/api/v1/pricing/districts');
      if (distRes.ok) {
        const distData = await distRes.json();
        setDistricts(distData);
        if (distData.length > 0 && formDistrictId === '') {
          setFormDistrictId(distData[0].id);
        }
      }

      // 3. Fetch products
      const prodRes = await fetch('http://localhost:8080/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const list = Array.isArray(prodData) ? prodData : (prodData.products || []);
        setProducts(list);
        if (list.length > 0) {
          if (formBuyProductId === '') setFormBuyProductId(list[0].product_id);
          if (formFreeProductId === '') setFormFreeProductId(list.length > 1 ? list[1].product_id : list[0].product_id);
        }
      }

      // 4. Fetch merchandise catalog
      const merchRes = await fetch('http://localhost:8080/api/merchandise');
      if (merchRes.ok) {
        const merchData = await merchRes.json();
        const mList = Array.isArray(merchData) ? merchData : [];
        setMerchandiseList(mList);
        if (mList.length > 0 && formMerchandiseId === '') {
          setFormMerchandiseId(mList[0].merchandise_id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching trade schemes data:', err);
      setError('Failed to load trade schemes and district data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update default title when buy/free product or merchandise changes
  useEffect(() => {
    if (formBuyProductId && formDistrictId) {
      const bProd = products.find((p) => p.product_id === Number(formBuyProductId));
      const dist = districts.find((d) => d.id === Number(formDistrictId));

      if (bProd && dist) {
        const bName = `${bProd.brand} ${bProd.flavor_variant || ''}`.trim();
        if (formRewardType === 'MERCHANDISE' && formMerchandiseId) {
          const mProd = merchandiseList.find((m) => m.merchandise_id === Number(formMerchandiseId));
          if (mProd) {
            const autoTitle = `${dist.name} Merchandise Incentive: Buy ${formBuyQty} Cases ${bName} → Get ${formFreeQty} Free ${mProd.name}`;
            setFormTitle(autoTitle);
            setFormDescription(
              `Promotional retailer merchandise reward for ${dist.name} district: Order ${formBuyQty} cases of ${bName} to receive ${formFreeQty} official ${mProd.name} (Retail value: ৳${Number(mProd.price || 0).toLocaleString()}) 100% free of charge.`
            );
          }
        } else if (formFreeProductId) {
          const fProd = products.find((p) => p.product_id === Number(formFreeProductId));
          if (fProd) {
            const fName = `${fProd.brand} ${fProd.flavor_variant || ''}`.trim();
            const autoTitle = `${dist.name} Special: Buy ${formBuyQty} Cases ${bName} → Get ${formFreeQty} Case ${fName} FREE`;
            setFormTitle(autoTitle);
            setFormDescription(
              `Exclusive retailer trade incentive for ${dist.name} district: Order ${formBuyQty} cases of ${bName} and get ${formFreeQty} free case(s) of ${fName}.`
            );
          }
        }
      }
    }
  }, [formDistrictId, formBuyProductId, formRewardType, formFreeProductId, formMerchandiseId, formBuyQty, formFreeQty, products, districts, merchandiseList]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveFreeId = formRewardType === 'MERCHANDISE' ? formMerchandiseId : formFreeProductId;
    if (!formDistrictId || !formBuyProductId || !effectiveFreeId) {
      alert('Please select district, purchased product, and free bonus item.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8080/api/v1/trade-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district_id: Number(formDistrictId),
          buy_product_id: Number(formBuyProductId),
          buy_quantity_cases: Number(formBuyQty),
          free_product_id: Number(effectiveFreeId),
          free_quantity_cases: Number(formFreeQty),
          free_item_type: formRewardType,
          title: formTitle.trim(),
          description: formDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create trade scheme.');
      }

      setSuccessMsg(data.message || 'Trade Scheme launched successfully! Suppliers & Outlets have been notified.');
      setIsModalOpen(false);
      await fetchAllData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error creating trade scheme.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (offer: TradeOffer) => {
    const nextStatus = offer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`http://localhost:8080/api/v1/trade-offers/${offer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOffers((prev) =>
          prev.map((o) => (o.id === offer.id ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error('Error toggling offer status:', err);
    }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this promotional trade scheme?')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/v1/trade-offers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOffers((prev) => prev.filter((o) => o.id !== id));
        setSuccessMsg('Offer scheme removed.');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting offer:', err);
    }
  };

  // Divisions set for filtering
  const divisions = Array.from(new Set(districts.map((d) => d.division))).sort();

  // Filtered districts dropdown for filter bar
  const availableFilterDistricts =
    selectedDivision === 'ALL'
      ? districts
      : districts.filter((d) => d.division === selectedDivision);

  // Filtered offers list
  const filteredOffers = offers.filter((o) => {
    if (selectedDivision !== 'ALL' && o.division_name !== selectedDivision) return false;
    if (selectedDistrictFilter !== 'ALL' && String(o.district_id) !== selectedDistrictFilter) return false;
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (rewardTypeFilter !== 'ALL') {
      const type = (o.free_item_type || 'BEVERAGE').toUpperCase();
      if (type !== rewardTypeFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = o.title?.toLowerCase().includes(q);
      const matchDistrict = o.district_name?.toLowerCase().includes(q);
      const matchBuy = o.buy_product_name?.toLowerCase().includes(q);
      const matchFree = o.free_product_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDistrict && !matchBuy && !matchFree) return false;
    }
    return true;
  });

  const totalActive = offers.filter((o) => o.status === 'ACTIVE').length;
  const uniqueDistrictsCovered = new Set(offers.map((o) => o.district_id)).size;

  return (
    <div className="space-y-6 animate-fade-in text-[#2C251F]">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#FFFDF7] via-[#F4EFE6] to-[#EAE3D2] border border-[#D9CBB8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#324438] text-white rounded-xl shadow-md">
            <Gift className="w-6 h-6 text-[#EBFFD8]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#101B14] flex items-center gap-2">
              Trade Promotion & Extra Stock Schemes
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#324438] text-[#EBFFD8]">
                District Specific
              </span>
            </h1>
            <p className="text-xs text-[#5C5042] mt-0.5">
              Assign buy-case bulk targets for specific beverage products to award free bonus cases (e.g. 10 cases Pepsi → 1 or 2 cases Aquafina free) for individual districts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
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
            <span>Create District Offer</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#EBF5EE] text-[#245E3D]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#7A6E5D] uppercase tracking-wider">Active Trade Schemes</p>
            <p className="text-xl font-black text-[#101B14]">{totalActive} <span className="text-xs font-normal text-gray-500">of {offers.length} total</span></p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#EFF6FF] text-[#1D4ED8]">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#7A6E5D] uppercase tracking-wider">Districts Covered</p>
            <p className="text-xl font-black text-[#101B14]">{uniqueDistrictsCovered} <span className="text-xs font-normal text-gray-500">Districts</span></p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#FEF3C7] text-[#B45309]">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#7A6E5D] uppercase tracking-wider">Standard Ratio</p>
            <p className="text-xl font-black text-[#101B14]">10 : 1 or 2 <span className="text-xs font-normal text-gray-500">Free Bonus</span></p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#F0FDF4] text-[#15803D]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#7A6E5D] uppercase tracking-wider">Supplier Sync</p>
            <p className="text-sm font-bold text-[#15803D] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 inline" /> Auto-Notified Live
            </p>
          </div>
        </div>
      </div>

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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5DECF] shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, product, or district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D9CBB8] focus:outline-hidden focus:border-[#324438]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#7A6E5D] uppercase">Division:</span>
          <select
            value={selectedDivision}
            onChange={(e) => {
              setSelectedDivision(e.target.value);
              setSelectedDistrictFilter('ALL');
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D9CBB8] bg-white text-[#2C251F]"
          >
            <option value="ALL">All Divisions</option>
            {divisions.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#7A6E5D] uppercase">District:</span>
          <select
            value={selectedDistrictFilter}
            onChange={(e) => setSelectedDistrictFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D9CBB8] bg-white text-[#2C251F]"
          >
            <option value="ALL">All Districts</option>
            {availableFilterDistricts.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {getDistrictDisplayName(d.name)} ({d.division})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#7A6E5D] uppercase">Reward:</span>
          <select
            value={rewardTypeFilter}
            onChange={(e) => setRewardTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D9CBB8] bg-white text-[#2C251F]"
          >
            <option value="ALL">All Reward Types</option>
            <option value="BEVERAGE">🥤 Free Beverage Cases</option>
            <option value="MERCHANDISE">🎁 Free Merchandise Gifts</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#7A6E5D] uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D9CBB8] bg-white text-[#2C251F]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DECF]">
          <RefreshCw className="w-8 h-8 text-[#324438] animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#7A6E5D]">Loading trade schemes & district offers...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#D9CBB8]">
          <Gift className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-700">No Promotional Schemes Found</h3>
          <p className="text-xs text-gray-500 mt-1">
            No trade offers match your selected filter criteria. Click "Create District Offer" to launch a new scheme.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredOffers.map((offer) => {
            const isActive = offer.status === 'ACTIVE';
            return (
              <div
                key={offer.id}
                className={`p-5 rounded-2xl bg-white border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                  isActive ? 'border-[#B8CBBE]' : 'border-gray-200 opacity-75'
                }`}
              >
                <div>
                  {/* Card Header: District Badge & Status Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#EBF5EE] text-[#245E3D] border border-[#B8CBBE]">
                        <MapPin className="w-3.5 h-3.5" />
                        {offer.district_name} District ({offer.division_name})
                      </span>
                      {offer.free_item_type === 'MERCHANDISE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          🎁 Merchandise Gift
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          🥤 Bonus Beverage
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        Scheme #{offer.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(offer)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-gray-400" />}
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </button>

                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        title="Delete Scheme"
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-black text-[#101B14] mb-1 leading-snug">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-[#5C5042] mb-4 line-clamp-2">
                    {offer.description}
                  </p>

                  {/* Buy / Free Trade Bundle Visual */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#FFFDF7] to-[#F4EFE6] border border-[#D9CBB8] flex items-center justify-between gap-2">
                    {/* Buy Item Block */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {offer.buy_product_image ? (
                          <img
                            src={offer.buy_product_image}
                            alt=""
                            className="w-10 h-10 object-contain rounded-lg border border-gray-200 bg-white p-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                            BUY
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-sm">
                            BUY TARGET
                          </span>
                          <p className="text-xs font-bold text-gray-900 mt-0.5 leading-tight">
                            {offer.buy_quantity_cases} Cases
                          </p>
                          <p className="text-[11px] text-gray-600 truncate max-w-[140px]">
                            {offer.buy_product_name}
                          </p>
                          {offer.buy_unit_price && (
                            <p className="text-[10px] text-gray-500 font-mono">
                              ৳{Number(offer.buy_unit_price).toFixed(2)}/case
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrow / Plus */}
                    <div className="px-2 flex flex-col items-center justify-center text-[#324438]">
                      <ArrowRight className="w-4 h-4 text-[#324438]" />
                      <span className="text-[9px] font-black uppercase text-[#245E3D]">GET</span>
                    </div>

                    {/* Free Item Block */}
                    <div className="flex-1 pl-2 border-l border-[#D9CBB8]/60">
                      {offer.free_item_type === 'MERCHANDISE' ? (
                        <div className="flex items-center gap-2">
                          {offer.free_product_image ? (
                            <img
                              src={offer.free_product_image}
                              alt=""
                              className="w-10 h-10 object-contain rounded-lg border border-purple-300 bg-purple-50 p-0.5"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-800 font-bold text-xs">
                              GIFT
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-purple-600 text-white rounded-sm shadow-xs flex items-center gap-1 w-fit">
                              🎁 {offer.free_quantity_cases} UNIT FREE GIFT
                            </span>
                            <p className="text-xs font-bold text-purple-950 mt-0.5 leading-tight">
                              {offer.free_quantity_cases} Free Merchandise Item
                            </p>
                            <p className="text-[11px] text-purple-900 truncate max-w-[140px]" title={offer.free_product_name}>
                              {offer.free_product_name}
                            </p>
                            <p className="text-[10px] font-bold text-purple-700 font-mono">
                              Gift Value: ৳{Number(offer.free_unit_value || 0).toLocaleString()} (৳0.00 Cost)
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {offer.free_product_image ? (
                            <img
                              src={offer.free_product_image}
                              alt=""
                              className="w-10 h-10 object-contain rounded-lg border border-emerald-300 bg-emerald-50 p-0.5"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-xs">
                              FREE
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-600 text-white rounded-sm shadow-xs">
                              {offer.free_quantity_cases} CASE(S) FREE
                            </span>
                            <p className="text-xs font-bold text-emerald-950 mt-0.5 leading-tight">
                              {offer.free_quantity_cases} Bonus Case
                            </p>
                            <p className="text-[11px] text-emerald-900 truncate max-w-[140px]" title={offer.free_product_name}>
                              {offer.free_product_name}
                            </p>
                            <p className="text-[10px] font-bold text-emerald-700 font-mono">
                              Cost: ৳0.00 (Free Stock)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#7A6E5D]">
                  <span>Created: {new Date(offer.created_at).toLocaleDateString()}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available to Outlets in {offer.district_name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE OFFER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#D9CBB8] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#324438] to-[#1E2D24] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/10 text-[#EBFFD8]">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Create District Trade Scheme</h3>
                  <p className="text-xs text-white/70">
                    Assign bulk purchase extra stock incentives for a specific district
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
            <form onSubmit={handleCreateOffer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* District Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  1. Target District (Individual Territory) *
                </label>
                <select
                  value={formDistrictId}
                  onChange={(e) => setFormDistrictId(Number(e.target.value))}
                  required
                  className="w-full p-2.5 text-xs rounded-xl border border-[#D9CBB8] bg-white text-gray-900 font-semibold focus:border-[#324438]"
                >
                  <option value="" disabled>
                    -- Select District --
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {getDistrictDisplayName(d.name)} ({d.division} Division)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Suppliers handling this district will receive automated notifications, and outlets in this district can order.
                </p>
              </div>

              {/* Buy Product & Cases */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase">
                  <Package className="w-4 h-4 text-blue-700" />
                  <span>2. Purchased Product (Condition)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-blue-800 mb-1">
                      Beverage Product *
                    </label>
                    <select
                      value={formBuyProductId}
                      onChange={(e) => setFormBuyProductId(Number(e.target.value))}
                      required
                      className="w-full p-2 text-xs rounded-lg border border-blue-300 bg-white text-gray-900"
                    >
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.brand} {p.flavor_variant} ({p.size_volume || 'Standard'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-blue-800 mb-1">
                      Required Cases *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formBuyQty}
                      onChange={(e) => setFormBuyQty(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                      className="w-full p-2 text-xs rounded-lg border border-blue-300 bg-white text-gray-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Free Reward Section: Beverage vs Merchandise Toggle */}
              <div className={`p-4 rounded-xl border transition-all space-y-3.5 ${
                formRewardType === 'MERCHANDISE'
                  ? 'bg-purple-50/70 border-purple-200'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase">
                    <Gift className={`w-4 h-4 ${formRewardType === 'MERCHANDISE' ? 'text-purple-700' : 'text-emerald-700'}`} />
                    <span className={formRewardType === 'MERCHANDISE' ? 'text-purple-900' : 'text-emerald-900'}>
                      3. Reward Type (Bonus Stock or Branded Merchandise) *
                    </span>
                  </div>

                  {/* Toggle tabs */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setFormRewardType('BEVERAGE')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        formRewardType === 'BEVERAGE'
                          ? 'bg-[#324438] text-[#EBFFD8] shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      🥤 Beverage Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormRewardType('MERCHANDISE')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        formRewardType === 'MERCHANDISE'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      🎁 Merchandise Gift
                    </button>
                  </div>
                </div>

                {formRewardType === 'BEVERAGE' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                        Free Beverage Product *
                      </label>
                      <select
                        value={formFreeProductId}
                        onChange={(e) => setFormFreeProductId(Number(e.target.value))}
                        required
                        className="w-full p-2 text-xs rounded-lg border border-emerald-300 bg-white text-gray-900"
                      >
                        {products.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.brand} {p.flavor_variant} ({p.size_volume || 'Standard'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                        Free Cases Awarded *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formFreeQty}
                        onChange={(e) => setFormFreeQty(Math.max(1, parseInt(e.target.value) || 1))}
                        required
                        className="w-full p-2 text-xs rounded-lg border border-emerald-300 bg-white text-gray-900 font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-purple-800 mb-1">
                          Select Official Merchandise Product *
                        </label>
                        <select
                          value={formMerchandiseId}
                          onChange={(e) => setFormMerchandiseId(Number(e.target.value))}
                          required
                          className="w-full p-2 text-xs rounded-lg border border-purple-300 bg-white text-gray-900"
                        >
                          {merchandiseList.map((m) => (
                            <option key={m.merchandise_id} value={m.merchandise_id}>
                              [{m.brand}] {m.name} — Retail: ৳{Number(m.price || 0).toLocaleString()} ({m.item_type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-purple-800 mb-1">
                          Free Gift Units *
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formFreeQty}
                          onChange={(e) => setFormFreeQty(Math.max(1, parseInt(e.target.value) || 1))}
                          required
                          className="w-full p-2 text-xs rounded-lg border border-purple-300 bg-white text-gray-900 font-bold"
                        />
                      </div>
                    </div>

                    {/* Merchandise Preview Card */}
                    {(() => {
                      const selMerch = merchandiseList.find((m) => m.merchandise_id === Number(formMerchandiseId));
                      if (!selMerch) return null;
                      return (
                        <div className="p-3 rounded-lg bg-white border border-purple-200 flex items-center gap-3">
                          {selMerch.image_url ? (
                            <img
                              src={selMerch.image_url}
                              alt=""
                              className="w-12 h-12 rounded-lg object-contain border border-purple-100 bg-purple-50/50 p-1 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-black text-sm shrink-0">
                              🎁
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 truncate">
                                {selMerch.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800">
                                {selMerch.brand} • {selMerch.item_type}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-600 flex items-center gap-3 mt-0.5 flex-wrap">
                              <span>SKU: <code className="text-gray-800 font-mono">{selMerch.sku}</code></span>
                              {selMerch.size_spec && <span>Spec: <b>{selMerch.size_spec}</b></span>}
                              <span>Retail Value: <b className="text-purple-700">৳{Number(selMerch.price || 0).toLocaleString()}</b></span>
                              <span>Stock Available: <b className="text-emerald-700">{selMerch.stock_quantity ?? 0} units</b></span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Scheme Display Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  placeholder="e.g. Cumilla Special: Buy 10 Cases Pepsi → Get 2 Cases Aquafina FREE"
                  className="w-full p-2 text-xs rounded-lg border border-[#D9CBB8] text-gray-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Terms & Commercial Notes
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Notes for suppliers and outlets..."
                  className="w-full p-2 text-xs rounded-lg border border-[#D9CBB8] text-gray-900"
                />
              </div>

              {/* Action Buttons */}
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
                  <span>Publish Offer & Notify Suppliers</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
