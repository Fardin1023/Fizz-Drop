import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Flame,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Send,
  UserCheck,
  Phone,
} from 'lucide-react';
import { SupplyStockModal, type ProductOption, type OutletOption } from './SupplyStockModal';
import { ZeroStockAlertModal, type ZeroStockAlertData } from '../../components/Alerts/ZeroStockAlertModal';

export interface OutletRequisitionItem {
  id: number;
  requisition_code: string;
  outlet_id: number;
  outlet_name: string;
  franchise_name?: string;
  branch_name?: string;
  city?: string;
  area?: string;
  location_address?: string;
  contact_phone?: string;
  product_id: number;
  product_name: string;
  quantity: number;
  urgency: string; // 'NORMAL' | 'HIGH' | 'CRITICAL'
  status: string; // 'PENDING' | 'DISPATCHED' | 'COMPLETED' | 'REJECTED'
  outlet_remarks?: string;
  unit_price?: number;
  total_amount?: number;
  supplier_buy_rate?: number;
  outlet_sell_rate?: number;
  supplier_profit_per_unit?: number;
  supplier_total_profit?: number;
  created_date: string;
  updated_date?: string;
  supplier_available_stock: number;
  can_dispatch: boolean;
  sales_officer_id?: number;
  sales_officer_name?: string;
  sales_officer_code?: string;
  sales_officer_area?: string;
  sales_officer_phone?: string;
}

interface SupplierOutletRequisitionsProps {
  userId?: number;
  onRequestRestockFromSuperadmin?: (productId?: number) => void;
}

