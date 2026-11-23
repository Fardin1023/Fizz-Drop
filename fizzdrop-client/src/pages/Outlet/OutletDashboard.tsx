import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getNotificationDestination } from '../../utils/notificationRouter';
import {
  Store,
  Package,
  ShoppingCart,
  Truck,
  ClipboardList,
  Receipt,
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Search,
  Filter,
  Sliders,
  DollarSign,
  Plus,
  RefreshCw,
  Clock,
  Printer,
  Download,
  Phone,
  MapPin,
  Flame,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Gift,
} from 'lucide-react';
import logoImg from '../../assets/img/fizzdrop-logo.png';
import { OutletSaleModal, type OutletProductItem } from './OutletSaleModal';
import { OutletAdjustStockModal } from './OutletAdjustStockModal';
import { OutletRequisitionModal } from './OutletRequisitionModal';
import { OutletOffersView } from './OutletOffersView';
import { SaleReceiptModal, type ReceiptData } from './SaleReceiptModal';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { StripePaymentModal } from '../../components/Payment/StripePaymentModal';

export const OutletDashboard: React.FC = () => {
  const { user, outlet: authOutlet, isAuthenticated, isOutlet, loginAsOutlet, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['inventory', 'pos', 'offers', 'request', 'deliveries', 'ledger', 'profile'];
  const initialTab = (searchParams.get('tab') as any) || 'inventory';
  const [activeTab, setActiveTab] = useState<'inventory' | 'pos' | 'offers' | 'request' | 'deliveries' | 'ledger' | 'profile'>(
    validTabs.includes(initialTab) ? initialTab : 'inventory'
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
    const dest = getNotificationDestination(n, 'OUTLET');
    if (dest.path === '/outlet' && validTabs.includes(dest.tab)) {
      handleTabChange(dest.tab);
    } else {
      navigate(dest.fullUrl);
    }
  };

  // Navigation Tabs
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Active Outlet Data
  const [outlet, setOutlet] = useState<any>(authOutlet || null);
  const [allOutlets, setAllOutlets] = useState<any[]>([]);
  const paramOutletId = searchParams.get('outletId') ? Number(searchParams.get('outletId')) : null;
  const authOutletId = authOutlet?.outlet_id || user?.branch_id;
  const activeOutletId = paramOutletId || authOutletId || outlet?.outlet_id || (allOutlets.length > 0 ? allOutlets[0].outlet_id : 2);
  const [preSalesOfficer, setPreSalesOfficer] = useState<any | null>(null);
  const [products, setProducts] = useState<OutletProductItem[]>([]);
  const [kpi, setKpi] = useState<any>({
    total_products: 0,
    total_stock_units: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    today_sales_revenue: 0,
    today_sales_count: 0,
  });
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const [stripePaymentData, setStripePaymentData] = useState<{
    isOpen: boolean;
    amount: number;
    requisitionId: number;
    title: string;
    description: string;
  }>({
    isOpen: false,
    amount: 0,
    requisitionId: 0,
    title: '',
    description: '',
  });

  // Fleet Inbound Deliveries & Delivery Confirmation
  const [fleetDeliveries, setFleetDeliveries] = useState<any[]>([]);
  const [confirmingReceiptId, setConfirmingReceiptId] = useState<number | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | string | null>(null);
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState<string | null>(null);

  // Real-time Notifications for this outlet
  const {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
  } = useNotifications('OUTLET', Number(outlet?.outlet_id || activeOutletId));

  // Customer order alert banner state
  const [customerOrderAlert, setCustomerOrderAlert] = useState<any | null>(null);

  // Auto-refresh shelf stock and delivery tracker when a dispatch notification arrives
  useEffect(() => {
    if (popupNotification && (popupNotification.recipient_role as any) === 'OUTLET') {
      fetchDashboardData(outlet?.outlet_id || activeOutletId, true);
    }
  }, [popupNotification, activeOutletId, outlet?.outlet_id]);

  // Real-time listener for Customer Purchases from Customer UI via BroadcastChannel & LocalStorage
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        if (event.data?.type === 'CUSTOMER_PURCHASE') {
          const currentId = Number(outlet?.outlet_id || activeOutletId);
          if (Number(event.data.outlet_id) === currentId) {
            setCustomerOrderAlert(event.data);
            fetchDashboardData(currentId, true);
          }
        } else if (event.data?.type === 'PSR_STOCK_DISPATCHED' || event.data?.type === 'DELIVERY_STOCK_OFFERED' || event.data?.type === 'STOCK_OFFER_RESPONDED' || event.data?.type === 'DELIVERY_ORDER_CANCELLED') {
          const currentId = Number(outlet?.outlet_id || activeOutletId);
          if (!event.data.outlet_id || Number(event.data.outlet_id) === currentId) {
            fetchDashboardData(currentId, true);
          }
        }
      };
    } catch (ignored) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fizzdrop_last_sale_event') {
        const currentId = Number(outlet?.outlet_id || activeOutletId);
        fetchDashboardData(currentId, true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Periodic silent background sync every 25 seconds to keep shelf stock updated without flashing the screen
    const pollInterval = setInterval(() => {
      fetchDashboardData(outlet?.outlet_id || activeOutletId, true);
    }, 25000);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
    };
  }, [activeOutletId, outlet?.outlet_id]);

  // Auto-dismiss customer order alert banner after 10s
  useEffect(() => {
    if (customerOrderAlert) {
      const timer = setTimeout(() => setCustomerOrderAlert(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [customerOrderAlert]);

  // Filters for Shelf Inventory Tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Modal States
  const [isSaleModalOpen, setIsSaleModalOpen] = useState<boolean>(false);
  const [selectedProductIdForSale, setSelectedProductIdForSale] = useState<number | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<OutletProductItem | null>(null);

  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState<boolean>(false);
  const [selectedProductIdForReq, setSelectedProductIdForReq] = useState<number | null>(null);

  // Full POS Register Cart state
  const [posCart, setPosCart] = useState<Array<{ product: OutletProductItem; qty: number }>>([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'Card' | 'bKash / MFS'>('Cash');
  const [posCustomerNote, setPosCustomerNote] = useState<string>('');
  const [posSubmitting, setPosSubmitting] = useState<boolean>(false);
  const [posError, setPosError] = useState<string | null>(null);
  const [posReceipt, setPosReceipt] = useState<ReceiptData | null>(null);
  const [showPosReceipt, setShowPosReceipt] = useState<boolean>(false);

  // Fetch all branch data (supports silent background re-fetching so UI never flickers)
  const fetchDashboardData = async (targetOutletId = activeOutletId, isSilent = false) => {
    if (!targetOutletId) return;
    if (!isSilent && !hasLoadedOnceRef.current) {
      setLoadingData(true);
    }
    try {
      // 1. Fetch Outlet Inventory & KPI
      const invRes = await fetch(`http://localhost:8080/api/inventory/outlet/${targetOutletId}`);
      if (invRes.ok) {
        const invData = await invRes.json();
        setOutlet(invData.outlet);
        setProducts(invData.products || []);
        if (invData.pre_sales_officer) {
          setPreSalesOfficer(invData.pre_sales_officer);
        } else if (invData.outlet?.assigned_psr_name) {
          setPreSalesOfficer({
            name: invData.outlet.assigned_psr_name,
            code: invData.outlet.assigned_psr_code,
            phone: invData.outlet.assigned_psr_phone,
            sub_route: invData.outlet.sub_route,
          });
        }
        if (invData.kpi) setKpi(invData.kpi);
      }

      // 2. Fetch Sales History
      const salesRes = await fetch(`http://localhost:8080/api/inventory/outlet/${targetOutletId}/sales`);
      if (salesRes.ok) {
        const sData = await salesRes.json();
        if (Array.isArray(sData)) setSalesHistory(sData);
      }

      // 3. Fetch Requisitions
      const reqRes = await fetch(`http://localhost:8080/api/inventory/outlet/${targetOutletId}/requisitions`);
      if (reqRes.ok) {
        const rData = await reqRes.json();
        if (Array.isArray(rData)) setRequisitions(rData);
      }

      // 4. Fetch list of all outlets for quick branch switcher
      const allOutRes = await fetch('http://localhost:8080/api/outlets');
      if (allOutRes.ok) {
        const allOutData = await allOutRes.json();
        if (Array.isArray(allOutData)) setAllOutlets(allOutData);
      }

      // 5. Fetch Fleet Inbound Consignments for this outlet
      try {
        const fleetRes = await fetch(`http://localhost:8080/api/v1/delivery/outlet-pending-deliveries/${targetOutletId}`);
        if (fleetRes.ok) {
          const fleetData = await fleetRes.json();
          if (Array.isArray(fleetData)) setFleetDeliveries(fleetData);
        }
      } catch {}
      hasLoadedOnceRef.current = true;
    } catch (err) {
      // ignore
    } finally {
      setLoadingData(false);
    }
  };

  const handleConfirmFleetDelivery = async (dispatchId: number) => {
    setConfirmingReceiptId(dispatchId);
    try {
      const res = await fetch('http://localhost:8080/api/v1/delivery/confirm-outlet-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outlet?.outlet_id || activeOutletId,
          dispatch_id: dispatchId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReceiptSuccessMsg(data.message || 'Stock delivery confirmed! Shelf inventory updated and profit credited to supplier.');
        localStorage.setItem('fizzdrop_supplier_wallet_refresh', Date.now().toString());
        try {
          const channel = new BroadcastChannel('fizzdrop_realtime_events');
          channel.postMessage({ type: 'SUPPLIER_WALLET_UPDATED' });
          channel.close();
        } catch {}
        window.dispatchEvent(new Event('storage'));
        fetchDashboardData(outlet?.outlet_id || activeOutletId);
      } else {
        alert(data.message || 'Failed to confirm delivery receipt.');
      }
    } catch {
      alert('Error connecting to delivery service.');
    } finally {
      setConfirmingReceiptId(null);
    }
  };

  const handleCancelOrderAndRefund = async (opts: {
    dispatchId?: number;
    requisitionId?: number;
    code: string;
    refundEstimate?: number;
  }) => {
    const refundFormatted = (opts.refundEstimate || 0).toFixed(2);
    const confirmMsg = `Are you sure you want to cancel ${opts.code}?\n\nA full refund of ৳${refundFormatted} will be issued to your account, and the delivery vehicle driver will be immediately alerted to skip this store.`;
    if (!window.confirm(confirmMsg)) return;

    const cancelKey = opts.dispatchId || opts.requisitionId || opts.code;
    setCancellingOrderId(cancelKey);
    try {
      const res = await fetch('http://localhost:8080/api/v1/delivery/cancel-outlet-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outlet?.outlet_id || activeOutletId,
          dispatch_id: opts.dispatchId,
          requisition_id: opts.requisitionId,
          reason: 'Cancelled by outlet manager via dashboard',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReceiptSuccessMsg(data.message || `Order ${opts.code} cancelled! Full refund of ৳${refundFormatted} processed. Delivery team notified.`);
        try {
          const channel = new BroadcastChannel('fizzdrop_realtime_events');
          channel.postMessage({
            type: 'DELIVERY_ORDER_CANCELLED',
            dispatchId: opts.dispatchId,
            requisitionId: opts.requisitionId,
            outletId: outlet?.outlet_id || activeOutletId,
          });
          channel.close();
        } catch {}
        window.dispatchEvent(new Event('storage'));
        await fetchDashboardData(outlet?.outlet_id || activeOutletId);
      } else {
        alert(data.message || 'Failed to cancel order.');
      }
    } catch {
      alert('Network error while cancelling order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const [respondingOfferId, setRespondingOfferId] = useState<string | number | null>(null);

  const handleRespondStockOffer = async (offerCodeOrId: string | number, action: 'ACCEPT' | 'DENY') => {
    setRespondingOfferId(offerCodeOrId);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/stock-offers/${offerCodeOrId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReceiptSuccessMsg(action === 'ACCEPT' 
          ? '✓ Stock offer accepted! Consignment is on the way to your store.' 
          : 'Stock offer was declined and returned to truck cargo.');
        setTimeout(() => setReceiptSuccessMsg(null), 6000);
        try {
          const ch = new BroadcastChannel('fizzdrop_realtime_events');
          ch.postMessage({
            type: 'STOCK_OFFER_RESPONDED',
            action,
            code: offerCodeOrId,
            outlet_id: outlet?.outlet_id || activeOutletId,
          });
          ch.close();
        } catch {}
        await fetchDashboardData(outlet?.outlet_id || activeOutletId, true);
      } else {
        alert(data.message || 'Failed to process stock offer response.');
      }
    } catch {
      alert('Error connecting to stock offer service.');
    } finally {
      setRespondingOfferId(null);
    }
  };

  useEffect(() => {
    fetchDashboardData(activeOutletId);
  }, [activeOutletId]);

  useEffect(() => {
    if (paramOutletId && outlet?.outlet_id && paramOutletId !== outlet.outlet_id) {
      fetchDashboardData(paramOutletId);
    }
  }, [paramOutletId, outlet?.outlet_id]);

  // Auth navigation guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/outlet/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Switch branch
  const handleSwitchBranch = async (newOutletId: number) => {
    const selected = allOutlets.find((o) => o.outlet_id === newOutletId);
    if (!selected) return;

    // Reset modals, cart, and search state
    setIsSaleModalOpen(false);
    setSelectedProductIdForSale(null);
    setIsAdjustModalOpen(false);
    setSelectedProductForAdjust(null);
    setIsRequisitionModalOpen(false);
    setSelectedProductIdForReq(null);
    setPosCart([]);
    setPosReceipt(null);
    setShowPosReceipt(false);
    setSearchQuery('');
    setConfirmingReceiptId(null);
    setReceiptSuccessMsg(null);
    setCustomerOrderAlert(null);

    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('outletId', String(newOutletId));
      return p;
    }, { replace: true });

    if (loginAsOutlet) {
      await loginAsOutlet(newOutletId, selected.email);
    }
    await fetchDashboardData(newOutletId);
  };

  // Filtered Products for Inventory Tab (declared before any returns to strictly adhere to React Rules of Hooks)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.flavor_variant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        p.brand?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStock =
        selectedStockStatus === 'ALL' ||
        (selectedStockStatus === 'IN_STOCK' && p.stock_quantity > 0) ||
        (selectedStockStatus === 'LOW_STOCK' && p.stock_quantity > 0 && p.stock_quantity <= 15) ||
        (selectedStockStatus === 'OUT_OF_STOCK' && p.stock_quantity === 0);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, selectedStockStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Guard: if not authenticated, render nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Categories list
  const categories = ['All', '7up', 'Pepsi', 'Mirinda', 'Mountain Dew', 'Aquafina', 'Slice'];

  // Add item to POS Cart
  const handleAddToPosCart = (prod: OutletProductItem) => {
    if (prod.stock_quantity <= 0) return;
    setPosCart((prev) => {
      const existing = prev.find((item) => item.product.product_id === prod.product_id);
      if (existing) {
        if (existing.qty >= prod.stock_quantity) return prev;
        return prev.map((item) =>
          item.product.product_id === prod.product_id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product: prod, qty: 1 }];
    });
  };

  const handleUpdatePosQty = (productId: number, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.product.product_id === productId) {
            const nextQty = item.qty + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock_quantity) return item;
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: OutletProductItem; qty: number }>
    );
  };

  const handleCheckoutPos = async () => {
    if (posCart.length === 0) return;
    setPosSubmitting(true);
    setPosError(null);

    try {
      // Execute each cart item sale
      for (const item of posCart) {
        const res = await fetch(`http://localhost:8080/api/inventory/outlet/${outlet?.outlet_id || activeOutletId}/sell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.product.product_id,
            quantity: item.qty,
            payment_method: posPaymentMethod,
            customer_notes: posCustomerNote.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Checkout item failed');
        }
      }

      // Generate Combined Receipt for the latest item
      const totalCartAmount = posCart.reduce(
        (sum, item) => sum + Number((item.product as any).retail_price || item.product.base_price || 25) * item.qty,
        0
      );
      const totalUnits = posCart.reduce((sum, item) => sum + item.qty, 0);

      setPosReceipt({
        saleCode: `POS-${Date.now()}`,
        outletName: outlet?.outlet_name || 'Outlet Branch',
        outletAddress: outlet?.location_address,
        outletPhone: outlet?.contact_phone,
        productName: posCart.map((i) => `${i.product.brand} x${i.qty}`).join(', '),
        quantitySold: totalUnits,
        unitPrice: totalCartAmount / totalUnits,
        totalAmount: totalCartAmount,
        paymentMethod: posPaymentMethod,
        customerNotes: posCustomerNote.trim() || undefined,
        timestamp: new Date().toISOString(),
      });

      setShowPosReceipt(true);
      setPosCart([]);
      setPosCustomerNote('');
      fetchDashboardData(outlet?.outlet_id || activeOutletId);
    } catch (err: any) {
      setPosError(err.message || 'Checkout failed');
    } finally {
      setPosSubmitting(false);
    }
  };

  // Nav Items Config
  const navSections = [
    {
      id: 'inventory' as const,
      label: 'Live Shelf Inventory',
      shortLabel: 'Shelf Inventory',
      desc: 'Real-time branch bottle & can counts',
      icon: Package,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      badge: `${kpi.total_stock_units} Units`,
      badgeHighlight: kpi.low_stock_count > 0,
    },
    {
      id: 'pos' as const,
      label: 'Point of Sale (POS)',
      shortLabel: 'POS Register',
      desc: 'Fast customer checkout & billing',
      icon: ShoppingCart,
      gradient: 'from-teal-600 via-emerald-600 to-green-600',
      badge: 'Counter',
    },
    {
      id: 'offers' as const,
      label: 'Special Trade Schemes & Free Stock',
      shortLabel: 'Trade Offers',
      desc: 'Buy bulk cases & receive free extra water/soda stock',
      icon: Gift,
      gradient: 'from-amber-500 via-orange-500 to-emerald-600',
      badge: 'Free Stock',
      badgeHighlight: notifications.some((n) => (n.type === 'OFFER_CREATED' || (n.title && n.title.includes('Offer'))) && !n.is_read),
    },
    {
      id: 'request' as const,
      label: 'Request Stock Requisition',
      shortLabel: 'Order Restock',
      desc: 'Order cases via Route Pre-Sales Officer (PSR)',
      icon: Truck,
      gradient: 'from-orange-600 via-amber-600 to-emerald-600',
      badge: 'PSR Route',
    },
    {
      id: 'deliveries' as const,
      label: 'Inbound Deliveries & Orders',
      shortLabel: 'Deliveries Tracker',
      desc: 'Status of orders & PSR field deliveries',
      icon: ClipboardList,
      gradient: 'from-cyan-600 via-teal-600 to-blue-600',
      badge: `${requisitions.length} Orders`,
    },
    {
      id: 'ledger' as const,
      label: 'Daily Sales Ledger',
      shortLabel: 'Sales Ledger',
      desc: 'Daily revenue, receipts & sales logs',
      icon: Receipt,
      gradient: 'from-amber-600 via-orange-600 to-rose-600',
      badge: `৳${Number(kpi.today_sales_revenue).toFixed(0)}`,
    },
    {
      id: 'profile' as const,
      label: 'Branch Profile & Location',
      shortLabel: 'Branch Profile',
      desc: 'Franchise address, zone & contact',
      icon: Building,
      gradient: 'from-purple-600 via-pink-600 to-rose-600',
      badge: 'Settings',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF4EB] text-[#2D2319] flex flex-col outlet-theme selection:bg-[#FFD18D]/40 selection:text-[#2D2319]">
      {/* TOP HEADER HUD */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2C799] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Branch Title */}
          <div className="flex items-center gap-3.5">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-2xl bg-[#FDECAD] p-1 border border-[#DFBC87] flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                <img src={logoImg} alt="FizzDrop" className="w-full h-full object-contain" />
              </div>
            </Link>

            <div className="h-7 w-[1px] bg-[#E2C799] hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-[#2D2319] tracking-tight flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#B45309] shrink-0" />
                  <span>{outlet?.franchise_name || 'Franchise'}</span>
                  <span className="text-[#A88B6E] font-normal">—</span>
                  <span className="text-[#78350F] font-bold">{outlet?.branch_name || outlet?.outlet_name || 'Branch'}</span>
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-[#F5F1BB] text-[#2D2319] text-[10px] font-bold border border-[#E2C799] uppercase">
                  {outlet?.city || 'Dhaka'} • {outlet?.area || 'Retail Hub'}
                </span>
              </div>
              <p className="text-[11px] text-[#6B5440] flex items-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-[#A88B6E]" />
                <span className="truncate max-w-[260px] sm:max-w-md">{outlet?.location_address || 'Outlet Address'}</span>
              </p>
            </div>
          </div>

          {/* Quick Branch Switcher & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick POS Button */}
            <button
              onClick={() => {
                setSelectedProductIdForSale(null);
                setIsSaleModalOpen(true);
              }}
              className="py-2 px-3.5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-[#433022]"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#FFD18D]" />
              <span className="hidden sm:inline">Record Sale (POS)</span>
              <span className="sm:hidden">POS</span>
            </button>

            {/* Quick Restock Order */}
            <button
              onClick={() => {
                setSelectedProductIdForReq(null);
                setIsRequisitionModalOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-[#FDECAD] hover:bg-[#FFD18D] text-[#2D2319] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer hidden md:flex border border-[#E2C799]"
            >
              <Truck className="w-3.5 h-3.5 text-[#78350F]" />
              <span>Order Restock</span>
            </button>

            {/* Branch Switcher Dropdown */}
            {allOutlets.length > 1 && (
              <select
                value={outlet?.outlet_id || activeOutletId}
                onChange={(e) => handleSwitchBranch(Number(e.target.value))}
                className="py-1.5 px-2.5 rounded-xl border border-[#E2C799] bg-[#F7E6C9] hover:bg-[#FFD18D] text-[#2D2319] text-xs font-bold focus:outline-none cursor-pointer"
              >
                {allOutlets.map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>
                    Switch: {o.franchise_name || o.outlet_name} ({o.branch_name || o.area})
                  </option>
                ))}
              </select>
            )}

            {/* Real-time Inbound Notifications Bell */}
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDeleteNotification={deleteNotification}
              onClearOldNotifications={clearOldNotifications}
              onSelectNotification={handleNotificationClick}
            />

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                navigate('/outlet/login');
              }}
              title="Logout from branch"
              className="p-2 rounded-xl border border-[#E2C799] bg-white hover:bg-[#F6DBD4] text-[#6B5440] hover:text-[#7C2D12] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD HERO KPI BANNER */}
      <section className="bg-gradient-to-r from-[#FFD18D] via-[#FDECAD] to-[#F7E6C9] text-[#2D2319] border-b border-[#DFBC87] py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 text-[#78350F] text-xs font-black border border-[#DFBC87] mb-2 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
              <span>FRANCHISE RETAIL OUTLET PORTAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2D2319]">
              {outlet?.outlet_name || 'Outlet Branch'}
            </h2>
            <p className="text-xs sm:text-sm text-[#433022] font-medium mt-1 max-w-xl">
              Live beverage shelf inventory, customer transactions, stock adjustments & regional supplier restocks.
            </p>
          </div>

          {/* Quick KPI Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2C799] shadow-2xs">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#78350F]">Total Units</p>
              <p className="text-2xl font-black text-[#2D2319] mt-0.5 font-mono">{kpi.total_stock_units}</p>
              <p className="text-[10px] text-[#6B5440] font-medium">On Shelf & Backroom</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2C799] shadow-2xs">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#7C2D12]">Low Stock</p>
              <p className="text-2xl font-black text-[#7C2D12] mt-0.5 font-mono">{kpi.low_stock_count}</p>
              <p className="text-[10px] text-[#6B5440] font-medium">&le; 15 units remaining</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2C799] shadow-2xs">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#78350F]">Today Sales</p>
              <p className="text-2xl font-black text-[#2D2319] mt-0.5 font-mono">{kpi.today_sales_count}</p>
              <p className="text-[10px] text-[#6B5440] font-medium">Receipts generated</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E2C799] shadow-2xs">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#78350F]">Today Revenue</p>
              <p className="text-2xl font-black text-[#2D2319] mt-0.5 font-mono">৳{Number(kpi.today_sales_revenue).toFixed(0)}</p>
              <p className="text-[10px] text-[#6B5440] font-medium">Collected today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Assigned Route Pre-Sales Officer (PSR) Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[#FDECAD] via-[#F7E6C9] to-[#F5F1BB] border border-[#E2C799] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[#2D2319]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFD18D] border border-[#DFBC87] text-[#2D2319] font-black flex items-center justify-center text-xs shadow-2xs shrink-0">
              PSR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#78350F]">
                  Exclusive Route Pre-Sales Officer (PSR)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F6DBD4] text-[#7C2D12] border border-[#E2C799]">
                  Primary Contact
                </span>
              </div>
              <p className="text-sm font-bold text-[#2D2319] mt-0.5">
                {preSalesOfficer?.name || outlet?.assigned_psr_name || 'Assigned Territory Officer'}
                {(preSalesOfficer?.code || outlet?.assigned_psr_code) && (
                  <span className="text-xs font-mono text-[#78350F] font-semibold ml-1.5">
                    ({preSalesOfficer?.code || outlet?.assigned_psr_code})
                  </span>
                )}
                <span className="text-xs text-[#6B5440] font-medium ml-2">
                  • Sub-Route: <strong className="font-semibold text-[#2D2319]">{preSalesOfficer?.sub_route || outlet?.sub_route || 'Territory Sub-Route'}</strong>
                </span>
                {(preSalesOfficer?.phone || outlet?.assigned_psr_phone) && (
                  <span className="text-xs text-[#6B5440] font-medium ml-2">
                    • 📞 <strong className="font-semibold text-[#2D2319]">{preSalesOfficer?.phone || outlet?.assigned_psr_phone}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('offers')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Gift className="w-3.5 h-3.5 text-white" />
              <span>Special Offers</span>
            </button>
            <button
              onClick={() => {
                if (products.length > 0) setSelectedProductIdForReq(products[0].product_id);
                setIsRequisitionModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 border border-[#433022]"
            >
              <Truck className="w-3.5 h-3.5 text-[#FFD18D]" />
              <span>Order Stock via PSR</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA WITH SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* SIDEBAR NAVIGATION */}
          <aside
            className={`transition-all duration-300 shrink-0 ${
              isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
            } w-full`}
          >
            <div className="sticky top-24 bg-white rounded-3xl border border-[#E2C799] shadow-xs p-3 space-y-1.5">
              <div className="hidden lg:flex items-center justify-between px-3 py-2 border-b border-[#FAF4EB] mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider text-[#A88B6E] ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Outlet Modules
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1 rounded-lg hover:bg-[#FAF4EB] text-[#6B5440] hover:text-[#2D2319] transition-colors"
                >
                  {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>

              {navSections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleTabChange(sec.id)}
                    className={`w-full p-2.5 rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer group ${
                      isActive
                        ? `bg-[#FFD18D] text-[#2D2319] shadow-xs border border-[#DFBC87] font-black`
                        : 'text-[#433022] hover:bg-[#F7E6C9]/60 hover:text-[#2D2319]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'bg-white/50 text-[#2D2319] border border-[#DFBC87]' : 'bg-[#FAF4EB] text-[#6B5440] group-hover:text-[#2D2319]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {!isSidebarCollapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black tracking-tight truncate">{sec.label}</span>
                          {sec.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                isActive
                                  ? 'bg-white/60 text-[#2D2319] border border-[#DFBC87]'
                                  : sec.badgeHighlight
                                  ? 'bg-[#F6DBD4] text-[#7C2D12] border border-[#E2C799]'
                                  : 'bg-[#FDECAD] text-[#2D2319] border border-[#E2C799]'
                              }`}
                            >
                              {sec.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {sec.desc}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* MAIN TAB CONTENT */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* REAL-TIME LIVE CUSTOMER ORDER NOTIFICATION BANNER */}
            {customerOrderAlert && (
              <div className="p-4 rounded-3xl bg-gradient-to-r from-[#FFD18D] via-[#FDECAD] to-[#F7E6C9] text-[#2D2319] shadow-lg shadow-[#FFD18D]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in border border-[#E2C799]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#2D2319]/10 backdrop-blur-md flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[#78350F] animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase tracking-wide text-[#2D2319]">
                        ⚡ New Customer Order Received!
                      </span>
                      <span className="text-[10px] font-mono bg-[#2D2319]/10 text-[#2D2319] px-2 py-0.5 rounded-full font-bold border border-[#E2C799]">
                        {customerOrderAlert.sale_code || 'PROCESSED'}
                      </span>
                    </div>
                    <p className="text-xs text-[#433022] mt-0.5">
                      Customer bought <strong className="text-[#2D2319]">{customerOrderAlert.quantity}x {customerOrderAlert.product_name}</strong> for{' '}
                      <strong className="text-[#78350F]">৳{Number(customerOrderAlert.total_amount).toFixed(2)}</strong> via{' '}
                      <span className="underline font-medium">{customerOrderAlert.payment_method}</span>. Shelf inventory &amp; Today's Revenue updated automatically!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2D2319] text-[#FDECAD] text-xs font-bold hover:bg-[#433022] transition-colors shadow-xs cursor-pointer"
                  >
                    View in Ledger →
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerOrderAlert(null)}
                    className="p-1.5 rounded-xl bg-[#2D2319]/10 hover:bg-[#2D2319]/20 text-[#2D2319] transition-colors cursor-pointer"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {/* TAB 1: LIVE SHELF INVENTORY */}
            {activeTab === 'inventory' && (
              <div className="space-y-5 animate-fade-in">
                {/* Search & Filter Toolbar */}
                <div className="p-4 rounded-3xl bg-white border border-[#E2C799] shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B5440]" />
                      <input
                        type="text"
                        placeholder="Search beverages by brand, SKU, flavor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl border border-[#E2C799] bg-[#FAF4EB]/60 text-[#2D2319] placeholder:text-[#6B5440]/60 focus:outline-none focus:ring-2 focus:ring-[#FFD18D]"
                      />
                    </div>

                    {/* Stock Status Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                      {[
                        { id: 'ALL', label: 'All Items' },
                        { id: 'IN_STOCK', label: 'In Stock' },
                        { id: 'LOW_STOCK', label: 'Low Stock (<15)' },
                        { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSelectedStockStatus(st.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            selectedStockStatus === st.id
                              ? 'bg-[#2D2319] text-[#FDECAD] shadow-xs'
                              : 'bg-[#F7E6C9]/60 hover:bg-[#F7E6C9] text-[#433022]'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brand Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                    <span className="text-[10px] uppercase font-bold text-[#78350F] mr-1">Brands:</span>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-[#FFD18D] text-[#2D2319] shadow-xs border border-[#E2C799]'
                            : 'bg-[#FAF4EB] hover:bg-[#F7E6C9] text-[#433022] border border-[#E2C799]/40'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Inventory Cards Grid */}
                {loadingData ? (
                  <div className="py-20 flex justify-center">
                    <div className="w-8 h-8 border-3 border-[#FFD18D]/40 border-t-[#2D2319] rounded-full animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-[#E2C799] text-[#6B5440]">
                    <Package className="w-12 h-12 mx-auto mb-3 text-[#E2C799]" />
                    <p className="font-bold text-[#2D2319]">No beverages match your filters</p>
                    <p className="text-xs text-[#6B5440] mt-1">Try clearing search terms or selecting 'All Items'.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProducts.map((p) => {
                      const isLow = p.stock_quantity > 0 && p.stock_quantity <= 15;
                      const isZero = p.stock_quantity === 0;

                      return (
                        <div
                          key={p.product_id}
                          className="bg-white rounded-3xl border border-[#E2C799] shadow-xs hover:shadow-md hover:border-[#FFD18D] transition-all p-5 flex flex-col justify-between group relative overflow-hidden"
                        >
                          {/* Top Stock Status Badge */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="w-14 h-14 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/60 p-2 flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.brand} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-6 h-6 text-[#6B5440]" />
                              )}
                            </div>

                            <div className="text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isZero
                                    ? 'bg-[#F6DBD4] text-[#7C2D12] border border-[#E29D94]'
                                    : isLow
                                    ? 'bg-[#FFD18D]/60 text-[#78350F] border border-[#FFD18D]'
                                    : 'bg-[#F5F1BB] text-[#365314] border border-[#D9D384]'
                                }`}
                              >
                                {isZero ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                              </span>
                              <p className="text-xs font-black text-[#2D2319] font-mono mt-1">
                                ৳{Number((p as any).retail_price || p.base_price || 25).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Details */}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#78350F] tracking-wider">
                              {p.category || 'Carbonated Drink'} • {p.packaging || 'Bottle'}
                            </span>
                            <h4 className="text-base font-black text-[#2D2319] tracking-tight group-hover:text-[#78350F] transition-colors">
                              {p.brand} {p.flavor_variant}
                            </h4>
                            <p className="text-[11px] text-[#6B5440] font-mono">
                              SKU: {p.sku || 'N/A'} • {p.size_volume || '250ml'}
                            </p>
                          </div>

                          {/* Live Shelf Quantity Display */}
                          <div className="mt-4 p-3 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/60 flex items-center justify-between">
                            <span className="text-xs font-bold text-[#6B5440] uppercase tracking-wider">
                              Shelf Stock:
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-xl font-black font-mono ${
                                  isZero ? 'text-[#B91C1C]' : isLow ? 'text-[#B45309]' : 'text-[#2D2319]'
                                }`}
                              >
                                {p.stock_quantity}
                              </span>
                              <span className="text-xs text-[#6B5440] font-medium">units</span>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#E2C799]/40">
                            {/* Record Sale */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductIdForSale(p.product_id);
                                setIsSaleModalOpen(true);
                              }}
                              disabled={isZero}
                              className="py-2 px-2 rounded-xl bg-[#2D2319] hover:bg-[#433022] disabled:opacity-30 text-[#FDECAD] font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                              title="Record Point of Sale checkout"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Sell</span>
                            </button>

                            {/* Request Restock */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductIdForReq(p.product_id);
                                setIsRequisitionModalOpen(true);
                              }}
                              className="py-2 px-2 rounded-xl bg-[#FDECAD] hover:bg-[#FFD18D] text-[#2D2319] font-bold text-[11px] border border-[#E2C799] flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Order stock from Regional Supplier"
                            >
                              <Truck className="w-3 h-3 text-[#78350F]" />
                              <span>Restock</span>
                            </button>

                            {/* Adjust Stock */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductForAdjust(p);
                                setIsAdjustModalOpen(true);
                              }}
                              className="py-2 px-2 rounded-xl bg-[#FAF4EB] hover:bg-[#F7E6C9] text-[#433022] font-bold text-[11px] border border-[#E2C799]/60 flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Adjust physical inventory count"
                            >
                              <Sliders className="w-3 h-3 text-[#6B5440]" />
                              <span>Count</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: POINT OF SALE (POS) FULL COUNTER */}
            {activeTab === 'pos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                {/* Left Side: Product Selector Grid */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-4 bg-white rounded-3xl border border-[#E2C799] shadow-xs flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-[#2D2319] tracking-tight flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-[#78350F]" />
                        <span>QUICK COUNTER REGISTER</span>
                      </h3>
                      <p className="text-xs text-[#6B5440]">Tap any beverage to add it to customer cart</p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-[#F5F1BB] text-[#365314] font-bold border border-[#D9D384]">
                      {products.filter((p) => p.stock_quantity > 0).length} Available SKUs
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map((p) => {
                      const isZero = p.stock_quantity <= 0;
                      return (
                        <button
                          key={p.product_id}
                          type="button"
                          onClick={() => handleAddToPosCart(p)}
                          disabled={isZero}
                          className="p-3.5 rounded-2xl bg-white hover:bg-[#FDECAD]/50 border border-[#E2C799] hover:border-[#FFD18D] text-left transition-all flex flex-col justify-between shadow-xs disabled:opacity-40 cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#FAF4EB] text-[#433022] font-bold border border-[#E2C799]/40">
                              Stock: {p.stock_quantity}
                            </span>
                            <span className="text-xs font-black text-[#2D2319] font-mono">
                              ৳{Number((p as any).retail_price || p.base_price || 25).toFixed(0)}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-black text-[#2D2319] group-hover:text-[#78350F] truncate">
                              {p.brand} {p.flavor_variant}
                            </p>
                            <p className="text-[10px] text-[#6B5440] truncate">
                              {p.packaging} • {p.size_volume}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-[#E2C799]/40 flex items-center justify-between text-[11px] font-bold text-[#78350F]">
                            <span>+ Tap to Add</span>
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side: Active Customer Cart & Checkout */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white rounded-3xl border border-[#E2C799] shadow-md p-5 space-y-4 sticky top-24">
                    <div className="flex items-center justify-between border-b border-[#E2C799]/40 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-[#2D2319] uppercase tracking-tight">Active Bill / Cart</h4>
                        <p className="text-[11px] text-[#6B5440] font-mono">{outlet?.outlet_name}</p>
                      </div>
                      {posCart.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPosCart([])}
                          className="text-[11px] text-[#B91C1C] hover:underline font-bold"
                        >
                          Clear Cart
                        </button>
                      )}
                    </div>

                    {posError && (
                      <div className="p-3 rounded-xl bg-[#F6DBD4] border border-[#E29D94] text-[#7C2D12] text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
                        <span>{posError}</span>
                      </div>
                    )}

                    {/* Cart Items List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {posCart.length === 0 ? (
                        <div className="py-8 text-center text-[#6B5440] text-xs">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-[#E2C799]" />
                          <p>Cart is currently empty.</p>
                          <p className="text-[11px] text-[#6B5440]/70 mt-0.5">Click beverages on the left to add items.</p>
                        </div>
                      ) : (
                        posCart.map((item) => {
                          const itemPrice = Number((item.product as any).retail_price || item.product.base_price || 25);
                          const sub = itemPrice * item.qty;
                          return (
                            <div
                              key={item.product.product_id}
                              className="p-3 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#2D2319] truncate">
                                  {item.product.brand} {item.product.flavor_variant}
                                </p>
                                <p className="text-[10px] text-[#6B5440] font-mono">
                                  ৳{Number((item.product as any).retail_price || item.product.base_price || 25).toFixed(2)} each
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Stepper */}
                                <div className="flex items-center gap-1.5 bg-white border border-[#E2C799] rounded-xl px-1.5 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePosQty(item.product.product_id, -1)}
                                    className="w-5 h-5 flex items-center justify-center text-[#2D2319] font-bold hover:text-[#78350F]"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black font-mono px-1 text-[#2D2319]">{item.qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePosQty(item.product.product_id, 1)}
                                    disabled={item.qty >= item.product.stock_quantity}
                                    className="w-5 h-5 flex items-center justify-center text-[#2D2319] font-bold hover:text-[#78350F] disabled:opacity-30"
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="text-xs font-black text-[#2D2319] font-mono w-14 text-right">
                                  ৳{sub.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Payment Mode Selector */}
                    {posCart.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-[#E2C799]/40">
                        <label className="text-[11px] font-black uppercase tracking-wider text-[#6B5440]">
                          Payment Mode
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'Cash', label: 'Cash', icon: Banknote },
                            { id: 'Card', label: 'Card / POS', icon: CreditCard },
                            { id: 'bKash / MFS', label: 'bKash / MFS', icon: Smartphone },
                          ].map((mode) => {
                            const isSelected = posPaymentMethod === mode.id;
                            const Icon = mode.icon;
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => setPosPaymentMethod(mode.id as any)}
                                className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-[#2D2319] bg-[#FFD18D] text-[#2D2319] ring-2 ring-[#FFD18D]/40'
                                    : 'border-[#E2C799] bg-[#FAF4EB] text-[#433022] hover:bg-[#F7E6C9]'
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2D2319]' : 'text-[#6B5440]'}`} />
                                <span className="text-[10px]">{mode.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          placeholder="Optional customer reference / notes..."
                          value={posCustomerNote}
                          onChange={(e) => setPosCustomerNote(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2C799] bg-[#FAF4EB]/60 text-[#2D2319] placeholder:text-[#6B5440]/60 focus:outline-none focus:ring-2 focus:ring-[#FFD18D]"
                        />

                        {/* Total Due Banner */}
                        <div className="p-4 rounded-2xl bg-[#2D2319] text-white flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#F7E6C9]">Total Payable</span>
                            <p className="text-xs text-[#FFD18D]">
                              {posCart.reduce((s, i) => s + i.qty, 0)} item(s) in bill
                            </p>
                          </div>
                          <span className="text-2xl font-black font-mono text-[#FFD18D]">
                            ৳
                            {posCart
                              .reduce((sum, item) => sum + Number((item.product as any).retail_price || item.product.base_price || 25) * item.qty, 0)
                              .toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleCheckoutPos}
                          disabled={posSubmitting}
                          className="w-full py-3.5 px-4 rounded-2xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2D2319]/25 transition-all cursor-pointer"
                        >
                          {posSubmitting ? (
                            <div className="w-5 h-5 border-2 border-[#FDECAD]/30 border-t-[#FDECAD] rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-[#FFD18D]" />
                              <span>Complete & Generate Receipt</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SPECIAL TRADE SCHEMES & OFFERS */}
            {activeTab === 'offers' && (
              <OutletOffersView
                outletId={activeOutletId}
                outletDistrictId={outlet?.district_id || 1}
                outletName={outlet?.outlet_name || 'Retail Outlet'}
                onOrderSuccess={() => {
                  fetchDashboardData(true);
                }}
                onNavigateToDeliveries={() => handleTabChange('deliveries')}
              />
            )}

            {/* TAB 3: REQUEST STOCK REQUISITION */}
            {activeTab === 'request' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="p-6 bg-white rounded-3xl border border-[#E2C799] shadow-md space-y-5">
                  <div className="flex items-center gap-3 border-b border-[#E2C799]/40 pb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFD18D] text-[#2D2319] flex items-center justify-center shadow-md shadow-[#FFD18D]/30">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#2D2319] tracking-tight">
                        ORDER RESTOCK VIA ROUTE PRE-SALES OFFICER (PSR)
                      </h3>
                      <p className="text-xs text-[#6B5440]">
                        Orders are placed exclusively with your assigned Route Pre-Sales Officer for sub-route delivery.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7E6C9]/70 border border-[#E2C799] text-xs text-[#2D2319] space-y-1">
                    <p className="font-bold">
                      Assigned Officer: {preSalesOfficer?.name || outlet?.assigned_psr_name || 'Territory PSR'} 
                      {(preSalesOfficer?.code || outlet?.assigned_psr_code) && ` (${preSalesOfficer?.code || outlet?.assigned_psr_code})`}
                    </p>
                    <p className="text-[#433022]">
                      Sub-Route: {preSalesOfficer?.sub_route || outlet?.sub_route || 'Local Sub-Route'}. Your Route Officer verifies stock orders and personally executes or coordinates delivery replenishment to your shop.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductIdForReq(null);
                      setIsRequisitionModalOpen(true);
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2D2319]/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-[#FFD18D]" />
                    <span>Open New Order to Pre-Sales Officer</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: INBOUND DELIVERIES & REQUISITIONS HISTORY */}
            {activeTab === 'deliveries' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-white rounded-3xl border border-[#E2C799] shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-[#2D2319] tracking-tight flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-[#78350F]" />
                      <span>INBOUND DELIVERIES & ORDER TRACKER</span>
                    </h3>
                    <p className="text-xs text-[#6B5440]">
                      Track beverage restock requests and depot shipments sent to this branch
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchDashboardData(outlet?.outlet_id || activeOutletId)}
                    className="p-2 rounded-xl border border-[#E2C799] hover:bg-[#FAF4EB] text-[#2D2319] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {receiptSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-[#F5F1BB] border border-[#D9D384] text-[#365314] text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#365314] shrink-0" />
                      <span>{receiptSuccessMsg}</span>
                    </div>
                    <button onClick={() => setReceiptSuccessMsg(null)} className="text-[#365314] hover:opacity-80 font-bold cursor-pointer">×</button>
                  </div>
                )}

                {/* Active Inbound Live Alert Banner */}
                {fleetDeliveries.some((d) => !d.is_confirmed_by_outlet && (d.status === 'IN_TRANSIT' || d.status === 'BOARDED' || d.is_delivered_by_driver)) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFD18D]/30 via-[#FDECAD]/40 to-[#F7E6C9]/40 border-2 border-[#E2C799] shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2D2319] text-[#FFD18D] flex items-center justify-center shadow-md animate-pulse shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D2319] flex items-center gap-2">
                          <span>Active Inbound Stock In Progress</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD18D] text-[#2D2319] font-black uppercase border border-[#E2C799]">Live Tracking</span>
                        </h4>
                        <p className="text-xs text-[#433022] mt-0.5">
                          {fleetDeliveries.find((d) => !d.is_confirmed_by_outlet && d.is_delivered_by_driver)
                            ? 'A delivery vehicle has arrived at your store and unloaded cases. Please confirm stock receipt below.'
                            : fleetDeliveries.find((d) => !d.is_confirmed_by_outlet && d.status === 'IN_TRANSIT')
                            ? 'A delivery vehicle is currently on the way to your outlet. Track vehicle registration and driver hotline below.'
                            : 'Your ordered consignment has been verified & boarded onto the delivery truck by the delivery team.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fleet Delivery Consignments */}
                {fleetDeliveries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-oswald text-xs font-bold uppercase tracking-wider text-[#2D2319] flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#78350F]" />
                        <span>Supplier Delivery Fleet Consignments</span>
                      </h4>
                      <span className="text-[11px] font-mono text-[#6B5440] font-bold">
                        {fleetDeliveries.length} Consignments
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {fleetDeliveries.map((delivery) => {
                        const isDeliveredByDriver = delivery.is_delivered_by_driver;
                        const isConfirmedByOutlet = delivery.is_confirmed_by_outlet;
                        const isCancelled = delivery.is_cancelled || delivery.status === 'CANCELLED';
                        const isBoarded = delivery.status === 'BOARDED' || delivery.status === 'IN_TRANSIT' || isDeliveredByDriver || isConfirmedByOutlet;
                        const isInTransit = delivery.status === 'IN_TRANSIT' || isDeliveredByDriver || isConfirmedByOutlet;

                        return (
                          <div
                            key={delivery.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isCancelled
                                ? 'bg-[#F6DBD4]/40 border-[#E29D94] shadow-xs'
                                : isConfirmedByOutlet
                                ? 'bg-white border-[#E2C799] shadow-xs'
                                : isDeliveredByDriver
                                ? 'bg-[#F5F1BB]/50 border-2 border-[#D9D384] shadow-md'
                                : delivery.status === 'IN_TRANSIT'
                                ? 'bg-[#FFD18D]/30 border-2 border-[#FFD18D] shadow-md'
                                : delivery.status === 'BOARDED'
                                ? 'bg-[#FDECAD]/50 border-2 border-[#E2C799] shadow-sm'
                                : 'bg-white border-[#E2C799] shadow-xs'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black font-mono text-[#2D2319]">
                                    {delivery.dispatch_code}
                                  </span>
                                  <span className="font-mono text-xs font-bold text-[#2D2319] bg-[#F7E6C9] px-2 py-0.5 rounded-md border border-[#E2C799]">
                                    Vehicle: {delivery.vehicle_registration_no}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                                    isCancelled
                                      ? 'bg-[#F6DBD4] text-[#7C2D12] border border-[#E29D94]'
                                      : isConfirmedByOutlet
                                      ? 'bg-[#F5F1BB] text-[#365314] border border-[#D9D384]'
                                      : isDeliveredByDriver
                                      ? 'bg-[#FFD18D] text-[#2D2319] border border-[#E2C799] animate-pulse'
                                      : delivery.status === 'IN_TRANSIT'
                                      ? 'bg-[#FDECAD] text-[#2D2319] animate-pulse border border-[#E2C799]'
                                      : delivery.status === 'BOARDED'
                                      ? 'bg-[#F7E6C9] text-[#2D2319] border border-[#E2C799]'
                                      : 'bg-[#FAF4EB] text-[#2D2319] border border-[#E2C799]'
                                  }`}>
                                    {isCancelled
                                      ? '⛔ Order Cancelled & Refunded'
                                      : isConfirmedByOutlet
                                      ? '✓ Stock Received & Added to Shelf'
                                      : isDeliveredByDriver
                                      ? '🚚 Vehicle Arrived & Unloaded'
                                      : delivery.status === 'IN_TRANSIT'
                                      ? '🚚 On The Way to Outlet (In Transit)'
                                      : delivery.status === 'BOARDED'
                                      ? '📦 Cargo Boarded on Truck'
                                      : '📋 Dispatched to Fleet'}
                                  </span>
                                </div>

                                <p className="text-xs text-[#433022]">
                                  Sub-Route: <strong>{delivery.sub_route}</strong> • Driver: <strong>{delivery.driver_name}</strong> ({delivery.driver_phone})
                                </p>

                                {/* Unloaded Products */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {delivery.outlet_items?.map((it: any, itemIdx: number) => (
                                    <span
                                      key={itemIdx}
                                      className="text-xs px-2 py-0.5 rounded-md bg-[#FAF4EB] border border-[#E2C799]/70 text-[#2D2319] font-medium"
                                    >
                                      {it.product_name} • <strong className="text-[#78350F] font-mono font-bold">{it.assigned_cases || it.demanded_cases} cases</strong>
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Outlet Confirmation / Cancellation Action Button */}
                              <div className="text-right sm:self-center">
                                {isCancelled ? (
                                  <div className="flex items-center gap-1.5 text-xs text-[#7C2D12] font-bold bg-[#F6DBD4] px-3 py-1.5 rounded-xl border border-[#E29D94]">
                                    <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
                                    <span>Refund Processed</span>
                                  </div>
                                ) : isConfirmedByOutlet ? (
                                  <div className="flex items-center gap-1.5 text-xs text-[#365314] font-bold bg-[#F5F1BB] px-3 py-1.5 rounded-xl border border-[#D9D384]">
                                    <CheckCircle className="w-4 h-4 text-[#365314]" />
                                    <span>Consignment Accepted</span>
                                  </div>
                                ) : isDeliveredByDriver ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmFleetDelivery(delivery.id)}
                                      disabled={confirmingReceiptId === delivery.id || cancellingOrderId !== null}
                                      className="px-4 py-2 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                    >
                                      <CheckCircle className="w-4 h-4 text-[#FFD18D]" />
                                      <span>{confirmingReceiptId === delivery.id ? 'Confirming...' : 'Confirm Stock Received'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelOrderAndRefund({
                                        dispatchId: delivery.id,
                                        code: delivery.dispatch_code,
                                        refundEstimate: delivery.outlet_items?.reduce((s: number, it: any) => s + (it.assigned_cases || it.demanded_cases || 0) * (it.unit_price || 42), 0) || 0,
                                      })}
                                      disabled={cancellingOrderId === delivery.id}
                                      className="px-3 py-2 rounded-xl border border-[#E29D94] bg-[#F6DBD4] hover:bg-[#f3cac1] text-[#7C2D12] font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                      title="Cancel order and request full refund"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Cancel & Refund</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                    {delivery.is_offer_pending ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const code = delivery.outlet_items?.find((it: any) => it.is_offered_stock)?.requisition_code || delivery.id;
                                            handleRespondStockOffer(code, 'ACCEPT');
                                          }}
                                          disabled={respondingOfferId !== null}
                                          className="px-3 py-1.5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5 text-[#FFD18D]" />
                                          <span>Accept Stock</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const code = delivery.outlet_items?.find((it: any) => it.is_offered_stock)?.requisition_code || delivery.id;
                                            handleRespondStockOffer(code, 'DENY');
                                          }}
                                          disabled={respondingOfferId !== null}
                                          className="px-3 py-1.5 rounded-xl border border-[#E29D94] bg-[#F6DBD4] hover:bg-[#f3cac1] text-[#7C2D12] font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>Deny Stock</span>
                                        </button>
                                      </div>
                                    ) : delivery.is_offer_denied ? (
                                      <span className="text-xs text-[#7C2D12] font-bold bg-[#F6DBD4] px-3 py-1.5 rounded-xl border border-[#E29D94]">
                                        Stock Offer Denied
                                      </span>
                                    ) : delivery.status === 'IN_TRANSIT' ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs text-[#2D2319] font-bold bg-[#FFD18D] px-3 py-1.5 rounded-xl border border-[#E2C799] animate-pulse">
                                        <Truck className="w-4 h-4 text-[#78350F]" />
                                        <span>En Route to Store</span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-[#6B5440] italic">
                                        Awaiting vehicle departure
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCancelOrderAndRefund({
                                        dispatchId: delivery.id,
                                        code: delivery.dispatch_code,
                                        refundEstimate: delivery.outlet_items?.reduce((s: number, it: any) => s + (it.assigned_cases || it.demanded_cases || 0) * (it.unit_price || 42), 0) || 0,
                                      })}
                                      disabled={cancellingOrderId === delivery.id}
                                      className="px-3 py-1.5 rounded-xl border border-[#E29D94] bg-[#F6DBD4] hover:bg-[#f3cac1] text-[#7C2D12] font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                      title="Cancel delivery order and get full refund"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>{cancellingOrderId === delivery.id ? 'Cancelling...' : 'Cancel Order & Refund'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 4-Step Visual Delivery Progress Stepper */}
                            <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t border-[#E2C799]/40">
                              {/* Step 1: Dispatched */}
                              <div className="flex flex-col items-center text-center p-1.5 rounded-xl border bg-[#F7E6C9] border-[#E2C799] text-[#2D2319] font-bold text-[11px]">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-[#78350F]" />
                                  <span>1. Dispatched</span>
                                </div>
                                <span className="text-[9px] text-[#6B5440] font-normal">By Supplier</span>
                              </div>

                              {/* Step 2: Boarded */}
                              <div className={`flex flex-col items-center text-center p-1.5 rounded-xl border text-[11px] ${
                                isBoarded
                                  ? 'bg-[#FDECAD] border-[#E2C799] text-[#2D2319] font-bold'
                                  : 'bg-[#FAF4EB]/60 border-[#E2C799]/40 text-[#6B5440]'
                              }`}>
                                <div className="flex items-center gap-1">
                                  {isBoarded ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-[#78350F]" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border border-[#E2C799] flex items-center justify-center text-[9px] text-[#6B5440] font-mono">2</div>
                                  )}
                                  <span>2. Boarded</span>
                                </div>
                                <span className="text-[9px] text-[#6B5440] font-normal">Onto Truck</span>
                              </div>

                              {/* Step 3: On The Way */}
                              <div className={`flex flex-col items-center text-center p-1.5 rounded-xl border text-[11px] ${
                                isCancelled
                                  ? 'bg-[#F6DBD4] border-[#E29D94] text-[#7C2D12] font-bold'
                                  : isInTransit
                                  ? 'bg-[#FFD18D]/60 border-[#FFD18D] text-[#2D2319] font-bold'
                                  : 'bg-[#FAF4EB]/60 border-[#E2C799]/40 text-[#6B5440]'
                              }`}>
                                <div className="flex items-center gap-1">
                                  {isCancelled ? (
                                    <X className="w-3.5 h-3.5 text-[#B91C1C]" />
                                  ) : isInTransit ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-[#78350F]" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border border-[#E2C799] flex items-center justify-center text-[9px] text-[#6B5440] font-mono">3</div>
                                  )}
                                  <span>3. {isCancelled ? 'Cancelled' : 'On The Way'}</span>
                                </div>
                                <span className="text-[9px] text-[#6B5440] font-normal">{isCancelled ? 'Order Voided' : 'In Transit'}</span>
                              </div>

                              {/* Step 4: Arrived / Confirmed / Refunded */}
                              <div className={`flex flex-col items-center text-center p-1.5 rounded-xl border text-[11px] ${
                                isCancelled
                                  ? 'bg-[#F6DBD4] border-[#E29D94] text-[#7C2D12] font-bold'
                                  : isConfirmedByOutlet
                                  ? 'bg-[#F5F1BB] border-[#D9D384] text-[#365314] font-bold'
                                  : isDeliveredByDriver
                                  ? 'bg-[#FFD18D] border-[#E2C799] text-[#2D2319] font-bold animate-pulse'
                                  : 'bg-[#FAF4EB]/60 border-[#E2C799]/40 text-[#6B5440]'
                              }`}>
                                <div className="flex items-center gap-1">
                                  {isCancelled ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-[#B91C1C]" />
                                  ) : isConfirmedByOutlet ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-[#365314]" />
                                  ) : isDeliveredByDriver ? (
                                    <Clock className="w-3.5 h-3.5 text-[#78350F] animate-spin" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border border-[#E2C799] flex items-center justify-center text-[9px] text-[#6B5440] font-mono">4</div>
                                  )}
                                  <span>4. {isCancelled ? 'Refunded' : 'Confirmed'}</span>
                                </div>
                                <span className="text-[9px] text-[#6B5440] font-normal">{isCancelled ? 'Refund Issued' : isConfirmedByOutlet ? 'In Stock' : isDeliveredByDriver ? 'Unloaded' : 'Pending'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {requisitions.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-[#E2C799] text-[#6B5440]">
                    <Truck className="w-12 h-12 mx-auto mb-2 text-[#E2C799]" />
                    <p className="font-bold text-[#2D2319]">No requisitions placed yet</p>
                    <p className="text-xs text-[#6B5440] mt-1">
                      Click "+ Order Restock" to submit your first inventory requisition.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {requisitions.map((req) => {
                      const isCompleted = req.status === 'COMPLETED';
                      const isCancelled = req.status === 'CANCELLED' || req.status === 'CANCELLED_REFUNDED' || String(req.status).toUpperCase().startsWith('CANCEL');
                      const isDelivered = req.status === 'DELIVERED';
                      const isInTransit = req.status === 'IN_TRANSIT';
                      const isBoarded = req.status === 'BOARDED';
                      const isDispatched = req.status === 'DISPATCHED';

                      return (
                        <div
                          key={req.id}
                          className={`p-4 rounded-2xl bg-white border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            isCancelled
                              ? 'border-[#E29D94] bg-[#F6DBD4]/20'
                              : isInTransit
                              ? 'border-[#FFD18D] bg-[#FFD18D]/15'
                              : isBoarded
                              ? 'border-[#E2C799] bg-[#FDECAD]/20'
                              : 'border-[#E2C799] hover:border-[#FFD18D]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-[#2D2319] font-mono">
                                {req.requisition_code}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                                  isCancelled
                                    ? 'bg-[#F6DBD4] text-[#7C2D12] border border-[#E29D94]'
                                    : isCompleted
                                    ? 'bg-[#F5F1BB] text-[#365314] border border-[#D9D384]'
                                    : isDelivered
                                    ? 'bg-[#FFD18D] text-[#2D2319] border border-[#E2C799]'
                                    : isInTransit
                                    ? 'bg-[#FDECAD] text-[#2D2319] border border-[#E2C799] animate-pulse'
                                    : isBoarded
                                    ? 'bg-[#F7E6C9] text-[#2D2319] border border-[#E2C799]'
                                    : isDispatched
                                    ? 'bg-[#FAF4EB] text-[#2D2319] border border-[#E2C799]'
                                    : 'bg-[#FDECAD] text-[#2D2319] border border-[#E2C799]'
                                }`}
                              >
                                {isCancelled
                                  ? '⛔ Cancelled & Refunded'
                                  : isCompleted
                                  ? '✓ Delivered & Confirmed'
                                  : isDelivered
                                  ? '📦 Unloaded at Outlet'
                                  : isInTransit
                                  ? '🚚 On The Way to Outlet'
                                  : isBoarded
                                  ? '📦 Boarded by Delivery Team'
                                  : isDispatched
                                  ? '📋 Dispatched to Fleet'
                                  : '⏳ Order Placed (Pending Review)'}
                              </span>
                              {req.urgency === 'DIRECT_SUPPLY' ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFD18D] text-[#2D2319] font-black uppercase flex items-center gap-1 border border-[#E2C799]">
                                  <span>⚡ Direct Push (Unrequested)</span>
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#FAF4EB] text-[#433022] font-bold uppercase border border-[#E2C799]/40">
                                  {req.urgency} Urgency
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-[#2D2319]">
                              {req.product_name} • <span className="text-[#78350F] font-mono font-black">{req.quantity} units</span>
                            </p>

                            {/* Assigned Vehicle & Driver Details if Boarded / In Transit */}
                            {(req.vehicle_registration_no || req.driver_name) && (
                              <div className="flex items-center gap-2 text-xs text-[#2D2319] bg-[#FAF4EB] px-2.5 py-1 rounded-lg border border-[#E2C799] w-fit">
                                <Truck className="w-3.5 h-3.5 text-[#78350F] shrink-0" />
                                <span>Vehicle: <strong className="font-mono text-[#2D2319]">{req.vehicle_registration_no || 'Assigned'}</strong></span>
                                {req.driver_name && (
                                  <span>• Driver: <strong>{req.driver_name}</strong> {req.driver_phone ? `(${req.driver_phone})` : ''}</span>
                                )}
                              </div>
                            )}

                            {req.outlet_remarks && (
                              <p className="text-xs text-[#6B5440] italic">Notes: {req.outlet_remarks}</p>
                            )}
                            {req.admin_supplier_notes && (
                              <p className="text-xs text-[#78350F] font-medium">Supplier Memo: {req.admin_supplier_notes}</p>
                            )}
                          </div>

                          <div className="text-right text-xs text-[#6B5440] font-mono flex flex-col items-end justify-between">
                            <div>
                              <p>{new Date(req.created_date).toLocaleDateString()}</p>
                              <p>{new Date(req.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {req.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const amt = Number(req.total_amount || (req.quantity * (req.unit_price || 35)));
                                  setStripePaymentData({
                                    isOpen: true,
                                    amount: amt,
                                    requisitionId: req.id,
                                    title: `Settle Invoice: ${req.requisition_code}`,
                                    description: `Restock consignment payment for ${req.quantity} units of ${req.product_name}`,
                                  });
                                }}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-[#FFD18D]" />
                                <span>Pay ৳{Number(req.total_amount || (req.quantity * (req.unit_price || 35))).toFixed(2)} with Stripe</span>
                              </button>
                            )}

                            {/* In-Transit Direct Stock Offer Accept / Deny Options */}
                            {(() => {
                              const isDirectOffer = req.urgency === 'DIRECT_SUPPLY' || String(req.requisition_code).startsWith('OUT-OFFER-');
                              if (!isDirectOffer) return null;
                              const isOfferAccepted = req.admin_supplier_notes?.includes('ACCEPTED') || req.status === 'ACCEPTED';
                              const isOfferDenied = req.admin_supplier_notes?.includes('DENIED') || req.status === 'DENIED';
                              const isPending = !isOfferAccepted && !isOfferDenied;

                              if (isPending) {
                                return (
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRespondStockOffer(req.requisition_code || req.id, 'ACCEPT')}
                                      disabled={respondingOfferId === (req.requisition_code || req.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2D2319] hover:bg-[#433022] text-[#FDECAD] font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-[#FFD18D]" />
                                      <span>{respondingOfferId === (req.requisition_code || req.id) ? 'Accepting...' : 'Accept Stock'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRespondStockOffer(req.requisition_code || req.id, 'DENY')}
                                      disabled={respondingOfferId === (req.requisition_code || req.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E29D94] bg-[#F6DBD4] hover:bg-[#f3cac1] text-[#7C2D12] font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>{respondingOfferId === (req.requisition_code || req.id) ? 'Denying...' : 'Deny Stock'}</span>
                                    </button>
                                  </div>
                                );
                              }
                              if (isOfferAccepted) {
                                return (
                                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#365314] bg-[#F5F1BB] px-2.5 py-1 rounded-lg border border-[#D9D384]">
                                    <CheckCircle className="w-3 h-3 text-[#365314]" />
                                    <span>Stock Offer Accepted • In Transit</span>
                                  </span>
                                );
                              }
                              if (isOfferDenied) {
                                return (
                                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#7C2D12] bg-[#F6DBD4] px-2.5 py-1 rounded-lg border border-[#E29D94]">
                                    <X className="w-3 h-3 text-[#B91C1C]" />
                                    <span>Stock Offer Denied</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            {!isCompleted && !isCancelled && req.status !== 'OFFER_PENDING' && !req.admin_supplier_notes?.includes('DENIED') && req.status !== 'DENIED' && (isInTransit || isBoarded || isDispatched || isDelivered) && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrderAndRefund({
                                  requisitionId: req.id,
                                  dispatchId: req.dispatch_id,
                                  code: req.requisition_code,
                                  refundEstimate: Number(req.total_amount || (req.quantity * (req.unit_price || 35))),
                                })}
                                disabled={cancellingOrderId === req.id}
                                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E29D94] bg-[#F6DBD4] hover:bg-[#f3cac1] text-[#7C2D12] font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                title="Cancel order and request full refund"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>{cancellingOrderId === req.id ? 'Cancelling...' : 'Cancel Order & Refund'}</span>
                              </button>
                            )}

                            {isCancelled && (
                              <span className="mt-2 text-[11px] font-bold text-[#7C2D12] bg-[#F6DBD4] px-2.5 py-1 rounded-lg border border-[#E29D94]">
                                Refund Credited
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: DAILY SALES LEDGER */}
            {activeTab === 'ledger' && (
              <div className="space-y-5 animate-fade-in">
                {/* Ledger Top Header */}
                <div className="p-4 bg-white rounded-3xl border border-[#E2C799] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#2D2319] tracking-tight flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-[#78350F]" />
                      <span>BRANCH DAILY SALES LEDGER</span>
                    </h3>
                    <p className="text-xs text-[#6B5440]">Itemized log of customer transactions recorded at this register</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // Export simple CSV
                      if (salesHistory.length === 0) return;
                      const headers = ['Sale Code', 'Date', 'Product', 'Quantity', 'Unit Price', 'Total Amount', 'Payment Mode'];
                      const rows = salesHistory.map((s) => [
                        s.sale_code,
                        s.sale_date,
                        `"${s.product_name}"`,
                        s.quantity,
                        s.unit_price,
                        s.total_amount,
                        s.payment_method,
                      ]);
                      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `sales_ledger_${outlet?.outlet_id || 'branch'}_${Date.now()}.csv`;
                      a.click();
                    }}
                    className="py-2 px-3.5 rounded-xl border border-[#E2C799] hover:bg-[#FAF4EB] text-[#2D2319] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#78350F]" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {salesHistory.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-[#E2C799] text-[#6B5440]">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-[#E2C799]" />
                    <p className="font-bold text-[#2D2319]">No sales transactions logged yet</p>
                    <p className="text-xs text-[#6B5440] mt-1">
                      Transactions completed in POS will be recorded here immediately.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-[#E2C799] shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7E6C9] border-b border-[#E2C799] text-[#2D2319] uppercase font-black text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Receipt / Code</th>
                            <th className="py-3 px-4">Timestamp</th>
                            <th className="py-3 px-4">Beverage Item</th>
                            <th className="py-3 px-4 text-center">Qty</th>
                            <th className="py-3 px-4">Unit Price</th>
                            <th className="py-3 px-4">Total Paid</th>
                            <th className="py-3 px-4">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2C799]/40">
                          {salesHistory.map((s) => (
                            <tr key={s.id} className="hover:bg-[#FAF4EB]/60 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#2D2319]">
                                {s.sale_code}
                              </td>
                              <td className="py-3 px-4 text-[#6B5440] font-mono text-[11px]">
                                {new Date(s.sale_date).toLocaleString([], {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td className="py-3 px-4 font-bold text-[#2D2319]">
                                {s.product_name}
                              </td>
                              <td className="py-3 px-4 text-center font-black font-mono text-[#2D2319]">
                                {s.quantity}
                              </td>
                              <td className="py-3 px-4 font-mono text-[#433022]">
                                ৳{Number(s.unit_price).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 font-black font-mono text-[#2D2319]">
                                ৳{Number(s.total_amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDECAD] text-[#2D2319] border border-[#E2C799]/70 text-[10px] font-bold">
                                  {s.payment_method}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: BRANCH PROFILE & OPERATING SETTINGS */}
            {activeTab === 'profile' && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="bg-white rounded-3xl border border-[#E2C799] shadow-md p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#E2C799]/40 pb-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFD18D] text-[#2D2319] flex items-center justify-center shadow-md shadow-[#FFD18D]/30">
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#2D2319] tracking-tight">
                        BRANCH PROFILE & OPERATING DETAILS
                      </h3>
                      <p className="text-xs text-[#6B5440]">
                        Official franchise branch registry and geographic allocation
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#78350F]">Franchise Brand</span>
                      <p className="text-base font-black text-[#2D2319]">{outlet?.franchise_name || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#78350F]">Branch Identifier</span>
                      <p className="text-base font-black text-[#2D2319]">{outlet?.branch_name || outlet?.outlet_name || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#78350F]">City & Area</span>
                      <p className="text-base font-black text-[#2D2319]">
                        {outlet?.city || 'Dhaka'}, {outlet?.area || 'Gulshan'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#78350F]">Division</span>
                      <p className="text-base font-black text-[#2D2319]">{outlet?.division_name || 'Dhaka'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 space-y-1 sm:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-[#78350F]">Street Address</span>
                      <p className="text-sm font-semibold text-[#2D2319]">{outlet?.location_address || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#78350F]">Hotline Phone</span>
                      <p className="text-sm font-black text-[#2D2319] font-mono">{outlet?.contact_phone || '01900-112233'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#E2C799]/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#78350F]">Operating Status</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F5F1BB] text-[#365314] text-xs font-bold border border-[#D9D384]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {outlet?.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: Fast Point of Sale Modal */}
      <OutletSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        outletId={outlet?.outlet_id || activeOutletId}
        outletName={outlet?.outlet_name || 'Outlet Branch'}
        outletAddress={outlet?.location_address}
        outletPhone={outlet?.contact_phone}
        products={products}
        initialProductId={selectedProductIdForSale}
        onSaleCompleted={() => fetchDashboardData(outlet?.outlet_id || activeOutletId)}
      />

      {/* MODAL 2: Adjust Stock Count Modal */}
      <OutletAdjustStockModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        outletId={outlet?.outlet_id || activeOutletId}
        product={selectedProductForAdjust}
        onUpdated={() => fetchDashboardData(outlet?.outlet_id || activeOutletId)}
      />

      {/* MODAL 3: Requisition via Route Pre-Sales Officer Modal */}
      <OutletRequisitionModal
        isOpen={isRequisitionModalOpen}
        onClose={() => setIsRequisitionModalOpen(false)}
        outletId={outlet?.outlet_id || activeOutletId}
        outletName={outlet?.outlet_name || 'Outlet Branch'}
        products={products}
        preSalesOfficer={preSalesOfficer}
        initialProductId={selectedProductIdForReq}
        onSubmitted={() => fetchDashboardData(outlet?.outlet_id || activeOutletId)}
      />

      {/* MODAL 4: Full POS Cart Receipt */}
      <SaleReceiptModal
        isOpen={showPosReceipt}
        onClose={() => setShowPosReceipt(false)}
        receipt={posReceipt}
      />

      {/* Real-time Inbound Dispatch Notification Popup */}
      <NotificationPopup
        notification={popupNotification}
        onClose={dismissPopup}
        onAction={handleNotificationClick}
      />

      {/* Embedded Stripe Elements Modal for Outlet Requisition Invoice Payment */}
      <StripePaymentModal
        isOpen={stripePaymentData.isOpen}
        onClose={() => setStripePaymentData((prev) => ({ ...prev, isOpen: false }))}
        amount={stripePaymentData.amount}
        paymentType="OUTLET_REQUISITION"
        title={stripePaymentData.title}
        description={stripePaymentData.description}
        referenceId={stripePaymentData.requisitionId}
        metadata={{
          outlet_requisition_id: String(stripePaymentData.requisitionId),
          outlet_id: String(outlet?.outlet_id || activeOutletId),
        }}
        payloadData={{
          outlet_requisition_id: stripePaymentData.requisitionId,
          outlet_id: outlet?.outlet_id || activeOutletId,
        }}
        onSuccess={() => {
          fetchDashboardData(outlet?.outlet_id || activeOutletId);
        }}
      />
    </div>
  );
};
