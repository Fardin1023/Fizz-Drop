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
  Boxes,
  Send,
  UserCheck,
  Phone,
  X,
  Route,
  Users,
  Check,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SupplyStockModal, type ProductOption, type OutletOption } from './SupplyStockModal';
import { ZeroStockAlertModal, type ZeroStockAlertData } from '../../components/Alerts/ZeroStockAlertModal';

export interface DeliveryTeam {
  id: number;
  team_name: string;
  vehicle_registration_no: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone?: string;
  team_members?: string;
  max_capacity_cases: number;
  status: string;
}

export interface OutletRequisitionItem {
  id: number;
  requisition_code: string;
  outlet_id: number;
  outlet_name: string;
  franchise_name?: string;
  branch_name?: string;
  city?: string;
  area?: string;
  sub_route?: string;
  location_address?: string;
  contact_phone?: string;
  product_id: number;
  product_name: string;
  category?: string;
  quantity: number;
  urgency: string; // 'NORMAL' | 'HIGH' | 'CRITICAL'
  status: string; // 'PENDING' | 'DISPATCHED' | 'COMPLETED' | 'REJECTED'
  outlet_remarks?: string;
  unit_price?: number;
  total_amount?: number;
  supplier_buy_rate?: number;
  outlet_sell_rate?: number;
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
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<'ALL' | 'SO_BUFFER' | 'OUTLET_DEMAND'>('ALL');
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

  // Delivery Teams for Outlet Dispatch Form
  const [deliveryTeams, setDeliveryTeams] = useState<DeliveryTeam[]>([]);
  const [selectedDeliveryTeamId, setSelectedDeliveryTeamId] = useState<number | ''>('');
  const [dispatchSubRoute, setDispatchSubRoute] = useState<string>('');
  const [lastAssignedVehicleReg, setLastAssignedVehicleReg] = useState<string | null>(null);

  // Quick inline team creation if supplier doesn't have a delivery team yet
  const [showInlineNewTeam, setShowInlineNewTeam] = useState<boolean>(false);
  const [inlineTeamForm, setInlineTeamForm] = useState({
    team_name: 'Dhaka Central Express Fleet',
    vehicle_registration_no: 'DHA-METRO-4892',
    vehicle_type: 'Covered Van',
    driver_name: 'Karim Ullah',
    driver_phone: '01711-234567',
    team_members: 'Karim Ullah (Lead Driver), Rafiq (Loader)',
    max_capacity_cases: 250,
  });
  const [inlineTeamCreating, setInlineTeamCreating] = useState<boolean>(false);

