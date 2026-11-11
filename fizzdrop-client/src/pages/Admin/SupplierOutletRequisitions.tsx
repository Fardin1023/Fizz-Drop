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
  X,
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
  is_so_purchase?: boolean;
  so_purchased_stock?: number;
  so_has_purchased?: boolean;
  sales_officer_id?: number;
  sales_officer_name?: string;
  sales_officer_code?: string;
  sales_officer_area?: string;
  sales_officer_phone?: string;
}

interface SupplierOutletRequisitionsProps {
  userId?: number;
  onRequestRestockFromSuperadmin?: (productId?: number) => void;
  onNavigateToTracking?: () => void;
}

export const SupplierOutletRequisitions: React.FC<SupplierOutletRequisitionsProps> = ({
  userId = 4,
  onRequestRestockFromSuperadmin,
  onNavigateToTracking,
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
  const [fulfillModalReq, setFulfillModalReq] = useState<OutletRequisitionItem | null>(null);
  const [fulfillQty, setFulfillQty] = useState<number>(0);
  const [fulfillPrice, setFulfillPrice] = useState<number>(0);
  const [fulfillNotes, setFulfillNotes] = useState<string>('');
  const [fulfillSubmitting, setFulfillSubmitting] = useState<boolean>(false);

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

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        const payload = event.data;
        if (
          payload?.type === 'SO_STOCK_REQUEST_FOR_OUTLET' ||
          payload?.type === 'SO_ORDER_APPROVED' ||
          payload?.type === 'NEW_PSR_ORDER' ||
          payload?.type === 'REQUISITION_ACTION'
        ) {
          fetchRequisitions();
        }
      };
    } catch (e) {}

    return () => {
      if (channel) channel.close();
    };
  }, [userId]);

  const openFulfillModal = (req: OutletRequisitionItem) => {
    // If depot is completely empty, trigger ZeroStockAlertModal
    if (req.supplier_available_stock <= 0) {
      setZeroStockAlertData({
        productName: req.product_name,
        productId: req.product_id,
        outletName: req.outlet_name,
      });
      setIsZeroStockAlertOpen(true);
      return;
    }
    const maxAllowed = req.is_so_purchase
      ? req.supplier_available_stock
      : Math.min(req.supplier_available_stock, req.so_purchased_stock ?? 0);
    setFulfillModalReq(req);
    setFulfillQty(Math.max(1, Math.min(req.quantity, maxAllowed > 0 ? maxAllowed : req.quantity)));
    setFulfillPrice(Number(req.unit_price || 35));
    setFulfillNotes(
      req.is_so_purchase
        ? `Wholesale stock delivery to Sales Officer ${req.sales_officer_name || ''} buffer`
        : `Dispatched from Sales Officer ${req.sales_officer_name || ''}'s purchased stock to ${req.outlet_name}`
    );
  };

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillModalReq) return;

    // Stock validation
    if (fulfillModalReq.supplier_available_stock <= 0) {
      setActionErrorMsg("Cannot dispatch: Depot stock is 0 cases. Please request stock from Superadmin first.");
      return;
    }
    if (!fulfillModalReq.is_so_purchase) {
      if (!fulfillModalReq.so_has_purchased || (fulfillModalReq.so_purchased_stock ?? 0) <= 0) {
        setActionErrorMsg(`Cannot dispatch: ${fulfillModalReq.product_name} has not been purchased by Sales Officer ${fulfillModalReq.sales_officer_name || ''}. The Sales Officer must purchase stock from the Regional Supplier first.`);
        return;
      }
      if (fulfillQty > (fulfillModalReq.so_purchased_stock ?? 0)) {
        setActionErrorMsg(`Cannot dispatch beyond SO purchased stock: Sales Officer holds only ${fulfillModalReq.so_purchased_stock ?? 0} cases in buffer, but requested ${fulfillQty} cases.`);
        return;
      }
    }
    if (fulfillQty <= 0) {
      setActionErrorMsg("Dispatch quantity must be at least 1 case.");
      return;
    }
    if (fulfillQty > fulfillModalReq.supplier_available_stock) {
      setActionErrorMsg(`Cannot dispatch beyond stock limit: You hold ${fulfillModalReq.supplier_available_stock} cases in depot, but requested to supply ${fulfillQty} cases.`);
      return;
    }

    setFulfillSubmitting(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch(`http://localhost:8080/api/inventory/supplier/outlet-requisitions/${fulfillModalReq.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: fulfillQty,
          unit_price: fulfillPrice,
          user_id: userId,
          sales_officer_id: fulfillModalReq.sales_officer_id,
          notes: fulfillNotes || `Wholesale fulfillment to Sales Officer ${fulfillModalReq.sales_officer_name || ''} (${fulfillModalReq.sales_officer_code || 'Territory'})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to dispatch stock');
      }

      // If price was adjusted, broadcast to Superadmin tabs
      if (fulfillPrice > 0 && fulfillPrice !== fulfillModalReq.unit_price) {
        try {
          const channel = new BroadcastChannel('fizzdrop_realtime_events');
          channel.postMessage({
            type: 'PRICE_UPDATED',
            product_id: fulfillModalReq.product_id,
            outlet_price: fulfillPrice,
            product_name: fulfillModalReq.product_name,
          });
          setTimeout(() => channel.close(), 100);
        } catch (e) {}
      }

      // Broadcast stock purchase confirmation and outlet dispatch to Sales Officer tabs
      try {
        const soChannel = new BroadcastChannel('fizzdrop_realtime_events');
        soChannel.postMessage({
          type: 'SUPPLIER_DISPATCHED_TO_OUTLET',
          recipientRole: 'SALES_OFFICER',
          recipientUserId: data.sales_officer_user_id || fulfillModalReq.sales_officer_id,
          sales_officer_id: data.sales_officer_id || fulfillModalReq.sales_officer_id,
          referenceId: data.sales_officer_id || fulfillModalReq.sales_officer_id,
          outlet_name: fulfillModalReq.outlet_name,
          product_name: fulfillModalReq.product_name,
          quantity: fulfillQty,
          profit_earned: data.profit_earned,
          title: `Stock Dispatched to ${fulfillModalReq.outlet_name}`,
          message: `Supplier has dispatched ${fulfillQty} cases of ${fulfillModalReq.product_name} to ${fulfillModalReq.outlet_name} from your purchased stock. Profit has been credited to your wholesale ledger.`,
        });
        soChannel.postMessage({
          type: 'SALES_OFFICER_PURCHASE_CONFIRMED',
          recipientRole: 'SALES_OFFICER',
          recipientUserId: data.sales_officer_user_id || fulfillModalReq.sales_officer_id,
          referenceId: data.sales_officer_id || fulfillModalReq.sales_officer_id,
          title: 'Stock Purchase Confirmed by Supplier',
          message: `Supplier approved and dispatched ${fulfillQty} units of ${fulfillModalReq.product_name} at ৳${Number(fulfillPrice).toFixed(2)}/case.`,
          final_total_amount: data.final_total_amount || (fulfillQty * fulfillPrice),
        });
        setTimeout(() => soChannel.close(), 100);
      } catch (e) {}

      setActionSuccessMsg(
        fulfillModalReq.is_so_purchase
          ? `Successfully dispatched ${fulfillQty} cases of ${fulfillModalReq.product_name} to Sales Officer ${fulfillModalReq.sales_officer_name || ''}'s buffer stock!`
          : `Successfully dispatched ${fulfillQty} units of ${fulfillModalReq.product_name} to ${fulfillModalReq.outlet_name} from Sales Officer ${fulfillModalReq.sales_officer_name || ''}'s purchased stock!`
      );
      setFulfillModalReq(null);
      fetchRequisitions();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setFulfillSubmitting(false);
    }
  };

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

    if (!req.is_so_purchase && (!req.so_has_purchased || (req.so_purchased_stock ?? 0) <= 0)) {
      setActionErrorMsg(`Cannot dispatch: ${req.product_name} has not been purchased by Sales Officer ${req.sales_officer_name || ''}. The Sales Officer must purchase stock from the Regional Supplier first.`);
      return;
    }
    if (!req.is_so_purchase && req.quantity > (req.so_purchased_stock ?? 0)) {
      setActionErrorMsg(`Cannot dispatch beyond SO purchased stock: Sales Officer holds only ${req.so_purchased_stock ?? 0} cases in buffer, but outlet requested ${req.quantity} cases.`);
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

      // Broadcast stock purchase confirmation and outlet dispatch to Sales Officer tabs
      try {
        const soChannel = new BroadcastChannel('fizzdrop_realtime_events');
        soChannel.postMessage({
          type: 'SUPPLIER_DISPATCHED_TO_OUTLET',
          recipientRole: 'SALES_OFFICER',
          recipientUserId: data.sales_officer_user_id || req.sales_officer_id,
          sales_officer_id: data.sales_officer_id || req.sales_officer_id,
          referenceId: data.sales_officer_id || req.sales_officer_id,
          outlet_name: req.outlet_name,
          product_name: req.product_name,
          quantity: req.quantity,
          profit_earned: data.profit_earned,
          title: `Stock Dispatched to ${req.outlet_name}`,
          message: `Supplier has dispatched ${req.quantity} cases of ${req.product_name} to ${req.outlet_name} from your purchased stock. Profit has been credited to your wholesale ledger.`,
        });
        soChannel.postMessage({
          type: 'SALES_OFFICER_PURCHASE_CONFIRMED',
          recipientRole: 'SALES_OFFICER',
          recipientUserId: data.sales_officer_user_id || req.sales_officer_id,
          referenceId: data.sales_officer_id || req.sales_officer_id,
          title: 'Stock Purchase Confirmed by Supplier',
          message: `Supplier approved and dispatched ${req.quantity} units of ${req.product_name}.`,
          final_total_amount: data.final_total_amount,
        });
        setTimeout(() => soChannel.close(), 100);
      } catch (e) {}

      setActionSuccessMsg(
        `Successfully dispatched ${req.quantity} units of ${req.product_name} to ${req.outlet_name} from Sales Officer ${req.sales_officer_name || ''}'s purchased stock!`
      );

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

      {/* Quick Access to Stock Sales & Outlet Dispatch Tracking */}
      {onNavigateToTracking && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-indigo-200/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-slate-900 block truncate">
                Stock Sales & Outlet Dispatch Tracking
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                Monitor wholesale stock sold vs actual quantities dispatched to retail outlets
              </span>
            </div>
          </div>
          <button
            onClick={onNavigateToTracking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            <span>View Sold vs Dispatched</span>
            <ArrowRight className="w-3.5 h-3.5" />
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
                  {req.is_so_purchase ? (
                    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200/90 text-xs text-blue-900 font-medium mb-1">
                      <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-bold text-blue-800 uppercase tracking-wide text-[10px]">SO Stock Purchase Demand:</span>
                      <strong className="font-bold text-blue-900">{req.sales_officer_name || "Designated Sales Officer"}</strong>
                      {req.sales_officer_code && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white text-blue-700 border border-blue-200 font-bold">
                          {req.sales_officer_code}
                        </span>
                      )}
                      <span className="text-blue-600 text-[11px] font-normal">
                        • Territory: <strong className="text-blue-900">{req.sales_officer_area || req.area}</strong>
                      </span>
                      <span className="ml-auto text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                        Buffer Stock Requisition
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-900 font-medium mb-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Channeled via Sales Officer:</span>
                      <strong className="font-bold text-teal-700">{req.sales_officer_name || "Designated Sales Officer"}</strong>
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
                  )}

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

                {/* Right: Supplier Stock Health, SO Buffer & Dispatch Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Supplier Depot Stock Health Gauge */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-right min-w-[190px]">
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
                        ? 'Depot stock sufficient'
                        : `Partial: ${req.supplier_available_stock} available`}
                    </p>

                    {/* SO Purchased Buffer Status Indicator for Outlet Requisitions */}
                    {!req.is_so_purchase && (
                      <div className="mt-2 pt-2 border-t border-slate-200/70">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          SO Purchased Buffer Stock
                        </p>
                        {req.so_has_purchased && (req.so_purchased_stock ?? 0) >= req.quantity ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                            Purchased: {req.so_purchased_stock} cases
                          </span>
                        ) : req.so_has_purchased && (req.so_purchased_stock ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                            <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                            Partial Buffer: {req.so_purchased_stock} / {req.quantity}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                            Not Purchased by SO (0 cases)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <>
                        {/* Direct Fast Dispatch / Review Button */}
                        {req.supplier_available_stock <= 0 ? (
                          <button
                            type="button"
                            onClick={() => openFulfillModal(req)}
                            className="py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition cursor-pointer shadow-xs active:scale-95"
                            title="0 stock in depot — click for restock alert"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>0 Stock in Depot</span>
                          </button>
                        ) : !req.is_so_purchase && (!req.so_has_purchased || (req.so_purchased_stock ?? 0) < req.quantity) ? (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              disabled
                              className="py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                              title={`Cannot dispatch: Product has not been purchased by Sales Officer ${req.sales_officer_name || ''}. The Sales Officer must purchase stock from the Regional Supplier first.`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                              <span>Awaiting SO Purchase</span>
                            </button>
                            <span className="text-[10px] text-amber-700 font-semibold">
                              SO must purchase product first
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openFulfillModal(req)}
                            disabled={dispatchingId === req.id}
                            className="py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 active:scale-95"
                            title={
                              req.is_so_purchase
                                ? "Fulfill and dispatch stock directly to Sales Officer's buffer"
                                : "Review, adjust quantity/price & fulfill request to Outlet"
                            }
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{req.is_so_purchase ? "Confirm & Dispatch to SO" : "Adjust & Dispatch to Outlet"}</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>{req.is_so_purchase ? "Dispatched to SO" : "Dispatched to Outlet"}</span>
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
        data={zeroStockAlertData}
        onRequestStock={() => {
          setIsZeroStockAlertOpen(false);
          if (onRequestRestockFromSuperadmin) {
            onRequestRestockFromSuperadmin(zeroStockAlertData?.productId);
          }
        }}
      />

      {/* MODAL: Adjust & Dispatch to Sales Officer Modal */}
      {fulfillModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                    Adjust & Dispatch Stock
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    Requisition #{fulfillModalReq.requisition_code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFulfillModalReq(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFulfillSubmit} className="p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-zinc-100">
              
              {/* Product & Outlet Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Beverage Item</span>
                    <h4 className="font-black text-base text-slate-900 dark:text-white">{fulfillModalReq.product_name}</h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    fulfillModalReq.urgency === 'HIGH' || fulfillModalReq.urgency === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300'
                  }`}>
                    {fulfillModalReq.urgency || 'NORMAL'} Priority
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sales Officer (Channel):</span>
                    <strong className="text-slate-800 dark:text-zinc-200 font-bold block truncate">
                      {fulfillModalReq.sales_officer_name || 'Assigned Sales Officer'}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">{fulfillModalReq.sales_officer_code || fulfillModalReq.area}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Destination Outlet:</span>
                    <strong className="text-slate-800 dark:text-zinc-200 font-bold block truncate">
                      {fulfillModalReq.outlet_name}
                    </strong>
                    <span className="text-[10px] text-slate-500 truncate block">{fulfillModalReq.location_address || fulfillModalReq.area}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs">
                  <span className="text-slate-500">Requested: <strong className="text-slate-900 dark:text-white">{fulfillModalReq.quantity} cases</strong></span>
                  <div className="flex items-center gap-3">
                    <span className="text-teal-600 dark:text-teal-400 font-bold">
                      Depot: <strong className="font-mono text-sm">{fulfillModalReq.supplier_available_stock}</strong> cases
                    </span>
                    {!fulfillModalReq.is_so_purchase && (
                      <span className={`${(fulfillModalReq.so_purchased_stock ?? 0) > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'} font-bold`}>
                        SO Buffer: <strong className="font-mono text-sm">{fulfillModalReq.so_purchased_stock ?? 0}</strong> cases
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning if unpurchased by SO */}
                {!fulfillModalReq.is_so_purchase && (!fulfillModalReq.so_has_purchased || (fulfillModalReq.so_purchased_stock ?? 0) <= 0) && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Cannot dispatch: Product has not been purchased by Sales Officer <strong>{fulfillModalReq.sales_officer_name}</strong>. The SO must purchase stock from the Supplier first.</span>
                  </div>
                )}
              </div>

              {/* Input 1: Adjustable Quantity */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Dispatch Quantity (Cases)
                  </label>
                  <span className="text-xs text-slate-400">
                    Max: <strong className="text-teal-600">
                      {fulfillModalReq.is_so_purchase 
                        ? fulfillModalReq.supplier_available_stock 
                        : Math.min(fulfillModalReq.supplier_available_stock, fulfillModalReq.so_purchased_stock ?? 0)} cases
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={fulfillModalReq.is_so_purchase ? fulfillModalReq.supplier_available_stock : Math.min(fulfillModalReq.supplier_available_stock, fulfillModalReq.so_purchased_stock ?? 0)}
                    value={fulfillQty}
                    onChange={(e) => setFulfillQty(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    required
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const maxLimit = fulfillModalReq.is_so_purchase ? fulfillModalReq.supplier_available_stock : Math.min(fulfillModalReq.supplier_available_stock, fulfillModalReq.so_purchased_stock ?? 0);
                        setFulfillQty(Math.min(fulfillModalReq.quantity, maxLimit > 0 ? maxLimit : fulfillModalReq.quantity));
                      }}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition cursor-pointer"
                    >
                      Requested ({fulfillModalReq.quantity})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const maxLimit = fulfillModalReq.is_so_purchase ? fulfillModalReq.supplier_available_stock : Math.min(fulfillModalReq.supplier_available_stock, fulfillModalReq.so_purchased_stock ?? 0);
                        setFulfillQty(maxLimit > 0 ? maxLimit : 1);
                      }}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 transition cursor-pointer"
                    >
                      Max Available
                    </button>
                  </div>
                </div>
              </div>

              {/* Input 2: Adjustable Wholesale Case Price */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Wholesale Unit Price (৳ per Case)
                  </label>
                  <span className="text-xs text-slate-400">
                    Original: ৳{Number(fulfillModalReq.unit_price || 35).toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    value={fulfillPrice}
                    onChange={(e) => setFulfillPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Fulfillment Notes */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 block mb-1.5">
                  Fulfillment Notes / Dispatch Remarks
                </label>
                <input
                  type="text"
                  value={fulfillNotes}
                  onChange={(e) => setFulfillNotes(e.target.value)}
                  placeholder="e.g. Batch 402 dispatched to Sales Officer for route distribution"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Financial Calculation Summary Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 dark:from-teal-950/40 dark:via-emerald-950/40 dark:to-cyan-950/40 border border-teal-200 dark:border-teal-800/60">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 mb-1">
                  <span>Calculation:</span>
                  <span className="font-mono">{fulfillQty} cases × ৳{Number(fulfillPrice).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-teal-700 dark:text-teal-300 block">
                      Total Wholesale Invoice
                    </span>
                    <span className="text-xs text-slate-500">Credited directly to Supplier Wallet</span>
                  </div>
                  <strong className="text-2xl font-black text-teal-700 dark:text-teal-300">
                    ৳{Number(fulfillQty * fulfillPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setFulfillModalReq(null)}
                  disabled={fulfillSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    fulfillSubmitting ||
                    fulfillQty <= 0 ||
                    fulfillQty > fulfillModalReq.supplier_available_stock ||
                    (!fulfillModalReq.is_so_purchase && (!fulfillModalReq.so_has_purchased || (fulfillModalReq.so_purchased_stock ?? 0) < fulfillQty))
                  }
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black shadow-lg shadow-teal-600/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {fulfillSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>{fulfillModalReq.is_so_purchase ? "Confirm & Dispatch to Sales Officer" : "Confirm & Dispatch to Outlet"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
