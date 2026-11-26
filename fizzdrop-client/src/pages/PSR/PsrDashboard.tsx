import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNotificationDestination } from '../../utils/notificationRouter';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
import psrLogo from '../../assets/img/psr-logo.jpg';
import {
  Store,
  ShoppingCart,
  RotateCcw,
  MapPin,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Send,
  Building2,
  Package,
  Layers,
  Search,
  RefreshCw,
  LogOut,
  Calendar,
  Sparkles,
  ChevronRight,
  ClipboardList,
  Truck,
  Target,
  Boxes,
  ClipboardCheck,
  Eye,
  Gift,
  X,
} from 'lucide-react';

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

interface PsrData {
  psr: any;
  sales_officer: any;
  sub_route: string;
  assigned_area: string;
  outlets: any[];
  products: any[];
  orders: any[];
  refunds: any[];
  visits: any[];
  stats: {
    total_outlets: number;
    total_orders: number;
    active_orders_count: number;
    today_orders_value: number;
    pending_refunds_count: number;
    settled_refunds_count: number;
  };
}

export default function PsrDashboard() {
  const { user, isPsr, loginAsPsr, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['outlets', 'orders', 'refunds', 'visits', 'offers'];
  const initialTab = (searchParams.get('tab') as any) || 'outlets';
  const [activeTab, setActiveTab] = useState<'outlets' | 'orders' | 'refunds' | 'visits' | 'offers'>(
    validTabs.includes(initialTab) ? initialTab : 'outlets'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as any;
    if (t && validTabs.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: any) => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', newTab);
      return p;
    }, { replace: true });
  };

  const handleNotificationClick = (n: any) => {
    if (!n) return;
    if (n.id) markAsRead(n.id);
    const dest = getNotificationDestination(n, 'PSR');
    if (dest.path === '/psr' && validTabs.includes(dest.tab)) {
      handleTabChange(dest.tab);
    } else {
      navigate(dest.fullUrl);
    }
  };
  const [data, setData] = useState<PsrData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allPsrs, setAllPsrs] = useState<any[]>([]);

  // Modal states
  const [orderModalOutlet, setOrderModalOutlet] = useState<any | null>(null);
  const [refundModalOutlet, setRefundModalOutlet] = useState<any | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [urgency, setUrgency] = useState<string>('NORMAL');
  const [remarks, setRemarks] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('DAMAGED_LEAKAGE');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Small animated alert state for Request to SO action
  const [requestAlert, setRequestAlert] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    orderCode?: string;
  } | null>(null);

  useEffect(() => {
    if (requestAlert) {
      const timer = setTimeout(() => {
        setRequestAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [requestAlert]);

  // Shop Visit & Inventory Audit Modal State
  const [visitModalOutlet, setVisitModalOutlet] = useState<any | null>(null);
  const [visitType, setVisitType] = useState<string>('STOCK_AUDIT');
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [visitSubmitting, setVisitSubmitting] = useState<boolean>(false);

  // Trade Scheme Offers State
  const [tradeOffers, setTradeOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState<boolean>(false);
  const [modalTradeOffers, setModalTradeOffers] = useState<any[]>([]);
  const [pitchingOfferId, setPitchingOfferId] = useState<number | null>(null);
  const [pitchSuccess, setPitchSuccess] = useState<string | null>(null);

  const paramPsrId = searchParams.get('psrId') ? Number(searchParams.get('psrId')) : null;
  const authPsrId = user?.pre_sales_officer?.id;
  const activePsrId = paramPsrId || authPsrId || data?.psr?.id || (allPsrs.length > 0 ? allPsrs[0].id : 1);
  const activeUserId = data?.psr?.user_id || ((user as any)?.role === 'PSR' ? (user as any)?.user_id : undefined) || (activePsrId ? 200 + activePsrId : 201);

  // Notifications
  const {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
  } = useNotifications('PSR', activeUserId);

  const fetchPsrOffers = useCallback(async (psrId: number) => {
    setLoadingOffers(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/trade-offers/psr/${psrId}`);
      if (res.ok) {
        const json = await res.json();
        setTradeOffers(json.offers || []);
      }
    } catch (err) {
      console.error('Error fetching PSR trade offers:', err);
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  const loadDashboard = useCallback(async (overrideId?: number) => {
    const idToFetch = overrideId || activePsrId;
    if (!idToFetch) return;
    setLoading(true);
    try {
      const url = `http://localhost:8080/api/v1/psr/dashboard?psrId=${idToFetch}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      fetchPsrOffers(idToFetch);
    } catch (e) {
      console.error('Error fetching PSR dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchPsrOffers]);

  // Check matching trade schemes when taking order for an outlet
  useEffect(() => {
    if (!orderModalOutlet) {
      setModalTradeOffers([]);
      setPitchSuccess(null);
      return;
    }
    const checkOffer = async () => {
      try {
        const outletId = orderModalOutlet.outlet_id;
        let url = `http://localhost:8080/api/v1/trade-offers/check?outletId=${outletId}`;
        if (selectedProductId) {
          url += `&productId=${selectedProductId}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setModalTradeOffers(json.schemes || []);
        }
      } catch (err) {
        console.error('Error checking trade offers for outlet:', err);
      }
    };
    checkOffer();
  }, [orderModalOutlet, selectedProductId]);

  const handlePitchOffer = async (offerId: number) => {
    if (!orderModalOutlet) return;
    setPitchingOfferId(offerId);
    setPitchSuccess(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/trade-offers/${offerId}/disclose-to-outlet/${orderModalOutlet.outlet_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psr_id: data?.psr?.id || activePsrId,
          psr_name: data?.psr?.name || 'Pre-Sales Officer (PSR)',
        }),
      });
      if (res.ok) {
        setPitchSuccess('Offer disclosed to outlet! They have received an instant notification and can now view this offer.');
        setModalTradeOffers((prev) =>
          prev.map((o) => (o.id === offerId ? { ...o, is_disclosed: true } : o))
        );
      }
    } catch (err) {
      console.error('Error pitching offer:', err);
    } finally {
      setPitchingOfferId(null);
    }
  };

  // Fetch all PSRs and load active dashboard
  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/psr/all');
        const resData = await res.json();
        const psrList = Array.isArray(resData) ? resData : [];
        if (!isCancelled) setAllPsrs(psrList);

        const targetId = paramPsrId || authPsrId || (psrList.length > 0 ? psrList[0].id : 1);
        if (!isCancelled) {
          loadDashboard(targetId);
        }
      } catch (err) {
        console.error('Error loading PSR data:', err);
        if (!isCancelled) {
          loadDashboard(paramPsrId || authPsrId || 1);
        }
      }
    };

    init();

    return () => {
      isCancelled = true;
    };
  }, [paramPsrId, authPsrId, loadDashboard]);

  const handleSwitchPsr = async (selectedId: number) => {
    const selected = allPsrs.find((p) => p.id === selectedId);
    if (!selected) return;

    setOrderModalOutlet(null);
    setRefundModalOutlet(null);
    setVisitModalOutlet(null);
    setSelectedProductId('');
    setQuantity(1);
    setCustomPrice('');
    setRemarks('');
    setActionSuccess(null);
    setActionError(null);
    setSearchQuery('');

    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('psrId', String(selectedId));
      return p;
    }, { replace: true });

    await loginAsPsr(selectedId, selected.email);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin-login');
  };

  const [submittingToSoId, setSubmittingToSoId] = useState<number | null>(null);

  // Real-time listener for incoming Outlet Orders & Sales Officer Responses via BroadcastChannel
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        if (
          event.data?.type === 'OUTLET_ORDER_TO_PSR' ||
          event.data?.type === 'SO_ORDER_APPROVED' ||
          event.data?.type === 'SO_STOCK_REQUEST_FOR_OUTLET' ||
          event.data?.type === 'SUPPLIER_DISPATCHED_TO_OUTLET' ||
          event.data?.type === 'SO_ORDER_DISPATCHED' ||
          event.data?.type === 'SO_REFUND_APPROVED'
        ) {
          loadDashboard();
        }
      };
    } catch (ignored) {}

    return () => {
      if (channel) channel.close();
    };
  }, [loadDashboard]);

  // Auto-refresh when popup notification arrives for this PSR
  useEffect(() => {
    if (popupNotification && popupNotification.recipient_role === 'PSR') {
      loadDashboard();
    }
  }, [popupNotification, loadDashboard]);

  // PSR submits / requests an order to the Sales Officer
  const handleSubmitOrderToSo = async (order: any) => {
    if (!order || !order.id) return;
    setSubmittingToSoId(order.id);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/orders/${order.id}/submit-to-so`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to submit order to Sales Officer');

      // Realtime broadcast to Sales Officer portal
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'NEW_PSR_ORDER',
          recipientRole: 'SALES_OFFICER',
          recipientUserId: data?.sales_officer?.user_id || (data?.sales_officer?.id ? 100 + data.sales_officer.id : undefined),
          referenceId: data?.sales_officer?.id || order.sales_officer_id,
          title: `Stock Permission Requested by PSR ${data?.psr?.name || 'Field Agent'}`,
          message: `PSR ${data?.psr?.name || 'Field Agent'} requested SO permission & stock approval for ${order.quantity} cases of ${order.product_name} for ${order.outlet_name}.`,
          referenceCode: order.order_code,
          order_code: order.order_code,
          psr_id: order.psr_id,
          outlet_name: order.outlet_name,
          quantity: order.quantity,
          product_name: order.product_name,
        });
        bc.close();
      } catch (ignored) {}

      setRequestAlert({
        type: 'success',
        title: 'Request Sent to Sales Officer',
        message: `Order ${order.order_code} (${order.product_name || 'Stock'} · ${order.quantity} cs) requested to Sales Officer! Your SO has received the real-time notification.`,
        orderCode: order.order_code,
      });
      loadDashboard(activePsrId);
    } catch (err: any) {
      setRequestAlert({
        type: 'error',
        title: 'Request to SO Failed',
        message: err.message || 'Failed to submit order to Sales Officer',
      });
    } finally {
      setSubmittingToSoId(null);
    }
  };

  // Handle Log Shop Visit & Inventory Audit
  const handleLogVisit = async (proceedToOrder: boolean = false) => {
    if (!visitModalOutlet || !data?.psr?.id) return;
    setVisitSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch('http://localhost:8080/api/v1/psr/visit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psr_id: data.psr.id,
          outlet_id: visitModalOutlet.outlet_id,
          visit_type: visitType,
          notes: visitNotes || `Physical store visit & shelf inventory audit conducted at ${visitModalOutlet.outlet_name || visitModalOutlet.branch_name}.`,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || 'Failed to log visit');

      setActionSuccess(`Shop visit recorded for ${visitModalOutlet.franchise_name || ''} ${visitModalOutlet.branch_name || visitModalOutlet.outlet_name}`);
      const targetOutlet = visitModalOutlet;
      setVisitModalOutlet(null);
      loadDashboard();

      if (proceedToOrder) {
        setOrderModalOutlet(targetOutlet);
        if (data.psr?.target_product_id) {
          setSelectedProductId(String(data.psr.target_product_id));
        } else if (data.products && data.products.length > 0) {
          setSelectedProductId(String(data.products[0].product_id));
        }
      }
    } catch (err: any) {
      setActionError(err.message || 'Error recording shop visit');
    } finally {
      setVisitSubmitting(false);
    }
  };

  // Handle Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderModalOutlet || !selectedProductId || quantity <= 0) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const payload: any = {
        psr_id: data?.psr?.id || activePsrId,
        outlet_id: orderModalOutlet.outlet_id,
        product_id: Number(selectedProductId),
        quantity: quantity,
        urgency: urgency,
        outlet_remarks: remarks,
        psr_notes: `Order taken by ${data?.psr?.name} on sub-route ${data?.sub_route}`,
        status: 'SUBMITTED_TO_SO',
      };
      if (customPrice && !isNaN(Number(customPrice))) {
        payload.unit_price = Number(customPrice);
      }

      const res = await fetch('http://localhost:8080/api/v1/psr/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || resJson.message || 'Failed to place order');

      // If there are undisclosed trade offers for this product, disclose & notify the outlet
      if (modalTradeOffers.length > 0) {
        for (const mo of modalTradeOffers) {
          if (!mo.is_disclosed) {
            try {
              await fetch(`http://localhost:8080/api/v1/trade-offers/${mo.id}/disclose-to-outlet/${orderModalOutlet.outlet_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  psr_id: data?.psr?.id || activePsrId,
                  psr_name: data?.psr?.name || 'Pre-Sales Officer (PSR)',
                }),
              });
            } catch (ignored) {}
          }
        }
      }

      setActionSuccess(`Order ${resJson.order_code} recorded and sent to Sales Officer!`);
      // Broadcast event for realtime update across tabs
      try {
        const channel = new BroadcastChannel('fizzdrop_realtime_events');
        channel.postMessage({
          type: 'NEW_PSR_ORDER',
          recipientRole: 'SALES_OFFICER',
          recipientUserId: data?.sales_officer?.user_id || (data?.sales_officer?.id ? 100 + data.sales_officer.id : undefined),
          referenceId: data?.sales_officer?.id,
          title: `Stock Permission Requested by PSR ${data?.psr?.name || 'Field Agent'}`,
          message: `PSR ${data?.psr?.name || 'Field Agent'} booked ${quantity} units for ${orderModalOutlet.franchise_name || orderModalOutlet.outlet_name || 'Outlet'} and requested SO stock permission.`,
          referenceCode: resJson.order_code,
          order_code: resJson.order_code,
          outlet_name: orderModalOutlet.franchise_name || orderModalOutlet.outlet_name || 'Outlet',
          quantity: quantity,
        });
        channel.close();
      } catch (err) {}

      setTimeout(() => {
        setOrderModalOutlet(null);
        setSelectedProductId('');
        setQuantity(1);
        setCustomPrice('');
        setRemarks('');
        setActionSuccess(null);
        loadDashboard();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Error creating order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Refund Request
  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOutlet || !selectedProductId || quantity <= 0) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const payload: any = {
        psr_id: data?.psr?.id || activePsrId,
        outlet_id: refundModalOutlet.outlet_id,
        product_id: Number(selectedProductId),
        quantity: quantity,
        reason: refundReason,
        outlet_remarks: remarks,
        psr_notes: `Inspected in-store by ${data?.psr?.name}. Verified stock condition.`,
      };
      if (customPrice && !isNaN(Number(customPrice))) {
        payload.unit_price = Number(customPrice);
      }

      const res = await fetch('http://localhost:8080/api/v1/psr/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || resJson.message || 'Failed to submit refund');

      setActionSuccess(`Refund request ${resJson.refund_code} submitted to Sales Officer!`);
      // Broadcast event
      try {
        const channel = new BroadcastChannel('fizzdrop_realtime_events');
        channel.postMessage({
          type: 'NEW_PSR_REFUND',
          recipientRole: 'SALES_OFFICER',
          recipientUserId: data?.sales_officer?.user_id || (data?.sales_officer?.id ? 100 + data.sales_officer.id : undefined),
          referenceId: data?.sales_officer?.id,
          title: `Return Permission Requested by PSR ${data?.psr?.name || 'Field Agent'}`,
          message: `Return claim from ${refundModalOutlet.franchise_name || refundModalOutlet.outlet_name || 'Outlet'} for ${quantity} units logged by PSR ${data?.psr?.name || ''}.`,
          referenceCode: resJson.refund_code,
        });
        channel.close();
      } catch (err) {}

      setTimeout(() => {
        setRefundModalOutlet(null);
        setSelectedProductId('');
        setQuantity(1);
        setCustomPrice('');
        setRemarks('');
        setActionSuccess(null);
        loadDashboard();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Error submitting refund request');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch submit draft orders
  const handleBatchSubmit = async () => {
    if (!data?.psr?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/psr/orders/submit-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psr_id: data.psr.id }),
      });
      if (res.ok) {
        try {
          const channel = new BroadcastChannel('fizzdrop_realtime_events');
          channel.postMessage({
            type: 'NEW_PSR_ORDER',
            recipientRole: 'SALES_OFFICER',
            title: `Batch Field Orders from PSR ${data?.psr?.name}`,
            message: `PSR ${data?.psr?.name} submitted batch orders for your review and approval.`,
          });
          channel.close();
        } catch (err) {}

        setRequestAlert({
          type: 'success',
          title: 'Batch Orders Submitted',
          message: 'All pending draft orders have been submitted to your Sales Officer for approval!',
        });
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedProduct = data?.products?.find((p) => String(p.product_id) === String(selectedProductId));
  const effectiveUnitPrice = customPrice ? Number(customPrice) : (selectedProduct?.outlet_price || selectedProduct?.base_price || 0);
  const calculatedTotal = effectiveUnitPrice * quantity;

  // Filter outlets by search
  const filteredOutlets = (data?.outlets || []).filter((o) => {
    const term = searchQuery.toLowerCase();
    return (
      (o.franchise_name || '').toLowerCase().includes(term) ||
      (o.branch_name || '').toLowerCase().includes(term) ||
      (o.address || '').toLowerCase().includes(term) ||
      (o.sub_route || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="psr-theme psr-portal-page min-h-screen bg-[#e8f4ff] text-[#0F172A] flex flex-col font-sans transition-colors">
      <NotificationPopup notification={popupNotification} onDismiss={dismissPopup} onAction={handleNotificationClick} />

      {/* Small Animated Pop-up Alert for Request to SO */}
      {requestAlert && (
        <div className="fixed top-20 right-4 sm:right-8 z-[200] max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div
            className={`p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-xl flex items-start gap-3.5 transition-all ${
              requestAlert.type === 'success'
                ? 'bg-[#DEFDEF] border-[#15221C] text-[#15221C]'
                : 'bg-[#FADECF] border-[#7D2828] text-[#7D2828]'
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                requestAlert.type === 'success' ? 'bg-[#C8F1E8] text-[#15221C]' : 'bg-[#F8C8B8] text-[#7D2828]'
              }`}
            >
              {requestAlert.type === 'success' ? (
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <Send className="w-5 h-5 text-[#15221C] relative z-10" />
                </div>
              ) : (
                <AlertCircle className="w-5 h-5 text-red-700" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-oswald uppercase font-black text-sm tracking-wide text-[#15221C]">
                  {requestAlert.title}
                </p>
                <button
                  type="button"
                  onClick={() => setRequestAlert(null)}
                  className="text-[#4A5852] hover:text-[#15221C] p-0.5 rounded cursor-pointer transition-colors"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-medium text-[#1E2E27] mt-1 leading-relaxed">
                {requestAlert.message}
              </p>
              {requestAlert.orderCode && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#FFE8BD] text-[#15221C] border border-[#15221C] text-[10px] font-mono font-bold">
                    Ref: {requestAlert.orderCode}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Notification delivered to SO
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#f7fbff]/95 backdrop-blur-md border-b border-[#c4dde9] px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={psrLogo}
              alt="PSR Portal Logo"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl object-cover shadow-2xs border border-[#c4dde9] shrink-0 transform hover:scale-105 transition-transform bg-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-[#0F172A] tracking-tight">
                  Pre-Sales Representative (PSR) Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9]">
                  {data?.psr?.psr_code || 'PSR'}
                </span>
              </div>
              <p className="text-xs text-[#475569] flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3 w-3 text-[#0284c7]" />
                <span>{data?.sub_route || 'Assigned Sub-Route'}</span>
                <span className="text-[#c4dde9]">•</span>
                <span>Area: <strong className="text-[#0F172A]">{data?.assigned_area || 'Zone'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Quick Switch PSR Dropdown */}
            {allPsrs.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#f7fbff] px-2.5 py-1.5 rounded-xl border border-[#c4dde9] text-xs shadow-2xs">
                <User className="h-3.5 w-3.5 text-[#475569]" />
                <select
                  className="bg-transparent font-medium text-[#0F172A] focus:outline-none cursor-pointer"
                  value={data?.psr?.id || activePsrId || ''}
                  onChange={(e) => {
                    const selId = Number(e.target.value);
                    handleSwitchPsr(selId);
                  }}
                >
                  {allPsrs.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white text-[#0F172A]">
                      {p.name} ({p.psr_code} - {p.assigned_area})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => { void loadDashboard(activePsrId); }}
              className="p-2 rounded-xl text-[#334155] hover:text-[#0F172A] hover:bg-[#d6ecff] border border-transparent hover:border-[#c4dde9] transition cursor-pointer"
              title="Refresh Route Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

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
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col gap-5">
        {loading && !data ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-9 w-9 text-[#0284c7] animate-spin" />
            <h3 className="font-bold text-base text-[#0F172A]">Loading PSR Field Route & Outlets...</h3>
            <p className="text-xs text-[#64748B]">Connecting to Pre-Sales logistics network</p>
          </div>
        ) : (
          <>
        {/* Assigned Hierarchy Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#d6ecff] via-[#e8f4ff] to-[#f7fbff] p-5 text-[#0F172A] border border-[#c4dde9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={psrLogo}
              alt="PSR Representative"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover shadow-xs border border-[#c4dde9] shrink-0 bg-white"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold bg-[#f7fbff] text-[#0F172A] border border-[#c4dde9] px-2.5 py-0.5 rounded-full">
                  Pre-Sales Field Representative
                </span>
                <span className="text-xs bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0284c7] animate-pulse" /> Live Field Duty
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[#0F172A]">{data?.psr?.name || 'Pre-Sales Officer'}</h2>
              <p className="text-sm text-[#334155] flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-[#475569]" /> {data?.psr?.phone || '+8801819001101'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-[#475569]" /> Reporting to Sales Officer: <strong className="underline underline-offset-2 text-[#0F172A]">{data?.sales_officer?.name || data?.psr?.sales_officer_name || 'Assigned Officer'}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-[#475569]" /> Supplier: <strong className="underline underline-offset-2 text-[#0F172A]">{data?.psr?.supplier_name || 'Dhaka Metropolitan & Central Beverage Logistics Hub'}</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="bg-[#f7fbff] rounded-xl p-3 px-4 border border-[#c4dde9] shadow-2xs flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
            <div>
              <p className="text-[#64748B] uppercase font-semibold text-[10px]">Territory Area</p>
              <p className="font-bold text-sm text-[#0F172A]">{data?.assigned_area || 'Dhaka Region'}</p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#c4dde9]" />
            <div>
              <p className="text-[#64748B] uppercase font-semibold text-[10px]">Designated Sub-Route</p>
              <p className="font-bold text-sm max-w-xs truncate text-[#0F172A]" title={data?.sub_route}>
                {data?.sub_route || 'Daily Outlets Route'}
              </p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#c4dde9]" />
            <div>
              <p className="text-[#64748B] uppercase font-semibold text-[10px] flex items-center gap-1">
                <Truck className="h-3 w-3 text-[#475569]" /> Dedicated Supplier Hub
              </p>
              <p className="font-bold text-sm max-w-[220px] truncate text-[#0F172A]" title={data?.psr?.supplier_name || 'Dhaka Metropolitan & Central Beverage Logistics Hub'}>
                {data?.psr?.supplier_name || 'Dhaka Metropolitan & Central Beverage Logistics Hub'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#f7fbff] border border-[#c4dde9] hover:border-[#b7c4cd] rounded-xl p-4 shadow-2xs hover:shadow-sm transition flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569] font-medium">Assigned Outlets</p>
              <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                {data?.stats?.total_outlets || data?.outlets?.length || 0}
              </h3>
              <p className="text-[11px] text-[#334155] mt-1 font-medium flex items-center gap-1">
                <Store className="h-3 w-3 text-[#0284c7]" /> Along sub-route
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-[#d6ecff] border border-[#c4dde9] text-[#0F172A] flex items-center justify-center shadow-2xs">
              <Store className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-[#f7fbff] border border-[#c4dde9] hover:border-[#b7c4cd] rounded-xl p-4 shadow-2xs hover:shadow-sm transition flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569] font-medium">Field Orders Booked</p>
              <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                {data?.orders?.length || 0}
              </h3>
              <p className="text-[11px] text-[#334155] mt-1 font-medium flex items-center gap-1">
                <ShoppingCart className="h-3 w-3 text-[#0284c7]" /> {data?.stats?.active_orders_count || 0} submitted to SO
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-[#d6ecff] border border-[#c4dde9] text-[#0F172A] flex items-center justify-center shadow-2xs">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-[#f7fbff] border border-[#c4dde9] hover:border-[#b7c4cd] rounded-xl p-4 shadow-2xs hover:shadow-sm transition flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569] font-medium">Total Orders Value</p>
              <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                ৳{Number(data?.stats?.today_orders_value || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-[#64748B] mt-1">
                From route demand
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-[#d6ecff] border border-[#c4dde9] text-[#0F172A] flex items-center justify-center shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-[#f7fbff] border border-[#c4dde9] hover:border-[#b7c4cd] rounded-xl p-4 shadow-2xs hover:shadow-sm transition flex items-center justify-between">
            <div>
              <p className="text-xs text-[#475569] font-medium">Refunds & Claims</p>
              <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                {data?.refunds?.length || 0}
              </h3>
              <p className="text-[11px] text-[#334155] mt-1 font-medium flex items-center gap-1">
                <RotateCcw className="h-3 w-3 text-[#0284c7]" /> {data?.stats?.pending_refunds_count || 0} pending review
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-[#d6ecff] border border-[#c4dde9] text-[#0F172A] flex items-center justify-center shadow-2xs">
              <RotateCcw className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c4dde9] pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => handleTabChange('outlets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'outlets'
                  ? 'bg-[#0F172A] text-white shadow-xs border border-[#0F172A]'
                  : 'bg-[#f7fbff] text-[#334155] hover:bg-[#d6ecff] hover:text-[#0F172A] border border-[#c4dde9]'
              }`}
            >
              <Store className="h-4 w-4" />
              Sub-Route Outlets ({data?.outlets?.length || 0})
            </button>
            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#0F172A] text-white shadow-xs border border-[#0F172A]'
                  : 'bg-[#f7fbff] text-[#334155] hover:bg-[#d6ecff] hover:text-[#0F172A] border border-[#c4dde9]'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Field Orders ({data?.orders?.length || 0})
            </button>
            <button
              onClick={() => handleTabChange('refunds')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'refunds'
                  ? 'bg-[#0F172A] text-white shadow-xs border border-[#0F172A]'
                  : 'bg-[#f7fbff] text-[#334155] hover:bg-[#d6ecff] hover:text-[#0F172A] border border-[#c4dde9]'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              Refund Requests ({data?.refunds?.length || 0})
            </button>
            <button
              onClick={() => handleTabChange('visits')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'visits'
                  ? 'bg-[#0F172A] text-white shadow-xs border border-[#0F172A]'
                  : 'bg-[#f7fbff] text-[#334155] hover:bg-[#d6ecff] hover:text-[#0F172A] border border-[#c4dde9]'
              }`}
            >
              <Clock className="h-4 w-4" />
              Route Visit Logs ({data?.visits?.length || 0})
            </button>
            <button
              onClick={() => handleTabChange('offers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'offers'
                  ? 'bg-[#0F172A] text-white shadow-xs border border-[#0F172A]'
                  : 'bg-[#f7fbff] text-[#334155] hover:bg-[#d6ecff] hover:text-[#0F172A] border border-[#c4dde9]'
              }`}
            >
              <Gift className="h-4 w-4 text-amber-500" />
              Trade Offers ({tradeOffers.length})
            </button>
          </div>

          {activeTab === 'outlets' && (
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <input
                type="text"
                placeholder="Search shops & outlets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#c4dde9] bg-[#f7fbff] text-xs sm:text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#b7c4cd]"
              />
            </div>
          )}

          {activeTab === 'orders' && (
            <button
              onClick={handleBatchSubmit}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs border border-[#b7c4cd] transition self-end cursor-pointer disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit All Drafts to SO</span>
            </button>
          )}
        </div>

        {/* Tab 1: Sub-Route Outlets */}
        {activeTab === 'outlets' && (
          <div className="space-y-4">
            {/* Sales Officer Allotted Target Card */}
            {Boolean(data && data.psr && (data.psr.target_cases || 0) > 0) && data && (
              <div className="bg-gradient-to-r from-[#d6ecff] via-[#e8f4ff] to-[#f7fbff] text-[#0F172A] border border-[#c4dde9] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#f7fbff] border border-[#c4dde9] flex items-center justify-center shrink-0 shadow-2xs">
                      <Target className="w-5 h-5 text-[#0F172A]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-[#f7fbff] text-[#0F172A] border border-[#c4dde9] px-2.5 py-0.5 rounded-full">
                          Sales Officer Assigned Target
                        </span>
                        <span className="text-xs bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9] px-2 py-0.5 rounded-full font-mono font-bold">
                          {data?.sub_route || 'Allotted Sub-Route'}
                        </span>
                      </div>
                      <h4 className="font-black text-base sm:text-lg tracking-tight mt-0.5 text-[#0F172A]">
                        Target: {data.psr.target_cases} Cases Allotted
                      </h4>
                    </div>
                  </div>

                  <div className="bg-[#f7fbff] border border-[#c4dde9] px-3.5 py-1.5 rounded-xl self-start sm:self-auto text-right shadow-2xs">
                    <span className="text-[10px] uppercase block font-semibold text-[#475569]">Progress</span>
                    <span className="font-mono font-black text-sm sm:text-base text-[#0F172A]">
                      {data.psr.achieved_cases || 0} / {data.psr.target_cases} Cases
                    </span>
                  </div>
                </div>

                {data.psr.target_sku_ounces && (
                  <p className="text-xs text-[#334155] flex flex-wrap items-center gap-1.5">
                    <span>Target Beverage SKU:</span>
                    <strong className="text-[#0F172A] font-mono bg-[#f7fbff] border border-[#c4dde9] px-2 py-0.5 rounded">
                      {data.psr.target_sku_ounces}
                    </strong>
                  </p>
                )}

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 rounded-full bg-[#c4dde9] overflow-hidden">
                    <div
                      className="h-full bg-[#0F172A] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round(((data.psr.achieved_cases || 0) / data.psr.target_cases) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#475569] font-medium">
                    <span className="font-bold text-[#0F172A]">{Math.min(100, Math.round(((data.psr.achieved_cases || 0) / data.psr.target_cases) * 100))}% Achieved</span>
                    <span>
                      {Math.max(0, data.psr.target_cases - (data.psr.achieved_cases || 0))} Cases Remaining to Target
                    </span>
                  </div>
                </div>

                {/* Category & Brand Targets Breakdown */}
                {Boolean(data?.psr?.targets && Array.isArray(data.psr.targets) && data.psr.targets.length > 0) && (
                  <div className="pt-3 border-t border-[#c4dde9] space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569] flex items-center justify-between">
                      <span>Category & Brand Targets Breakdown</span>
                      <span className="font-mono text-[#0F172A]">{data.psr.targets.length} Target Lines</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {data.psr.targets.map((tgt: any, idx: number) => {
                        const tCases = Number(tgt.target_cases) || 0;
                        const aCases = Number(tgt.achieved_cases) || 0;
                        const pct = tgt.achievement_percentage !== undefined ? tgt.achievement_percentage : (tCases > 0 ? Math.min(100, Math.round((aCases * 100) / tCases)) : 0);
                        return (
                          <div
                            key={idx}
                            className="bg-[#f7fbff] rounded-xl p-2.5 space-y-1.5 border border-[#c4dde9] shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#0F172A] truncate max-w-[140px]" title={tgt.brand || tgt.category}>
                                {tgt.brand ? `${tgt.brand}` : tgt.category}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9] font-mono font-bold">
                                {aCases}/{tCases} cs
                              </span>
                            </div>
                            <div className="text-[10px] text-[#475569] truncate" title={tgt.category}>
                              {tgt.category} {tgt.target_sku_ounces ? `• ${tgt.target_sku_ounces}` : ''}
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#c4dde9] overflow-hidden">
                              <div
                                className="h-full bg-[#0F172A] rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-[#475569]">
                              <span className="font-bold text-[#0F172A]">{pct}% Achieved</span>
                              <span>{Math.max(0, tCases - aCases)} cs left</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#e8f4ff] border border-[#c4dde9] rounded-xl p-3.5 text-xs text-[#0F172A] flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-[#0284c7] shrink-0" />
                <span>
                  <strong>Field Operating Rule:</strong> Conduct in-person visits to check cooler & shelf inventory at each shop on your sub-route before taking new replenishment orders.
                </span>
              </div>
            </div>

            {filteredOutlets.length === 0 ? (
              <div className="p-12 text-center bg-[#f7fbff] rounded-2xl border border-dashed border-[#c4dde9]">
                <Store className="h-10 w-10 text-[#64748B] mx-auto mb-2" />
                <h4 className="font-semibold text-[#0F172A]">No outlets found</h4>
                <p className="text-xs text-[#64748B] mt-1">Try another search keyword</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOutlets.map((outlet, idx) => {
                  const outletId = outlet.outlet_id ?? outlet.OUTLET_ID;
                  const franchiseName = outlet.franchise_name ?? outlet.FRANCHISE_NAME;
                  const branchName = outlet.branch_name ?? outlet.BRANCH_NAME;
                  const outletName = outlet.outlet_name ?? outlet.OUTLET_NAME;
                  const address = outlet.address ?? outlet.ADDRESS ?? outlet.location_address ?? outlet.LOCATION_ADDRESS;
                  const phoneNumber = outlet.phone_number ?? outlet.PHONE_NUMBER ?? outlet.contact_phone ?? outlet.CONTACT_PHONE;
                  const subRoute = outlet.sub_route ?? outlet.SUB_ROUTE;
                  const shelfStock = outlet.total_shelf_stock ?? outlet.TOTAL_SHELF_STOCK;

                  const outletTitle = franchiseName && branchName
                    ? `${franchiseName} – ${branchName}`
                    : (outletName || franchiseName || branchName || `Outlet #${outletId}`);

                  const normalizedOutlet = {
                    ...outlet,
                    outlet_id: outletId,
                    franchise_name: franchiseName,
                    branch_name: branchName,
                    outlet_name: outletTitle,
                    address,
                    phone_number: phoneNumber,
                    sub_route: subRoute,
                    total_shelf_stock: shelfStock,
                  };
                  return (
                    <div
                      key={outletId || idx}
                      className="bg-[#f7fbff] border border-[#c4dde9] hover:border-[#b7c4cd] rounded-xl p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">
                              Outlet #{outletId}
                            </span>
                            <h3 className="font-bold text-[#0F172A] text-base group-hover:text-[#0284c7] transition">
                              {outletTitle}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9]">
                            Active
                          </span>
                        </div>

                        <p className="text-xs text-[#475569] flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#64748B] shrink-0 mt-0.5" />
                          <span>{address || 'Address on sub-route'}</span>
                        </p>

                        {phoneNumber && (
                          <p className="text-xs text-[#475569] flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-[#64748B]" />
                            <span>{phoneNumber}</span>
                          </p>
                        )}

                        <div className="pt-1 flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#e8f4ff] border border-[#c4dde9] text-[#0F172A] font-medium">
                            Route: {subRoute || data?.sub_route || 'Standard sub-route'}
                          </span>
                          {shelfStock !== undefined && (
                            <span className="text-[11px] font-mono font-bold text-[#475569]">
                              Shelf Stock: <strong className="text-[#0F172A]">{shelfStock}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-[#c4dde9] flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVisitModalOutlet(normalizedOutlet);
                            setVisitType('STOCK_AUDIT');
                            setVisitNotes(`Physical cooler & shelf stock audit at ${outletTitle}`);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#e8f4ff] hover:bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9] hover:border-[#b7c4cd] transition cursor-pointer"
                          title="Visit store and inspect shelf stock"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 text-[#0284c7]" />
                          <span>Visit & Check Inventory</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOrderModalOutlet(normalizedOutlet);
                            if (data?.psr?.target_product_id) {
                              setSelectedProductId(String(data.psr.target_product_id));
                            } else if (data?.products?.[0]?.product_id) {
                              setSelectedProductId(String(data.products[0].product_id));
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-2xs border border-[#b7c4cd] transition cursor-pointer"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Take Order</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRefundModalOutlet(normalizedOutlet);
                            setSelectedProductId(data?.products?.[0]?.product_id ? String(data.products[0].product_id) : '');
                          }}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-[#f7fbff] hover:bg-rose-50 text-rose-700 border border-[#c4dde9] hover:border-rose-300 transition cursor-pointer"
                          title="Log defective / expired return"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Refund</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Field Orders */}
        {activeTab === 'orders' && (
          <div className="bg-[#f7fbff] border border-[#c4dde9] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#c4dde9] bg-[#d6ecff]/30 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#0F172A]">Field Orders Collected from Outlets</h3>
                <p className="text-xs text-[#475569]">
                  Every order booked physically by this PSR is routed to Sales Officer for fulfillment.
                </p>
              </div>
              <span className="text-xs font-bold bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9] px-3 py-1 rounded-full">
                {data?.orders?.length || 0} Total Orders
              </span>
            </div>

            {(!data?.orders || data.orders.length === 0) ? (
              <div className="p-12 text-center text-[#475569]">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-[#b7c4cd]" />
                <p className="font-medium text-[#0F172A]">No field orders taken yet</p>
                <p className="text-xs mt-1 text-[#475569]">Visit your assigned sub-route outlets and click "Take Order".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#e8f4ff] text-[#0F172A] font-bold border-b border-[#c4dde9]">
                    <tr>
                      <th className="p-3">Order Code</th>
                      <th className="p-3">Outlet Store</th>
                      <th className="p-3">Product Item</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total (৳)</th>
                      <th className="p-3 text-center">Urgency</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4dde9]/60">
                    {data.orders.map((ord: any, idx: number) => {
                      const ordId = ord.id ?? ord.ID ?? ord.order_code ?? ord.ORDER_CODE ?? idx;
                      const isSubmitted = ord.status === 'SUBMITTED_TO_SO' || ord.status === 'SUBMITTED_TO_PSR';
                      const isApproved = ord.status === 'APPROVED_BY_SO' || ord.status === 'REQUISITIONED_FROM_SUPPLIER';
                      const isDispatched = ord.status === 'DISPATCHED' || ord.status === 'DELIVERED';
                      return (
                        <tr key={ordId} className="hover:bg-[#d6ecff]/30 transition">
                          <td className="p-3 font-mono font-bold text-[#0F172A]">
                            {ord.order_code}
                          </td>
                          <td className="p-3 font-semibold text-[#0F172A]">
                            {ord.outlet_name}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[#0F172A]">{ord.product_name}</span>
                              {Boolean(ord.is_trade_package || (ord.product_name && ord.product_name.includes('Package'))) && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border border-amber-300 shadow-2xs">
                                  🎁 Unified Scheme Package
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#475569] font-mono flex items-center gap-1 mt-0.5" title={`Fulfillment Supplier: ${ord.supplier_name || data?.psr?.supplier_name || 'Regional Logistics Hub'}`}>
                              <Truck className="w-2.5 h-2.5 text-[#334155]" />
                              <span className="truncate max-w-[150px]">{ord.supplier_name || data?.psr?.supplier_name || 'Regional Logistics Hub'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-[#0F172A]">{ord.quantity}</td>
                          <td className="p-3 text-right text-[#475569] font-medium">৳{Number(ord.unit_price).toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-[#0F172A]">
                            ৳{Number(ord.total_amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.urgency === 'HIGH' || ord.urgency === 'URGENT'
                                  ? 'bg-[#d6ecff] text-[#0F172A] border border-[#b7c4cd]'
                                  : 'bg-[#e8f4ff] text-[#334155] border border-[#c4dde9]'
                              }`}
                            >
                              {ord.urgency || 'NORMAL'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border ${
                                isDispatched
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : ord.status === 'REQUESTED_FROM_SUPPLIER' || ord.status === 'APPROVED_BY_SO'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : ord.status === 'SUBMITTED_TO_SO'
                                  ? 'bg-[#d6ecff] text-[#0F172A] border-[#b7c4cd]'
                                  : ord.status === 'SUBMITTED_TO_PSR'
                                  ? 'bg-[#e8f4ff] text-[#0F172A] border-[#c4dde9]'
                                  : 'bg-[#f7fbff] text-[#334155] border-[#c4dde9]'
                              }`}
                            >
                              {isDispatched && <CheckCircle2 className="h-3 w-3" />}
                              {(ord.status === 'REQUESTED_FROM_SUPPLIER' || ord.status === 'APPROVED_BY_SO') && <Clock className="h-3 w-3 text-amber-700 animate-pulse" />}
                              {ord.status === 'SUBMITTED_TO_SO' && <Clock className="h-3 w-3" />}
                              {ord.status === 'SUBMITTED_TO_PSR' && <Store className="h-3 w-3" />}
                              {isDispatched
                                ? 'Dispatched by Supplier'
                                : ord.status === 'REQUESTED_FROM_SUPPLIER' || ord.status === 'APPROVED_BY_SO'
                                ? 'Awaiting Supplier Dispatch'
                                : ord.status === 'SUBMITTED_TO_SO'
                                ? 'Requested to SO'
                                : ord.status === 'SUBMITTED_TO_PSR'
                                ? 'Outlet Request'
                                : ord.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-[#475569]">
                            {ord.created_at ? new Date(ord.created_at).toLocaleString() : 'Just now'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isDispatched ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Stock Delivered
                                </span>
                              ) : ord.status === 'REQUESTED_FROM_SUPPLIER' || ord.status === 'APPROVED_BY_SO' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                  Awaiting Supplier Dispatch
                                </span>
                              ) : ord.status === 'SUBMITTED_TO_SO' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#d6ecff] text-[#0F172A] text-xs font-bold border border-[#b7c4cd]">
                                  <Clock className="w-3.5 h-3.5 text-[#0F172A]" />
                                  Pending SO Approval
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSubmitOrderToSo(ord)}
                                  disabled={submittingToSoId === ord.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs border border-[#b7c4cd] transition cursor-pointer disabled:opacity-50 whitespace-nowrap active:scale-95"
                                  title="Request stock approval from Sales Officer"
                                >
                                  {submittingToSoId === ord.id ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="w-3 h-3" />
                                      <span>Request to SO</span>
                                    </>
                                  )}
                                </button>
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
        )}

        {/* Tab 3: Refund Requests */}
        {activeTab === 'refunds' && (
          <div className="bg-[#f7fbff] border border-[#c4dde9] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#c4dde9] bg-[#d6ecff]/30 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#0F172A]">Outlet Refund & Damage Return Claims</h3>
                <p className="text-xs text-[#475569]">
                  Defective, broken, or expired stocks inspected in the field and logged for Sales Officer verification.
                </p>
              </div>
              <span className="text-xs font-bold bg-[#d6ecff] text-[#0F172A] border border-[#c4dde9] px-3 py-1 rounded-full">
                {data?.refunds?.length || 0} Claims
              </span>
            </div>

            {(!data?.refunds || data.refunds.length === 0) ? (
              <div className="p-12 text-center text-[#475569]">
                <RotateCcw className="h-10 w-10 mx-auto mb-2 text-[#b7c4cd]" />
                <p className="font-medium text-[#0F172A]">No refund claims recorded</p>
                <p className="text-xs mt-1 text-[#475569]">If an outlet has damaged goods, log a refund from the Outlets tab.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#e8f4ff] text-[#0F172A] font-bold border-b border-[#c4dde9]">
                    <tr>
                      <th className="p-3">Claim Code</th>
                      <th className="p-3">Outlet Store</th>
                      <th className="p-3">Defective Item</th>
                      <th className="p-3 text-right">Units</th>
                      <th className="p-3 text-right">Claim Amount</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">SO Remarks</th>
                      <th className="p-3">Logged At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4dde9]/60">
                    {data.refunds.map((ref: any, idx: number) => {
                      const refId = ref.id ?? ref.ID ?? ref.refund_code ?? ref.REFUND_CODE ?? idx;
                      const isSettled = ref.status === 'SETTLED' || ref.status === 'APPROVED_BY_SO';
                      const isRejected = ref.status === 'REJECTED';
                      return (
                        <tr key={refId} className="hover:bg-[#d6ecff]/30 transition">
                          <td className="p-3 font-mono font-bold text-[#0F172A]">
                            {ref.refund_code}
                          </td>
                          <td className="p-3 font-semibold text-[#0F172A]">
                            {ref.outlet_name}
                          </td>
                          <td className="p-3 font-medium text-[#0F172A]">{ref.product_name}</td>
                          <td className="p-3 text-right font-bold text-rose-700">
                            {ref.quantity}
                          </td>
                          <td className="p-3 text-right font-bold text-[#0F172A]">
                            ৳{Number(ref.refund_amount).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#e8f4ff] text-[#0F172A] border border-[#c4dde9]">
                              {ref.reason}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isSettled
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-[#d6ecff] text-[#0F172A] border-[#b7c4cd]'
                              }`}
                            >
                              {ref.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-[#475569] italic max-w-xs truncate">
                            {ref.so_remarks || 'Awaiting Sales Officer review'}
                          </td>
                          <td className="p-3 text-xs text-[#475569]">
                            {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'Today'}
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

        {/* Tab 4: Route Visit History */}
        {activeTab === 'visits' && (
          <div className="bg-[#f7fbff] border border-[#c4dde9] rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-[#0F172A]">Sub-Route Daily Field Check-in History</h3>
              <p className="text-xs text-[#475569]">
                Audit log of field visits conducted along {data?.sub_route}.
              </p>
            </div>

            {(!data?.visits || data.visits.length === 0) ? (
              <p className="text-xs text-[#475569] italic py-6 text-center">No field visits logged today yet.</p>
            ) : (
              <div className="space-y-3">
                {data.visits.map((v: any, idx: number) => (
                  <div
                    key={v.id ?? v.ID ?? idx}
                    className="p-3 rounded-xl border border-[#c4dde9] bg-[#e8f4ff] hover:bg-[#d6ecff]/40 flex items-start justify-between gap-3 text-xs transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0F172A]">{v.outlet_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#d6ecff] text-[#0F172A] border border-[#b7c4cd]">
                          {v.visit_type}
                        </span>
                      </div>
                      <p className="text-[#334155]">{v.notes}</p>
                    </div>
                    <span className="text-[11px] font-medium text-[#475569] shrink-0">
                      {v.created_at ? new Date(v.created_at).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Territory Trade Offers */}
        {activeTab === 'offers' && (
          <div className="bg-[#f7fbff] border border-[#c4dde9] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c4dde9] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0F172A]">Territory Promotional Schemes & Free Stocks</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0F172A] text-white">
                    Field Pitch Guide
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-1">
                  Active bonus stock trade schemes applicable to outlets along {data?.sub_route}. Inform outlets during your store visits or pitch them directly when taking orders to unlock bonus stock and trigger notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => activePsrId && fetchPsrOffers(activePsrId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#c4dde9] text-xs font-bold text-[#334155] hover:bg-[#e8f4ff] cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOffers ? 'animate-spin' : ''}`} />
                <span>Refresh Schemes</span>
              </button>
            </div>

            {loadingOffers ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-[#0F172A] animate-spin mx-auto mb-2" />
                <p className="text-xs text-[#475569]">Loading territory schemes...</p>
              </div>
            ) : tradeOffers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#c4dde9] rounded-2xl bg-white/50">
                <Gift className="w-10 h-10 text-[#64748B] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#0F172A]">No Active Trade Offers in Route District</h4>
                <p className="text-xs text-[#475569] mt-1 max-w-sm mx-auto">
                  There are currently no active manufacturer trade promotions assigned to your territory.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tradeOffers.map((offer: any) => (
                  <div
                    key={offer.id}
                    className="p-5 rounded-2xl bg-white border border-[#c4dde9] shadow-xs hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#e8f4ff] text-[#0F172A] border border-[#c4dde9]">
                          <MapPin className="w-3 h-3 text-[#334155]" />
                          {offer.district_name} District
                        </span>
                        {offer.free_item_type === 'MERCHANDISE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            🎁 Merchandise Gift
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active Scheme
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#0F172A]">{offer.title}</h4>
                      <p className="text-xs text-[#475569] mt-1 leading-relaxed">{offer.description}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#f7fbff] border border-[#c4dde9] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#475569] font-medium">Buy Requirement:</span>
                        <span className="font-bold text-[#0F172A]">
                          {offer.buy_quantity_cases} Cases of {offer.buy_product_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#c4dde9]">
                        <span className={`font-bold ${offer.free_item_type === 'MERCHANDISE' ? 'text-purple-700' : 'text-emerald-700'}`}>
                          {offer.free_item_type === 'MERCHANDISE' ? '🎁 Free Merchandise Reward:' : 'Free Bonus Stock:'}
                        </span>
                        <span className={`font-black ${offer.free_item_type === 'MERCHANDISE' ? 'text-purple-700' : 'text-emerald-700'}`}>
                          +{offer.free_quantity_cases} {offer.free_item_type === 'MERCHANDISE' ? 'Unit(s)' : 'Case(s)'} of {offer.free_product_name} (৳0.00)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#475569]">
                      <span>Field Instruction:</span>
                      <span className="font-bold text-[#0F172A]">Pitch during shop order entry</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* MODAL: TAKE OUTLET ORDER */}
      {orderModalOutlet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f7fbff] border border-[#c4dde9] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-[#0F172A]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-[#0F172A] tracking-wider px-2 py-0.5 rounded bg-[#d6ecff] border border-[#b7c4cd] inline-block mb-1">
                  Field Order Form
                </span>
                <h3 className="text-xl font-bold text-[#0F172A] mt-0.5">
                  {orderModalOutlet.franchise_name} - {orderModalOutlet.branch_name}
                </h3>
                <p className="text-xs text-[#475569] flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="h-3 w-3 text-[#334155]" /> {orderModalOutlet.address}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#e8f4ff] text-[#0F172A] border border-[#c4dde9]">
                    <Truck className="h-3.5 w-3.5 text-[#334155]" />
                    Fulfillment Supplier: {data?.psr?.supplier_name || 'Regional Logistics Hub'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOrderModalOutlet(null)}
                className="text-[#475569] hover:text-[#0F172A] text-lg font-bold p-1 rounded-lg hover:bg-[#d6ecff]/50 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Select Product Item *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const pr = data?.products?.find((p) => String(p.product_id) === e.target.value);
                    if (pr) setCustomPrice(String(pr.outlet_price || pr.base_price || ''));
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-sm text-[#0F172A] font-medium focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                >
                  <option value="">-- Choose beverage product --</option>
                  {(data?.products || []).map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand} {p.flavor_variant} ({p.size_volume || p.packaging}) - Outlet Price: ৳{p.outlet_price || p.base_price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Promotional Trade Offer Pitch Callout */}
              {modalTradeOffers.length > 0 && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                      <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Territory Trade Scheme Available</span>
                    </div>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                      Extra Bonus Stock
                    </span>
                  </div>

                  {modalTradeOffers.map((mo: any) => (
                    <div
                      key={mo.id}
                      className="p-3 rounded-lg bg-white/95 border border-amber-200 space-y-2 text-xs shadow-xs"
                    >
                      <div className="font-bold text-slate-900 leading-tight">{mo.title}</div>
                      <div className="p-2 rounded bg-amber-50/60 border border-amber-100 flex items-center justify-between gap-2 text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-700">Qualifying Rule: </span>
                          <span className="font-bold text-blue-900">Buy {mo.buy_quantity_cases} Cases</span> of {mo.buy_product_name}
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${mo.free_item_type === 'MERCHANDISE' ? 'text-purple-800' : 'text-emerald-800'}`}>
                            +{mo.free_quantity_cases} {mo.free_item_type === 'MERCHANDISE' ? 'Free Gift Unit(s)' : 'Free Case(s)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                        {mo.is_disclosed ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Pitched to Outlet (Visible on their Offers page)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePitchOffer(mo.id)}
                            disabled={pitchingOfferId === mo.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                            <span>
                              {pitchingOfferId === mo.id
                                ? 'Notifying Outlet...'
                                : 'Tell Outlet About Offer (Pitch & Notify)'}
                            </span>
                          </button>
                        )}

                        {quantity >= mo.buy_quantity_cases && (
                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-md shadow-2xs border ${
                            mo.free_item_type === 'MERCHANDISE'
                              ? 'text-purple-800 bg-purple-50 border-purple-300'
                              : 'text-emerald-800 bg-emerald-50 border-emerald-300'
                          }`}>
                            🎉 Qualifies for {Math.floor(quantity / mo.buy_quantity_cases) * mo.free_quantity_cases} FREE {mo.free_item_type === 'MERCHANDISE' ? 'Merchandise Gift(s)' : 'Bonus Case(s)'}!
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {pitchSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{pitchSuccess}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Order Quantity (Cases) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-sm text-[#0F172A] font-bold focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Unit Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={String(selectedProduct?.outlet_price || selectedProduct?.base_price || 0)}
                    className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-sm text-[#0F172A] font-bold focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Dispatch Priority
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-sm text-[#0F172A] font-medium focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                  >
                    <option value="NORMAL">Normal Delivery</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (Stock Out Risk)</option>
                  </select>
                </div>

                <div className="bg-[#e8f4ff] p-2.5 rounded-xl border border-[#c4dde9] flex flex-col justify-center">
                  <span className="text-[10px] text-[#475569] uppercase font-bold">Estimated Total</span>
                  <span className="text-lg font-black text-[#0F172A]">
                    ৳{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Outlet Remarks / Special Delivery Instructions
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Needs delivery by Thursday morning before rush hour"
                  className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-xs sm:text-sm text-[#0F172A] focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none placeholder:text-[#475569]/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderModalOutlet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#334155] hover:bg-[#e8f4ff] border border-[#c4dde9] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-2xs border border-[#b7c4cd] transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{actionLoading ? 'Booking Order...' : 'Submit to Sales Officer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG REFUND / RETURN */}
      {refundModalOutlet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f7fbff] border border-[#c4dde9] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-[#0F172A]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-[#0F172A] tracking-wider px-2 py-0.5 rounded bg-[#d6ecff] border border-[#b7c4cd] inline-block mb-1">
                  Field Refund & Return Inspection
                </span>
                <h3 className="text-xl font-bold text-[#0F172A] mt-0.5">
                  {refundModalOutlet.franchise_name} - {refundModalOutlet.branch_name}
                </h3>
                <p className="text-xs text-[#475569] flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="h-3 w-3 text-[#334155]" /> {refundModalOutlet.address}
                </p>
              </div>
              <button
                onClick={() => setRefundModalOutlet(null)}
                className="text-[#475569] hover:text-[#0F172A] text-lg font-bold p-1 rounded-lg hover:bg-[#d6ecff]/50 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Product Item to Return *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const pr = data?.products?.find((p) => String(p.product_id) === e.target.value);
                    if (pr) setCustomPrice(String(pr.outlet_price || pr.base_price || ''));
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-sm text-[#0F172A] font-medium focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                >
                  <option value="">-- Choose beverage product --</option>
                  {(data?.products || []).map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand} {p.flavor_variant} ({p.size_volume || p.packaging})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Defective Units *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-sm text-[#0F172A] font-bold focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Refund Reason *
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-sm text-[#0F172A] font-medium focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                  >
                    <option value="DAMAGED_LEAKAGE">Damaged / Seal Leakage</option>
                    <option value="EXPIRED_BATCH">Expired Stock</option>
                    <option value="WRONG_DISPATCH">Wrong Flavor / SKU</option>
                    <option value="CUSTOMER_RETURN">Customer Defect Return</option>
                    <option value="SLOW_ROTATION">Overstocked / Route Recall</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#e8f4ff] p-3 rounded-xl border border-[#c4dde9] flex items-center justify-between">
                <span className="text-xs text-[#0F172A] font-bold">Total Credit Refund:</span>
                <span className="text-base font-black text-rose-700">
                  ৳{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  PSR Inspection Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Inspected 4 bottles with cracked caps upon outlet unboxing"
                  className="w-full p-2.5 rounded-xl border border-[#c4dde9] bg-white text-xs sm:text-sm text-[#0F172A] focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none placeholder:text-[#475569]/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOutlet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#334155] hover:bg-[#e8f4ff] border border-[#c4dde9] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-2xs border border-[#b7c4cd] transition disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{actionLoading ? 'Logging Claim...' : 'Submit Claim to SO'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHOP VISIT & INVENTORY AUDIT MODAL */}
      {visitModalOutlet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f7fbff] rounded-3xl max-w-xl w-full border border-[#c4dde9] shadow-2xl overflow-hidden animate-scale-up my-8 max-h-[90vh] flex flex-col text-[#0F172A]">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#d6ecff] via-[#e8f4ff] to-[#f7fbff] border-b border-[#c4dde9] text-[#0F172A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#c4dde9] flex items-center justify-center shrink-0 text-[#0F172A] shadow-2xs">
                  <ClipboardCheck className="w-5 h-5 text-[#0F172A]" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#0F172A]">
                    Shop Visit & Shelf Stock Audit
                  </h3>
                  <p className="text-xs text-[#475569] font-medium">
                    {visitModalOutlet.franchise_name || ''} {visitModalOutlet.branch_name || visitModalOutlet.outlet_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisitModalOutlet(null)}
                className="p-1.5 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-white/80 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Outlet details bar */}
              <div className="p-3 rounded-2xl bg-[#e8f4ff] border border-[#c4dde9] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[#334155] font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#0F172A] shrink-0" />
                  <span className="truncate max-w-xs">{visitModalOutlet.address || 'Sub-route Location'}</span>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#d6ecff] text-[#0F172A] border border-[#b7c4cd]">
                  Route: {visitModalOutlet.sub_route || data?.sub_route}
                </span>
              </div>

              {/* Shelf Inventory Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#0F172A] flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-[#0F172A]" />
                    <span>Current Store Shelf Inventory</span>
                  </h4>
                  <span className="text-[11px] text-[#475569] font-medium">
                    Audit before taking replenishment order
                  </span>
                </div>

                <div className="rounded-xl border border-[#c4dde9] overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#e8f4ff] text-[10px] uppercase font-bold text-[#0F172A] border-b border-[#c4dde9]">
                      <tr>
                        <th className="p-2.5">Beverage Product</th>
                        <th className="p-2.5">SKU / Size (oz)</th>
                        <th className="p-2.5 text-center">Shelf Stock</th>
                        <th className="p-2.5 text-right">Stock Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c4dde9]/60">
                      {(visitModalOutlet.inventory || data?.products || []).map((prod: any) => {
                        const stock = prod.stock_quantity ?? prod.branch_stock ?? 0;
                        const isTargetSku =
                          (data?.psr?.target_sku_ounces && prod.sku && data.psr.target_sku_ounces.includes(prod.sku)) ||
                          (data?.psr?.targets &&
                            Array.isArray(data.psr.targets) &&
                            data.psr.targets.some(
                              (t: any) =>
                                (t.product_id && String(t.product_id) === String(prod.product_id)) ||
                                (t.brand && prod.brand && t.brand.toLowerCase() === prod.brand.toLowerCase()) ||
                                (t.category && prod.category && t.category.toLowerCase() === prod.category.toLowerCase())
                            ));
                        return (
                          <tr key={prod.product_id} className={`hover:bg-[#d6ecff]/30 transition ${isTargetSku ? 'bg-[#d6ecff]/20' : ''}`}>
                            <td className="p-2.5">
                              <span className="font-bold text-[#0F172A] block">
                                {prod.brand} {prod.flavor_variant}
                              </span>
                              {isTargetSku && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#d6ecff] text-[#0F172A] border border-[#b7c4cd]">
                                  ★ Target Product
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-[#475569] font-medium">
                              {prod.sku} • {formatOunces(prod.size_volume)}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-sm">
                              <span className={stock === 0 ? 'text-rose-600' : stock < 10 ? 'text-amber-700' : 'text-emerald-700'}>
                                {stock}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  stock === 0
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : stock < 10
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {stock === 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'In Stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Log Visit Form */}
              <div className="space-y-3 pt-3 border-t border-[#c4dde9]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0F172A] mb-1">
                      Visit Nature
                    </label>
                    <select
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#c4dde9] bg-white text-[#0F172A] font-bold focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none"
                    >
                      <option value="STOCK_AUDIT">Physical Stock Audit</option>
                      <option value="ROUTINE_CHECK">Routine Store Visit</option>
                      <option value="RESTOCK_RECOMMENDATION">Restock Order Consultation</option>
                      <option value="COOLER_MAINTENANCE">Beverage Display / Cooler Check</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0F172A] mb-1">
                      Visit Observation Notes
                    </label>
                    <input
                      type="text"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      placeholder="e.g. Shelves running low on 330ml cans, recommended 20 cases"
                      className="w-full px-3 py-2 rounded-xl border border-[#c4dde9] bg-white text-[#0F172A] font-medium focus:ring-2 focus:ring-[#b7c4cd] focus:outline-none placeholder:text-[#475569]/60"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#c4dde9] flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleLogVisit(false)}
                  disabled={visitSubmitting}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#c4dde9] bg-white text-[#0F172A] font-bold hover:bg-[#e8f4ff] transition cursor-pointer"
                >
                  {visitSubmitting ? 'Recording...' : 'Record Visit Log Only'}
                </button>

                <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVisitModalOutlet(null)}
                    className="px-4 py-2 rounded-xl bg-[#e8f4ff] hover:bg-[#d6ecff] text-[#334155] border border-[#c4dde9] font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={() => handleLogVisit(true)}
                    disabled={visitSubmitting}
                    className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold shadow-2xs border border-[#b7c4cd] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Proceed to Take Order</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