  // Fetch delivery teams
  const fetchDeliveryTeams = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/teams?userId=${userId}&all=true`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDeliveryTeams(data);
          if (data.length > 0) {
            setSelectedDeliveryTeamId((prev) => {
              if (prev && data.some((t: any) => t.id === prev)) return prev;
              const avail = data.find((t: any) => t.status === 'AVAILABLE') || data[0];
              return avail ? avail.id : '';
            });
          }
        }
      }
    } catch (err) {}
  };

  const handleCreateInlineTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineTeamCreating(true);
    setActionErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...inlineTeamForm,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDeliveryTeams();
        if (data.id) setSelectedDeliveryTeamId(data.id);
        setShowInlineNewTeam(false);
      } else {
        setActionErrorMsg(data.message || 'Failed to create delivery team');
      }
    } catch (e) {
      setActionErrorMsg('Network error while creating delivery team');
    } finally {
      setInlineTeamCreating(false);
    }
  };

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
    fetchDeliveryTeams();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        const payload = event.data;
        if (
          payload?.type === 'SO_STOCK_REQUEST_FOR_OUTLET' ||
          payload?.type === 'SO_ORDER_APPROVED' ||
          payload?.type === 'NEW_PSR_ORDER' ||
          payload?.type === 'REQUISITION_ACTION' ||
          payload?.type === 'FLEET_DELIVERY_DISPATCHED' ||
          payload?.type === 'FLEET_STOCKS_BOARDED' ||
          payload?.type === 'FLEET_RIDE_STARTED' ||
          payload?.type === 'FLEET_STOP_DELIVERED'
        ) {
          fetchRequisitions();
          fetchDeliveryTeams();
        }
      };
    } catch (e) {}

    return () => {
      if (channel) channel.close();
    };
  }, [userId]);

  const openFulfillModal = (req: OutletRequisitionItem) => {
    // If it's an SO purchase demand and depot is completely empty, trigger ZeroStockAlertModal
    if (req.is_so_purchase && req.supplier_available_stock <= 0) {
      setZeroStockAlertData({
        productName: req.product_name,
        productId: req.product_id,
        outletName: req.outlet_name,
      });
      setIsZeroStockAlertOpen(true);
      return;
    }
    setFulfillModalReq(req);
    setShowInlineNewTeam(false);
    // For outlet requisitions, quantity is strictly locked to requested quantity (not more or less)
    if (!req.is_so_purchase) {
      setFulfillQty(req.quantity);
      const initialRoute = req.sub_route || (req.branch_name ? `${req.branch_name} Sub-Route` : `${req.area || 'Territory'} Sub-Route`);
      setDispatchSubRoute(initialRoute);
      fetchDeliveryTeams();
      setFulfillNotes(`Dispatched ${req.quantity} cases of ${req.product_name} to ${req.outlet_name} via delivery team`);
    } else {
      setFulfillQty(Math.max(1, Math.min(req.quantity, req.supplier_available_stock > 0 ? req.supplier_available_stock : req.quantity)));
      setFulfillNotes(`Wholesale stock delivery to Sales Officer ${req.sales_officer_name || ''} buffer`);
    }
    setFulfillPrice(Number(req.unit_price || 35));
  };

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillModalReq) return;

    // Strict quantity enforcement: Outlet orders must dispatch exact requested quantity
    const effectiveDispatchQty = fulfillModalReq.is_so_purchase ? fulfillQty : fulfillModalReq.quantity;

    if (fulfillModalReq.is_so_purchase) {
      if (fulfillModalReq.supplier_available_stock <= 0) {
        setActionErrorMsg("Cannot dispatch: Depot stock is 0 cases. Please request stock from Superadmin first.");
        return;
      }
      if (effectiveDispatchQty > fulfillModalReq.supplier_available_stock) {
        setActionErrorMsg(`Cannot dispatch beyond stock limit: You hold ${fulfillModalReq.supplier_available_stock} cases in depot, but requested to supply ${effectiveDispatchQty} cases.`);
        return;
      }
    } else {
      // Outlet requisition: Dispatched via Delivery Team (from SO purchased buffer or Supplier depot stock)
      const hasEnoughStock = (fulfillModalReq.supplier_available_stock >= fulfillModalReq.quantity) || ((fulfillModalReq.so_purchased_stock ?? 0) >= fulfillModalReq.quantity);
      if (!hasEnoughStock) {
        setActionErrorMsg(`Cannot dispatch: Insufficient stock. Depot available: ${fulfillModalReq.supplier_available_stock} cases, SO buffer: ${fulfillModalReq.so_purchased_stock ?? 0} cases, but outlet requested ${fulfillModalReq.quantity} cases.`);
        return;
      }
      if (!selectedDeliveryTeamId) {
        setActionErrorMsg("Please select an assigned delivery team / fleet vehicle for this outlet dispatch.");
        return;
      }

      setFulfillSubmitting(true);
      setActionErrorMsg(null);
      setActionSuccessMsg(null);

      try {
        const assignedTeam = deliveryTeams.find((t) => t.id === Number(selectedDeliveryTeamId));
        const subRouteToUse = dispatchSubRoute.trim() || fulfillModalReq.sub_route || fulfillModalReq.area || 'Main Territory Sub-Route';

        const dispatchPayload = {
          user_id: userId,
          delivery_team_id: Number(selectedDeliveryTeamId),
          sub_route: subRouteToUse,
          notes: fulfillNotes || `Dispatched to ${fulfillModalReq.outlet_name} from SO ${fulfillModalReq.sales_officer_name || ''} buffer`,
          items: [
            {
              outlet_id: fulfillModalReq.outlet_id,
              outlet_name: fulfillModalReq.franchise_name ? `${fulfillModalReq.franchise_name} — ${fulfillModalReq.branch_name || fulfillModalReq.outlet_name}` : fulfillModalReq.outlet_name,
              branch_name: fulfillModalReq.branch_name,
              location_address: fulfillModalReq.location_address,
              contact_phone: fulfillModalReq.contact_phone,
              product_id: fulfillModalReq.product_id,
              product_name: fulfillModalReq.product_name,
              category: fulfillModalReq.category,
              demanded_cases: fulfillModalReq.quantity,
              assigned_cases: fulfillModalReq.quantity,
              unit_price: fulfillPrice,
              requisition_id: fulfillModalReq.id,
              requisition_code: fulfillModalReq.requisition_code,
              sales_officer_id: fulfillModalReq.sales_officer_id,
              stop_status: 'ASSIGNED',
            },
          ],
        };

        const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dispatchPayload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Failed to dispatch via delivery fleet');
        }

        const vehicleReg = data.vehicle_registration_no || assignedTeam?.vehicle_registration_no || 'Vehicle';
        setLastAssignedVehicleReg(vehicleReg);

        // Broadcast real-time events to all channels
        try {
          const ch = new BroadcastChannel('fizzdrop_realtime_events');
          ch.postMessage({
            type: 'FLEET_DELIVERY_DISPATCHED',
            dispatch_code: data.dispatch_code,
            vehicle_registration_no: vehicleReg,
            outlet_id: fulfillModalReq.outlet_id,
            outlet_name: fulfillModalReq.outlet_name,
            sub_route: subRouteToUse,
          });
          ch.postMessage({
            type: 'SUPPLIER_DISPATCHED_TO_OUTLET',
            recipientRole: 'SALES_OFFICER',
            recipientUserId: fulfillModalReq.sales_officer_id,
            outlet_name: fulfillModalReq.outlet_name,
            product_name: fulfillModalReq.product_name,
            quantity: fulfillModalReq.quantity,
            title: `Stock Dispatched via Delivery Fleet to ${fulfillModalReq.outlet_name}`,
            message: `Supplier assigned vehicle ${vehicleReg} to deliver ${fulfillModalReq.quantity} cases of ${fulfillModalReq.product_name} to ${fulfillModalReq.outlet_name} on route ${subRouteToUse}.`,
          });
          setTimeout(() => ch.close(), 100);
        } catch (e) {}

        setActionSuccessMsg(
          `Successfully assigned delivery team "${assignedTeam?.team_name || 'Fleet'}" (${vehicleReg}) to deliver ${fulfillModalReq.quantity} cases to ${fulfillModalReq.outlet_name} on sub-route "${subRouteToUse}"! The delivery team can now confirm the order in the Delivery Team Portal.`
        );

        setFulfillModalReq(null);
        fetchRequisitions();
        fetchDeliveryTeams();
      } catch (err: any) {
        setActionErrorMsg(err.message || 'Failed to dispatch via delivery fleet');
      } finally {
        setFulfillSubmitting(false);
      }
      return;
    }

    if (effectiveDispatchQty <= 0) {
      setActionErrorMsg("Dispatch quantity must be at least 1 case.");
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
          quantity: effectiveDispatchQty,
          unit_price: fulfillModalReq.is_so_purchase ? Number(fulfillModalReq.unit_price || 35) : fulfillPrice,
          user_id: userId,
          sales_officer_id: fulfillModalReq.sales_officer_id,
          notes: fulfillNotes || `Dispatched to SO ${fulfillModalReq.sales_officer_name || ''} buffer`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to dispatch stock');
      }

      // If price was adjusted for retail outlet orders, broadcast to Superadmin tabs
      if (!fulfillModalReq.is_so_purchase && fulfillPrice > 0 && fulfillPrice !== fulfillModalReq.unit_price) {
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
          title: `Stock Dispatched to ${fulfillModalReq.outlet_name}`,
          message: `Supplier has dispatched ${fulfillQty} cases of ${fulfillModalReq.product_name} to ${fulfillModalReq.outlet_name} from your purchased stock towards your monthly target achievement.`,
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

    const hasEnoughStock = (req.supplier_available_stock >= req.quantity) || ((req.so_purchased_stock ?? 0) >= req.quantity);
    if (!req.is_so_purchase && !hasEnoughStock) {
      setActionErrorMsg(`Cannot dispatch: Insufficient stock. Depot holds ${req.supplier_available_stock} cases, Sales Officer holds ${req.so_purchased_stock ?? 0} cases in buffer, but outlet requested ${req.quantity} cases.`);
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
          title: `Stock Dispatched to ${req.outlet_name}`,
          message: `Supplier has dispatched ${req.quantity} cases of ${req.product_name} to ${req.outlet_name} from your purchased stock towards your monthly target achievement.`,
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

  // Unique categories
  const categories = useMemo(() => {
    return ['ALL', ...(Array.from(new Set(requisitions.map((r) => r.category).filter(Boolean))) as string[])];
  }, [requisitions]);

  // Filtered List
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'PENDING' && r.status === 'PENDING') ||
        (filterStatus === 'DISPATCHED' && (r.status === 'DISPATCHED' || r.status === 'COMPLETED'));

      const matchesUrgency = filterUrgency === 'ALL' || r.urgency === filterUrgency;

      const matchesCategory =
        filterCategory === 'ALL' ||
        (r.category && r.category.toLowerCase() === filterCategory.toLowerCase());

      const matchesSource =
        filterSource === 'ALL' ||
        (filterSource === 'SO_BUFFER' && r.is_so_purchase) ||
        (filterSource === 'OUTLET_DEMAND' && !r.is_so_purchase);

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        r.requisition_code?.toLowerCase().includes(q) ||
        r.outlet_name?.toLowerCase().includes(q) ||
        r.franchise_name?.toLowerCase().includes(q) ||
        r.branch_name?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.sales_officer_name?.toLowerCase().includes(q);

      return matchesStatus && matchesUrgency && matchesCategory && matchesSource && matchesSearch;
    });
  }, [requisitions, filterStatus, filterUrgency, filterCategory, filterSource, searchQuery]);

  // KPIs
  const pendingCount = requisitions.filter((r) => r.status === 'PENDING').length;
  const criticalCount = requisitions.filter((r) => r.status === 'PENDING' && r.urgency === 'CRITICAL').length;
  const soBufferCount = requisitions.filter((r) => r.is_so_purchase).length;
  const outletDemandCount = requisitions.filter((r) => !r.is_so_purchase).length;
  const totalUnitsRequested = requisitions
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert Banners */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-scale-up">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{actionSuccessMsg}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastAssignedVehicleReg && (
              <Link
                to={`/delivery-team?regNo=${encodeURIComponent(lastAssignedVehicleReg)}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Open Delivery Team Portal ({lastAssignedVehicleReg})</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            <button
              onClick={() => {
                setActionSuccessMsg(null);
                setLastAssignedVehicleReg(null);
              }}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-1 p-1"
            >
              ✕
            </button>
          </div>
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
        {/* Demand Source Filter Tabs: Clean separation of SO Buffer Purchases vs Outlet Restock Orders */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2.5">
          <button
            type="button"
            onClick={() => setFilterSource('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterSource === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Requisitions ({requisitions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('SO_BUFFER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterSource === 'SO_BUFFER'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>SO Buffer Purchases ({soBufferCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('OUTLET_DEMAND')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterSource === 'OUTLET_DEMAND'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Outlet Demands ({outletDemandCount})</span>
          </button>
        </div>

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

        {/* Product Category Filter Chips */}
        {categories.length > 1 && (
          <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        )}
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

                  {/* Requisition Destination & Beneficiary */}
                  {req.is_so_purchase ? (
                    <div className="space-y-1 mb-2">
                      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-900 font-medium">
                        <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-bold text-blue-800 uppercase tracking-wide text-[10px]">
                          Sales Officer Stock Purchase:
                        </span>
                        <strong className="font-bold text-blue-900">
                          {req.sales_officer_name || "Designated Sales Officer"}
                        </strong>
                        {req.sales_officer_code && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white text-blue-700 border border-blue-200 font-bold">
                            {req.sales_officer_code}
                          </span>
                        )}
                        <span className="text-blue-600 text-[11px] font-normal">
                          • Territory: <strong className="text-blue-900">{req.sales_officer_area || req.area}</strong>
                        </span>
                        <span className="ml-auto text-[10px] bg-blue-200/80 text-blue-900 font-extrabold px-2 py-0.5 rounded-full">
                          SO Territory Buffer (Held at Depot)
                        </span>
                      </div>
                      <div className="px-1 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                          <strong>Kept Separate:</strong> Purchased by Sales Officer to hold in reserve. Dispatches to individual outlets only when outlets submit orders. (No outlet assigned).
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 mb-2">
                      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-900 font-medium">
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
                        <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Outlet Order (To be fulfilled from SO Stock)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-900 pt-0.5">
                        <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{req.franchise_name || req.outlet_name}</span>
                        <span className="text-slate-400 font-normal">—</span>
                        <span className="text-emerald-700 font-bold">{req.branch_name || req.area}</span>
                        <span className="text-xs text-slate-400 font-normal">
                          ({req.city} • {req.area})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Beverage & Quantity Details */}
                  <div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800 font-bold mt-1">
                      <Package className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{req.product_name}</span>
                      {req.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {req.category}
                        </span>
                      )}
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
                  {req.is_so_purchase ? (
                    /* For SO Stock Purchases: Dispatched from Supplier Depot Stock */
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
                    </div>
                  ) : (
                    /* For Outlet Requisitions: Dispatched strictly from SO Purchased Stock with Depot Stock Context */
                    <div className="flex items-center gap-2">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-right min-w-[140px]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Your Depot Stock
                        </p>
                        <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                          <span
                            className={`text-lg font-black font-mono ${
                              req.supplier_available_stock <= 0
                                ? 'text-rose-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {req.supplier_available_stock}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">cases</span>
                        </div>
                        <p className="text-[9px] text-slate-400">From Superadmin</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-right min-w-[190px]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          SO Purchased Buffer Stock
                        </p>
                        <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                          <span
                            className={`text-2xl font-black font-mono ${
                              (req.so_purchased_stock ?? 0) >= req.quantity
                                ? 'text-emerald-700'
                                : (req.so_purchased_stock ?? 0) > 0
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {req.so_purchased_stock ?? 0}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">cases</span>
                        </div>
                        {(req.so_purchased_stock ?? 0) >= req.quantity ? (
                          <p className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1 mt-0.5">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Ready to Dispatch ({req.quantity} req)</span>
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-amber-700 flex items-center justify-end gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>SO holds {req.so_purchased_stock ?? 0}/{req.quantity} cases</span>
                          </p>
                        )}
                        <p className="text-[9px] text-slate-400 mt-1 truncate max-w-[180px]">
                          SO: <strong className="text-slate-600">{req.sales_officer_name || 'Assigned Officer'}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <>
                        {req.is_so_purchase && req.supplier_available_stock <= 0 ? (
                          <button
                            type="button"
                            onClick={() => openFulfillModal(req)}
                            className="py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition cursor-pointer shadow-xs active:scale-95"
                            title="0 stock in depot — click for restock alert"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>0 Stock in Depot</span>
                          </button>
                        ) : !req.is_so_purchase && req.supplier_available_stock < req.quantity && ((req.so_purchased_stock ?? 0) < req.quantity) ? (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              disabled
                              className="py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                              title={`Cannot dispatch: Insufficient stock. Depot holds ${req.supplier_available_stock} cases, SO buffer holds ${req.so_purchased_stock ?? 0} cases.`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                              <span>Insufficient Stock</span>
                            </button>
                            <span className="text-[10px] text-amber-700 font-semibold">
                              Need {req.quantity} cases
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
                                : `Assign delivery team and dispatch exact ${req.quantity} cases to outlet`
                            }
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>
                              {req.is_so_purchase
                                ? `Confirm & Dispatch to SO (${req.quantity} Cases)`
                                : `Dispatch to Outlet (${req.quantity} Cases)`}
                            </span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>{req.is_so_purchase ? "Purchased & Reserved in SO Buffer" : "Dispatched to Outlet"}</span>
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

      {/* MODAL: Dispatch Modal (Wholesale Buffer Stock vs Assign Delivery Team for Outlets) */}
      {fulfillModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
                  fulfillModalReq.is_so_purchase
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20'
                    : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 shadow-emerald-500/20'
                }`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                    {fulfillModalReq.is_so_purchase
                      ? 'Fulfill SO Buffer Stock Requisition'
                      : 'Assign Delivery Team & Dispatch to Outlet'}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    Requisition #{fulfillModalReq.requisition_code} • {fulfillModalReq.is_so_purchase ? 'Wholesale Depot Transfer' : 'Fleet Delivery Assignment'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFulfillModalReq(null);
                  setShowInlineNewTeam(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFulfillSubmit} className="p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-zinc-100">
              
              {/* Product & Destination Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Beverage Stock</span>
                      {fulfillModalReq.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {fulfillModalReq.category}
                        </span>
                      )}
                    </div>
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
                    <span className="text-[10px] text-slate-400 block">Sales Officer (Buffer Owner):</span>
                    <strong className="text-slate-800 dark:text-zinc-200 font-bold block truncate">
                      {fulfillModalReq.sales_officer_name || 'Assigned Sales Officer'}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">{fulfillModalReq.sales_officer_code || fulfillModalReq.area}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      {fulfillModalReq.is_so_purchase ? 'Destination Buffer:' : 'Destination Outlet:'}
                    </span>
                    <strong className="text-slate-800 dark:text-zinc-200 font-bold block truncate">
                      {fulfillModalReq.is_so_purchase
                        ? `Sales Officer Buffer Stock (${fulfillModalReq.sales_officer_name})`
                        : (fulfillModalReq.franchise_name ? `${fulfillModalReq.franchise_name} — ${fulfillModalReq.branch_name || fulfillModalReq.outlet_name}` : fulfillModalReq.outlet_name)}
                    </strong>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {fulfillModalReq.is_so_purchase
                        ? `Held at Depot • Territory: ${fulfillModalReq.sales_officer_area || fulfillModalReq.area}`
                        : (fulfillModalReq.location_address || fulfillModalReq.area)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs">
                  <span className="text-slate-500">Demanded Volume: <strong className="text-slate-900 dark:text-white font-mono">{fulfillModalReq.quantity} cases</strong></span>
                  <div className="flex items-center gap-3">
                    <span className="text-teal-600 dark:text-teal-400 font-bold">
                      Depot Stock: <strong className="font-mono text-sm">{fulfillModalReq.supplier_available_stock}</strong> cases
                    </span>
                    {!fulfillModalReq.is_so_purchase && (
                      <span className={`${(fulfillModalReq.so_purchased_stock ?? 0) >= fulfillModalReq.quantity ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'} font-bold`}>
                        SO Buffer: <strong className="font-mono text-sm">{fulfillModalReq.so_purchased_stock ?? 0}</strong> cases
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning if insufficient stock in both SO buffer and depot */}
                {!fulfillModalReq.is_so_purchase && fulfillModalReq.supplier_available_stock < fulfillModalReq.quantity && ((fulfillModalReq.so_purchased_stock ?? 0) < fulfillModalReq.quantity) && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Cannot dispatch: Insufficient stock in depot ({fulfillModalReq.supplier_available_stock} cases) and Sales Officer <strong>{fulfillModalReq.sales_officer_name}</strong> buffer ({fulfillModalReq.so_purchased_stock ?? 0} cases) for requested {fulfillModalReq.quantity} cases.</span>
                  </div>
                )}
              </div>

              {/* SPECIFIC FORM FOR OUTLET DEMAND: ASSIGN DELIVERY TEAM, STOCKS & SUB-ROUTE */}
              {!fulfillModalReq.is_so_purchase ? (
                <div className="space-y-4">
                  {/* Outlet Name & Sub-Route Details */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-zinc-800/80 border border-emerald-200/80 dark:border-zinc-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Outlet Destination & Sub-Route</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">
                        {fulfillModalReq.city} • {fulfillModalReq.area}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 block mb-1">
                        Outlet Name
                      </label>
                      <input
                        type="text"
                        disabled
                        value={fulfillModalReq.franchise_name ? `${fulfillModalReq.franchise_name} — ${fulfillModalReq.branch_name || fulfillModalReq.outlet_name}` : fulfillModalReq.outlet_name}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 text-xs font-bold cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                          <Route className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Outlet Sub-Route *</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Route for navigation & live transit</span>
                      </div>
                      <input
                        type="text"
                        value={dispatchSubRoute}
                        onChange={(e) => setDispatchSubRoute(e.target.value)}
                        placeholder="e.g. Gulshan2-Circle North Route"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* Stocks to Assign & Deliver */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-600" />
                        <span>Stocks Demanded & Assigned to Vehicle</span>
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full">
                        Locked to Demand
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                      <div>
                        <strong className="text-sm font-black text-slate-900 dark:text-white block">
                          {fulfillModalReq.product_name}
                        </strong>
                        <span className="text-xs text-slate-500">
                          Wholesale: ৳{Number(fulfillPrice).toFixed(2)}/case • Total: ৳{Number(fulfillModalReq.quantity * fulfillPrice).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono text-teal-700 dark:text-teal-400">
                          {fulfillModalReq.quantity}
                        </span>
                        <span className="text-xs font-bold text-slate-500 ml-1">cases</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Dispatched strictly from stock purchased by Sales Officer <strong>{fulfillModalReq.sales_officer_name}</strong>.
                    </p>
                  </div>

                  {/* Assign Delivery Team Selector */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-zinc-800/80 border border-blue-200/70 dark:border-zinc-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>Assign Delivery Team / Fleet Vehicle *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowInlineNewTeam((prev) => !prev)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{showInlineNewTeam ? 'Select Existing Team' : '+ Add Delivery Team'}</span>
                      </button>
                    </div>

                    {!showInlineNewTeam ? (
                      <>
                        {deliveryTeams.length === 0 ? (
                          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                            <p className="font-bold flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>No delivery team currently registered.</span>
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400">
                              Please register a delivery team below to dispatch this order.
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowInlineNewTeam(true)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Register Delivery Team Now</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <select
                              value={selectedDeliveryTeamId}
                              onChange={(e) => setSelectedDeliveryTeamId(e.target.value ? Number(e.target.value) : '')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                              required
                            >
                              <option value="">-- Choose Assigned Delivery Team & Vehicle --</option>
                              {deliveryTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.team_name} — {t.vehicle_registration_no} ({t.vehicle_type} • Driver: {t.driver_name} • Cap: {t.max_capacity_cases} cases) [{t.status}]
                                </option>
                              ))}
                            </select>

                            {/* Details of Selected Team */}
                            {selectedDeliveryTeamId && (
                              (() => {
                                const team = deliveryTeams.find((t) => t.id === Number(selectedDeliveryTeamId));
                                if (!team) return null;
                                return (
                                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200/80 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Vehicle Reg & Type</span>
                                      <strong className="text-slate-900 dark:text-white font-mono">{team.vehicle_registration_no}</strong>
                                      <span className="text-[10px] text-slate-500 block">{team.vehicle_type} (Cap: {team.max_capacity_cases} cases)</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Lead Driver & Status</span>
                                      <strong className="text-slate-900 dark:text-white">{team.driver_name}</strong>
                                      <span className="text-[10px] text-slate-500 block">{team.driver_phone || 'No phone'} • <strong className={team.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-blue-600'}>{team.status}</strong></span>
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      /* Inline Quick Team Registration Form */
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200/80 dark:border-zinc-800 space-y-2.5">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">
                          Register New Delivery Team & Vehicle
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Team Name</label>
                            <input
                              type="text"
                              value={inlineTeamForm.team_name}
                              onChange={(e) => setInlineTeamForm({ ...inlineTeamForm, team_name: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Vehicle Reg No</label>
                            <input
                              type="text"
                              value={inlineTeamForm.vehicle_registration_no}
                              onChange={(e) => setInlineTeamForm({ ...inlineTeamForm, vehicle_registration_no: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Driver Name</label>
                            <input
                              type="text"
                              value={inlineTeamForm.driver_name}
                              onChange={(e) => setInlineTeamForm({ ...inlineTeamForm, driver_name: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Driver Phone</label>
                            <input
                              type="text"
                              value={inlineTeamForm.driver_phone}
                              onChange={(e) => setInlineTeamForm({ ...inlineTeamForm, driver_phone: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowInlineNewTeam(false)}
                            className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateInlineTeam}
                            disabled={inlineTeamCreating}
                            className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1"
                          >
                            {inlineTeamCreating ? 'Saving...' : 'Save & Select Team'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dispatch Notes */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 block mb-1">
                      Dispatch Instructions / Delivery Notes
                    </label>
                    <input
                      type="text"
                      value={fulfillNotes}
                      onChange={(e) => setFulfillNotes(e.target.value)}
                      placeholder="e.g. Morning delivery priority, hand over invoice to store manager"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                /* SO BUFFER PURCHASE FORM (Dispatched from Depot to SO Buffer) */
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                        Dispatch Quantity (Cases)
                      </label>
                      <span className="text-xs text-slate-400">
                        Depot Max: <strong className="text-teal-600">{fulfillModalReq.supplier_available_stock} cases</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={fulfillModalReq.supplier_available_stock}
                        value={fulfillQty}
                        onChange={(e) => setFulfillQty(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                        required
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFulfillQty(Math.min(fulfillModalReq.quantity, fulfillModalReq.supplier_available_stock))}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition cursor-pointer"
                        >
                          Requested ({fulfillModalReq.quantity})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfillQty(fulfillModalReq.supplier_available_stock)}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 transition cursor-pointer"
                        >
                          Max Available
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Wholesale Price */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <span>Wholesale Unit Price (৳ per Case)</span>
                        {fulfillModalReq.is_so_purchase && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Centrally Assigned
                          </span>
                        )}
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
                        onChange={(e) => !fulfillModalReq.is_so_purchase && setFulfillPrice(parseFloat(e.target.value) || 0)}
                        readOnly={fulfillModalReq.is_so_purchase}
                        disabled={fulfillModalReq.is_so_purchase}
                        className={`w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-base focus:outline-hidden ${
                          fulfillModalReq.is_so_purchase
                            ? 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 cursor-not-allowed select-none'
                            : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500'
                        }`}
                        required
                      />
                    </div>
                    {fulfillModalReq.is_so_purchase && (
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1 font-medium">
                        <span>🔒 Wholesale rate is centrally assigned by Superadmin for this district and cannot be modified.</span>
                      </p>
                    )}
                  </div>

                  {/* Notes */}
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
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setFulfillModalReq(null);
                    setShowInlineNewTeam(false);
                  }}
                  disabled={fulfillSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    fulfillSubmitting ||
                    (fulfillModalReq.is_so_purchase && (fulfillQty <= 0 || fulfillQty > fulfillModalReq.supplier_available_stock)) ||
                    (!fulfillModalReq.is_so_purchase && (
                      (fulfillModalReq.supplier_available_stock < fulfillModalReq.quantity && (fulfillModalReq.so_purchased_stock ?? 0) < fulfillModalReq.quantity) ||
                      (!selectedDeliveryTeamId && !showInlineNewTeam)
                    ))
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
                      <span>
                        {fulfillModalReq.is_so_purchase
                          ? `Confirm & Dispatch to Sales Officer (${fulfillQty} Cases)`
                          : `Assign Delivery Team & Dispatch (${fulfillModalReq.quantity} Cases)`}
                      </span>
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
