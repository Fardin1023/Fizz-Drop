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
  ShoppingBag,
  Info,
  Clock,
  Check,
  ChevronRight,
  Percent,
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
  disclosed_by_psr_name?: string;
  disclosed_at?: string;
}

interface OutletOffersViewProps {
  outletId: number;
  outletDistrictId?: number;
  outletName: string;
  onOrderSuccess?: () => void;
  onNavigateToDeliveries?: () => void;
}

export const OutletOffersView: React.FC<OutletOffersViewProps> = ({
  outletId,
  outletDistrictId = 1,
  outletName,
  onOrderSuccess,
  onNavigateToDeliveries,
}) => {
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Offer Order Modal
  const [selectedOffer, setSelectedOffer] = useState<TradeOffer | null>(null);
  const [bundleMultiplier, setBundleMultiplier] = useState<number>(1);
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [remarks, setRemarks] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);

  const fetchDisclosedOffers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Outlets only see trade offers that have been pitched/disclosed to them by their assigned PSR
      const res = await fetch(`http://localhost:8080/api/v1/trade-offers/outlet/${outletId}`);
      if (res.ok) {
        const data = await res.json();
        setOffers(Array.isArray(data) ? data : []);
      } else {
        setOffers([]);
      }
    } catch (err: any) {
      console.error('Error fetching trade schemes for outlet:', err);
      setError('Could not load promotional trade offers at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisclosedOffers();
  }, [outletId]);

  const handleOpenOrderModal = (offer: TradeOffer) => {
    setSelectedOffer(offer);
    setBundleMultiplier(1);
    setUrgency('NORMAL');
    setRemarks('');
    setOrderResult(null);
  };

  const handleSubmitOfferOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;

    setOrdering(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/trade-offers/${selectedOffer.id}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          multipliers: bundleMultiplier,
          urgency,
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit scheme order.');
      }

      setOrderResult(data);
      if (onOrderSuccess) onOrderSuccess();
    } catch (err: any) {
      setError(err.message || 'Error processing scheme order.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#2D2319]">
      {/* Top Promotional Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#FFD18D] via-[#F7E6C9] to-[#FAF4EB] border border-[#E2C799] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2D2319] text-[#FDECAD] flex items-center justify-center shadow-md">
              <Gift className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#2D2319] tracking-tight">
                  Special Trade Schemes & Extra Free Stock
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2D2319] text-[#FDECAD]">
                  Territory Exclusive
                </span>
              </div>
              <p className="text-xs text-[#6B5440] mt-1 max-w-2xl font-medium">
                Official manufacturer & distributor trade promotions. Order qualifying cases of beverages (e.g., 10 cases of Pepsi) and receive free bonus stock (e.g., 1 or 2 cases of Aquafina Water) at 100% free of charge (৳0.00).
              </p>
            </div>
          </div>

          <button
            onClick={fetchDisclosedOffers}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#2D2319] font-bold text-xs border border-[#E2C799] hover:bg-[#F7E6C9] transition-all cursor-pointer shadow-xs self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Check Latest Offers</span>
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2C799] shadow-xs flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#F7E6C9] text-[#78350F] shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#433022] leading-relaxed">
          <strong className="font-bold text-[#2D2319]">How Trade Schemes Work:</strong> When your assigned Pre-Sales Officer (PSR) visits and pitches a promotion to you, it unlocks here and sends an alert. You can then order through the offer to receive matched requisitions: one for purchased stock and one for free bonus stock at <span className="font-bold text-emerald-700">৳0.00</span>.
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E2C799]">
          <RefreshCw className="w-8 h-8 text-[#2D2319] animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#6B5440]">Checking disclosed schemes for {outletName}...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#E2C799] p-8">
          <div className="w-16 h-16 rounded-full bg-[#FAF4EB] border border-[#E2C799] flex items-center justify-center mx-auto mb-3 text-[#78350F]">
            <Gift className="w-8 h-8 text-[#DFBC87]" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF4EB] text-[#78350F] border border-[#E2C799] inline-block mb-2">
            Awaiting Field PSR Visit
          </span>
          <h3 className="text-lg font-bold text-[#2D2319]">No Trade Offers Disclosed Yet</h3>
          <p className="text-xs text-[#6B5440] mt-1.5 max-w-md mx-auto leading-relaxed">
            Your assigned Pre-Sales Officer (PSR) will inform you of exclusive trade offers and bonus stock schemes during their store visits.
          </p>
          <div className="mt-4 p-3 max-w-sm mx-auto rounded-xl bg-[#FAF4EB] border border-[#E2C799] text-[11px] text-[#433022] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Offers will be unlocked and notified here once pitched by your PSR.</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {offers.map((offer) => {
            const buyUnitPrice = offer.buy_unit_price || 30.00;
            const freeUnitVal = offer.free_unit_value || 15.00;
            const bundleTotalPayable = buyUnitPrice * offer.buy_quantity_cases;
            const bundleFreeValue = freeUnitVal * offer.free_quantity_cases;

            return (
              <div
                key={offer.id}
                className="p-6 rounded-3xl bg-white border border-[#E2C799] shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden"
              >
                {/* Visual Ribbon */}
                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${
                  offer.free_item_type === 'MERCHANDISE'
                    ? 'bg-purple-900 text-purple-100'
                    : 'bg-[#2D2319] text-[#FDECAD]'
                }`}>
                  {offer.free_item_type === 'MERCHANDISE' ? (
                    <>
                      <Gift className="w-3 h-3 text-purple-300" />
                      <span>Official Merchandise Gift</span>
                    </>
                  ) : (
                    <>
                      <Percent className="w-3 h-3 text-[#FFD18D]" />
                      <span>Extra Bonus Stock</span>
                    </>
                  )}
                </div>

                <div>
                  {/* Scheme Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F7E6C9] text-[#78350F]">
                      <MapPin className="w-3 h-3" />
                      {offer.district_name} District
                    </span>
                    {offer.free_item_type === 'MERCHANDISE' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                        🎁 Merchandise Incentive
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active Promotion
                      </span>
                    )}
                    {offer.disclosed_by_psr_name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        Pitched by PSR: {offer.disclosed_by_psr_name}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-black text-[#2D2319] mb-1.5 leading-snug">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-[#6B5440] mb-5 leading-relaxed">
                    {offer.description}
                  </p>

                  {/* Visual Product Bundle Matcher */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FAF4EB] via-[#F7E6C9]/40 to-[#FAF4EB] border border-[#E2C799] flex items-center justify-between gap-3">
                    {/* Buy Item */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {offer.buy_product_image ? (
                          <img
                            src={offer.buy_product_image}
                            alt=""
                            className="w-14 h-14 object-contain rounded-xl border border-[#E2C799] bg-white p-1 shadow-xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                            BUY
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md">
                            BUY {offer.buy_quantity_cases} CASES
                          </span>
                          <p className="text-xs font-bold text-[#2D2319] mt-1 leading-tight">
                            {offer.buy_product_name}
                          </p>
                          <p className="text-[11px] text-[#6B5440] font-mono mt-0.5">
                            Wholesale: ৳{Number(buyUnitPrice).toFixed(2)}/case
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow / Plus */}
                    <div className="flex flex-col items-center justify-center px-1 text-[#2D2319]">
                      <ArrowRight className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase text-[#78350F]">GET</span>
                    </div>

                    {/* Free Item */}
                    <div className="flex-1 pl-3 border-l border-[#E2C799]">
                      {offer.free_item_type === 'MERCHANDISE' ? (
                        <div className="flex items-center gap-3">
                          {offer.free_product_image ? (
                            <img
                              src={offer.free_product_image}
                              alt=""
                              className="w-14 h-14 object-contain rounded-xl border border-purple-300 bg-purple-50 p-1 shadow-xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center">
                              GIFT
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-purple-700 text-white rounded-md shadow-xs">
                              🎁 {offer.free_quantity_cases} UNIT FREE GIFT
                            </span>
                            <p className="text-xs font-bold text-purple-950 mt-1 leading-tight">
                              {offer.free_product_name}
                            </p>
                            <p className="text-[11px] font-bold text-purple-700 font-mono mt-0.5">
                              Cost: ৳0.00 (Worth ৳{Number(freeUnitVal).toLocaleString()})
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {offer.free_product_image ? (
                            <img
                              src={offer.free_product_image}
                              alt=""
                              className="w-14 h-14 object-contain rounded-xl border border-emerald-300 bg-emerald-50 p-1 shadow-xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                              FREE
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-600 text-white rounded-md shadow-xs">
                              {offer.free_quantity_cases} CASE(S) FREE
                            </span>
                            <p className="text-xs font-bold text-emerald-950 mt-1 leading-tight">
                              {offer.free_product_name}
                            </p>
                            <p className="text-[11px] font-bold text-emerald-700 font-mono mt-0.5">
                              Cost: ৳0.00 (100% Free)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profit Margin / Free Value Callout */}
                  <div className="mt-4 p-3 rounded-xl bg-[#FAF4EB] border border-[#E2C799] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-[#7A6E5D] block">Bundle Total Cost:</span>
                      <span className="text-sm font-black text-[#2D2319] font-mono">
                        ৳{Number(bundleTotalPayable).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-emerald-700 font-bold block">
                        {offer.free_item_type === 'MERCHANDISE' ? 'Merchandise Gift Value:' : 'Free Stock Retail Value:'}
                      </span>
                      <span className="text-sm font-black text-emerald-700 font-mono">
                        +৳{Number(bundleFreeValue).toFixed(2)} FREE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card CTA Footer */}
                <div className="mt-5 pt-4 border-t border-[#FAF4EB] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#7A6E5D]">
                    Eligible for {outletName}
                  </span>

                  <button
                    onClick={() => handleOpenOrderModal(offer)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#FFD18D]" />
                    <span>Order via This Offer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BUNDLE ORDER MODAL */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E2C799] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#2D2319] to-[#433022] text-[#FDECAD] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-[#FFD18D]">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#FDECAD]">Order Trade Scheme Bundle</h3>
                  <p className="text-xs text-[#FDECAD]/70">
                    {selectedOffer.district_name} District Promotional Allocation
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedOffer(null);
                  setOrderResult(null);
                }}
                className="text-[#FDECAD]/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* If Order Succeeded: Show Success Screen */}
            {orderResult ? (
              <div className="p-6 space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900">
                    Trade Scheme Order Placed!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    {orderResult.message}
                  </p>
                </div>

                {/* Ticket Details */}
                <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799] text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#6B5440]">Scheme Bundle Code:</span>
                    <strong className="font-mono text-[#2D2319]">{orderResult.bundle_code}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B5440]">Purchased Cases:</span>
                    <strong className="text-[#2D2319]">{orderResult.buy_cases} Cases ({selectedOffer.buy_product_name})</strong>
                  </div>
                  <div className={`flex justify-between ${selectedOffer.free_item_type === 'MERCHANDISE' ? 'text-purple-800' : 'text-emerald-800'}`}>
                    <span className="font-bold">
                      {selectedOffer.free_item_type === 'MERCHANDISE' ? '🎁 100% Free Merchandise Gift:' : '100% Free Bonus Stock:'}
                    </span>
                    <strong className="font-extrabold">
                      {orderResult.free_cases} {selectedOffer.free_item_type === 'MERCHANDISE' ? 'Unit(s)' : 'Cases'} ({selectedOffer.free_product_name})
                    </strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E2C799]/50">
                    <span className="text-[#6B5440]">Total Amount Payable:</span>
                    <strong className="font-mono text-base font-black text-[#2D2319]">
                      ৳{Number(orderResult.total_payable).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedOffer(null);
                      setOrderResult(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Close
                  </button>
                  {onNavigateToDeliveries && (
                    <button
                      onClick={() => {
                        setSelectedOffer(null);
                        setOrderResult(null);
                        onNavigateToDeliveries();
                      }}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] text-xs font-bold shadow-md cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-[#FFD18D]" />
                      <span>Track Inbound Requisition</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Modal Form */
              <form onSubmit={handleSubmitOfferOrder} className="p-6 space-y-5">
                {/* Scheme Summary */}
                <div className="p-3.5 rounded-2xl bg-[#FAF4EB] border border-[#E2C799] text-xs space-y-1.5">
                  <p className="font-bold text-[#2D2319]">{selectedOffer.title}</p>
                  <p className="text-[#6B5440] text-[11px]">{selectedOffer.description}</p>
                </div>

                {/* Multiplier / Bundle Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#2D2319] uppercase mb-1.5">
                    Select Bundle Quantity (How many sets?)
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[1, 2, 3].map((mult) => {
                      const bQty = selectedOffer.buy_quantity_cases * mult;
                      const fQty = selectedOffer.free_quantity_cases * mult;
                      const isSel = bundleMultiplier === mult;
                      return (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setBundleMultiplier(mult)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#FFD18D] border-[#2D2319] shadow-sm'
                              : 'bg-white border-[#E2C799] hover:bg-[#F7E6C9]'
                          }`}
                        >
                          <span className="text-xs font-black text-[#2D2319] block">
                            {mult}x Scheme Set
                          </span>
                          <span className="text-[11px] text-[#433022] block mt-0.5">
                            Buy {bQty} Cases
                          </span>
                          <span className={`text-[10px] font-bold block ${selectedOffer.free_item_type === 'MERCHANDISE' ? 'text-purple-800' : 'text-emerald-800'}`}>
                            + {fQty} {selectedOffer.free_item_type === 'MERCHANDISE' ? 'GIFT' : 'FREE'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Order Breakdown */}
                {(() => {
                  const buyCases = selectedOffer.buy_quantity_cases * bundleMultiplier;
                  const freeCases = selectedOffer.free_quantity_cases * bundleMultiplier;
                  const unitPrice = selectedOffer.buy_unit_price || 30.00;
                  const total = unitPrice * buyCases;
                  const freeVal = (selectedOffer.free_unit_value || 15.00) * freeCases;
                  const isMerch = selectedOffer.free_item_type === 'MERCHANDISE';

                  return (
                    <div className="p-4 rounded-2xl bg-white border border-[#E2C799] space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[#433022]">
                        <span>Purchased Stock ({buyCases} cases @ ৳{unitPrice.toFixed(2)}):</span>
                        <span className="font-mono font-bold text-[#2D2319]">৳{total.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between items-center font-bold ${isMerch ? 'text-purple-800' : 'text-emerald-800'}`}>
                        <span>
                          {isMerch
                            ? `🎁 Free Merchandise Gift (${freeCases} unit(s) of ${selectedOffer.free_product_name}):`
                            : `Extra Bonus Stock (${freeCases} cases of ${selectedOffer.free_product_name}):`}
                        </span>
                        <span className="font-mono">৳0.00 (FREE)</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#E2C799] text-[#2D2319]">
                        <span className="text-xs font-black uppercase">Total Payable:</span>
                        <span className="text-base font-black font-mono text-[#2D2319]">৳{total.toFixed(2)}</span>
                      </div>
                      <p className={`text-[10px] font-bold pt-1 ${isMerch ? 'text-purple-700' : 'text-emerald-700'}`}>
                        🎁 You get ৳{freeVal.toFixed(2)} worth of {isMerch ? 'official branded merchandise' : 'extra bonus stock'} 100% free with this order!
                      </p>
                    </div>
                  );
                })()}

                {/* Urgency */}
                <div>
                  <label className="block text-xs font-bold text-[#2D2319] uppercase mb-1">
                    Delivery Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e: any) => setUrgency(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-[#E2C799] bg-white text-[#2D2319]"
                  >
                    <option value="NORMAL">Normal Restock (Routine PSR Delivery)</option>
                    <option value="HIGH">High Priority (Within 24 Hours)</option>
                    <option value="CRITICAL">Critical Need (Immediate Dispatch)</option>
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-[#2D2319] uppercase mb-1">
                    Order Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Please deliver along with morning route..."
                    className="w-full p-2 text-xs rounded-xl border border-[#E2C799] text-[#2D2319]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#FAF4EB] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ordering}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {ordering ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFD18D]" />
                    ) : (
                      <Check className="w-4 h-4 text-[#FFD18D]" />
                    )}
                    <span>Confirm Order via Offer</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
