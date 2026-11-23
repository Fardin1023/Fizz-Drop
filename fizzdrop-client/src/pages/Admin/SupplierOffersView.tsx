import React, { useState, useEffect } from 'react';
import {
  Gift,
  MapPin,
  Package,
  Boxes,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
  RefreshCw,
  Search,
  Filter,
  Info,
  Building2,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
}

interface AssignedDistrict {
  id: number;
  name: string;
  division: string;
  is_primary: boolean;
}

interface SupplierSummary {
  id: number;
  user_id: number;
  name: string;
  business_name?: string;
  primary_district_id?: number;
  covered_district_ids?: string;
}

interface SupplierOffersViewProps {
  userId?: number;
  supplierId?: number;
  onRequestStock?: (productId: number) => void;
}

export const SupplierOffersView: React.FC<SupplierOffersViewProps> = ({
  userId,
  supplierId,
  onRequestStock,
}) => {
  const { user, isSuperadmin } = useAuth();
  const effectiveUserId = userId || user?.user_id || 4;

  const [allSuppliers, setAllSuppliers] = useState<SupplierSummary[]>([]);
  const [activeSupplierId, setActiveSupplierId] = useState<number | null>(supplierId || null);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [assignedDistricts, setAssignedDistricts] = useState<AssignedDistrict[]>([]);
  const [businessName, setBusinessName] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch all suppliers to resolve identity and support superadmin switcher
  useEffect(() => {
    fetch('http://localhost:8080/api/v1/suppliers')
      .then((r) => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const formatted: SupplierSummary[] = data.map((s) => ({
            id: s.id,
            user_id: s.user_id,
            name: s.business_name || s.name || `Supplier #${s.id}`,
            business_name: s.business_name,
            primary_district_id: s.primary_district_id,
            covered_district_ids: s.covered_district_ids,
          }));
          setAllSuppliers(formatted);

          // Find current supplier matching effective user
          if (!activeSupplierId) {
            const matched = formatted.find(
              (s) => s.user_id === effectiveUserId || s.id === supplierId
            );
            if (matched) {
              setActiveSupplierId(matched.id);
            } else if (formatted.length > 0) {
              setActiveSupplierId(formatted[0].id);
            }
          }
        }
      })
      .catch((err) => console.error('Failed to load suppliers:', err));
  }, [effectiveUserId, supplierId]);

  // 2. Fetch trade offers strictly isolated to active supplier's assigned districts
  const fetchSupplierOffers = async () => {
    if (!activeSupplierId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/trade-offers/supplier/${activeSupplierId}`);
      if (!res.ok) throw new Error('Failed to fetch supplier trade offers.');

      const data = await res.json();
      setOffers(data.offers || []);
      setAssignedDistricts(data.assigned_districts || []);
      setBusinessName(data.business_name || 'Regional Beverage Depot');
      // Reset district filter if previous filter is no longer in assigned districts
      setSelectedDistrictId('ALL');
    } catch (err: any) {
      console.error('Error loading supplier trade offers:', err);
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSupplierId) {
      fetchSupplierOffers();
    }
  }, [activeSupplierId]);

  const filteredOffers = offers.filter((offer) => {
    if (selectedDistrictId !== 'ALL' && offer.district_id !== selectedDistrictId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = offer.title?.toLowerCase().includes(q);
      const matchDistrict = offer.district_name?.toLowerCase().includes(q);
      const matchBuy = offer.buy_product_name?.toLowerCase().includes(q);
      const matchFree = offer.free_product_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDistrict && !matchBuy && !matchFree) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Top Territory Promotional Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg border border-emerald-700/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-300 border border-emerald-500/30">
              <Gift className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white">
                  Territory Trade Schemes & Extra Stock Offers
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Superadmin Assigned
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40">
                  {businessName}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-1 max-w-2xl">
                Active promotional schemes valid for your assigned distribution territories. You only see trade offers created for your approved districts. Outlets in these districts receive free bonus stock on eligible bulk orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* Superadmin Supplier Switcher */}
            {isSuperadmin && allSuppliers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/20 rounded-xl px-2.5 py-1 text-xs text-white">
                <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] text-emerald-200 font-semibold uppercase">Supplier:</span>
                <select
                  value={activeSupplierId || ''}
                  onChange={(e) => setActiveSupplierId(Number(e.target.value))}
                  className="bg-transparent text-white text-xs font-bold border-none outline-hidden cursor-pointer"
                >
                  {allSuppliers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={fetchSupplierOffers}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Schemes</span>
            </button>
          </div>
        </div>

        {/* Assigned Districts Selector Bar (Strictly the supplier's own districts) */}
        {assignedDistricts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-emerald-800/60 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5" /> Your District Coverage:
            </span>

            <button
              onClick={() => setSelectedDistrictId('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedDistrictId === 'ALL'
                  ? 'bg-emerald-400 text-emerald-950 border-emerald-300 shadow-xs'
                  : 'bg-emerald-950/60 text-emerald-200 border-emerald-700/50 hover:bg-emerald-900'
              }`}
            >
              All Assigned Districts ({offers.length} schemes)
            </button>

            {assignedDistricts.map((d) => {
              const count = offers.filter((o) => o.district_id === d.id).length;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDistrictId(d.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    selectedDistrictId === d.id
                      ? 'bg-emerald-400 text-emerald-950 border-emerald-300 shadow-xs'
                      : 'bg-emerald-950/60 text-emerald-200 border-emerald-700/50 hover:bg-emerald-900'
                  }`}
                >
                  <span>{d.name}</span>
                  {d.is_primary && (
                    <span className="px-1 text-[9px] rounded bg-emerald-800 text-emerald-200">
                      Primary
                    </span>
                  )}
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-900/80 text-emerald-300 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Search & Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by beverage, bonus item, or district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold self-end sm:self-auto">
          <span>Depot: <strong className="text-slate-900">{businessName}</strong></span>
          <span className="text-slate-300">•</span>
          <span>Showing: <strong className="text-emerald-700">{filteredOffers.length} Active Schemes</strong></span>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900">
          <strong className="font-bold">Trade Scheme Fulfillment Notice:</strong> When outlets order via these schemes, the order ticket will contain both the purchased stock cases (billed at approved wholesale price) and the free bonus cases (recorded at ৳0.00). Ensure your delivery team boards both lines for dispatch.
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading promotional schemes for your territory...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <Gift className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Active Trade Offers for This Selection</h3>
          <p className="text-xs text-slate-500 mt-1">
            Superadmin has not created an extra stock trade offer for this district yet. You will receive an instant notification when a scheme is published.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <MapPin className="w-3.5 h-3.5" />
                      {offer.district_name} District ({offer.division_name})
                    </span>
                    {offer.free_item_type === 'MERCHANDISE' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                        🎁 Merchandise Gift
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        Scheme #{offer.id}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ACTIVE
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-black text-slate-900 mb-1 leading-snug">
                  {offer.title}
                </h3>
                <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                  {offer.description}
                </p>

                {/* Trade Bundle Visual */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 via-emerald-50/40 to-teal-50/40 border border-emerald-100 flex items-center justify-between gap-3">
                  {/* Buy Target */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      {offer.buy_product_image ? (
                        <img
                          src={offer.buy_product_image}
                          alt=""
                          className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white p-1"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                          BUY
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-sm">
                          TARGET: {offer.buy_quantity_cases} CASES
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                          {offer.buy_product_name}
                        </p>
                        {offer.buy_unit_price && (
                          <p className="text-[11px] text-slate-600 font-mono">
                            Wholesale: ৳{Number(offer.buy_unit_price).toFixed(2)}/case
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex flex-col items-center justify-center px-1 text-emerald-700">
                    <ArrowRight className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">GET</span>
                  </div>

                  {/* Free Bonus */}
                  <div className="flex-1 pl-3 border-l border-emerald-200">
                    {offer.free_item_type === 'MERCHANDISE' ? (
                      <div className="flex items-center gap-2.5">
                        {offer.free_product_image ? (
                          <img
                            src={offer.free_product_image}
                            alt=""
                            className="w-12 h-12 object-contain rounded-lg border border-purple-300 bg-purple-50 p-1"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center">
                            GIFT
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-purple-600 text-white rounded-sm shadow-xs">
                            🎁 {offer.free_quantity_cases} UNIT FREE GIFT
                          </span>
                          <p className="text-xs font-bold text-purple-950 mt-0.5">
                            {offer.free_product_name}
                          </p>
                          <p className="text-[11px] font-bold text-purple-700 font-mono">
                            100% Free Gift (৳0.00)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        {offer.free_product_image ? (
                          <img
                            src={offer.free_product_image}
                            alt=""
                            className="w-12 h-12 object-contain rounded-lg border border-emerald-300 bg-emerald-50 p-1"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            FREE
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-600 text-white rounded-sm shadow-xs">
                            {offer.free_quantity_cases} BONUS CASE(S)
                          </span>
                          <p className="text-xs font-bold text-emerald-950 mt-0.5">
                            {offer.free_product_name}
                          </p>
                          <p className="text-[11px] font-bold text-emerald-700 font-mono">
                            100% Free Stock (৳0.00)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action / Restock Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Valid for retail outlets in {offer.district_name}
                </span>

                {onRequestStock && (
                  <button
                    onClick={() => onRequestStock(offer.buy_product_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Request Stock from Superadmin</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
