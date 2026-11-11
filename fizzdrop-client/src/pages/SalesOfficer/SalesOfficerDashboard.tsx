import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Building2,
  Store,
  Package,
  Truck,
  MapPin,
  Phone,
  Mail,
  Compass,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Send,
  Boxes,
  Clock,
  ArrowRight,
  TrendingUp,
  LogOut,
  Home,
  ShieldCheck,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  Target,
  DollarSign,
  Coins,
  Award,
  Calendar,
  Percent,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from '../Admin/AdminLogin';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';

interface TerritoryOutlet {
  outlet_id: number;
  outlet_name: string;
  franchise_name?: string;
  branch_name?: string;
  location_address: string;
  city?: string;
  area?: string;
  contact_phone?: string;
  status: string;
  total_shelf_stock?: number;
  sub_route?: string;
  assigned_psr_id?: number;
  assigned_psr_name?: string;
  assigned_psr_code?: string;
  assigned_psr_phone?: string;
}

interface ProductItem {
  product_id: number;
  brand: string;
  flavor_variant: string;
  category?: string;
  sku?: string;
  base_price?: number;
  supplier_price?: number;
  outlet_price?: number;
  retail_price?: number;
  image_url?: string;
  depot_buffer_stock?: number;
  size_volume?: string;
}

export const formatOunces = (sizeVolume?: string): string => {
  if (!sizeVolume) return '12 oz';
  const clean = sizeVolume.toLowerCase().trim();
  if (clean.includes('oz')) return sizeVolume;
  if (clean === '250ml') return '8.45 oz (250ml)';
  if (clean === '330ml') return '11.16 oz (330ml)';
  if (clean === '355ml') return '12 oz (355ml)';
  if (clean === '400ml') return '13.5 oz (400ml)';
  if (clean === '500ml') return '16.9 oz (500ml)';
  if (clean === '1l' || clean === '1000ml') return '33.8 oz (1L)';
  if (clean === '1.5l') return '50.7 oz (1.5L)';
  if (clean === '2l') return '67.6 oz (2L)';
  const match = clean.match(/(\d+(\.\d+)?)\s*ml/);
  if (match) {
    const ml = parseFloat(match[1]);
    const oz = (ml * 0.033814).toFixed(1);
    return `${oz} oz (${sizeVolume})`;
  }
  return sizeVolume;
};

interface OfficerProfile {
  id: number;
  user_id?: number;
  officer_code: string;
  name: string;
  email?: string;
  phone: string;
  supplier_id: number;
  district_id?: number;
  city: string;
  assigned_area: string;
  status: string;
  notes?: string;
  supplier_name?: string;
}

interface SupplierInfo {
  id: number;
  business_name: string;
  depot_address?: string;
  phone_number?: string;
  allocated_areas?: string;
}

export interface FinancialTargetData {
  monthly_target: number;
  amount_spent: number;
  pending_spent?: number;
  remaining_target: number;
  progress_percentage: number;
  is_target_met: boolean;
  month_name: string;
  days_left: number;
  end_of_month: string;
  total_profit_gained: number;
  total_distribution_revenue: number;
  total_distribution_cost: number;
  total_units_sold_to_outlets: number;
}

export interface DistributionRecord {
  id: number;
  sales_officer_id: number;
  outlet_id: number;
  product_id: number;
  quantity: number;
  cost_price: number;
  sale_price: number;
  total_cost: number;
  total_revenue: number;
  profit_earned: number;
  distribution_date: string;
  notes?: string;
  outlet_name?: string;
  branch_name?: string;
  franchise_name?: string;
  brand?: string;
  flavor_variant?: string;
  sku?: string;
}

