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
  Navigation,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getNotificationDestination } from '../../utils/notificationRouter';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from '../Admin/AdminLogin';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
import DeliveryFleetMap, { type VehicleDispatch } from '../../components/Map/DeliveryFleetMap';
import salesOfficerLogo from '../../assets/img/sales-officer-logo.jpg';

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
  so_purchased_stock?: number;
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
  trade_license_number?: string;
  primary_district_id?: number;
  depot_address?: string;
  phone_number?: string;
  allocated_areas?: string;
  division_name?: string;
  district_name?: string;
  user_id?: number;
  user_email?: string;
  wallet_balance?: number;
}

export interface SupplierPurchasedStockItem {
  product_id: number;
  product_name: string;
  purchased_cases: number;
  total_spent: number;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['overview', 'orders-tracking', 'network', 'fleet-tracking', 'profit-ledger', 'distributions', 'outlets', 'demands', 'psr-team', 'supplier-link'];
  const rawTab = searchParams.get('tab');
  const initialTab = (rawTab === 'psr-team' || rawTab === 'supplier-link') ? 'network' : ((rawTab as any) || 'overview');
  const [activeTab, setActiveTab] = useState<'overview' | 'orders-tracking' | 'network' | 'fleet-tracking' | 'profit-ledger' | 'distributions' | 'outlets' | 'demands' | 'psr-team' | 'supplier-link'>(
    validTabs.includes(initialTab) ? initialTab : 'overview'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as any;
    const effTab = (t === 'psr-team' || t === 'supplier-link') ? 'network' : t;
    if (effTab && validTabs.includes(effTab) && effTab !== activeTab) {
      setActiveTab(effTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: any) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const handleNotificationClick = (n: any) => {
    if (!n) return;
    if (n.id) markAsRead(n.id);
    const dest = getNotificationDestination(n, 'SALES_OFFICER');
    if (dest.path === '/sales-officer' && validTabs.includes(dest.tab)) {
      handleTabChange(dest.tab);
    } else {
      navigate(dest.fullUrl);
    }
  };
  
  
  // Dashboard Data State
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierPurchasedStocks, setSupplierPurchasedStocks] = useState<SupplierPurchasedStockItem[]>([]);
  const [supplierTotalCasesPurchased, setSupplierTotalCasesPurchased] = useState<number>(0);
  const [supplierPsrs, setSupplierPsrs] = useState<any[]>([]);

  // Order Tracking Filter State
  const [orderTrackingFilter, setOrderTrackingFilter] = useState<'ALL' | 'SUBMITTED_TO_SO' | 'REQUESTED_FROM_SUPPLIER' | 'DISPATCHED' | 'DELIVERED'>('ALL');
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

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
  const [allotSupplierId, setAllotSupplierId] = useState<number | string>('');
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

  // Quick Re-allot Supplier Modal State
  const [reallotModalPsr, setReallotModalPsr] = useState<any | null>(null);
  const [reallotSupplierId, setReallotSupplierId] = useState<number | string>('');
  const [reallotSubmitting, setReallotSubmitting] = useState(false);
  const [activeSupplierNetworkTab, setActiveSupplierNetworkTab] = useState<'ALL' | number>('ALL');
  const [psrNetworkSearch, setPsrNetworkSearch] = useState<string>('');

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

  // Delivery Fleet & Map Tracking State
  const [fleetDispatches, setFleetDispatches] = useState<VehicleDispatch[]>([]);
  const [selectedFleetDispatch, setSelectedFleetDispatch] = useState<VehicleDispatch | null>(null);
  const [loadingFleet, setLoadingFleet] = useState<boolean>(false);

  const fetchFleetDispatches = async (officerId?: number) => {
    const id = officerId || officer?.id;
    if (!id) return;
    try {
      setLoadingFleet(true);
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches?soId=${id}`);
      if (res.ok) {
        const data = await res.json();
        const list: VehicleDispatch[] = Array.isArray(data) ? data : [];
        setFleetDispatches(list);
        if (list.length > 0) {
          setSelectedFleetDispatch((prev) => {
            if (!prev) return list[0];
            const updated = list.find((d) => d.id === prev.id);
            return updated || list[0];
          });
        }
      }
    } catch (err) {
      console.error('Error fetching fleet dispatches:', err);
    } finally {
      setLoadingFleet(false);
    }
  };

  const fetchDashboardData = async (targetOfficerId?: number, targetSupplierId?: number) => {
    setLoading(true);
    try {
      const officerParam = targetOfficerId ? `officerId=${targetOfficerId}` : (user?.user_id ? `userId=${user.user_id}` : '');
      const supParam = targetSupplierId ? `&supplierId=${targetSupplierId}` : (selectedSupplierId ? `&supplierId=${selectedSupplierId}` : '');
      const [dashRes, allOffRes, allSuppliersRes] = await Promise.all([
        fetch(`http://localhost:8080/api/v1/sales-officer/dashboard?${officerParam}${supParam}`),
        fetch('http://localhost:8080/api/v1/sales-officers'),
        fetch('http://localhost:8080/api/v1/suppliers'),
      ]);

      let activeSupId = targetSupplierId || selectedSupplierId;

      if (dashRes.ok) {
        const data = await dashRes.json();
        setOfficer(data.sales_officer || null);
        const resolvedSupplier = data.selected_supplier || data.supplier || null;
        setSupplier(resolvedSupplier);
        if (resolvedSupplier?.id) {
          activeSupId = resolvedSupplier.id;
          setSelectedSupplierId(resolvedSupplier.id);
        }
        if (data.suppliers && Array.isArray(data.suppliers)) {
          setSuppliers(data.suppliers);
        }
        setSupplierPurchasedStocks(data.supplier_purchased_stocks || []);
        setSupplierTotalCasesPurchased(data.supplier_total_cases_purchased || 0);
        setSupplierPsrs(data.supplier_psrs || []);

        setOutlets(data.outlets || []);
        setProducts(data.products || []);
        setRequisitions(data.requisitions || []);
        setFinancialTarget(data.financial_target || null);
        setDistributions(data.distributions || []);

        if (data.sales_officer?.id) {
          fetchPsrData(data.sales_officer.id, activeSupId);
          fetchFleetDispatches(data.sales_officer.id);
        }
      }

      if (allSuppliersRes.ok) {
        const supList = await allSuppliersRes.json();
        if (Array.isArray(supList) && supList.length > 0) {
          setSuppliers(supList);
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

  const fetchPsrData = async (officerId: number, supId?: number | null) => {
    try {
      const supQuery = supId ? `?supplierId=${supId}` : '';
      const res = await fetch(`http://localhost:8080/api/v1/psr/so-summary/${officerId}${supQuery}`);
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

  const handleSelectSupplier = (supId: number) => {
    setSelectedSupplierId(supId);
    const chosen = suppliers.find((s) => s.id === supId);
    if (chosen) setSupplier(chosen);
    if (officer?.id) {
      fetchDashboardData(officer.id, supId);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.user_id]);

  // Periodic polling for fleet dispatches and truck telemetry
  useEffect(() => {
    if (!officer?.id) return;
    fetchFleetDispatches(officer.id);
    const interval = setInterval(() => {
      fetchFleetDispatches(officer.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [officer?.id]);

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
          payload?.type === 'PSR_STOCK_DISPATCHED' ||
          payload?.type === 'FLEET_STOCKS_BOARDED' ||
          payload?.type === 'FLEET_RIDE_STARTED' ||
          payload?.type === 'FLEET_STOP_DELIVERED' ||
          payload?.type === 'FLEET_DELIVERY_DISPATCHED' ||
          payload?.type === 'SO_FLEET_STOCKS_BOARDED' ||
          payload?.type === 'SO_FLEET_RIDE_STARTED' ||
          payload?.type === 'SO_FLEET_STOP_DELIVERED' ||
          payload?.type === 'SO_FLEET_DISPATCHED' ||
          payload?.type === 'SO_STOCK_DELIVERY_CONFIRMED'
        ) {
          if (
            !payload.recipientUserId ||
            payload.recipientUserId === officer?.user_id ||
            payload.recipientUserId === soUserId ||
            payload.referenceId === officer?.id ||
            payload.sales_officer_id === officer?.id
          ) {
            if (officer?.id) {
              fetchDashboardData(officer.id);
              fetchPsrData(officer.id);
              fetchFleetDispatches(officer.id);
            }
            if (payload?.type === 'NEW_PSR_ORDER' || payload?.type === 'NEW_PSR_REFUND') {
              setActionSuccessMsg(
                payload.message || `PSR has submitted a new stock permission request.`
              );
            }
            if (payload?.type === 'SUPPLIER_DISPATCHED_TO_OUTLET') {
              setActionSuccessMsg(
                payload.message || `Supplier has dispatched stock to ${payload.outlet_name || 'outlet'}! Territory restock updated towards monthly target.`
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
      // Find the PSR who collected/received this order
      const psrObj = psrs.find((p: any) => p.id === ord.psr_id || p.name === ord.psr_name || p.psr_code === ord.psr_code);
      const targetSupplierId = psrObj?.supplier_id || ord.supplier_id || selectedSupplierId || supplier?.id || officer?.supplier_id;

      const res = await fetch(`http://localhost:8080/api/v1/psr/orders/${ord.id}/so-request-supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_officer_id: officer?.id,
          supplier_id: targetSupplierId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to notify supplier');

      const targetSupplierName = data.supplier_name || psrObj?.supplier_name || 'Regional Supplier';

      // Real-time broadcast to Supplier
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'SO_STOCK_REQUEST_FOR_OUTLET',
          recipientRole: 'SUPPLIER',
          recipientUserId: data.supplier_user_id || 4,
          supplier_id: data.supplier_id || targetSupplierId,
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
          message: `Sales Officer ${officer?.name || 'Sales Officer'} notified you: ${ord.quantity} cases of ${ord.product_name} is needed in ${ord.outlet_name}. Please dispatch to outlet from SO purchased stock.`,
        });
        setTimeout(() => bc.close(), 100);
      } catch (ignored) {}

      setActionSuccessMsg(
        `Notified Supplier (${targetSupplierName}): ${ord.quantity} cases of ${ord.product_name} needed at ${ord.outlet_name}. Awaiting supplier dispatch from purchased stock.`
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
    setAllotSupplierId(psr.supplier_id || selectedSupplierId || (suppliers[0] ? suppliers[0].id : 1));
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
          supplier_id: allotSupplierId ? Number(allotSupplierId) : null,
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

  const openReallotModal = (psr: any) => {
    setReallotModalPsr(psr);
    setReallotSupplierId(psr.supplier_id || (suppliers[0] ? suppliers[0].id : ''));
  };

  const handleQuickReallotSupplier = async () => {
    if (!reallotModalPsr || !reallotSupplierId) return;
    setReallotSubmitting(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/${reallotModalPsr.id}/allocate-supplier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: Number(reallotSupplierId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to reallot supplier');
      const targetSup = suppliers.find((s) => s.id === Number(reallotSupplierId));
      setActionSuccessMsg(`PSR ${reallotModalPsr.name} successfully reallocated to Supplier: ${targetSup?.business_name || `Supplier #${reallotSupplierId}`}!`);
      setReallotModalPsr(null);
      if (officer?.id) {
        fetchPsrData(officer.id);
        fetchDashboardData(officer.id);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error reallotting supplier');
    } finally {
      setReallotSubmitting(false);
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
          supplier_id: selectedSupplierId || supplier?.id || officer.supplier_id,
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

  // Filtered orders for clean and organized order tracking
  const filteredTrackedOrders = useMemo(() => {
    return psrOrders.filter((ord) => {
      // 1. Supplier filter
      if (orderSupplierFilter === 'CURRENT' && selectedSupplierId) {
        const psrObj = psrs.find((p) => p.id === ord.psr_id || p.name === ord.psr_name || p.psr_code === ord.psr_code);
        const ordSupId = ord.supplier_id ? Number(ord.supplier_id) : (psrObj?.supplier_id ? Number(psrObj.supplier_id) : null);
        if (ordSupId && ordSupId !== Number(selectedSupplierId)) return false;
      }

      // 2. Status filter
      if (orderTrackingFilter !== 'ALL') {
        if (orderTrackingFilter === 'SUBMITTED_TO_SO' && ord.status !== 'SUBMITTED_TO_SO' && ord.status !== 'PENDING') {
          return false;
        }
        if (orderTrackingFilter === 'REQUESTED_FROM_SUPPLIER' && ord.status !== 'REQUESTED_FROM_SUPPLIER' && ord.status !== 'APPROVED_BY_SO') {
          return false;
        }
        if (orderTrackingFilter === 'DISPATCHED' && ord.status !== 'DISPATCHED') {
          return false;
        }
        if (orderTrackingFilter === 'DELIVERED' && ord.status !== 'DELIVERED') {
          return false;
        }
      }

      // 3. Search query
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const code = (ord.order_code || '').toLowerCase();
        const outlet = (ord.outlet_name || '').toLowerCase();
        const psr = (ord.psr_name || '').toLowerCase();
        const product = (ord.product_name || '').toLowerCase();
        const route = (ord.sub_route || '').toLowerCase();
        if (!code.includes(q) && !outlet.includes(q) && !psr.includes(q) && !product.includes(q) && !route.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [psrOrders, orderSupplierFilter, selectedSupplierId, orderTrackingFilter, orderSearchQuery]);

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
        onAction={handleNotificationClick}
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

              <div className="flex items-center gap-2.5">
                <img
                  src={salesOfficerLogo}
                  alt="Sales Officer Logo"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-md shadow-indigo-500/25 border border-indigo-400/40 shrink-0 transform hover:scale-105 transition-transform"
                />
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
                onSelectNotification={handleNotificationClick}
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
              <img
                src={salesOfficerLogo}
                alt="Sales Officer Emblem"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-2xl border-2 border-indigo-400/40 shrink-0 bg-slate-900/60"
              />
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

            {/* Active Supplier Hub Selector & Status */}
            <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-indigo-400/30 space-y-2 shrink-0 max-w-md w-full shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Dealing With Supplier (1 At A Time)
                </span>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Active Partner
                </span>
              </div>

              {suppliers.length > 1 ? (
                <div className="relative">
                  <select
                    value={selectedSupplierId || supplier?.id || ''}
                    onChange={(e) => handleSelectSupplier(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white border border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                    title="Choose from which supplier to ask for stocks"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.business_name} ({s.district_name || 'Depot'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="font-bold text-sm text-white flex items-center gap-1.5 truncate">
                  {supplier?.business_name || officer?.supplier_name || 'Central Regional Supplier'}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-blue-200/80 pt-1 border-t border-white/10">
                <span className="truncate" title={supplier?.depot_address}>
                  📍 {supplier?.depot_address || 'Regional Logistics Hub'}
                </span>
                <span className="shrink-0 font-mono text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-bold ml-2">
                  Purchased: {supplierTotalCasesPurchased} cs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MONTHLY TARGET & RESTOCK COMMAND CENTER */}
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

          {/* Card 2: Territory Outlet Restocks & Quota Achievement */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-950 via-slate-900 to-cyan-950 text-white border border-teal-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  <Truck className="w-3.5 h-3.5 text-teal-400" />
                  Territory Distribution Volume
                </span>
                <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/40">
                  TARGET PROGRESS
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-teal-200 font-semibold uppercase tracking-wider block">
                  Dispatched to Retail Outlets
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-teal-300">
                    {financialTarget?.total_units_sold_to_outlets ?? 0} Cases
                  </span>
                </div>
                <p className="text-xs text-teal-200/80">
                  Stock delivered to franchise branches towards meeting assigned monthly quota
                </p>
              </div>

              {/* Breakdown Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-teal-500/20 text-xs">
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Target Achieved</span>
                  <span className="font-mono font-bold text-teal-300 text-sm">
                    ৳{Number(financialTarget?.amount_spent ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Quota Fulfillment</span>
                  <span className="font-mono font-bold text-slate-200 text-sm">
                    {financialTarget?.progress_percentage ?? 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-teal-200 relative z-10">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-teal-400" />
                <span>Active Outlets: <strong>{outlets.length} Stores</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('distributions')}
                className="text-[10px] text-teal-300 hover:text-white font-bold underline cursor-pointer"
              >
                View Restock Logs →
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
                onClick={() => setActiveTab('fleet-tracking')}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5 animate-pulse" />
                <span>Track Delivery Trucks on Live Map ({fleetDispatches.filter(d => d.status === 'IN_TRANSIT').length} In Transit)</span>
              </button>

              <button
                onClick={() => setActiveTab('network')}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Allocated Suppliers & PSR Network ({suppliers.length} Suppliers • {psrs.length} Active PSRs)</span>
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
              { id: 'orders-tracking', label: `Track Orders (${psrOrders.length})`, icon: Target },
              { id: 'network', label: `Allocated Suppliers & PSR Network (${suppliers.length} Suppliers • ${psrs.length} PSRs)`, icon: Building2 },
              { id: 'fleet-tracking', label: `Live Fleet Map Tracking (${fleetDispatches.length})`, icon: Navigation },
              { id: 'demands', label: `Store Demands (${requisitions.length})`, icon: Clock },
              { id: 'distributions', label: `Outlet Restock Distributions (${distributions.length})`, icon: Truck },
              { id: 'outlets', label: `Retail Stores (${outlets.length})`, icon: Store },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (tab.id === 'network' && (activeTab === 'psr-team' || activeTab === 'supplier-link'));
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
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
        </div>

        {/* 5. TAB 1: OVERVIEW & WHOLESALE STOCK BUFFER */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* SUPPLIER-SPECIFIC PURCHASED INVENTORY SUMMARY */}
            <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 shadow-sm border border-indigo-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-cyan-400/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                      Purchased Stocks Quantity
                    </span>
                    <span className="text-xs font-semibold text-blue-200">
                      Partner: <strong className="text-white">{supplier?.business_name || 'Regional Supplier'}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Purchased Cases Available:</span>
                    <span className="text-2xl font-black font-mono text-cyan-300">{supplierTotalCasesPurchased} Cases</span>
                  </h3>
                  <p className="text-xs text-blue-200/80 max-w-2xl">
                    Live record of wholesale stock quantities purchased by you from <strong>{supplier?.business_name}</strong>. Outlets order from your buffer via their route PSR.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                      setIsRequestModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Request Stock from {supplier?.business_name?.split(' ')[0] || 'Supplier'}</span>
                  </button>
                </div>
              </div>

              {/* Per-product purchased breakdown */}
              {supplierPurchasedStocks.length > 0 ? (
                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {supplierPurchasedStocks.map((item) => (
                    <div key={item.product_id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white block text-[11px] truncate max-w-[120px]">{item.product_name}</span>
                        <span className="text-[10px] text-cyan-300 font-mono">৳{Number(item.total_spent).toLocaleString()} spent</span>
                      </div>
                      <span className="font-mono font-black text-sm text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30">
                        {item.purchased_cases} cs
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-blue-200/70 flex items-center justify-between">
                  <span>No purchased stocks from <strong>{supplier?.business_name}</strong> in this cycle.</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                      setIsRequestModalOpen(true);
                    }}
                    className="text-cyan-300 font-bold hover:underline"
                  >
                    Procure Stock Now →
                  </button>
                </div>
              )}
            </div>

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
                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Purchased Stock</span>
                            <span className={`text-base font-black font-mono ${(p.so_purchased_stock ?? 0) > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                              {p.so_purchased_stock ?? 0}
                            </span>
                            <span className="text-xs text-slate-500 font-medium ml-1">cases</span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier Depot</span>
                            <span className="text-sm font-bold text-slate-600 font-mono">
                              {p.depot_buffer_stock ?? 50}
                            </span>
                            <span className="text-xs text-slate-400 font-medium ml-1">cases</span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Wholesale Rate:</span>
                          <span className="font-bold text-slate-800 font-mono">
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

        {/* TAB: LIVE DELIVERY FLEET & OPENSTREETMAP TELEMETRY */}
        {activeTab === 'fleet-tracking' && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Stat Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Fleet Trips</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-blue-700 font-mono">{fleetDispatches.length}</span>
                  <span className="text-xs text-slate-500 font-medium">consignments</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Supplier logistics fleet</p>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Trucks In Transit</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-amber-600 font-mono">
                    {fleetDispatches.filter((d) => d.status === 'IN_TRANSIT').length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">active routes</span>
                </div>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Live moving on road
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cargo In Transit</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-indigo-700 font-mono">
                    {fleetDispatches
                      .filter((d) => d.status === 'IN_TRANSIT' || d.status === 'BOARDED')
                      .reduce((acc, d) => acc + (d.total_cases || 0), 0)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">cases</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Dispatched for sub-route stores</p>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">OpenStreetMap API</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600 font-mono">100%</span>
                  <span className="text-xs text-slate-500 font-medium">synchronized</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Live waypoint telemetry</p>
              </div>
            </div>

            {/* Live OpenStreetMap Component */}
            {fleetDispatches.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                  <Truck className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="font-oswald text-xl font-bold uppercase tracking-wide text-slate-900">
                  No Active Delivery Dispatches Found
                </h4>
                <p className="text-slate-500 text-xs mt-1.5 max-w-md mx-auto">
                  When your Central Wholesale Supplier ({supplier?.business_name || 'Supplier'}) assigns a vehicle delivery team and dispatches stock to your sub-routes, live GPS tracking and OpenStreetMap progression will display here automatically.
                </p>
                <button
                  type="button"
                  onClick={() => officer?.id && fetchFleetDispatches(officer.id)}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFleet ? 'animate-spin' : ''}`} />
                  <span>Check for Fleet Trips</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <DeliveryFleetMap
                  dispatches={fleetDispatches}
                  selectedDispatchId={selectedFleetDispatch?.id}
                  onSelectDispatch={(disp) => setSelectedFleetDispatch(disp)}
                  height="560px"
                />

                {/* Selected Trip Details & Stop Progression Manifest */}
                {selectedFleetDispatch && (
                  <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base border border-blue-100">
                          🚚
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-base">
                              {selectedFleetDispatch.team_name || 'Delivery Logistics Fleet'}
                            </h4>
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {selectedFleetDispatch.vehicle_registration_no}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Sub-Route: <strong className="text-slate-800">{selectedFleetDispatch.sub_route}</strong> • Driver: <strong className="text-slate-800">{selectedFleetDispatch.driver_name}</strong> ({selectedFleetDispatch.driver_phone || 'N/A'})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => officer?.id && fetchFleetDispatches(officer.id)}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Refresh live fleet dispatches"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingFleet ? 'animate-spin text-blue-600' : ''}`} />
                          <span className="hidden sm:inline">Sync Live</span>
                        </button>
                      </div>
                    </div>

                    {/* Checkpoints & Outlets Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Stop #</th>
                            <th className="py-2.5 px-3">Outlet Name</th>
                            <th className="py-2.5 px-3">Product Cases</th>
                            <th className="py-2.5 px-3">Delivery Status</th>
                            <th className="py-2.5 px-3 text-right">Wholesale Profit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {(selectedFleetDispatch.items || []).map((item, idx) => {
                            const isConfirmed = item.stop_status === 'CONFIRMED_BY_OUTLET';
                            const isDelivered = item.stop_status === 'DELIVERED_BY_DRIVER';
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                                  #{idx + 1}
                                </td>
                                <td className="py-2.5 px-3">
                                  <p className="font-bold text-slate-900">{item.outlet_name}</p>
                                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{item.outlet_address || selectedFleetDispatch.sub_route}</p>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    {item.assigned_cases || item.demanded_cases || 0} cases
                                  </span>
                                  <span className="text-[11px] text-slate-500 block mt-0.5">
                                    {item.brand || ''} {item.flavor_variant || ''}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {isConfirmed ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed by Outlet
                                    </span>
                                  ) : isDelivered ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Truck className="w-3 h-3 text-amber-600" /> Delivered by Driver
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      <Clock className="w-3 h-3 text-blue-600" /> En Route
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                  {isConfirmed && item.wholesale_profit ? `+৳${Number(item.wholesale_profit).toLocaleString()}` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: COMPREHENSIVE ORDERS TRACKING & LIFECYCLE */}
        {activeTab === 'orders-tracking' && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Field Orders</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-mono">{psrOrders.length}</span>
                  <span className="text-xs text-slate-500 font-medium">orders</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Across assigned sub-routes</p>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-orange-600">Awaiting SO Approval</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-orange-600 font-mono">
                    {psrOrders.filter((o) => o.status === 'SUBMITTED_TO_SO' || o.status === 'PENDING').length}
                  </span>
                  <span className="text-xs text-orange-500 font-medium">pending</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Booked by field PSRs</p>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Sent to Supplier</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-amber-600 font-mono">
                    {psrOrders.filter((o) => o.status === 'REQUESTED_FROM_SUPPLIER' || o.status === 'APPROVED_BY_SO').length}
                  </span>
                  <span className="text-xs text-amber-500 font-medium">in queue</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Awaiting supplier fleet dispatch</p>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Dispatched & Delivered</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600 font-mono">
                    {psrOrders.filter((o) => o.status === 'DISPATCHED' || o.status === 'DELIVERED').length}
                  </span>
                  <span className="text-xs text-emerald-500 font-medium">fulfilled</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Delivered to retail shelves</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Field Orders & Outlet Delivery Tracker
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Track the full lifecycle: PSR books order from outlet &rarr; SO reviews & requests supplier &rarr; Supplier dispatches fleet &rarr; Outlet receives stock.
                  </p>
                </div>

                {/* Supplier Binding Filter */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Supplier Scope:</span>
                  <button
                    type="button"
                    onClick={() => setOrderSupplierFilter('CURRENT')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      orderSupplierFilter === 'CURRENT'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dealing Supplier ({supplier?.business_name?.split(' ')[0] || 'Current'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSupplierFilter('ALL')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      orderSupplierFilter === 'ALL'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Suppliers
                  </button>
                </div>
              </div>

              {/* Search & Status Filter Strip */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search by order code, outlet, route, PSR, or product..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {orderSearchQuery && (
                    <button
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'ALL', label: 'All Orders' },
                    { id: 'SUBMITTED_TO_SO', label: 'Awaiting SO' },
                    { id: 'REQUESTED_FROM_SUPPLIER', label: 'Sent to Supplier' },
                    { id: 'DISPATCHED', label: 'Dispatched' },
                    { id: 'DELIVERED', label: 'Delivered' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderTrackingFilter(f.id as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                        orderTrackingFilter === f.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders Lifecycle List */}
            {filteredTrackedOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
                <Target className="w-12 h-12 mx-auto text-slate-300" />
                <h4 className="font-bold text-slate-700 text-base">No Orders Matching Filter</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {orderSearchQuery || orderTrackingFilter !== 'ALL' || orderSupplierFilter === 'CURRENT'
                    ? 'Try clearing the search query or switching the supplier/status filter to view other orders.'
                    : 'When PSR field agents collect demand orders from retail outlets along their route, they will appear here in real-time.'}
                </p>
                {(orderSearchQuery || orderTrackingFilter !== 'ALL' || orderSupplierFilter === 'CURRENT') && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearchQuery('');
                      setOrderTrackingFilter('ALL');
                      setOrderSupplierFilter('ALL');
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTrackedOrders.map((ord) => {
                  const isSubmittedToSo = ord.status === 'SUBMITTED_TO_SO' || ord.status === 'PENDING';
                  const isRequestedFromSupplier = ord.status === 'REQUESTED_FROM_SUPPLIER' || ord.status === 'APPROVED_BY_SO';
                  const isDispatched = ord.status === 'DISPATCHED';
                  const isDelivered = ord.status === 'DELIVERED';

                  const linkedPsr = psrs.find((p) => p.id === ord.psr_id || p.name === ord.psr_name || p.psr_code === ord.psr_code);
                  const linkedSupplierName = ord.supplier_name || linkedPsr?.supplier_name || supplier?.business_name || 'Regional Supplier Hub';

                  // Lifecycle Stage Numbers: 1 (Booked) -> 2 (SO Approved) -> 3 (Requested to Supplier) -> 4 (Dispatched) -> 5 (Delivered)
                  let currentStage = 1;
                  if (isDelivered) currentStage = 5;
                  else if (isDispatched) currentStage = 4;
                  else if (isRequestedFromSupplier) currentStage = 3;
                  else if (isSubmittedToSo) currentStage = 1;

                  return (
                    <div
                      key={ord.id}
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-300 transition-all shadow-xs space-y-4"
                    >
                      {/* Top Bar: Code, Supplier, PSR, Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-indigo-700 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200">
                            {ord.order_code}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {ord.created_at ? new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                            {ord.urgency || 'NORMAL'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              isDelivered
                                ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                : isDispatched
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isRequestedFromSupplier
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-orange-100 text-orange-800 border border-orange-300'
                            }`}
                          >
                            {isDelivered
                              ? 'Delivered & Confirmed'
                              : isDispatched
                              ? 'Dispatched to Outlet'
                              : isRequestedFromSupplier
                              ? 'Stock Requested from Supplier'
                              : 'Awaiting SO Approval'}
                          </span>
                        </div>
                      </div>

                      {/* Main Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Target Outlet & Sub-Route */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-emerald-600" />
                            Target Retail Outlet
                          </span>
                          <h5 className="font-bold text-slate-900 text-sm">{ord.outlet_name}</h5>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate" title={ord.sub_route}>{ord.sub_route}</span>
                          </p>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                            Exclusive Dispatch Destination
                          </span>
                        </div>

                        {/* Route PSR & Linked Supplier */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                            Route Pre-Sales Officer (PSR)
                          </span>
                          <h5 className="font-bold text-slate-900 text-sm">{ord.psr_name || 'Assigned PSR'}</h5>
                          <div className="pt-1 border-t border-slate-200/60 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-indigo-700 block flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              Providing Supplier Hub
                            </span>
                            <p className="text-[11px] font-bold text-slate-800 truncate" title={linkedSupplierName}>
                              {linkedSupplierName}
                            </p>
                          </div>
                        </div>

                        {/* Beverage & Quantity */}
                        <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-indigo-600" />
                              Beverage Order Details
                            </span>
                            <h5 className="font-bold text-slate-900 text-sm mt-0.5">{ord.product_name}</h5>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-slate-600 font-medium">Quantity:</span>
                              <span className="font-mono font-black text-indigo-700 text-base">{ord.quantity} Cases</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Total Invoiced:</span>
                            <span className="font-mono font-black text-slate-900 text-sm">৳{Number(ord.total_amount).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* 5-Stage Lifecycle Progress Bar */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${currentStage >= 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            1. Booked by PSR
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${currentStage >= 2 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            2. Approved by SO
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${currentStage >= 3 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            3. Sent to Supplier
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${currentStage >= 4 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            4. Dispatched Fleet
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${currentStage >= 5 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            5. Delivered
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDelivered
                                ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                                : isDispatched
                                ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
                                : isRequestedFromSupplier
                                ? 'bg-gradient-to-r from-amber-500 to-blue-500'
                                : 'bg-orange-500'
                            }`}
                            style={{
                              width: `${
                                currentStage === 5 ? 100 : currentStage === 4 ? 80 : currentStage === 3 ? 60 : currentStage === 2 ? 40 : 20
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-slate-500">
                          {isDelivered ? (
                            <span className="text-teal-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-teal-600" />
                              Order fulfilled and shelf stock confirmed in {ord.outlet_name}.
                            </span>
                          ) : isDispatched ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <Truck className="w-4 h-4 text-emerald-600" />
                              Supplier dispatched fleet. Delivery team is en route to {ord.outlet_name}.
                            </span>
                          ) : isRequestedFromSupplier ? (
                            <span className="text-amber-800 font-semibold flex items-center gap-1">
                              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                              Awaiting {linkedSupplierName} logistics team to dispatch stock from SO purchased buffer to {ord.outlet_name}.
                            </span>
                          ) : (
                            <span className="text-orange-800 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                              Awaiting your approval to requisition stock from {linkedSupplierName}.
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSubmittedToSo ? (
                            <button
                              type="button"
                              disabled={loadingActionId === ord.id}
                              onClick={() => handleTellSupplier(ord)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                              title={`Tell ${linkedSupplierName} that ${ord.quantity} cases of ${ord.product_name} is needed in ${ord.outlet_name}`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Tell Supplier (Stock Needed)</span>
                            </button>
                          ) : isRequestedFromSupplier ? (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              <span>Supplier Notified (Pending Fleet)</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Consignment Dispatched</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: ALLOCATED SUPPLIERS & DEDICATED PSR NETWORK */}
        {(activeTab === 'network' || activeTab === 'psr-team' || activeTab === 'supplier-link') && (
          <div className="space-y-6 animate-fade-in">
            {/* Operational Hierarchy Info Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                    Field Distribution Hierarchy
                  </span>
                  <span className="text-xs bg-black/25 text-white font-semibold px-2 py-0.5 rounded-full">
                    Territory: {officer?.assigned_area || 'Territory Zone'}
                  </span>
                  <span className="text-[11px] bg-white/20 text-white font-mono px-2 py-0.5 rounded-full">
                    1 SO ↔ Multiple Suppliers ↔ Dedicated PSRs
                  </span>
                </div>
                <h3 className="text-2xl font-black tracking-tight font-oswald uppercase">
                  Allocated Suppliers & Dedicated PSR Network
                </h3>
                <p className="text-xs text-orange-100 max-w-3xl leading-relaxed">
                  As Sales Officer, you manage the wholesale suppliers allocated to your territory. Under each supplier, individual Pre-Sales Representatives (PSRs) collect demand orders from retail outlets. Each PSR has an individual supplier who fulfills their field orders. Re-allot shops, targets, and supplier assignments directly below.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                    setIsRequestModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white text-orange-700 font-bold text-xs hover:bg-orange-50 shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Truck className="w-4 h-4" />
                  <span>Request Wholesale Stock</span>
                </button>
              </div>
            </div>

            {/* Network KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Allocated Suppliers
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">{suppliers.length}</span>
                    <span className="text-xs text-slate-500 font-medium">Depots</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Field PSRs Deployed
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">{psrs.length}</span>
                    <span className="text-xs text-slate-500 font-medium">Agents</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Allotted Retail Outlets
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {psrs.reduce((acc, p) => acc + (p.allotted_outlet_ids ? p.allotted_outlet_ids.length : (p.outlet_count || 0)), 0)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Outlets Covered</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    PSR Field Orders
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {(psrOrders.length > 0 ? psrOrders : requisitions).length}
                    </span>
                    <span className="text-xs text-emerald-700 font-bold font-mono">
                      ৳{(psrOrders.length > 0 ? psrOrders : requisitions).reduce((sum, d) => sum + (Number(d.total_amount || d.total_price) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier Navigation Filter Pills & Search */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Depot Filter:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSupplierNetworkTab('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeSupplierNetworkTab === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>All Allocated Suppliers ({suppliers.length})</span>
                </button>

                {suppliers.map((s) => {
                  const countUnderSupplier = psrs.filter((p) => Number(p.supplier_id) === Number(s.id)).length;
                  const isCurrent = activeSupplierNetworkTab === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSupplierNetworkTab(s.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/50'
                      }`}
                    >
                      <span>{s.business_name.split(' ')[0]}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isCurrent ? 'bg-white/25 text-white' : 'bg-indigo-200/70 text-indigo-800'}`}>
                        {countUnderSupplier} PSR{countUnderSupplier !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={psrNetworkSearch}
                  onChange={(e) => setPsrNetworkSearch(e.target.value)}
                  placeholder="Search PSR name, route, phone..."
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>

            {/* UNALLOCATED PSRs ALERT (If any PSR has no supplier assigned) */}
            {(() => {
              const unallocated = psrs.filter((p) => !p.supplier_id || Number(p.supplier_id) === 0);
              if (unallocated.length === 0) return null;
              return (
                <div className="rounded-2xl bg-amber-50 border border-amber-300/80 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm text-amber-900">
                          {unallocated.length} PSR(s) Awaiting Wholesale Supplier Allotment
                        </h4>
                        <p className="text-xs text-amber-800">
                          These Pre-Sales Representatives belong to your sales officer zone but have not yet been assigned to an individual supplier depot.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unallocated.map((psr) => (
                      <div key={psr.id} className="p-3 rounded-xl bg-white border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            {psr.psr_code}
                          </span>
                          <h5 className="font-bold text-xs text-slate-900 truncate mt-1">{psr.name}</h5>
                          <p className="text-[10px] text-slate-500 font-mono">{psr.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openReallotModal(psr)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 transition shadow-xs cursor-pointer"
                        >
                          Allot Supplier →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* HIERARCHICAL SUPPLIER SECTIONS WITH NESTED PSRs & TRANSACTIONS */}
            {suppliers
              .filter((s) => activeSupplierNetworkTab === 'ALL' || Number(activeSupplierNetworkTab) === Number(s.id))
              .map((s) => {
                const isSelectedForDealing = (selectedSupplierId || supplier?.id) === s.id;
                // PSRs under this specific supplier
                const matchingPsrs = psrs.filter((p) => {
                  const belongsToSupplier = Number(p.supplier_id) === Number(s.id);
                  if (!belongsToSupplier) return false;
                  if (!psrNetworkSearch.trim()) return true;
                  const q = psrNetworkSearch.toLowerCase();
                  return (
                    p.name?.toLowerCase().includes(q) ||
                    p.psr_code?.toLowerCase().includes(q) ||
                    p.sub_route?.toLowerCase().includes(q) ||
                    p.phone?.toLowerCase().includes(q)
                  );
                });

                // Field demand orders for this supplier's PSRs
                const activeOrdersList = psrOrders.length > 0 ? psrOrders : requisitions;
                const supplierOrders = activeOrdersList.filter((d) => {
                  const p = psrs.find((psr) => psr.id === d.psr_id || psr.name === d.psr_name || psr.psr_code === d.psr_code);
                  if (p && p.supplier_id) {
                    return Number(p.supplier_id) === Number(s.id);
                  }
                  if (d.supplier_id) return Number(d.supplier_id) === Number(s.id);
                  return false;
                });

                const totalCasesOrdered = supplierOrders.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
                const totalAmountOrdered = supplierOrders.reduce((sum, d) => sum + (Number(d.total_amount || d.total_price) || 0), 0);

                return (
                  <div
                    key={s.id}
                    className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* SUPPLIER DEPOT HEADER */}
                    <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 shrink-0">
                          <Building2 className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 text-white uppercase tracking-wider">
                              Wholesale Supplier #{s.id}
                            </span>
                            {isSelectedForDealing && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3" /> Active Logistics Partner
                              </span>
                            )}
                            <span className="text-[11px] text-slate-300">
                              Zone: <strong className="text-white">{s.division_name || officer?.assigned_area || 'Regional'}</strong>
                            </span>
                          </div>

                          <h3 className="text-xl font-bold font-oswald tracking-wide text-white">
                            {s.business_name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span>{s.depot_address || 'Regional Logistics Hub'}</span>
                            </span>
                            {s.phone_number && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3.5 h-3.5 text-amber-400" />
                                <span>{s.phone_number}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions & Quick Metrics */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/10 border border-white/15 px-3 py-2 rounded-xl text-center min-w-[90px]">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Allocated PSRs</span>
                          <span className="text-lg font-black font-mono text-amber-400">{matchingPsrs.length}</span>
                        </div>
                        <div className="bg-white/10 border border-white/15 px-3 py-2 rounded-xl text-center min-w-[100px]">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Booked Cases</span>
                          <span className="text-lg font-black font-mono text-white">{totalCasesOrdered} cs</span>
                        </div>
                        <div className="bg-white/10 border border-white/15 px-3 py-2 rounded-xl text-center min-w-[110px]">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Transactions</span>
                          <span className="text-lg font-black font-mono text-emerald-400">৳{totalAmountOrdered.toLocaleString()}</span>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplierId(s.id);
                              if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                              setIsRequestModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Procure Stock</span>
                          </button>

                          {!isSelectedForDealing && (
                            <button
                              type="button"
                              onClick={() => handleSelectSupplier(s.id)}
                              className="px-3.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition text-center cursor-pointer"
                            >
                              Deal with Depot →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SUPPLIER BODY: DEDICATED PSRs + TRANSACTIONS */}
                    <div className="p-6 space-y-6">
                      {/* 1. DEDICATED PSR CARDS UNDER THIS SUPPLIER */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">
                                Designated PSRs Operating Under {s.business_name} ({matchingPsrs.length})
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                This supplier fulfills demand orders exclusively for the retail outlets covered by these designated PSRs.
                              </p>
                            </div>
                          </div>
                        </div>

                        {matchingPsrs.length === 0 ? (
                          <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
                            <p>No Pre-Sales Representatives are currently assigned to this wholesale depot.</p>
                            <p className="text-[11px] text-slate-400">
                              Use the button below or re-allot any field PSR from another supplier depot to this partner.
                            </p>
                            {psrs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => openReallotModal(psrs[0])}
                                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition cursor-pointer"
                              >
                                Re-allot a PSR to this Depot
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matchingPsrs.map((psr) => {
                              const targetCases = psr.target_cases || 50;
                              const currentAchievement = psr.current_month_achievement || psr.achieved_cases || 0;
                              const progressPct = Math.min(100, Math.round((currentAchievement / targetCases) * 100));
                              const outletsCount = psr.allotted_outlet_ids ? psr.allotted_outlet_ids.length : (psr.outlet_count || 0);

                              return (
                                <div
                                  key={psr.id}
                                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                                          {psr.psr_code?.replace('PSR-', '') || psr.id}
                                        </div>
                                        <div>
                                          <h5 className="font-bold text-slate-900 text-sm">{psr.name}</h5>
                                          <span className="font-mono text-[10px] text-slate-500 font-semibold">{psr.psr_code}</span>
                                        </div>
                                      </div>

                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          psr.status === 'ACTIVE'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {psr.status || 'ACTIVE'}
                                      </span>
                                    </div>

                                    {/* Contact & Sub-Route Details */}
                                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1 text-xs">
                                      <div className="flex items-center justify-between text-slate-600">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Field Sub-Route</span>
                                        <span className="font-bold text-slate-800 truncate max-w-[150px]">
                                          {psr.sub_route || 'Unassigned'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-slate-600">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Allotted Shops</span>
                                        <span className="font-bold text-orange-700 font-mono">
                                          {outletsCount} Outlets
                                        </span>
                                      </div>
                                      {psr.phone && (
                                        <div className="flex items-center justify-between text-slate-600">
                                          <span className="text-[10px] uppercase font-bold text-slate-400">Phone</span>
                                          <span className="font-mono font-medium text-slate-700">{psr.phone}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Monthly Sales Target Progress Bar */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-bold text-slate-700 flex items-center gap-1">
                                          <Target className="w-3 h-3 text-orange-600" />
                                          <span>Target Achievement</span>
                                        </span>
                                        <span className="font-mono font-black text-slate-900">
                                          {currentAchievement} / {targetCases} cs ({progressPct}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            progressPct >= 100
                                              ? 'bg-emerald-600'
                                              : progressPct >= 50
                                              ? 'bg-amber-500'
                                              : 'bg-orange-500'
                                          }`}
                                          style={{ width: `${Math.min(100, progressPct)}%` }}
                                        />
                                      </div>
                                      {psr.target_sku_ounces && (
                                        <p className="text-[10px] text-slate-400 truncate">
                                          SKU: {psr.target_sku_ounces}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openAllotModal(psr)}
                                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs text-center transition shadow-xs cursor-pointer active:scale-95"
                                    >
                                      Allot Shops & Target
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openReallotModal(psr)}
                                      className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs transition cursor-pointer active:scale-95"
                                      title="Switch this PSR to another wholesale supplier"
                                    >
                                      Switch Depot
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 2. LIVE FIELD DEMANDS & TRANSACTIONS FOR THIS SUPPLIER */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              <Boxes className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">
                                Field Demands & Orders Fulfilled by {s.business_name} ({supplierOrders.length})
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Retail orders booked by this depot's designated PSRs awaiting wholesale dispatch.
                              </p>
                            </div>
                          </div>
                        </div>

                        {supplierOrders.length === 0 ? (
                          <div className="p-4 text-center rounded-xl bg-slate-50 text-slate-400 text-xs">
                            No field demand orders recorded under this supplier yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="p-3">Order / Date</th>
                                  <th className="p-3">Booking PSR</th>
                                  <th className="p-3">Retail Outlet</th>
                                  <th className="p-3">Beverage Product</th>
                                  <th className="p-3 text-right">Volume</th>
                                  <th className="p-3 text-right">Amount (৳)</th>
                                  <th className="p-3 text-center">Status</th>
                                  <th className="p-3 text-right">SO Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {supplierOrders.slice(0, 10).map((ord) => {
                                  const psr = psrs.find((p) => p.id === ord.psr_id || p.name === ord.psr_name);
                                  const isPending = ord.status === 'SUBMITTED_TO_SO' || ord.status === 'PENDING' || ord.status === 'PENDING_SO_APPROVAL';
                                  return (
                                    <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                                      <td className="p-3">
                                        <div className="font-mono font-bold text-slate-900">{ord.order_code || `ORD-${ord.id}`}</div>
                                        <div className="text-[10px] text-slate-400">{ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Today'}</div>
                                      </td>
                                      <td className="p-3">
                                        <div className="font-bold text-slate-800">{psr?.name || ord.psr_name || 'Field PSR'}</div>
                                        <div className="text-[10px] font-mono text-orange-700 font-semibold">{psr?.psr_code || 'PSR'}</div>
                                      </td>
                                      <td className="p-3">
                                        <div className="font-bold text-slate-900">{ord.outlet_name || 'Retail Outlet'}</div>
                                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{ord.outlet_address || ord.sub_route}</div>
                                      </td>
                                      <td className="p-3">
                                        <div className="font-semibold text-slate-800">{ord.product_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{ord.sku || ord.urgency}</div>
                                      </td>
                                      <td className="p-3 text-right font-black font-mono text-slate-900">
                                        {ord.quantity} cs
                                      </td>
                                      <td className="p-3 text-right font-bold text-indigo-700 font-mono">
                                        ৳{Number(ord.total_amount || ord.total_price || 0).toLocaleString()}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                            ord.status === 'DELIVERED' || ord.status === 'ORDER_CONFIRMED' || ord.status === 'DISPATCHED'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : isPending
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-blue-100 text-blue-800'
                                          }`}
                                        >
                                          {ord.status || 'PENDING'}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        {isPending ? (
                                          <button
                                            type="button"
                                            disabled={loadingActionId === ord.id}
                                            onClick={() => handleTellSupplier(ord)}
                                            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition flex items-center gap-1 active:scale-95 whitespace-nowrap ml-auto disabled:opacity-50"
                                            title="Verify and alert supplier that stock is needed"
                                          >
                                            <Send className="w-3 h-3" />
                                            <span>Tell Supplier</span>
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic font-medium">Forwarded</span>
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
                  </div>
                );
              })}

            {/* FIELD REPLACEMENT & REFUND CLAIMS SUBMITTED BY PSRs */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Field Replacement & Refund Claims Verified by PSRs ({psrRefunds.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      When PSRs encounter damaged bottles or expired cases in retail shops, they submit verified refund claims.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                    Pending Claims: {psrRefunds.filter((r) => r.status === 'SUBMITTED_TO_SO' || r.status === 'SUBMITTED_BY_PSR' || r.status === 'PENDING').length}
                  </span>
                </div>
              </div>

              {psrRefunds.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                  No replacement or refund claims submitted by PSRs for this territory.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Claim ID / Date</th>
                        <th className="p-3">PSR Representative</th>
                        <th className="p-3">Retail Outlet</th>
                        <th className="p-3">Defective Product</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Estimated Amount</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">SO Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {psrRefunds.map((ref) => {
                        const isPending = ref.status === 'SUBMITTED_TO_SO' || ref.status === 'SUBMITTED_BY_PSR' || ref.status === 'PENDING';
                        return (
                          <tr key={ref.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3">
                              <span className="font-mono font-bold text-slate-900">{ref.claim_code || `REF-${ref.id}`}</span>
                              <div className="text-[10px] text-slate-400">{ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'Recent'}</div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800">{ref.psr_name || `PSR #${ref.psr_id}`}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900">{ref.outlet_name || 'Retail Shop'}</span>
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{ref.outlet_address}</div>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-800">{ref.product_name}</span>
                              <div className="text-[10px] text-amber-700 italic">{ref.reason || 'Damaged seal / broken bottle'}</div>
                            </td>
                            <td className="p-3 text-right font-black font-mono text-slate-900">
                              {ref.quantity} {ref.quantity_type || 'bottles'}
                            </td>
                            <td className="p-3 text-right font-bold text-orange-700 font-mono">
                              ৳{Number(ref.refund_amount || ref.estimated_amount || 0).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
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
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePsrRefundStatus(ref.id, 'SETTLED', 'Credit settled')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
                                  >
                                    Settle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePsrRefundStatus(ref.id, 'REJECTED', 'Claim rejected')}
                                    className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition cursor-pointer"
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

        {/* TAB: TERRITORY RESTOCK DISTRIBUTIONS & MONTHLY TARGET LEDGER */}
        {(activeTab === 'distributions' || activeTab === 'profit-ledger') && (
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

            {/* 2. Retail Outlet Distribution Tracking */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Territory Outlet Stock Distributions
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cases dispatched by Regional Supplier to retail stores in {officer?.assigned_area} towards achieving your monthly quota.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-3 py-1 rounded-xl bg-teal-100 text-teal-800 font-bold border border-teal-300">
                    Total Delivered: {financialTarget?.total_units_sold_to_outlets ?? 0} Cases
                  </span>
                </div>
              </div>

              {/* Distributions Table */}
              {distributions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">No Outlet Distributions Logged Yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    When Regional Supplier fulfills outlet orders in your territory from your purchased buffer stock, the restock delivery records towards your monthly target will appear here.
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
                        <th className="py-2.5 px-3 text-right">Cost Rate</th>
                        <th className="py-2.5 px-3 text-right">Outlet Rate</th>
                        <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
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
                          <td className="py-2.5 px-3 font-sans text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Dispatched
                            </span>
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
              {/* Target Regional Supplier Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Target Regional Supplier *
                </label>
                <select
                  value={selectedSupplierId || supplier?.id || ''}
                  onChange={(e) => handleSelectSupplier(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_name} ({s.depot_address || 'Regional Depot'})
                    </option>
                  ))}
                </select>
              </div>

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
              {/* 0. Wholesale Supplier Allocation */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>Wholesale Supplier (Designated Logistics Partner) *</span>
                </label>
                <select
                  value={allotSupplierId}
                  onChange={(e) => setAllotSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="">-- No Wholesale Supplier Assigned --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_name} (Depot #{s.id} - {s.depot_address || 'Regional Depot'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Each PSR operates under one dedicated wholesale supplier who fulfills their field orders.
                </p>
              </div>

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
      {/* QUICK RE-ALLOT WHOLESALE SUPPLIER MODAL */}
      {reallotModalPsr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wide">
                    Re-allot Wholesale Supplier
                  </h3>
                  <p className="text-xs text-orange-100">
                    Assign a new Wholesale Supplier to {reallotModalPsr.name} ({reallotModalPsr.psr_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReallotModalPsr(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickReallotSupplier} className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Field Representative:</span>
                  <span className="font-bold text-slate-900">{reallotModalPsr.name} ({reallotModalPsr.psr_code})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Current Assigned Supplier:</span>
                  <span className="font-bold text-orange-700 font-mono">
                    {reallotModalPsr.supplier_name || 'None Assigned'}
                  </span>
                </div>
                {reallotModalPsr.sub_route && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Sub-Route:</span>
                    <span className="font-medium text-slate-800">{reallotModalPsr.sub_route}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Select New Wholesale Supplier *
                </label>
                <select
                  value={reallotSupplierId}
                  onChange={(e) => setReallotSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="">-- Remove Supplier Allocation --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_name} (Depot #{s.id} - {s.depot_address || 'Logistics Hub'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  One PSR can only have one individual supplier. All future orders booked by this PSR will route to this supplier depot.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReallotModalPsr(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reallotSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/20 flex items-center gap-2 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {reallotSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Supplier Allocation</span>
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