export const SupplierOutletRequisitions: React.FC<SupplierOutletRequisitionsProps> = ({
  userId = 4,
  onRequestRestockFromSuperadmin,
}) => {
  const [requisitions, setRequisitions] = useState<OutletRequisitionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'DISPATCHED'>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dispatch Action Modal State
  const [selectedReqForSupply, setSelectedReqForSupply] = useState<OutletRequisitionItem | null>(null);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState<boolean>(false);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Animated Zero Stock Alert Modal State
  const [zeroStockAlertData, setZeroStockAlertData] = useState<ZeroStockAlertData | null>(null);
  const [isZeroStockAlertOpen, setIsZeroStockAlertOpen] = useState<boolean>(false);

  // Fetch incoming requisitions
  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/inventory/supplier/outlet-requisitions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRequisitions(data);
      }
    } catch (err) {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();

    // Listen for cross-tab realtime events from outlets
    try {
      const channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        if (event.data?.recipientRole === 'SUPPLIER') {
          fetchRequisitions();
        }
      };
      return () => channel.close();
    } catch (e) {
      // BroadcastChannel fallback
    }
  }, [userId]);

  // Direct fast dispatch (Quick Fulfill)
  const handleDirectDispatch = async (req: OutletRequisitionItem) => {
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    // If supplier has 0 stock in depot for this beverage
    if (req.supplier_available_stock <= 0) {
      setZeroStockAlertData({
        productName: req.product_name,
        productId: req.product_id,
        outletName: req.outlet_name,
      });
      setIsZeroStockAlertOpen(true);
      return;
    }

    setDispatchingId(req.id);
    try {
      const res = await fetch(`http://localhost:8080/api/inventory/supplier/outlet-requisitions/${req.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: req.quantity,
          user_id: userId,
          sales_officer_id: req.sales_officer_id,
          notes: `Wholesale fulfillment to Sales Officer ${req.sales_officer_name || ''} (${req.sales_officer_code || 'Territory'}) for ${req.outlet_name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to dispatch stock');
      }

      setActionSuccessMsg(
        `Successfully dispatched ${req.quantity} units of ${req.product_name} via Sales Officer ${req.sales_officer_name || ''} (${req.sales_officer_code || req.area}) for ${req.outlet_name}!`
      );

      // Broadcast update to Outlet tabs
      try {
        const channel = new BroadcastChannel('fizzdrop_realtime_events');
        channel.postMessage({
          recipientRole: 'OUTLET',
          recipientUserId: req.outlet_id,
          title: `Stock Dispatched: ${req.product_name}`,
          message: `Supplier dispatched ${req.quantity} units to ${req.outlet_name}. Shelf stock updated!`,
          type: 'APPROVED',
          referenceCode: req.requisition_code,
          referenceId: req.outlet_id,
        });
        setTimeout(() => channel.close(), 100);
      } catch (e) {}

      fetchRequisitions();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setDispatchingId(null);
    }
  };

  // Filtered List
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'PENDING' && r.status === 'PENDING') ||
        (filterStatus === 'DISPATCHED' && (r.status === 'DISPATCHED' || r.status === 'COMPLETED'));

      const matchesUrgency = filterUrgency === 'ALL' || r.urgency === filterUrgency;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        r.requisition_code?.toLowerCase().includes(q) ||
        r.outlet_name?.toLowerCase().includes(q) ||
        r.franchise_name?.toLowerCase().includes(q) ||
        r.branch_name?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q);

      return matchesStatus && matchesUrgency && matchesSearch;
    });
  }, [requisitions, filterStatus, filterUrgency, searchQuery]);

  // KPIs
  const pendingCount = requisitions.filter((r) => r.status === 'PENDING').length;
  const criticalCount = requisitions.filter((r) => r.status === 'PENDING' && r.urgency === 'CRITICAL').length;
  const totalUnitsRequested = requisitions
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert Banners */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-scale-up">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">{actionErrorMsg}</span>
          </div>
          <button
            onClick={() => setActionErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Overview KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending Requests</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{pendingCount}</span>
            <span className="text-xs text-slate-500 font-medium">orders</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting depot dispatch</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Urgent Out-of-Stock</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600 font-mono">{criticalCount}</span>
            <span className="text-xs text-slate-500 font-medium">critical</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">High priority delivery</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Units Requested</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600 font-mono">{totalUnitsRequested}</span>
            <span className="text-xs text-slate-500 font-medium">units</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Volume requested by branches</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Allocated Territory</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {new Set(requisitions.map((r) => r.outlet_id)).size}
            </span>
            <span className="text-xs text-slate-500 font-medium">branches</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Franchise stores connected</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by outlet branch, beverage, code, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PENDING', label: `Pending (${pendingCount})` },
                { id: 'DISPATCHED', label: 'Dispatched' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilterStatus(st.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === st.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchRequisitions}
              className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh requisitions"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Urgency Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Urgency:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'NORMAL'].map((urg) => (
            <button
              key={urg}
              type="button"
              onClick={() => setFilterUrgency(urg)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterUrgency === urg
                  ? urg === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {urg === 'ALL' ? 'All Priorities' : urg}
            </button>
          ))}
        </div>
      </div>

      {/* Requisitions List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filteredRequisitions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
          <Store className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-600">No outlet requisitions match criteria</p>
          <p className="text-xs text-slate-400 mt-1">
            When franchise stores submit restock orders, they will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRequisitions.map((req) => {
            const isPending = req.status === 'PENDING';
            const isDispatched = req.status === 'DISPATCHED' || req.status === 'COMPLETED';
            const hasDepotStock = req.supplier_available_stock > 0;
            const hasSufficientStock = req.supplier_available_stock >= req.quantity;
            const isCritical = req.urgency === 'CRITICAL';

            return (
              <div
                key={req.id}
                className={`p-5 rounded-3xl bg-white border transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCritical && isPending
                    ? 'border-rose-300/80 bg-rose-50/20'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Left: Outlet & Beverage Details */}
                <div className="space-y-2 min-w-0 flex-1">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black font-mono text-slate-900">
                      {req.requisition_code}
                    </span>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                        isDispatched
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {req.status}
                    </span>

                    {/* Urgency Pill */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                          : req.urgency === 'HIGH'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isCritical && <Flame className="w-3 h-3 text-rose-600" />}
                      <span>{req.urgency} Priority</span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(req.created_date).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  {/* Sales Officer Assignment Banner */}
                  <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-900 font-medium mb-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Channeled via Sales Officer:</span>
                    <strong className="font-bold text-indigo-800">{req.sales_officer_name || "Designated Sales Officer"}</strong>
                    {req.sales_officer_code && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200 font-bold">
                        {req.sales_officer_code}
                      </span>
                    )}
                    <span className="text-slate-500 text-[11px] font-normal">
                      • Area: <strong className="text-slate-700">{req.sales_officer_area || req.area}</strong>
                    </span>
                    {req.sales_officer_phone && (
                      <span className="text-slate-500 text-[11px] font-mono flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-slate-400" /> {req.sales_officer_phone}
                      </span>
                    )}
                  </div>

                  {/* Outlet & Beverage Header */}
                  <div>
                    <div className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-900">
                      <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{req.franchise_name || req.outlet_name}</span>
                      <span className="text-slate-400 font-normal">—</span>
                      <span className="text-emerald-700 font-bold">{req.branch_name || req.area}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({req.city} • {req.area})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-800 font-bold mt-1">
                      <Package className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{req.product_name}</span>
                      <span className="text-slate-400 font-normal">•</span>
                      <span className="font-mono text-blue-700 font-black text-base">
                        {req.quantity} units requested
                      </span>
                    </div>

                    {/* Financial details & wholesale billing */}
                    {req.unit_price && (
                      <div className="flex flex-wrap items-center gap-2 text-xs mt-1 text-slate-500 font-mono">
                        <span>Wholesale: <strong className="text-slate-800">৳{Number(req.unit_price).toFixed(2)}</strong></span>
                        <span>•</span>
                        <span>Total: <strong className="text-indigo-700">৳{Number(req.total_amount || (Number(req.unit_price) * req.quantity)).toFixed(2)}</strong></span>
                        {req.supplier_total_profit && Number(req.supplier_total_profit) > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Profit: +৳{Number(req.supplier_total_profit).toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {req.outlet_remarks && (
                      <p className="text-xs text-slate-500 italic mt-0.5 bg-slate-50 p-2 rounded-xl border border-slate-100 inline-block">
                        Branch note: "{req.outlet_remarks}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Supplier Stock Health & Dispatch Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Supplier Depot Stock Health Gauge */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-right min-w-[170px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Your Available Depot Stock
                    </p>
                    <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                      <span
                        className={`text-xl font-black font-mono ${
                          req.supplier_available_stock <= 0
                            ? 'text-rose-600'
                            : hasSufficientStock
                            ? 'text-emerald-700'
                            : 'text-amber-600'
                        }`}
                      >
                        {req.supplier_available_stock}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">cases</span>
                    </div>
                    <p
                      className={`text-[10px] font-bold ${
                        req.supplier_available_stock <= 0
                          ? 'text-rose-600'
                          : hasSufficientStock
                          ? 'text-emerald-700'
                          : 'text-amber-600'
                      }`}
                    >
                      {req.supplier_available_stock <= 0
                        ? '0 Stock in Depot'
                        : hasSufficientStock
                        ? 'Sufficient to dispatch'
                        : `Partial: ${req.supplier_available_stock} available`}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <>
                        {/* Direct Fast Dispatch Button */}
                        <button
                          type="button"
                          onClick={() => handleDirectDispatch(req)}
                          disabled={dispatchingId === req.id}
                          className={`py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                            hasDepotStock
                              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20'
                              : 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700'
                          }`}
                          title={
                            hasDepotStock
                              ? `Fulfill and dispatch ${req.quantity} units to outlet`
                              : '0 stock in depot — click for restock alert'
                          }
                        >
                          {dispatchingId === req.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : hasDepotStock ? (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Dispatch {req.quantity} Units to Sales Officer</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              <span>0 Stock in Depot</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Dispatched to Outlet</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Animated Zero Stock Alert Modal */}
      <ZeroStockAlertModal
        isOpen={isZeroStockAlertOpen}
        onClose={() => setIsZeroStockAlertOpen(false)}
        alertData={zeroStockAlertData}
        onRequestStock={() => {
          setIsZeroStockAlertOpen(false);
          if (onRequestRestockFromSuperadmin) {
            onRequestRestockFromSuperadmin(zeroStockAlertData?.productId);
          }
        }}
      />
    </div>
  );
};
