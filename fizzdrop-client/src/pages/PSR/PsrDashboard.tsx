import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
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
  Truck
} from 'lucide-react';

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
  const [data, setData] = useState<PsrData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'outlets' | 'orders' | 'refunds' | 'visits'>('outlets');
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

  const psrId = user?.pre_sales_officer?.id || 1;
  const psrUserId = user?.user_id || (user?.pre_sales_officer?.id ? 200 + user.pre_sales_officer.id : 201);

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
  } = useNotifications('PSR', psrUserId);

  // Fetch all PSRs for quick demo switcher
  useEffect(() => {
    fetch('http://localhost:8080/api/v1/psr/all')
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData)) setAllPsrs(resData);
      })
      .catch(() => {});
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const url = psrId
        ? `http://localhost:8080/api/v1/psr/dashboard?psrId=${psrId}`
        : 'http://localhost:8080/api/v1/psr/dashboard';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching PSR dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [psrId]);

  const [dispatchingId, setDispatchingId] = useState<number | null>(null);

  // Real-time listener for incoming Outlet Orders via BroadcastChannel
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        if (event.data?.type === 'OUTLET_ORDER_TO_PSR') {
          loadDashboard();
        }
      };
    } catch (ignored) {}

    return () => {
      if (channel) channel.close();
    };
  }, [loadDashboard]);

  // Dispatch and deliver stock to outlet
  const handleDispatchOrderToOutlet = async (order: any) => {
    if (!order || !order.id) return;
    setDispatchingId(order.id);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/orders/${order.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || resData.message || 'Failed to dispatch stock');

      // Broadcast to other tabs so Outlet immediately refreshes shelf inventory and shows chime
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        bc.postMessage({
          type: 'PSR_STOCK_DISPATCHED',
          order_code: order.order_code,
          outlet_id: order.outlet_id,
          quantity: order.quantity,
          product_name: order.product_name,
        });
        bc.close();
      } catch (ignored) {}

      alert(`Stock successfully dispatched to ${order.outlet_name}! The outlet has received a realtime notification and shelf stock is replenished.`);
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch order');
    } finally {
      setDispatchingId(null);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Handle Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderModalOutlet || !selectedProductId || quantity <= 0) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const payload: any = {
        psr_id: data?.psr?.id || psrId,
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

      setActionSuccess(`Order ${resJson.order_code} recorded and sent to Sales Officer!`);
      // Broadcast event for realtime update across tabs
      try {
        const channel = new BroadcastChannel('fizzdrop_realtime_events');
        channel.postMessage({
          type: 'NEW_PSR_ORDER',
          recipientRole: 'SALES_OFFICER',
          title: `New Field Order from PSR ${data?.psr?.name}`,
          message: `Order for ${orderModalOutlet.franchise_name || 'Outlet'} (${quantity} units) submitted.`,
          referenceCode: resJson.order_code,
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
        psr_id: data?.psr?.id || psrId,
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
          title: `New Field Refund Claim from PSR ${data?.psr?.name}`,
          message: `Return claim from ${refundModalOutlet.franchise_name || 'Outlet'} for ${quantity} units logged.`,
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
        alert('All pending draft orders have been submitted to your Sales Officer!');
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <NotificationPopup notification={popupNotification} onDismiss={dismissPopup} />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  Pre-Sales Representative (PSR) Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {data?.psr?.psr_code || 'PSR'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-red-500" />
                <span>{data?.sub_route || 'Assigned Sub-Route'}</span>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <span>Area: <strong className="text-slate-700 dark:text-zinc-200">{data?.assigned_area || 'Zone'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Quick Switch PSR Dropdown */}
            {allPsrs.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <select
                  className="bg-transparent font-medium text-slate-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
                  value={data?.psr?.id || ''}
                  onChange={(e) => {
                    const selId = Number(e.target.value);
                    loginAsPsr(selId);
                  }}
                >
                  {allPsrs.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {p.name} ({p.psr_code} - {p.assigned_area})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={loadDashboard}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition"
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
              onSelectNotification={() => setActiveTab('orders')}
              isScrolled={true}
            />

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col gap-6">

        {/* Assigned Hierarchy Banner */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                Pre-Sales Field Representative
              </span>
              <span className="text-xs bg-emerald-500/90 text-white font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live Field Duty
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">{data?.psr?.name || 'Pre-Sales Officer'}</h2>
            <p className="text-sm text-orange-100 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {data?.psr?.phone || '+8801819001101'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Reporting to Sales Officer: <strong className="underline underline-offset-2">{data?.sales_officer?.name || data?.psr?.sales_officer_name || 'Assigned Officer'}</strong>
              </span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 px-4 border border-white/20 flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
            <div>
              <p className="text-orange-200 uppercase font-semibold text-[10px]">Territory Area</p>
              <p className="font-bold text-sm">{data?.assigned_area || 'Dhaka Region'}</p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-white/20" />
            <div>
              <p className="text-orange-200 uppercase font-semibold text-[10px]">Designated Sub-Route</p>
              <p className="font-bold text-sm max-w-xs truncate" title={data?.sub_route}>
                {data?.sub_route || 'Daily Outlets Route'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Assigned Outlets</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data?.stats?.total_outlets || data?.outlets?.length || 0}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                <Store className="h-3 w-3" /> Along sub-route
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Field Orders Booked</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data?.orders?.length || 0}
              </h3>
              <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-1 font-medium flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" /> {data?.stats?.active_orders_count || 0} submitted to SO
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Total Orders Value</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ৳{Number(data?.stats?.today_orders_value || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                From route demand
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Refunds & Claims</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {data?.refunds?.length || 0}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> {data?.stats?.pending_refunds_count || 0} pending review
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <RotateCcw className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('outlets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'outlets'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Store className="h-4 w-4" />
              Sub-Route Outlets ({data?.outlets?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'orders'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Field Orders ({data?.orders?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'refunds'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              Refund Requests ({data?.refunds?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('visits')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'visits'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Clock className="h-4 w-4" />
              Route Visit Logs ({data?.visits?.length || 0})
            </button>
          </div>

          {activeTab === 'outlets' && (
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shops & outlets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {activeTab === 'orders' && (
            <button
              onClick={handleBatchSubmit}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition self-end"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit All Drafts to SO</span>
            </button>
          )}
        </div>

        {/* Tab 1: Sub-Route Outlets */}
        {activeTab === 'outlets' && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Field Operating Rule:</strong> As Pre-Sales Representative, visit each retail store on this sub-route to collect new batch product orders and process damaged/expired refund claims. All collected demands are reviewed by your Sales Officer for bulk supplier requisitioning.
                </span>
              </div>
            </div>

            {filteredOutlets.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800">
                <Store className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h4 className="font-semibold text-slate-700 dark:text-zinc-300">No outlets found</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Try another search keyword</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOutlets.map((outlet) => {
                  const outletTitle = `${outlet.franchise_name || 'Retail Outlet'} - ${outlet.branch_name || 'Branch'}`;
                  return (
                    <div
                      key={outlet.outlet_id}
                      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-700 rounded-xl p-4 shadow-sm transition flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                              Outlet #{outlet.outlet_id}
                            </span>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                              {outletTitle}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{outlet.address || 'Address on sub-route'}</span>
                        </p>

                        {outlet.phone_number && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{outlet.phone_number}</span>
                          </p>
                        )}

                        <div className="pt-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium">
                            Route: {outlet.sub_route || data?.sub_route || 'Standard sub-route'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setOrderModalOutlet(outlet);
                            setSelectedProductId(data?.products?.[0]?.product_id ? String(data.products[0].product_id) : '');
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Take Order</span>
                        </button>

                        <button
                          onClick={() => {
                            setRefundModalOutlet(outlet);
                            setSelectedProductId(data?.products?.[0]?.product_id ? String(data.products[0].product_id) : '');
                          }}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 transition"
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
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Field Orders Collected from Outlets</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Every order booked physically by this PSR is routed to Sales Officer for fulfillment.
                </p>
              </div>
              <span className="text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 px-2.5 py-1 rounded-full">
                {data?.orders?.length || 0} Total Orders
              </span>
            </div>

            {(!data?.orders || data.orders.length === 0) ? (
              <div className="p-12 text-center text-slate-500 dark:text-zinc-400">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-zinc-700" />
                <p className="font-medium">No field orders taken yet</p>
                <p className="text-xs mt-1">Visit your assigned sub-route outlets and click "Take Order".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-semibold border-b border-slate-200 dark:border-zinc-800">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {data.orders.map((ord: any) => {
                      const isSubmitted = ord.status === 'SUBMITTED_TO_SO' || ord.status === 'SUBMITTED_TO_PSR';
                      const isApproved = ord.status === 'APPROVED_BY_SO' || ord.status === 'REQUISITIONED_FROM_SUPPLIER';
                      const isDispatched = ord.status === 'DISPATCHED' || ord.status === 'DELIVERED';
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition">
                          <td className="p-3 font-mono font-semibold text-orange-600 dark:text-orange-400">
                            {ord.order_code}
                          </td>
                          <td className="p-3 font-medium text-slate-900 dark:text-white">
                            {ord.outlet_name}
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{ord.product_name}</span>
                          </td>
                          <td className="p-3 text-right font-bold">{ord.quantity}</td>
                          <td className="p-3 text-right text-slate-500">৳{Number(ord.unit_price).toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            ৳{Number(ord.total_amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.urgency === 'HIGH' || ord.urgency === 'URGENT'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              {ord.urgency || 'NORMAL'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                                isDispatched
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isApproved
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : isSubmitted
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              {isDispatched && <CheckCircle2 className="h-3 w-3" />}
                              {isApproved && <Send className="h-3 w-3" />}
                              {isSubmitted && <Clock className="h-3 w-3" />}
                              {ord.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-400">
                            {ord.created_at ? new Date(ord.created_at).toLocaleString() : 'Just now'}
                          </td>
                          <td className="p-3 text-center">
                            {isDispatched ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Stock Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDispatchOrderToOutlet(ord)}
                                disabled={dispatchingId === ord.id}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap active:scale-95"
                              >
                                {dispatchingId === ord.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Send Stock to Outlet</span>
                                  </>
                                )}
                              </button>
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
        )}

        {/* Tab 3: Refund Requests */}
        {activeTab === 'refunds' && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Outlet Refund & Damage Return Claims</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Defective, broken, or expired stocks inspected in the field and logged for Sales Officer verification.
                </p>
              </div>
              <span className="text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2.5 py-1 rounded-full">
                {data?.refunds?.length || 0} Claims
              </span>
            </div>

            {(!data?.refunds || data.refunds.length === 0) ? (
              <div className="p-12 text-center text-slate-500 dark:text-zinc-400">
                <RotateCcw className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-zinc-700" />
                <p className="font-medium">No refund claims recorded</p>
                <p className="text-xs mt-1">If an outlet has damaged goods, log a refund from the Outlets tab.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-semibold border-b border-slate-200 dark:border-zinc-800">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {data.refunds.map((ref: any) => {
                      const isSettled = ref.status === 'SETTLED' || ref.status === 'APPROVED_BY_SO';
                      const isRejected = ref.status === 'REJECTED';
                      return (
                        <tr key={ref.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition">
                          <td className="p-3 font-mono font-semibold text-red-600 dark:text-red-400">
                            {ref.refund_code}
                          </td>
                          <td className="p-3 font-medium text-slate-900 dark:text-white">
                            {ref.outlet_name}
                          </td>
                          <td className="p-3 font-medium">{ref.product_name}</td>
                          <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">
                            {ref.quantity}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            ৳{Number(ref.refund_amount).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                              {ref.reason}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isSettled
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isRejected
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {ref.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-500 italic max-w-xs truncate">
                            {ref.so_remarks || 'Awaiting Sales Officer review'}
                          </td>
                          <td className="p-3 text-xs text-slate-400">
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
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Sub-Route Daily Field Check-in History</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Audit log of field visits conducted along {data?.sub_route}.
            </p>

            {(!data?.visits || data.visits.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No field visits logged today yet.</p>
            ) : (
              <div className="space-y-3">
                {data.visits.map((v: any) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{v.outlet_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                          {v.visit_type}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-zinc-300">{v.notes}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {v.created_at ? new Date(v.created_at).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL: TAKE OUTLET ORDER */}
      {orderModalOutlet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-orange-600 dark:text-orange-400 tracking-wider">
                  Field Order Form
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {orderModalOutlet.franchise_name} - {orderModalOutlet.branch_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {orderModalOutlet.address}
                </p>
              </div>
              <button
                onClick={() => setOrderModalOutlet(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Choose beverage product --</option>
                  {(data?.products || []).map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand} {p.flavor_variant} ({p.size_volume || p.packaging}) - Outlet Price: ৳{p.outlet_price || p.base_price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Order Quantity (Cases) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Unit Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={String(selectedProduct?.outlet_price || selectedProduct?.base_price || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Dispatch Priority
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="NORMAL">Normal Delivery</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (Stock Out Risk)</option>
                  </select>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Estimated Total</span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    ৳{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Outlet Remarks / Special Delivery Instructions
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Needs delivery by Thursday morning before rush hour"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs sm:text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderModalOutlet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20 transition disabled:opacity-50"
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
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-red-600 dark:text-red-400 tracking-wider">
                  Field Refund & Return Inspection
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {refundModalOutlet.franchise_name} - {refundModalOutlet.branch_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {refundModalOutlet.address}
                </p>
              </div>
              <button
                onClick={() => setRefundModalOutlet(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500"
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Defective Units *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Refund Reason *
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="DAMAGED_LEAKAGE">Damaged / Seal Leakage</option>
                    <option value="EXPIRED_BATCH">Expired Stock</option>
                    <option value="WRONG_DISPATCH">Wrong Flavor / SKU</option>
                    <option value="CUSTOMER_RETURN">Customer Defect Return</option>
                    <option value="SLOW_ROTATION">Overstocked / Route Recall</option>
                  </select>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center justify-between">
                <span className="text-xs text-red-700 dark:text-red-300 font-semibold">Total Credit Refund:</span>
                <span className="text-base font-black text-red-700 dark:text-red-300">
                  ৳{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  PSR Inspection Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Inspected 4 bottles with cracked caps upon outlet unboxing"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs sm:text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOutlet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{actionLoading ? 'Logging Claim...' : 'Submit Claim to SO'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