export const SalesOfficerDashboard: React.FC = () => {
  const { user, isAuthenticated, logout, loginAsSalesOfficer, isSalesOfficer, isSuperadmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'psr-team' | 'profit-ledger' | 'outlets' | 'demands' | 'supplier-link'>('overview');
  
  // Dashboard Data State
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [outlets, setOutlets] = useState<TerritoryOutlet[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [financialTarget, setFinancialTarget] = useState<FinancialTargetData | null>(null);
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [allOfficers, setAllOfficers] = useState<OfficerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-Sales Officers (PSR) & Sub-Routes Data
  const [psrs, setPsrs] = useState<any[]>([]);
  const [psrOrders, setPsrOrders] = useState<any[]>([]);
  const [psrRefunds, setPsrRefunds] = useState<any[]>([]);
  const [psrSummary, setPsrSummary] = useState<any | null>(null);

  // Real-time Notifications for Sales Officer
  const soUserId = officer?.user_id || (officer?.id ? 100 + officer.id : (user?.user_id || (user?.sales_officer?.id ? 100 + user.sales_officer.id : 101)));
  const {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
  } = useNotifications('SALES_OFFICER', soUserId);

  // Auto-refresh when notification arrives
  useEffect(() => {
    if (popupNotification && popupNotification.recipient_role === 'SALES_OFFICER') {
      if (officer?.id) {
        fetchDashboardData(officer.id);
        fetchPsrData(officer.id);
      }
    }
  }, [popupNotification, officer?.id]);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // PSR Allotment & Target Modal State
  const [isAllotModalOpen, setIsAllotModalOpen] = useState(false);
  const [allotPsr, setAllotPsr] = useState<any | null>(null);
  const [allotSubRoute, setAllotSubRoute] = useState<string>('');
  const [allotCustomSubRoute, setAllotCustomSubRoute] = useState<string>('');
  const [availableSubRoutes, setAvailableSubRoutes] = useState<string[]>([]);
  const [allAreaShops, setAllAreaShops] = useState<any[]>([]);
  const [subRouteShops, setSubRouteShops] = useState<any[]>([]);
  const [allotSelectedOutletIds, setAllotSelectedOutletIds] = useState<number[]>([]);
  const [allotTargetCases, setAllotTargetCases] = useState<number>(50);
  const [allotTargetProductId, setAllotTargetProductId] = useState<number | string>('');
  const [allotTargetSkuOunces, setAllotTargetSkuOunces] = useState<string>('');
  const [allotTargetNotes, setAllotTargetNotes] = useState<string>('');
  const [allotLoadingShops, setAllotLoadingShops] = useState(false);
  const [allotSubmitting, setAllotSubmitting] = useState(false);

  // Request Products from Supplier Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqProductId, setReqProductId] = useState<number | string>('');
  const [reqQuantity, setReqQuantity] = useState<number>(30);
  const [reqUrgency, setReqUrgency] = useState<string>('NORMAL');
  const [reqNotes, setReqNotes] = useState<string>('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  // Search & Filters
  const [outletSearch, setOutletSearch] = useState('');
  const [demandStatusFilter, setDemandStatusFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED'>('ALL');

  const fetchDashboardData = async (targetOfficerId?: number) => {
    setLoading(true);
    try {
      const officerParam = targetOfficerId ? `officerId=${targetOfficerId}` : (user?.user_id ? `userId=${user.user_id}` : '');
      const [dashRes, allOffRes] = await Promise.all([
        fetch(`http://localhost:8080/api/v1/sales-officer/dashboard?${officerParam}`),
        fetch('http://localhost:8080/api/v1/sales-officers'),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setOfficer(data.sales_officer || null);
        setSupplier(data.supplier || null);
        setOutlets(data.outlets || []);
        setProducts(data.products || []);
        setRequisitions(data.requisitions || []);
        setFinancialTarget(data.financial_target || null);
        setDistributions(data.distributions || []);

        if (data.sales_officer?.id) {
          fetchPsrData(data.sales_officer.id);
        }
      }

      if (allOffRes.ok) {
        const offList = await allOffRes.json();
        setAllOfficers(Array.isArray(offList) ? offList : []);
      }
    } catch (err) {
      console.error('Error fetching sales officer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPsrData = async (officerId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/so-summary/${officerId}`);
      if (res.ok) {
        const json = await res.json();
        setPsrs(json.psrs || []);
        setPsrOrders(json.orders || []);
        setPsrRefunds(json.refunds || []);
        setPsrSummary(json);
      }
    } catch (e) {
      console.error('Error fetching PSR data:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.user_id]);

  // Auto-refresh financial target and order status upon Supplier purchase confirmation
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        const payload = event.data;
        if (
          payload?.type === 'SALES_OFFICER_PURCHASE_CONFIRMED' ||
          payload?.type === 'SUPPLIER_DISPATCHED_TO_OUTLET' ||
          payload?.type === 'REQUISITION_ACTION' ||
          payload?.type === 'PRICE_UPDATED' ||
          payload?.type === 'NEW_PSR_ORDER' ||
          payload?.type === 'NEW_PSR_REFUND' ||
          payload?.type === 'SO_ORDER_APPROVED' ||
          payload?.type === 'PSR_STOCK_DISPATCHED'
        ) {
          if (
            !payload.recipientUserId ||
            payload.recipientUserId === officer?.user_id ||
            payload.referenceId === officer?.id ||
            payload.sales_officer_id === officer?.id
          ) {
            if (officer?.id) {
              fetchDashboardData(officer.id);
              fetchPsrData(officer.id);
            }
            if (payload?.type === 'SUPPLIER_DISPATCHED_TO_OUTLET') {
              setActionSuccessMsg(
                payload.message || `Supplier has dispatched stock to ${payload.outlet_name || 'outlet'}! Wholesale profit updated.`
              );
            }
          }
        }
      };
    } catch (e) {}

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, [officer?.id, officer?.user_id]);

  const handleConsolidateOrderToSupplier = (order: any) => {
    setReqProductId(order.product_id);
    setReqQuantity(order.quantity);
    setReqUrgency(order.urgency || 'HIGH');
    setReqNotes(`Consolidating field demand from PSR ${order.psr_name || 'Team'} for ${order.outlet_name} on sub-route ${order.sub_route}`);
    setIsRequestModalOpen(true);
  };

  const [loadingActionId, setLoadingActionId] = useState<number | null>(null);

  const handleTellSupplier = async (ord: any) => {
    if (!ord || !ord.id) return;
    setLoadingActionId(ord.id);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/orders/${ord.id}/so-request-supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_officer_id: officer?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to notify supplier');

      // Real-time broadcast to Supplier
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'SO_STOCK_REQUEST_FOR_OUTLET',
          recipientRole: 'SUPPLIER',
          recipientUserId: data.supplier_user_id || 4,
          order_id: ord.id,
          order_code: ord.order_code,
          outlet_id: ord.outlet_id,
          outlet_name: ord.outlet_name,
          product_id: ord.product_id,
          product_name: ord.product_name,
          quantity: ord.quantity,
          sales_officer_id: officer?.id,
          sales_officer_name: officer?.name,
          title: `Stock Needed: ${ord.quantity} cases in ${ord.outlet_name}`,
          message: `Sales Officer ${officer?.name || 'Tariq Rahman'} notified you: ${ord.quantity} cases of ${ord.product_name} is needed in ${ord.outlet_name}. Please dispatch to outlet from SO purchased stock.`,
        });
        setTimeout(() => bc.close(), 100);
      } catch (ignored) {}

      setActionSuccessMsg(
        `Notified Supplier: ${ord.quantity} cases of ${ord.product_name} needed at ${ord.outlet_name}. Awaiting supplier dispatch from purchased stock.`
      );

      if (officer?.id) {
        fetchDashboardData(officer.id);
        fetchPsrData(officer.id);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleUpdatePsrOrderStatus = async (orderOrId: any, status: string) => {
    const orderId = typeof orderOrId === 'object' ? orderOrId.id : orderOrId;
    const psrId = typeof orderOrId === 'object' ? orderOrId.psr_id : null;
    const orderCode = typeof orderOrId === 'object' ? orderOrId.order_code : null;
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        try {
          const bc = new BroadcastChannel('fizzdrop_realtime_events');
          bc.postMessage({
            type: 'SO_ORDER_APPROVED',
            order_code: orderCode,
            order_id: orderId,
            psr_id: psrId,
            status,
          });
          bc.close();
        } catch (ignored) {}

        if (officer?.id) {
          fetchDashboardData(officer.id);
          fetchPsrData(officer.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePsrRefundStatus = async (refundOrId: any, status: string, soRemarks: string) => {
    const refundId = typeof refundOrId === 'object' ? refundOrId.id : refundOrId;
    const psrId = typeof refundOrId === 'object' ? refundOrId.psr_id : null;
    const refundCode = typeof refundOrId === 'object' ? refundOrId.refund_code : null;
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/refunds/${refundId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, so_remarks: soRemarks }),
      });
      if (res.ok) {
        try {
          const bc = new BroadcastChannel('fizzdrop_realtime_events');
          bc.postMessage({
            type: 'SO_REFUND_APPROVED',
            refund_code: refundCode,
            refund_id: refundId,
            psr_id: psrId,
            status,
          });
          bc.close();
        } catch (ignored) {}

        if (officer?.id) {
          fetchDashboardData(officer.id);
          fetchPsrData(officer.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchOfficer = async (off: OfficerProfile) => {
    await loginAsSalesOfficer(off.id, off.email);
    fetchDashboardData(off.id);
  };

  const openAllotModal = async (psr: any) => {
    setAllotPsr(psr);
    const initialRoute = psr.sub_route || '';
    setAllotSubRoute(initialRoute);
    setAllotCustomSubRoute('');
    setAllotTargetCases(psr.target_cases && psr.target_cases > 0 ? psr.target_cases : 50);
    setAllotTargetNotes(psr.target_notes || 'Monthly outlet distribution target');

    if (psr.target_product_id) {
      setAllotTargetProductId(psr.target_product_id);
      setAllotTargetSkuOunces(psr.target_sku_ounces || '');
    } else if (products.length > 0) {
      const p = products[0];
      setAllotTargetProductId(p.product_id);
      setAllotTargetSkuOunces(`${p.sku} — ${p.brand} ${p.flavor_variant} (${formatOunces(p.size_volume)})`);
    }

    setIsAllotModalOpen(true);
    setAllotLoadingShops(true);

    try {
      const soId = officer?.id || 1;
      const srParam = initialRoute ? `&subRoute=${encodeURIComponent(initialRoute)}` : '';
      const res = await fetch(`http://localhost:8080/api/v1/psr/subroute-shops?salesOfficerId=${soId}${srParam}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSubRoutes(data.sub_routes || []);
        setAllAreaShops(data.all_shops || []);
        setSubRouteShops(data.subroute_shops || []);

        const preSelected = (data.all_shops || [])
          .filter((s: any) => s.assigned_psr_id === psr.id)
          .map((s: any) => s.outlet_id);

        if (preSelected.length === 0 && data.subroute_shops && data.subroute_shops.length > 0) {
          setAllotSelectedOutletIds(data.subroute_shops.map((s: any) => s.outlet_id));
        } else {
          setAllotSelectedOutletIds(preSelected);
        }
      }
    } catch (err) {
      console.error('Error loading sub-route shops:', err);
    } finally {
      setAllotLoadingShops(false);
    }
  };

  const handleSubRouteChange = async (selectedRoute: string) => {
    setAllotSubRoute(selectedRoute);
    if (selectedRoute === '__CUSTOM__') {
      setSubRouteShops([]);
      return;
    }
    setAllotLoadingShops(true);
    try {
      const soId = officer?.id || 1;
      const res = await fetch(`http://localhost:8080/api/v1/psr/subroute-shops?salesOfficerId=${soId}&subRoute=${encodeURIComponent(selectedRoute)}`);
      if (res.ok) {
        const data = await res.json();
        setSubRouteShops(data.subroute_shops || []);
        // Automatically check shops that belong to this sub-route
        if (data.subroute_shops && data.subroute_shops.length > 0) {
          const ids = data.subroute_shops.map((s: any) => s.outlet_id);
          setAllotSelectedOutletIds((prev) => Array.from(new Set([...prev, ...ids])));
        }
      }
    } catch (err) {
      console.error('Error fetching shops for route:', err);
    } finally {
      setAllotLoadingShops(false);
    }
  };

  const handleTargetProductChange = (prodId: string | number) => {
    setAllotTargetProductId(prodId);
    const prod = products.find((p) => String(p.product_id) === String(prodId));
    if (prod) {
      setAllotTargetSkuOunces(`${prod.sku} — ${prod.brand} ${prod.flavor_variant} (${formatOunces(prod.size_volume)})`);
    }
  };

  const toggleOutletAllotment = (outletId: number) => {
    setAllotSelectedOutletIds((prev) =>
      prev.includes(outletId) ? prev.filter((id) => id !== outletId) : [...prev, outletId]
    );
  };

  const handleAllotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allotPsr?.id) return;
    const finalRoute = allotSubRoute === '__CUSTOM__' ? allotCustomSubRoute.trim() : allotSubRoute.trim();
    if (!finalRoute) {
      setActionErrorMsg('Please specify a designated sub-route');
      return;
    }

    setAllotSubmitting(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/${allotPsr.id}/allot-outlets-target`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub_route: finalRoute,
          outlet_ids: allotSelectedOutletIds,
          target_cases: allotTargetCases,
          target_sku_ounces: allotTargetSkuOunces,
          target_product_id: allotTargetProductId ? Number(allotTargetProductId) : null,
          target_notes: allotTargetNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to allot shops and target');
      }

      setActionSuccessMsg(data.message || `Successfully allotted ${allotSelectedOutletIds.length} shops and target to ${allotPsr.name}`);
      setIsAllotModalOpen(false);
      if (officer?.id) {
        fetchPsrData(officer.id);
        fetchDashboardData(officer.id);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error allotting shops and target');
    } finally {
      setAllotSubmitting(false);
    }
  };

  const handleRequestStockFromSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officer?.id || !reqProductId || reqQuantity <= 0) {
      setActionErrorMsg('Please select a beverage product and valid quantity');
      return;
    }

    setReqSubmitting(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('http://localhost:8080/api/v1/sales-officer/request-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_officer_id: officer.id,
          product_id: Number(reqProductId),
          quantity: reqQuantity,
          urgency: reqUrgency,
          notes: reqNotes || `Stock request for ${officer.assigned_area} territory`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      // Real-time broadcast to Supplier browser tabs
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        const currentProd = products.find((p) => p.product_id === Number(reqProductId));
        bc.postMessage({
          recipientRole: 'SUPPLIER',
          recipientUserId: data.supplier_user_id,
          title: `New Product Request from Sales Officer ${officer.name}`,
          message: `Sales Officer ${officer.name} (${officer.assigned_area}) requested ${reqQuantity} cases of ${currentProd?.brand || 'Beverage'} ${currentProd?.flavor_variant || ''} (${reqUrgency} priority).`,
          type: 'SALES_OFFICER_REQUISITION',
          status: 'PENDING',
          referenceCode: data.requisition_code,
        });
        setTimeout(() => bc.close(), 100);
      } catch (err) {}

      setActionSuccessMsg(data.message || `Successfully submitted request for ${reqQuantity} cases to Supplier!`);
      setIsRequestModalOpen(false);
      setReqNotes('');
      fetchDashboardData(officer.id);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setReqSubmitting(false);
    }
  };

  // Filtered Territory Outlets
  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const term = outletSearch.toLowerCase();
      return (
        !term ||
        o.outlet_name.toLowerCase().includes(term) ||
        (o.franchise_name && o.franchise_name.toLowerCase().includes(term)) ||
        (o.branch_name && o.branch_name.toLowerCase().includes(term)) ||
        o.location_address.toLowerCase().includes(term)
      );
    });
  }, [outlets, outletSearch]);

  // Filtered Requisitions
  const filteredDemands = useMemo(() => {
    return requisitions.filter((r) => {
      if (demandStatusFilter === 'ALL') return true;
      if (demandStatusFilter === 'PENDING') return r.status === 'PENDING';
      return r.status === 'DISPATCHED' || r.status === 'COMPLETED';
    });
  }, [requisitions, demandStatusFilter]);

  // Quick stats
  const pendingDemandsCount = requisitions.filter((r) => r.status === 'PENDING').length;
  const totalAreaStock = outlets.reduce((sum, o) => sum + (o.total_shelf_stock || 0), 0);

  if (!isAuthenticated && !isSalesOfficer && !isSuperadmin) {
    return <AdminLogin requiredRole="any" />;
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-zinc-900 flex flex-col pb-16 selection:bg-blue-500/20 selection:text-blue-900">
      {/* Real-time Animated Notification Pop-up Window */}
      <NotificationPopup
        notification={popupNotification}
        onDismiss={dismissPopup}
        onAction={() => setActiveTab('demands')}
      />

      {/* 1. Top Navbar Fixed Subheader */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Left Brand & Home Link */}
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs"
                title="Return to Customer Storefront"
              >
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-oswald text-base font-bold uppercase tracking-wider text-slate-900">
                      Sales Officer Territory Portal
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      Territory Lead
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Wholesale distribution authority between Supplier and Retail Outlets
                  </p>
                </div>
              </div>
            </div>

            {/* Right Officer Info & Switcher */}
            <div className="flex items-center gap-2.5">
              {/* Officer Quick Profile Chip */}
              {officer && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="font-bold text-teal-600 block text-[11px] leading-tight">
                      {officer.name} ({officer.officer_code})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Zone: {officer.city} • {officer.assigned_area}
                    </span>
                  </div>
                </div>
              )}

              {/* Officer Switcher (Testing tool) */}
              {allOfficers.length > 1 && (
                <div className="relative">
                  <select
                    value={officer?.id || ''}
                    onChange={(e) => {
                      const selected = allOfficers.find((o) => String(o.id) === e.target.value);
                      if (selected) handleSwitchOfficer(selected);
                    }}
                    className="px-2.5 py-1.5 text-[11px] rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 focus:outline-none cursor-pointer"
                    title="Switch Sales Officer Account"
                  >
                    {allOfficers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.assigned_area})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notification Center */}
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDeleteNotification={deleteNotification}
                onClearOldNotifications={clearOldNotifications}
                onSelectNotification={() => setActiveTab('demands')}
                isScrolled={true}
              />

              <button
                onClick={() => logout()}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5 flex-1 w-full">
        {/* Toast Alerts */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-scale-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900 ml-3">✕</button>
          </div>
        )}

        {actionErrorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs animate-shake">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg(null)} className="font-bold text-rose-700 hover:text-rose-900 ml-3">✕</button>
          </div>
        )}

        {/* 2. Territory Jurisdiction Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30 shrink-0">
                {officer?.officer_code.split('-')[1] || 'SO'}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    {officer?.officer_code || 'SO-TERRITORY'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {officer?.status || 'ACTIVE'}
                  </span>
                </div>
                <h2 className="font-oswald text-2xl sm:text-3xl font-bold uppercase tracking-wide bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                  {officer?.name || 'Assigned Sales Officer'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/90 pt-1">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Jurisdiction: {officer?.city} • {officer?.assigned_area} Zone
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    {officer?.phone}
                  </span>
                  {officer?.email && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        {officer.email}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Linked Supplier Hub Pill */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1 shrink-0 max-w-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                Assigned Wholesale Supplier Hub
              </span>
              <p className="font-bold text-sm text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">{supplier?.business_name || officer?.supplier_name || 'Central Regional Supplier'}</span>
              </p>
              {supplier?.depot_address && (
                <p className="text-[11px] text-blue-200/80 truncate">
                  Depot: {supplier.depot_address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. MONTHLY TARGET & WHOLESALE PROFIT COMMAND CENTER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Monthly Purchase Target & Live Deductions */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white border border-indigo-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  Monthly Purchase Target
                </span>
                <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
                  financialTarget?.is_target_met
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}>
                  {financialTarget?.is_target_met ? 'TARGET MET 🎉' : `${financialTarget?.days_left ?? 0} DAYS LEFT`}
                </span>
              </div>

              {/* Big Target Remaining / Live Deduction */}
              <div className="space-y-1">
                <span className="text-[11px] text-indigo-200 font-semibold uppercase tracking-wider block">
                  Remaining Target to Fulfill
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                    ৳{Number(financialTarget?.remaining_target ?? 2000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80">
                  Initial Monthly Quota: <strong className="text-white font-mono">৳{Number(financialTarget?.monthly_target ?? 2000000).toLocaleString()}</strong>
                </p>
              </div>

              {/* Progress Bar & Deducted Amount */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-indigo-200">
                    Spent on Supplier Stock: <strong className="text-cyan-300">৳{Number(financialTarget?.amount_spent ?? 0).toLocaleString()}</strong>
                  </span>
                  <span className="font-bold text-cyan-300">
                    {financialTarget?.progress_percentage ?? 0}% Achieved
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      financialTarget?.is_target_met
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                        : 'bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, financialTarget?.progress_percentage ?? 0))}%` }}
                  />
                </div>
                {Boolean(financialTarget?.pending_spent && financialTarget.pending_spent > 0) && (
                  <p className="text-[10px] text-amber-300/90 font-mono pt-1">
                    ⏳ ৳{Number(financialTarget?.pending_spent).toLocaleString()} awaiting Supplier confirmation
                  </p>
                )}
              </div>
            </div>

            {/* Deadline Notice */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200/80 relative z-10">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Must Meet By: <strong>{financialTarget?.end_of_month || 'End of Month'}</strong></span>
              </span>
              <span className="font-bold text-white font-mono">{financialTarget?.month_name}</span>
            </div>
          </div>

          {/* Card 2: Wholesale Profit Gained from Outlets */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Wholesale Earnings & Margins
                </span>
                <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  REVENUE SHARE
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-emerald-200 font-semibold uppercase tracking-wider block">
                  Net Profit Gained from Outlet Sales
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-400">
                    +৳{Number(financialTarget?.total_profit_gained ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80">
                  Gained by distributing <strong className="text-white font-mono">{financialTarget?.total_units_sold_to_outlets ?? 0} cases</strong> to retail branches
                </p>
              </div>

              {/* Breakdown Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-emerald-500/20 text-xs">
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Store Invoiced Revenue</span>
                  <span className="font-mono font-bold text-white text-sm">
                    ৳{Number(financialTarget?.total_distribution_revenue ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Stock Purchase Cost</span>
                  <span className="font-mono font-bold text-slate-300 text-sm">
                    ৳{Number(financialTarget?.total_distribution_cost ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200 relative z-10">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Profit Margin: <strong>{financialTarget?.total_distribution_revenue ? ((financialTarget.total_profit_gained / financialTarget.total_distribution_revenue) * 100).toFixed(1) : '15.0'}%</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('profit-ledger')}
                className="text-[10px] text-emerald-300 hover:text-white font-bold underline cursor-pointer"
              >
                View Profit Ledger →
              </button>
            </div>
          </div>

          {/* Card 3: Quick Action & Territory Demands */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Territory Logistics Command</span>
                <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {officer?.assigned_area} Zone
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Retail Stores</span>
                  <span className="text-2xl font-black text-blue-900 font-mono">{outlets.length}</span>
                  <span className="text-[10px] text-blue-600 block">Physical Outlets</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Open Demands</span>
                  <span className="text-2xl font-black text-amber-900 font-mono">{pendingDemandsCount}</span>
                  <span className="text-[10px] text-amber-600 block">Awaiting Supply</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                  setIsRequestModalOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Buy Stock from Supplier (Deduct Target)</span>
              </button>

              <button
                onClick={() => setActiveTab('psr-team')}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Review PSR Field Demands ({psrs.length} Active PSRs)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Secondary Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Retail Outlets in Area</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-700 font-mono">{outlets.length}</span>
              <span className="text-xs text-slate-500 font-medium">stores</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Serviced via PSR Sub-Routes</p>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pre-Sales Field Officers</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-orange-600 font-mono">{psrs.length}</span>
              <span className="text-xs text-slate-500 font-medium">PSRs</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Covering sub-route stores</p>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Territory Shelf Stock</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 font-mono">{totalAreaStock}</span>
              <span className="text-xs text-slate-500 font-medium">units</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Stock across retail shelves</p>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Catalog Variants</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-700 font-mono">{products.length}</span>
              <span className="text-xs text-slate-500 font-medium">beverages</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Available for distribution</p>
          </div>
        </div>

        {/* 4. Tab Navigation Strip */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'overview', label: 'Territory Hub & Stock Buffer', icon: Boxes },
              { id: 'psr-team', label: `Pre-Sales (PSR) Team & Sub-Routes (${psrs.length})`, icon: UserCheck },
              { id: 'profit-ledger', label: `Wholesale Profit & Target (${distributions.length})`, icon: TrendingUp },
              { id: 'outlets', label: `Retail Stores (${outlets.length})`, icon: Store },
              { id: 'supplier-link', label: 'Supplier Depot & Logistics', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Request Stock from Supplier Button */}
            <button
              onClick={() => {
                if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                setIsRequestModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Request Products from Supplier</span>
            </button>
          </div>
        </div>

        {/* 5. TAB 1: OVERVIEW & WHOLESALE STOCK BUFFER */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Wholesale Beverage Inventory Buffer ({officer?.assigned_area})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Depot beverage cases supplied by {supplier?.business_name || 'Supplier'} to your territory. Outlets restock via designated Pre-Sales Officers.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fetchDashboardData(officer?.id)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Refresh stock levels"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>

              {/* Beverage Product Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {products.map((p) => (
                  <div
                    key={p.product_id}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs group"
                  >
                    <div>
                      {/* Top Brand & Category */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {p.sku || `SKU-${p.product_id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{p.category || 'Carbonated'}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                        {p.brand} {p.flavor_variant}
                      </h4>

                      {/* Stock Buffer Badge */}
                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Territory Buffer</span>
                          <span className="text-lg font-black text-emerald-700 font-mono">
                            {p.depot_buffer_stock ?? 50}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">cases</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Wholesale Rate</span>
                          <span className="text-xs font-bold text-slate-700 font-mono">
                            ৳{Number(p.supplier_price || p.base_price || 35).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReqProductId(p.product_id);
                        setIsRequestModalOpen(true);
                      }}
                      className="mt-3.5 w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Request from Supplier</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PRE-SALES (PSR) TEAM & SUB-ROUTES */}
        {activeTab === 'psr-team' && (
          <div className="space-y-6">
            {/* Operational Hierarchy Info Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                    Field Distribution Hierarchy
                  </span>
                  <span className="text-xs bg-black/20 text-white font-semibold px-2 py-0.5 rounded-full">
                    Zone: {officer?.assigned_area || 'Territory'}
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight">
                  Pre-Sales Representatives (PSR) & Field Sub-Routes
                </h3>
                <p className="text-xs text-orange-100 max-w-2xl leading-relaxed">
                  As Sales Officer, your assigned territory is partitioned into designated sub-routes. Dedicated Pre-Sales Officers visit retail shops along their route to book demand orders and verify refund claims. Review incoming field demands below and consolidate them into wholesale orders from your Central Supplier.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                    setIsRequestModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white text-orange-700 font-bold text-xs hover:bg-orange-50 shadow-md transition flex items-center gap-1.5 shrink-0"
                >
                  <Truck className="w-4 h-4" />
                  <span>Request Supplier Stock</span>
                </button>
              </div>
            </div>

            {/* Sub-Route & PSR Representative Directory */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-oswald text-base font-bold uppercase tracking-wide text-slate-900">
                    Assigned Field Representatives ({psrs.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    PSRs deployed across sub-routes in {officer?.assigned_area || 'your area'}. Allot shops and assign SKU targets.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {psrs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openAllotModal(psrs[0])}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Allot Shops & Target</span>
                    </button>
                  )}
                  <button
                    onClick={() => officer?.id && fetchPsrData(officer.id)}
                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs flex items-center gap-1 transition"
                    title="Refresh PSR team status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Routes</span>
                  </button>
                </div>
              </div>

              {psrs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No PSR field agents assigned yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {psrs.map((psr) => (
                    <div
                      key={psr.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-orange-400 transition flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                            {psr.psr_code}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {psr.status || 'ACTIVE'}
                          </span>
                        </div>

                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{psr.name}</h5>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{psr.phone}</span>
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1 text-xs">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Designated Sub-Route</p>
                          <p className="font-semibold text-slate-800 truncate" title={psr.sub_route}>
                            {psr.sub_route}
                          </p>
                        </div>

                        {/* Allotted Sales Target Card */}
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-black text-amber-900 flex items-center gap-1">
                              <Target className="w-3 h-3 text-amber-600" />
                              Allotted Sales Target
                            </span>
                            <span className="font-mono font-bold text-xs text-orange-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                              {psr.target_cases > 0 ? `${psr.target_cases} Cases` : 'No Target Set'}
                            </span>
                          </div>

                          {psr.target_sku_ounces ? (
                            <p className="text-[11px] font-medium text-slate-700 truncate" title={psr.target_sku_ounces}>
                              SKU (oz): <strong className="text-orange-950">{psr.target_sku_ounces}</strong>
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No SKU target assigned</p>
                          )}

                          {psr.target_cases > 0 && (
                            <div className="space-y-1 pt-1 border-t border-amber-200/60">
                              <div className="flex items-center justify-between text-[10px] font-medium text-slate-600">
                                <span>Achieved: <strong>{psr.achieved_cases || 0}</strong> Cases</span>
                                <span>{Math.min(100, Math.round(((psr.achieved_cases || 0) / psr.target_cases) * 100))}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-amber-200/70 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.round(((psr.achieved_cases || 0) / psr.target_cases) * 100))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openAllotModal(psr)}
                          className="w-full mt-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Allot Shops & Set Target</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span><strong>{psr.outlet_count ?? 0}</strong> outlets allotted</span>
                        <span>•</span>
                        <span><strong className="text-orange-600">{psr.active_orders_count ?? 0}</strong> active orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field Orders from Outlets (via PSR) */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-oswald text-base font-bold uppercase tracking-wide text-slate-900">
                    Incoming Outlet Orders from PSR Field Visits ({psrOrders.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Orders taken at store counters by PSRs. Consolidate into Supplier stock requests to fulfill.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 self-start sm:self-auto">
                  {psrOrders.filter((o) => o.status === 'SUBMITTED_TO_SO').length} Awaiting SO Review
                </span>
              </div>

              {psrOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No outlet orders collected by PSRs yet. Orders taken in the PSR portal will show up here in real-time.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Order Code</th>
                        <th className="p-3">PSR Agent</th>
                        <th className="p-3">Sub-Route / Outlet</th>
                        <th className="p-3">Beverage Item</th>
                        <th className="p-3 text-right">Cases</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Total (৳)</th>
                        <th className="p-3 text-center">Urgency</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {psrOrders.map((ord) => {
                        const isPending = ord.status === 'SUBMITTED_TO_SO';
                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3 font-mono font-bold text-orange-600">{ord.order_code}</td>
                            <td className="p-3 font-semibold text-slate-800">{ord.psr_name || 'PSR'}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{ord.outlet_name}</span>
                              <span className="text-[10px] text-slate-400 truncate block max-w-xs">{ord.sub_route}</span>
                            </td>
                            <td className="p-3 font-medium">{ord.product_name}</td>
                            <td className="p-3 text-right font-black text-slate-900">{ord.quantity}</td>
                            <td className="p-3 text-right text-slate-500">৳{Number(ord.unit_price).toFixed(2)}</td>
                            <td className="p-3 text-right font-black text-slate-900">
                              ৳{Number(ord.total_amount).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {ord.urgency || 'NORMAL'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ord.status === 'DISPATCHED' || ord.status === 'DELIVERED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.status === 'REQUESTED_FROM_SUPPLIER'
                                    ? 'bg-amber-100 text-amber-800'
                                    : ord.status === 'APPROVED_BY_SO'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {ord.status === 'REQUESTED_FROM_SUPPLIER' ? 'STOCK REQUESTED FROM SUPPLIER' : ord.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {ord.status === 'DISPATCHED' || ord.status === 'DELIVERED' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Dispatched by Supplier to Outlet
                                  </span>
                                ) : ord.status === 'REQUESTED_FROM_SUPPLIER' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                    Awaiting Supplier Dispatch
                                  </span>
                                ) : ord.status === 'APPROVED_BY_SO' ? (
                                  <button
                                    type="button"
                                    disabled={loadingActionId === ord.id}
                                    onClick={() => handleTellSupplier(ord)}
                                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 whitespace-nowrap disabled:opacity-50"
                                    title="Tell Supplier stock is needed for outlet"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Tell Supplier (Stock Needed)</span>
                                  </button>
                                ) : isPending ? (
                                  <button
                                    type="button"
                                    disabled={loadingActionId === ord.id}
                                    onClick={() => handleTellSupplier(ord)}
                                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 whitespace-nowrap disabled:opacity-50"
                                    title={`Tell Supplier that ${ord.quantity} cases of ${ord.product_name} is needed in ${ord.outlet_name}`}
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Tell Supplier (Stock Needed)</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 font-medium">
                                    {ord.status}
                                  </span>
                                )}
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

            {/* Field Refund Claims & Damage Returns (via PSR) */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-oswald text-base font-bold uppercase tracking-wide text-slate-900">
                    Outlet Damage & Refund Requests Logged by PSRs ({psrRefunds.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Defective, leaked, or expired stocks inspected in the field. Review and approve credit settlement.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                  {psrRefunds.filter((r) => r.status === 'SUBMITTED_TO_SO').length} Pending Review
                </span>
              </div>

              {psrRefunds.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No return claims reported by PSRs along sub-routes.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Claim Code</th>
                        <th className="p-3">PSR Inspector</th>
                        <th className="p-3">Outlet Store</th>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Units</th>
                        <th className="p-3 text-right">Amount (৳)</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {psrRefunds.map((ref) => {
                        const isPending = ref.status === 'SUBMITTED_TO_SO';
                        return (
                          <tr key={ref.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3 font-mono font-bold text-red-600">{ref.refund_code}</td>
                            <td className="p-3 font-medium text-slate-800">{ref.psr_name || 'PSR'}</td>
                            <td className="p-3 font-bold text-slate-900">{ref.outlet_name}</td>
                            <td className="p-3 font-medium">{ref.product_name}</td>
                            <td className="p-3 text-right font-black text-red-600">{ref.quantity}</td>
                            <td className="p-3 text-right font-black text-slate-900">
                              ৳{Number(ref.refund_amount).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                {ref.reason}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ref.status === 'SETTLED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ref.status === 'APPROVED_BY_SO'
                                    ? 'bg-blue-100 text-blue-800'
                                    : ref.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ref.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePsrRefundStatus(ref.id, 'APPROVED_BY_SO', 'Verified by Sales Officer')}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePsrRefundStatus(ref.id, 'SETTLED', 'Credit settled')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                                  >
                                    Settle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePsrRefundStatus(ref.id, 'REJECTED', 'Claim rejected')}
                                    className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Processed</span>
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
          </div>
        )}

        {/* TAB: WHOLESALE PROFIT & MONTHLY TARGET LEDGER */}
        {activeTab === 'profit-ledger' && (
          <div className="space-y-5">
            {/* 1. Monthly Target & Requisition Deduction Breakdown */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Monthly Stock Purchasing Target & Budget Ledger
                    </h3>
                    <p className="text-xs text-slate-500">
                      Every stock requisition placed to the supplier deducts from your ৳{Number(financialTarget?.monthly_target ?? 2000000).toLocaleString()} monthly quota. Must fulfill by {financialTarget?.end_of_month}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200">
                    Remaining: ৳{Number(financialTarget?.remaining_target ?? 2000000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Progress Summary Strip */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">
                    Monthly Quota Progress ({financialTarget?.month_name}):
                  </span>
                  <span className="font-mono font-bold text-indigo-700">
                    ৳{Number(financialTarget?.amount_spent ?? 0).toLocaleString()} spent of ৳{Number(financialTarget?.monthly_target ?? 2000000).toLocaleString()} target ({financialTarget?.progress_percentage ?? 0}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, financialTarget?.progress_percentage ?? 0))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>Start of Month</span>
                  <span className="text-amber-700 font-bold">
                    {financialTarget?.days_left ?? 0} days remaining until monthly target deadline
                  </span>
                  <span>End of Month Target (৳{Number(financialTarget?.monthly_target ?? 2000000).toLocaleString()})</span>
                </div>
              </div>

              {/* Supplier Purchase Deductions Log */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Supplier Stock Purchases this Month (Target Deductions)</span>
                </h4>

                {requisitions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs">
                    No supplier stock purchases recorded yet this month. Click "Buy Stock from Supplier" to requisition inventory.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Req Code</th>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-center">Cases</th>
                          <th className="py-2.5 px-3 text-right">Unit Wholesale Price</th>
                          <th className="py-2.5 px-3 text-right text-indigo-900 font-black">Amount Deducted</th>
                          <th className="py-2.5 px-3">Order Status</th>
                          <th className="py-2.5 px-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {requisitions.map((r: any) => (
                          <tr key={r.id || r.requisition_code} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-bold text-blue-700">{r.requisition_code}</td>
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{r.product_name}</td>
                            <td className="py-2.5 px-3 text-center">{r.quantity} cases</td>
                            <td className="py-2.5 px-3 text-right">৳{Number(r.unit_price || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-black text-rose-600">
                              -৳{Number(r.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                r.status === 'DISPATCHED' || r.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400 text-[10px]">
                              {r.created_date ? new Date(r.created_date).toLocaleDateString() : 'Recent'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Retail Outlet Profit Ledger */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Wholesale Profit Gained from Outlet Sales
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time profit earned by supplying beverage cases to supermarkets & retail stores in {officer?.assigned_area}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black border border-emerald-300">
                    Total Profit: +৳{Number(financialTarget?.total_profit_gained ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Profit Ledger Table */}
              {distributions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">No Outlet Distributions Logged Yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    When PSRs fulfill outlet orders in your territory, the exact wholesale revenue, purchase cost, and net profit will be recorded here permanently.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Target Retail Outlet</th>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-center">Cases</th>
                        <th className="py-2.5 px-3 text-right">Buy Price</th>
                        <th className="py-2.5 px-3 text-right">Sale Price</th>
                        <th className="py-2.5 px-3 text-right">Total Revenue</th>
                        <th className="py-2.5 px-3 text-right font-black text-emerald-700">Net Profit Gained</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {distributions.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                            {d.distribution_date ? new Date(d.distribution_date).toLocaleString() : 'Recent'}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                            {d.branch_name || d.outlet_name || `Outlet #${d.outlet_id}`}
                            {d.franchise_name && <span className="text-[10px] text-slate-400 block font-normal">{d.franchise_name}</span>}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-indigo-700">
                            {d.brand} {d.flavor_variant}
                            {d.sku && <span className="text-[9px] font-mono text-slate-400 block">{d.sku}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {d.quantity} cases
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            ৳{Number(d.cost_price).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-indigo-700 font-semibold">
                            ৳{Number(d.sale_price).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                            ৳{Number(d.total_revenue).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600 bg-emerald-50/50">
                            +৳{Number(d.profit_earned).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px] truncate max-w-[150px]">
                            {d.notes || 'Direct distribution'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. TAB 2: RETAIL OUTLETS IN TERRITORY */}
        {activeTab === 'outlets' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <Store className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Physical Retail Outlets ({officer?.assigned_area} Zone)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Supermarket and retail stores under your jurisdiction receiving wholesale dispatches.
                    </p>
                  </div>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={outletSearch}
                    onChange={(e) => setOutletSearch(e.target.value)}
                    placeholder="Search outlets by branch or address..."
                    className="w-full pl-8 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {filteredOutlets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Store className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-600 text-sm">No Retail Outlets Found in {officer?.assigned_area}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When Superadmin registers retail stores located in {officer?.assigned_area}, they will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredOutlets.map((o) => (
                    <div
                      key={o.outlet_id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-emerald-400 transition-all flex flex-col justify-between shadow-2xs group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                                {o.franchise_name || 'Retail Branch'}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {o.branch_name || o.outlet_name}
                              </h4>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              o.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>

                        {/* Shelf Stock Gauge */}
                        <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Shelf Inventory:</span>
                          <span className="font-black text-emerald-700 font-mono text-sm">
                            {o.total_shelf_stock || 0} units
                          </span>
                        </div>

                        {/* Assigned Route PSR & Sub-Route */}
                        <div className="mt-2.5 p-2 rounded-xl bg-orange-50/70 border border-orange-200/60 text-xs flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-orange-800 block">Route Pre-Sales Officer</span>
                            <span className="font-semibold text-slate-800 text-[11px]">{o.assigned_psr_name || 'Assigned Route PSR'}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">
                            {o.sub_route || 'Sub-Route'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 pt-3 border-t border-slate-100 mt-2.5">
                          <p className="flex items-start gap-1.5 leading-snug">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{o.location_address}</span>
                          </p>
                          {o.contact_phone && (
                            <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{o.contact_phone}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3.5 w-full py-2 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 text-center">
                        <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                        <span>Orders Managed via Route PSR</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. TAB 3: BRANCH RESTOCK DEMANDS */}
        {activeTab === 'demands' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Incoming Branch Restock Demands
                    </h3>
                    <p className="text-xs text-slate-500">
                      Store requisition orders placed by retail branches in your {officer?.assigned_area} territory.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  {['ALL', 'PENDING', 'DISPATCHED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDemandStatusFilter(st as any)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        demandStatusFilter === st
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'ALL' ? 'All Orders' : st}
                    </button>
                  ))}
                </div>
              </div>

              {filteredDemands.length === 0 ? (
                <div className="p-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-600">No Branch Demands Found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When outlets in {officer?.assigned_area} place restock orders, they will appear here for your fulfillment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDemands.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {req.requisition_code}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(req.created_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{req.franchise_name || req.outlet_name}</span>
                          <span className="text-slate-400 font-normal">—</span>
                          <span className="text-blue-700">{req.product_name}</span>
                          <span className="font-mono text-slate-900 font-black">
                            ({req.quantity} units requested)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === 'PENDING' ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                            Awaiting Supplier Dispatch
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            Dispatched by Supplier to Outlet
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. TAB 4: SUPPLIER LOGISTICS & LINK */}
        {activeTab === 'supplier-link' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-slate-900">
                    Linked Supplier Regional Depot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your assigned wholesale partner providing beverage cases for {officer?.assigned_area}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Enterprise</span>
                  <h4 className="font-bold text-base text-slate-900">{supplier?.business_name || officer?.supplier_name}</h4>
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Depot: {supplier?.depot_address || 'Central Regional Warehouse Hub'}</span>
                  </p>
                  {supplier?.phone_number && (
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{supplier.phone_number}</span>
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 text-xs text-blue-900 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Distribution Mandate</span>
                  <p className="leading-relaxed">
                    As an authorized Sales Officer, you represent {supplier?.business_name} in the <strong>{officer?.assigned_area}</strong> territory zone. 
                    Retail outlets place demand requisitions with you, and wholesale buffer inventory is dispatched directly from this supplier hub to your field accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* REQUEST STOCK FROM SUPPLIER MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wide">
                    Request Stock from Supplier
                  </h3>
                  <p className="text-xs text-blue-100">
                    Order wholesale inventory for {officer?.assigned_area} territory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestStockFromSupplier} className="p-6 space-y-4">
              {/* Supplier Info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Assigned Regional Supplier
                </span>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{supplier?.business_name || officer?.supplier_name || 'Regional Logistics Hub'}</span>
                </p>
                {supplier?.depot_address && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Depot: {supplier.depot_address}
                  </p>
                )}
              </div>

              {/* Product */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Beverage Product *
                </label>
                <select
                  value={reqProductId}
                  onChange={(e) => setReqProductId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand} {p.flavor_variant} (Wholesale: ৳{Number(p.supplier_price || p.base_price || 35).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Quantity Cases Needed *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-black text-blue-800 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Requisition Urgency *
                </label>
                <select
                  value={reqUrgency}
                  onChange={(e) => setReqUrgency(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                >
                  <option value="NORMAL">Normal Restock (2-3 Days)</option>
                  <option value="HIGH">High Priority (Next Day)</option>
                  <option value="CRITICAL">Critical Rush (Immediate Surge)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Territory Justification / Demand Notes
                </label>
                <input
                  type="text"
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="e.g. Retail stores in Dhanmondi reporting low shelf stocks"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {reqSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Request to Supplier</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ALLOT SUB-ROUTE SHOPS & TARGET MODAL */}
      {isAllotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wide">
                    Allot Sub-Route Shops & Assign Target
                  </h3>
                  <p className="text-xs text-orange-100">
                    Field Representative: <span className="font-bold underline">{allotPsr?.name}</span> ({allotPsr?.psr_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAllotModalOpen(false)}
                className="p-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAllotSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* 1. Sub-Route Selection */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-orange-600" />
                  <span>1. Select Field Sub-Route *</span>
                </label>
                <select
                  value={allotSubRoute}
                  onChange={(e) => handleSubRouteChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="" disabled>-- Select a Designated Sub-Route --</option>
                  {availableSubRoutes.map((sr) => (
                    <option key={sr} value={sr}>
                      {sr}
                    </option>
                  ))}
                  <option value="__CUSTOM__">➕ Enter Custom Sub-Route...</option>
                </select>

                {allotSubRoute === '__CUSTOM__' && (
                  <input
                    type="text"
                    required
                    value={allotCustomSubRoute}
                    onChange={(e) => setAllotCustomSubRoute(e.target.value)}
                    placeholder="e.g. Gulshan2-Circle North Route"
                    className="mt-2 w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                )}
                <p className="text-[10px] text-slate-500">
                  Selecting a sub-route automatically filters shops and store counters located on that route.
                </p>
              </div>

              {/* 2. Shops Under Selected Sub-Route (Dropdown List & Allotment) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-orange-600" />
                    <span>2. Available Shops Under Sub-Route ({allotSelectedOutletIds.length} Allotted) *</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const targetList = subRouteShops.length > 0 ? subRouteShops : allAreaShops;
                        setAllotSelectedOutletIds(targetList.map((s: any) => s.outlet_id));
                      }}
                      className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllotSelectedOutletIds([])}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Dropdown list to select shops as required */}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      toggleOutletAllotment(Number(e.target.value));
                    }
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="">-- Choose shop from dropdown to add/toggle allotment --</option>
                  {subRouteShops.length > 0 && (
                    <optgroup label={`📍 Shops Under '${allotSubRoute}' (${subRouteShops.length})`}>
                      {subRouteShops.map((shop) => {
                        const isSelected = allotSelectedOutletIds.includes(shop.outlet_id);
                        return (
                          <option key={`sub-${shop.outlet_id}`} value={shop.outlet_id}>
                            {isSelected ? '✓ ' : '+ '} {shop.franchise_name || ''} {shop.branch_name || shop.outlet_name} — {shop.address}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  <optgroup label={`🏢 Other Shops in ${officer?.assigned_area || 'Territory'} (${allAreaShops.length})`}>
                    {allAreaShops
                      .filter((shop) => !subRouteShops.some((s) => s.outlet_id === shop.outlet_id))
                      .map((shop) => {
                        const isSelected = allotSelectedOutletIds.includes(shop.outlet_id);
                        return (
                          <option key={`area-${shop.outlet_id}`} value={shop.outlet_id}>
                            {isSelected ? '✓ ' : '+ '} {shop.franchise_name || ''} {shop.branch_name || shop.outlet_name} — {shop.address}
                          </option>
                        );
                      })}
                  </optgroup>
                </select>

                {/* Interactive Allotted Shops Checklist */}
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 space-y-1.5 divide-y divide-slate-100">
                  {allotLoadingShops ? (
                    <div className="py-4 text-center text-xs text-slate-400">Loading sub-route shops...</div>
                  ) : (subRouteShops.length === 0 && allAreaShops.length === 0) ? (
                    <div className="py-4 text-center text-xs text-slate-400">No shops found in this territory.</div>
                  ) : (
                    <>
                      {/* Sub-route shops shown first */}
                      {subRouteShops.map((shop) => {
                        const isSelected = allotSelectedOutletIds.includes(shop.outlet_id);
                        return (
                          <label
                            key={shop.outlet_id}
                            className={`pt-1.5 first:pt-0 flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                              isSelected ? 'bg-orange-50/90 border border-orange-200' : 'hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOutletAllotment(shop.outlet_id)}
                              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0 text-xs">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 truncate">
                                  {shop.franchise_name ? `${shop.franchise_name} — ` : ''}
                                  {shop.branch_name || shop.outlet_name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-orange-100 text-orange-800 shrink-0">
                                  Sub-Route Shop
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{shop.address}</p>
                            </div>
                          </label>
                        );
                      })}

                      {/* Other area shops */}
                      {allAreaShops
                        .filter((shop) => !subRouteShops.some((s) => s.outlet_id === shop.outlet_id))
                        .map((shop) => {
                          const isSelected = allotSelectedOutletIds.includes(shop.outlet_id);
                          return (
                            <label
                              key={shop.outlet_id}
                              className={`pt-1.5 flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                                isSelected ? 'bg-orange-50/90 border border-orange-200' : 'hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOutletAllotment(shop.outlet_id)}
                                className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0 text-xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-900 truncate">
                                    {shop.franchise_name ? `${shop.franchise_name} — ` : ''}
                                    {shop.branch_name || shop.outlet_name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-slate-100 text-slate-600 shrink-0">
                                    Area Shop
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{shop.address}</p>
                              </div>
                            </label>
                          );
                        })}
                    </>
                  )}
                </div>
              </div>

              {/* 3. Target Allocation (Fixed Cases & Product SKU in Ounces) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-orange-600" />
                  <span>3. PSR Sales Target (Cases + SKU in Ounces) *</span>
                </label>

                {/* Product SKU Selector with Ounces */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Product SKU (with Bottle/Can Size in Ounces) *
                  </label>
                  <select
                    value={allotTargetProductId}
                    onChange={(e) => handleTargetProductChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    <option value="" disabled>-- Select Product SKU in Ounces --</option>
                    {products.map((p) => {
                      const ozText = formatOunces(p.size_volume);
                      return (
                        <option key={p.product_id} value={p.product_id}>
                          {p.brand} {p.flavor_variant} — {p.sku} ({ozText})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* SKU in Ounces Spec */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Assigned Target SKU Description
                  </label>
                  <input
                    type="text"
                    required
                    value={allotTargetSkuOunces}
                    onChange={(e) => setAllotTargetSkuOunces(e.target.value)}
                    placeholder="e.g. PEP-REG-CAN-330 (11.16 oz / 330ml Can)"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                {/* Fixed Cases Allotted */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-500">
                      Fixed Amount of Cases Allotted *
                    </label>
                    <div className="flex items-center gap-1">
                      {[25, 50, 100, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAllotTargetCases(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            allotTargetCases === preset
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {preset} Cases
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    required
                    value={allotTargetCases}
                    onChange={(e) => setAllotTargetCases(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-black text-orange-700 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                {/* Target Notes */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Route Operating Notes / Directive
                  </label>
                  <input
                    type="text"
                    value={allotTargetNotes}
                    onChange={(e) => setAllotTargetNotes(e.target.value)}
                    placeholder="e.g. Conduct shop visits and check cooler inventory before booking"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAllotModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allotSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {allotSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Allotment & Assign Target</span>
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

export default SalesOfficerDashboard;
