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
} from 'lucide-react';
import logoImg from '../../assets/img/fizzdrop-logo.png';
import { OutletSaleModal, type OutletProductItem } from './OutletSaleModal';
import { OutletAdjustStockModal } from './OutletAdjustStockModal';
import { OutletRequisitionModal } from './OutletRequisitionModal';
import { SaleReceiptModal, type ReceiptData } from './SaleReceiptModal';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { StripePaymentModal } from '../../components/Payment/StripePaymentModal';

export const OutletDashboard: React.FC = () => {
  const { user, outlet: authOutlet, isAuthenticated, isOutlet, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['inventory', 'pos', 'request', 'deliveries', 'ledger', 'profile'];
  const initialTab = (searchParams.get('tab') as any) || 'inventory';
  const [activeTab, setActiveTab] = useState<'inventory' | 'pos' | 'request' | 'deliveries' | 'ledger' | 'profile'>(
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
    setSearchParams({ tab: newTab }, { replace: true });
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
  const effectiveOutletId = authOutlet?.outlet_id || user?.branch_id || 2;
  const [outlet, setOutlet] = useState<any>(authOutlet || null);
  const [preSalesOfficer, setPreSalesOfficer] = useState<any | null>(null);
  const [allOutlets, setAllOutlets] = useState<any[]>([]);
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
  } = useNotifications('OUTLET', Number(effectiveOutletId));

  // Customer order alert banner state
  const [customerOrderAlert, setCustomerOrderAlert] = useState<any | null>(null);

  // Auto-refresh shelf stock and delivery tracker when a dispatch notification arrives
  useEffect(() => {
    if (popupNotification && (popupNotification.recipient_role as any) === 'OUTLET') {
      fetchDashboardData(outlet?.outlet_id || effectiveOutletId, true);
    }
  }, [popupNotification, effectiveOutletId]);

  // Real-time listener for Customer Purchases from Customer UI via BroadcastChannel & LocalStorage
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        if (event.data?.type === 'CUSTOMER_PURCHASE') {
          const currentId = Number(outlet?.outlet_id || effectiveOutletId);
          if (Number(event.data.outlet_id) === currentId) {
            setCustomerOrderAlert(event.data);
            fetchDashboardData(currentId, true);
          }
        } else if (event.data?.type === 'PSR_STOCK_DISPATCHED') {
          const currentId = Number(outlet?.outlet_id || effectiveOutletId);
          if (!event.data.outlet_id || Number(event.data.outlet_id) === currentId) {
            fetchDashboardData(currentId, true);
          }
        }
      };
    } catch (ignored) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fizzdrop_last_sale_event') {
        const currentId = Number(outlet?.outlet_id || effectiveOutletId);
        fetchDashboardData(currentId, true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Periodic silent background sync every 25 seconds to keep shelf stock updated without flashing the screen
    const pollInterval = setInterval(() => {
      fetchDashboardData(outlet?.outlet_id || effectiveOutletId, true);
    }, 25000);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
    };
  }, [effectiveOutletId]);

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
  const fetchDashboardData = async (targetOutletId = effectiveOutletId, isSilent = false) => {
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
      hasLoadedOnceRef.current = true;
    } catch (err) {
      // ignore
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(effectiveOutletId);
  }, [effectiveOutletId]);

  // Auth navigation guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/outlet/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Switch branch
  const handleSwitchBranch = (newOutletId: number) => {
    fetchDashboardData(newOutletId);
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
        const res = await fetch(`http://localhost:8080/api/inventory/outlet/${outlet?.outlet_id || effectiveOutletId}/sell`, {
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
      fetchDashboardData(outlet?.outlet_id || effectiveOutletId);
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
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* TOP HEADER HUD */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Branch Title */}
          <div className="flex items-center gap-3.5">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 p-1 border border-emerald-200 flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                <img src={logoImg} alt="FizzDrop" className="w-full h-full object-contain" />
              </div>
            </Link>

            <div className="h-7 w-[1px] bg-slate-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{outlet?.franchise_name || 'Franchise'}</span>
                  <span className="text-slate-400 font-normal">—</span>
                  <span className="text-emerald-700 font-bold">{outlet?.branch_name || outlet?.outlet_name || 'Branch'}</span>
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 uppercase">
                  {outlet?.city || 'Dhaka'} • {outlet?.area || 'Retail Hub'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
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
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Record Sale (POS)</span>
              <span className="sm:hidden">POS</span>
            </button>

            {/* Quick Restock Order */}
            <button
              onClick={() => {
                setSelectedProductIdForReq(null);
                setIsRequisitionModalOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer hidden md:flex"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Order Restock</span>
            </button>

            {/* Branch Switcher Dropdown */}
            {allOutlets.length > 1 && (
              <select
                value={outlet?.outlet_id || effectiveOutletId}
                onChange={(e) => handleSwitchBranch(Number(e.target.value))}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer hidden lg:block"
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
              className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD HERO KPI BANNER */}
      <section className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>FRANCHISE RETAIL OUTLET PORTAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {outlet?.outlet_name || 'Outlet Branch'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 max-w-xl">
              Live beverage shelf inventory, customer transactions, stock adjustments & regional supplier restocks.
            </p>
          </div>

          {/* Quick KPI Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Total Units</p>
              <p className="text-2xl font-black text-white mt-0.5 font-mono">{kpi.total_stock_units}</p>
              <p className="text-[10px] text-slate-300">On Shelf & Backroom</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300">Low Stock</p>
              <p className="text-2xl font-black text-amber-400 mt-0.5 font-mono">{kpi.low_stock_count}</p>
              <p className="text-[10px] text-slate-300">&le; 15 units remaining</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-[10px] uppercase tracking-wider font-bold text-cyan-300">Today Sales</p>
              <p className="text-2xl font-black text-white mt-0.5 font-mono">{kpi.today_sales_count}</p>
              <p className="text-[10px] text-slate-300">Receipts generated</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Today Revenue</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5 font-mono">৳{Number(kpi.today_sales_revenue).toFixed(0)}</p>
              <p className="text-[10px] text-slate-300">Collected today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Assigned Route Pre-Sales Officer (PSR) Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="p-4 rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-emerald-50 border border-orange-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-black flex items-center justify-center text-xs shadow-md shadow-orange-500/20 shrink-0">
              PSR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-orange-950">
                  Exclusive Route Pre-Sales Officer (PSR)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                  Primary Contact
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {preSalesOfficer?.name || outlet?.assigned_psr_name || 'Assigned Territory Officer'}
                {(preSalesOfficer?.code || outlet?.assigned_psr_code) && (
                  <span className="text-xs font-mono text-orange-700 font-semibold ml-1.5">
                    ({preSalesOfficer?.code || outlet?.assigned_psr_code})
                  </span>
                )}
                <span className="text-xs text-slate-500 font-normal ml-2">
                  • Sub-Route: <strong className="font-semibold text-slate-700">{preSalesOfficer?.sub_route || outlet?.sub_route || 'Territory Sub-Route'}</strong>
                </span>
                {(preSalesOfficer?.phone || outlet?.assigned_psr_phone) && (
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    • 📞 <strong className="font-semibold text-slate-700">{preSalesOfficer?.phone || outlet?.assigned_psr_phone}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (products.length > 0) setSelectedProductIdForReq(products[0].product_id);
                setIsRequisitionModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Truck className="w-3.5 h-3.5" />
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
            <div className="sticky top-24 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-3 space-y-1.5">
              <div className="hidden lg:flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider text-slate-400 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Outlet Modules
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
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
                        ? `bg-gradient-to-r ${sec.gradient} text-white shadow-md shadow-emerald-900/15`
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 group-hover:text-emerald-700'
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
                                  ? 'bg-white/20 text-white'
                                  : sec.badgeHighlight
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-500'
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
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xl shadow-emerald-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in border border-emerald-400/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase tracking-wide">
                        ⚡ New Customer Order Received!
                      </span>
                      <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full font-bold">
                        {customerOrderAlert.sale_code || 'PROCESSED'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      Customer bought <strong className="text-white">{customerOrderAlert.quantity}x {customerOrderAlert.product_name}</strong> for{' '}
                      <strong className="text-yellow-300">৳{Number(customerOrderAlert.total_amount).toFixed(2)}</strong> via{' '}
                      <span className="underline">{customerOrderAlert.payment_method}</span>. Shelf inventory &amp; Today's Revenue updated automatically!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 text-xs font-bold hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
                  >
                    View in Ledger →
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerOrderAlert(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
                <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search beverages by brand, SKU, flavor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brand Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Brands:</span>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-600'
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
                    <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-slate-600">No beverages match your filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing search terms or selecting 'All Items'.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProducts.map((p) => {
                      const isLow = p.stock_quantity > 0 && p.stock_quantity <= 15;
                      const isZero = p.stock_quantity === 0;

                      return (
                        <div
                          key={p.product_id}
                          className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300/60 transition-all p-5 flex flex-col justify-between group relative overflow-hidden"
                        >
                          {/* Top Stock Status Badge */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.brand} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-6 h-6 text-slate-400" />
                              )}
                            </div>

                            <div className="text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isZero
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {isZero ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                              </span>
                              <p className="text-xs font-black text-slate-900 font-mono mt-1">
                                ৳{Number((p as any).retail_price || p.base_price || 25).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Details */}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {p.category || 'Carbonated Drink'} • {p.packaging || 'Bottle'}
                            </span>
                            <h4 className="text-base font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                              {p.brand} {p.flavor_variant}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-mono">
                              SKU: {p.sku || 'N/A'} • {p.size_volume || '250ml'}
                            </p>
                          </div>

                          {/* Live Shelf Quantity Display */}
                          <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Shelf Stock:
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-xl font-black font-mono ${
                                  isZero ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                                }`}
                              >
                                {p.stock_quantity}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">units</span>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                            {/* Record Sale */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductIdForSale(p.product_id);
                                setIsSaleModalOpen(true);
                              }}
                              disabled={isZero}
                              className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
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
                              className="py-2 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Order stock from Regional Supplier"
                            >
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>Restock</span>
                            </button>

                            {/* Adjust Stock */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductForAdjust(p);
                                setIsAdjustModalOpen(true);
                              }}
                              className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Adjust physical inventory count"
                            >
                              <Sliders className="w-3 h-3 text-slate-500" />
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
                  <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                        <span>QUICK COUNTER REGISTER</span>
                      </h3>
                      <p className="text-xs text-slate-500">Tap any beverage to add it to customer cart</p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
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
                          className="p-3.5 rounded-2xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-left transition-all flex flex-col justify-between shadow-xs disabled:opacity-40 cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                              Stock: {p.stock_quantity}
                            </span>
                            <span className="text-xs font-black text-slate-900 font-mono">
                              ৳{Number((p as any).retail_price || p.base_price || 25).toFixed(0)}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-900 group-hover:text-emerald-700 truncate">
                              {p.brand} {p.flavor_variant}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {p.packaging} • {p.size_volume}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
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
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 space-y-4 sticky top-24">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Bill / Cart</h4>
                        <p className="text-[11px] text-slate-500 font-mono">{outlet?.outlet_name}</p>
                      </div>
                      {posCart.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPosCart([])}
                          className="text-[11px] text-rose-600 hover:underline font-bold"
                        >
                          Clear Cart
                        </button>
                      )}
                    </div>

                    {posError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{posError}</span>
                      </div>
                    )}

                    {/* Cart Items List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {posCart.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p>Cart is currently empty.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Click beverages on the left to add items.</p>
                        </div>
                      ) : (
                        posCart.map((item) => {
                          const itemPrice = Number((item.product as any).retail_price || item.product.base_price || 25);
                          const sub = itemPrice * item.qty;
                          return (
                            <div
                              key={item.product.product_id}
                              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {item.product.brand} {item.product.flavor_variant}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  ৳{Number((item.product as any).retail_price || item.product.base_price || 25).toFixed(2)} each
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Stepper */}
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-1.5 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePosQty(item.product.product_id, -1)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-600 font-bold hover:text-slate-900"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black font-mono px-1">{item.qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePosQty(item.product.product_id, 1)}
                                    disabled={item.qty >= item.product.stock_quantity}
                                    className="w-5 h-5 flex items-center justify-center text-slate-600 font-bold hover:text-slate-900 disabled:opacity-30"
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="text-xs font-black text-slate-900 font-mono w-14 text-right">
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
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
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
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
                        />

                        {/* Total Due Banner */}
                        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Payable</span>
                            <p className="text-xs text-emerald-400">
                              {posCart.reduce((s, i) => s + i.qty, 0)} item(s) in bill
                            </p>
                          </div>
                          <span className="text-2xl font-black font-mono text-emerald-400">
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
                          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                        >
                          {posSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
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

            {/* TAB 3: REQUEST STOCK REQUISITION */}
            {activeTab === 'request' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-md space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        ORDER RESTOCK VIA ROUTE PRE-SALES OFFICER (PSR)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Orders are placed exclusively with your assigned Route Pre-Sales Officer for sub-route delivery.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/60 text-xs text-orange-950 space-y-1">
                    <p className="font-bold">
                      Assigned Officer: {preSalesOfficer?.name || outlet?.assigned_psr_name || 'Territory PSR'} 
                      {(preSalesOfficer?.code || outlet?.assigned_psr_code) && ` (${preSalesOfficer?.code || outlet?.assigned_psr_code})`}
                    </p>
                    <p className="text-orange-800">
                      Sub-Route: {preSalesOfficer?.sub_route || outlet?.sub_route || 'Local Sub-Route'}. Your Route Officer verifies stock orders and personally executes or coordinates delivery replenishment to your shop.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductIdForReq(null);
                      setIsRequisitionModalOpen(true);
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 hover:from-orange-700 hover:to-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Open New Order to Pre-Sales Officer</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: INBOUND DELIVERIES & REQUISITIONS HISTORY */}
            {activeTab === 'deliveries' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                      <span>INBOUND DELIVERIES & ORDER TRACKER</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Track beverage restock requests and depot shipments sent to this branch
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchDashboardData(outlet?.outlet_id || effectiveOutletId)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {requisitions.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                    <Truck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No requisitions placed yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "+ Order Restock" to submit your first inventory requisition.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {requisitions.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              {req.requisition_code}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                                req.status === 'DELIVERED' || req.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'DISPATCHED'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.status}
                            </span>
                            {req.urgency === 'DIRECT_SUPPLY' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black uppercase flex items-center gap-1 border border-purple-200">
                                <span>⚡ Direct Push (Unrequested)</span>
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold uppercase">
                                {req.urgency} Urgency
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-800">
                            {req.product_name} • <span className="text-blue-600 font-mono font-black">{req.quantity} units</span>
                          </p>
                          {req.outlet_remarks && (
                            <p className="text-xs text-slate-500 italic">Notes: {req.outlet_remarks}</p>
                          )}
                          {req.admin_supplier_notes && (
                            <p className="text-xs text-indigo-600 font-medium">Supplier Memo: {req.admin_supplier_notes}</p>
                          )}
                        </div>

                        <div className="text-right text-xs text-slate-400 font-mono flex flex-col items-end justify-between">
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
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay ৳{Number(req.total_amount || (req.quantity * (req.unit_price || 35))).toFixed(2)} with Stripe</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: DAILY SALES LEDGER */}
            {activeTab === 'ledger' && (
              <div className="space-y-5 animate-fade-in">
                {/* Ledger Top Header */}
                <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-amber-600" />
                      <span>BRANCH DAILY SALES LEDGER</span>
                    </h3>
                    <p className="text-xs text-slate-500">Itemized log of customer transactions recorded at this register</p>
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
                    className="py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {salesHistory.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No sales transactions logged yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Transactions completed in POS will be recorded here immediately.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
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
                        <tbody className="divide-y divide-slate-100">
                          {salesHistory.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-800">
                                {s.sale_code}
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                {new Date(s.sale_date).toLocaleString([], {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {s.product_name}
                              </td>
                              <td className="py-3 px-4 text-center font-black font-mono">
                                {s.quantity}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                ৳{Number(s.unit_price).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 font-black font-mono text-emerald-700">
                                ৳{Number(s.total_amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
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
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        BRANCH PROFILE & OPERATING DETAILS
                      </h3>
                      <p className="text-xs text-slate-500">
                        Official franchise branch registry and geographic allocation
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Franchise Brand</span>
                      <p className="text-base font-black text-slate-900">{outlet?.franchise_name || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Branch Identifier</span>
                      <p className="text-base font-black text-slate-900">{outlet?.branch_name || outlet?.outlet_name || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">City & Area</span>
                      <p className="text-base font-black text-slate-900">
                        {outlet?.city || 'Dhaka'}, {outlet?.area || 'Gulshan'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Division</span>
                      <p className="text-base font-black text-slate-900">{outlet?.division_name || 'Dhaka'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1 sm:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Street Address</span>
                      <p className="text-sm font-semibold text-slate-800">{outlet?.location_address || 'N/A'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Hotline Phone</span>
                      <p className="text-sm font-black text-slate-800 font-mono">{outlet?.contact_phone || '01900-112233'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Operating Status</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
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
        outletId={outlet?.outlet_id || effectiveOutletId}
        outletName={outlet?.outlet_name || 'Outlet Branch'}
        outletAddress={outlet?.location_address}
        outletPhone={outlet?.contact_phone}
        products={products}
        initialProductId={selectedProductIdForSale}
        onSaleCompleted={() => fetchDashboardData(outlet?.outlet_id || effectiveOutletId)}
      />

      {/* MODAL 2: Adjust Stock Count Modal */}
      <OutletAdjustStockModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        outletId={outlet?.outlet_id || effectiveOutletId}
        product={selectedProductForAdjust}
        onUpdated={() => fetchDashboardData(outlet?.outlet_id || effectiveOutletId)}
      />

      {/* MODAL 3: Requisition via Route Pre-Sales Officer Modal */}
      <OutletRequisitionModal
        isOpen={isRequisitionModalOpen}
        onClose={() => setIsRequisitionModalOpen(false)}
        outletId={outlet?.outlet_id || effectiveOutletId}
        outletName={outlet?.outlet_name || 'Outlet Branch'}
        products={products}
        preSalesOfficer={preSalesOfficer}
        initialProductId={selectedProductIdForReq}
        onSubmitted={() => fetchDashboardData(outlet?.outlet_id || effectiveOutletId)}
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
          outlet_id: String(outlet?.outlet_id || effectiveOutletId),
        }}
        payloadData={{
          outlet_requisition_id: stripePaymentData.requisitionId,
          outlet_id: outlet?.outlet_id || effectiveOutletId,
        }}
        onSuccess={() => {
          fetchDashboardData(outlet?.outlet_id || effectiveOutletId);
        }}
      />
    </div>
  );
};
