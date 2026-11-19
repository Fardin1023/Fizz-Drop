import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from './AdminLogin';
import { SupplierRequestStock } from './SupplierRequestStock';
import { SupplierRequisitionHistory } from './SupplierRequisitionHistory';
import { SupplierProfileView } from './SupplierProfileView';
import { SupplierTransactionsView } from './SupplierTransactionsView';
import { SupplierAllocatedOutlets } from './SupplierAllocatedOutlets';
import { SupplierOutletRequisitions } from './SupplierOutletRequisitions';
import { SupplierStockSalesTracking } from './SupplierStockSalesTracking';
import { SupplierDeliveryManagement } from './SupplierDeliveryManagement';
import { SupplierWalletModal } from './SupplierWalletModal';
import {
  Package,
  LogOut,
  Truck,
  ClipboardList,
  Building,
  Home,
  ChevronLeft,
  Menu,
  Sparkles,
  ShieldCheck,
  Receipt,
  Warehouse,
  Store,
  Boxes,
  TrendingUp,
  Wallet,
  Users,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getNotificationDestination } from '../../utils/notificationRouter';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
import supplierLogo from '../../assets/img/supplier-logo.jpg';

export const AdminDashboard: React.FC = () => {
  const { user, isSupplier, isSuperadmin, isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'outlet-requests';
  const validTabs = ['outlet-requests', 'stock-sales-dispatch', 'delivery-fleet', 'request', 'history', 'outlets', 'profile', 'transactions'];
  const [activeTab, setActiveTab] = useState<'outlet-requests' | 'stock-sales-dispatch' | 'delivery-fleet' | 'request' | 'history' | 'outlets' | 'profile' | 'transactions'>(
    validTabs.includes(initialTab) ? initialTab : 'outlet-requests'
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
    const dest = getNotificationDestination(n, 'SUPPLIER');
    if (dest.path === '/admin' && validTabs.includes(dest.tab)) {
      handleTabChange(dest.tab);
    } else {
      navigate(dest.fullUrl);
    }
  };
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('fizzdrop_supplier_wallet');
      if (cached) {
        const val = parseFloat(cached);
        if (!isNaN(val) && val < 100000000000) {
          return val;
        }
      }
      return 0;
    } catch {
      return 0;
    }
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);

  const fetchWallet = async () => {
    try {
      const targetUserId = user?.user_id || 4;
      const res = await fetch(`http://localhost:8080/api/v1/supplier/wallet?userId=${targetUserId}`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data && data.wallet_balance !== undefined) {
            const bal = Number(data.wallet_balance);
            setWalletBalance(bal);
            localStorage.setItem('fizzdrop_supplier_wallet', bal.toString());
          }
        } catch {
          // Silent fallback if non-JSON returned
        }
      }
    } catch (e) {
      console.error('Failed to load wallet balance', e);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fizzdrop_supplier_wallet_refresh') {
        fetchWallet();
      } else if (e.key === 'fizzdrop_supplier_wallet') {
        if (e.newValue) {
          const val = parseFloat(e.newValue);
          if (!isNaN(val) && val < 100000000000) {
            setWalletBalance(val);
          } else {
            fetchWallet();
          }
        } else {
          fetchWallet();
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SUPPLIER_WALLET_UPDATED' || event.data?.type === 'OUTLET_DELIVERY_CONFIRMED') {
          fetchWallet();
        }
      };
    } catch (ignored) {}

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  const {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
  } = useNotifications('SUPPLIER', user?.user_id || 4);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Guard: Only Supplier or Superadmin can access
  if (!isAuthenticated || (!isSupplier && !isSuperadmin)) {
    return <AdminLogin requiredRole="supplier" />;
  }

  const navSections = [
    {
      id: 'outlet-requests' as const,
      label: 'Area Demands & Requisitions',
      shortLabel: 'Area Demands',
      desc: 'Restock orders channeled via assigned Sales Officers',
      icon: Store,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      badge: 'Area Demands',
      badgeHighlight: notifications.some((n) => (n.type === 'SO_STOCK_REQUEST_FOR_OUTLET' || n.type === 'SALES_OFFICER_REQUISITION' || n.type === 'NEW_REQUISITION') && !n.is_read),
    },
    {
      id: 'stock-sales-dispatch' as const,
      label: 'Stock Sales & Outlet Dispatch Tracking',
      shortLabel: 'Sold vs Dispatched',
      desc: 'Monitor wholesale stock sold vs quantities dispatched to outlets',
      icon: TrendingUp,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      badge: 'Fulfillment',
    },
    {
      id: 'delivery-fleet' as const,
      label: 'Vehicle Deliveries & Fleet Logistics',
      shortLabel: 'Vehicle Deliveries',
      desc: 'Dispatch vehicles, manage delivery teams & fulfill subroutes',
      icon: Truck,
      gradient: 'from-blue-600 via-indigo-600 to-cyan-600',
      badge: 'Fleet',
    },
    {
      id: 'request' as const,
      label: 'Request Stock Requisition',
      shortLabel: 'Request Stock',
      desc: 'Submit new inventory order to Superadmin',
      icon: Truck,
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      badge: 'Order Stock',
    },
    {
      id: 'history' as const,
      label: 'Requisitions History & Tracking',
      shortLabel: 'Order History',
      desc: 'Live order statuses, approvals & dispatches',
      icon: ClipboardList,
      gradient: 'from-cyan-600 via-teal-600 to-blue-600',
      badge: unreadCount > 0 ? `${unreadCount} NEW` : 'Tracking',
      badgeHighlight: unreadCount > 0,
    },
    {
      id: 'outlets' as const,
      label: 'Assigned Sales Officers & Territory',
      shortLabel: 'Sales Officers',
      desc: 'Superadmin assigned sales officers & territory coverage',
      icon: Users,
      gradient: 'from-amber-600 via-orange-600 to-red-600',
      badge: 'Sales Officers',
    },
    {
      id: 'profile' as const,
      label: 'Assigned Profile & Territory',
      shortLabel: 'Assigned Territory',
      desc: 'Superadmin allotted coverage & details',
      icon: Building,
      gradient: 'from-purple-600 via-pink-600 to-rose-600',
      badge: 'Read-Only',
    },
    {
      id: 'transactions' as const,
      label: 'Financial Ledger & Returns',
      shortLabel: 'Ledger & Returns',
      desc: 'Spending, refunds, returns & PDF statements',
      icon: Receipt,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      badge: 'Statement',
    },
  ];

  return (
    <div className="supplier-theme min-h-screen bg-[#EEF9FA] text-[#15221C] flex flex-col pb-16 selection:bg-[#C8F1E8] selection:text-[#111D17]">
      
      {/* Real-time Animated Notification Pop-up Window */}
      <NotificationPopup
        notification={popupNotification}
        onDismiss={dismissPopup}
        onAction={handleNotificationClick}
      />

      {/* Top Admin Sub-Header (Ultra-Compact, Fixed at Top & Static) */}
      <div className="sticky top-0 z-50 bg-[#DEFDEF]/95 backdrop-blur-md border-b border-[#BFC8C5] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Top Row: Title, Role Badge, Home Navigation, and Controls */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {/* Home / Storefront Navigation Button */}
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#15221C] hover:text-[#0E1813] bg-[#EEF9FA] hover:bg-[#C8F1E8] border border-[#BFC8C5] transition-colors shadow-2xs shrink-0"
                title="Return to Customer Storefront / Home"
              >
                <Home className="w-3.5 h-3.5 text-[#15221C]" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>

              <img
                src={supplierLogo}
                alt="Regional Supplier Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-xs border border-[#BFC8C5] shrink-0 transform hover:scale-105 transition-transform"
              />

              <span className="font-oswald font-bold tracking-tight uppercase text-[#15221C] text-xs sm:text-sm truncate">
                Regional Supplier & Logistics Portal
              </span>

              <span className="rounded-full font-mono font-bold text-[9px] px-2 py-0.5 bg-[#C8F1E8] text-[#15221C] border border-[#BFC8C5] uppercase tracking-wider shrink-0">
                {isSuperadmin ? 'Role 4: Superadmin' : 'Role 3: Supplier'}
              </span>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-[#4A5852] font-mono hidden md:inline truncate">
                ({user?.email})
              </span>

              {/* Supplier Commercial Wallet Pill */}
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FFE8BD] hover:bg-[#FADECF] border border-[#BFC8C5] text-[#15221C] font-bold text-xs transition-all cursor-pointer shadow-2xs group"
                title="Manage Commercial Wallet, Banking Accounts & Top-up"
              >
                <div className="w-5 h-5 rounded-lg bg-[#C8F1E8] text-[#15221C] flex items-center justify-center shrink-0 border border-[#BFC8C5] group-hover:scale-105 transition-transform">
                  <Wallet className="w-3 h-3 text-[#15221C]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[8px] uppercase tracking-wider text-[#4A5852] font-bold leading-none">Wallet</span>
                  <span className="font-oswald text-xs font-black text-[#15221C] leading-tight">
                    ৳{walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#C8F1E8] text-[#15221C] border border-[#BFC8C5] font-sans font-bold ml-0.5 hidden sm:inline">
                  + Top Up
                </span>
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
                onClick={logout}
                className="p-1 rounded-md text-[#4A5852] hover:text-[#7D2828] bg-[#EEF9FA] hover:bg-[#FADECF] border border-[#BFC8C5] transition-colors cursor-pointer"
                title="Sign out of Supplier Portal"
              >
                <LogOut className="w-3.5 h-3.5 text-[#15221C]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Container with Animated Left Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3.5 sm:mt-4 flex-1 w-full min-w-0 flex flex-col md:flex-row gap-4 sm:gap-6">
        
        {/* Animated Expandable/Collapsible Left Sidebar */}
        <aside
          className={`shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'w-full md:w-16' : 'w-full md:w-64'
          }`}
        >
          <div className="bg-[#DEFDEF]/95 backdrop-blur-md rounded-2xl border border-[#BFC8C5] shadow-xs p-2 sm:p-2.5 sticky top-[58px] flex flex-col gap-1.5 transition-all">
            
            {/* Sidebar Header: Toggle button and section title */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#BFC8C5]">
              {!isSidebarCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={supplierLogo}
                    alt="Supplier Emblem"
                    className="w-5 h-5 rounded-md object-cover shadow-2xs border border-[#BFC8C5] shrink-0"
                  />
                  <span className="text-[11px] font-bold text-[#15221C] tracking-wider uppercase truncate">
                    Supplier Hub
                  </span>
                </div>
              ) : (
                <img
                  src={supplierLogo}
                  alt="Supplier"
                  className="w-7 h-7 rounded-lg object-cover shadow-2xs mx-auto border border-[#BFC8C5]"
                />
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-1 rounded-lg text-[#4A5852] hover:text-[#15221C] bg-[#EEF9FA] hover:bg-[#C8F1E8] border border-[#BFC8C5] transition-colors cursor-pointer ${
                  isSidebarCollapsed ? 'mx-auto' : ''
                }`}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <Menu className="w-4 h-4 text-[#15221C]" /> : <ChevronLeft className="w-4 h-4 text-[#15221C]" />}
              </button>
            </div>

            {/* Navigation Items */}
            <div className="flex flex-col gap-1 pt-1">
              {navSections.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    title={isSidebarCollapsed ? `${item.label} - ${item.desc}` : undefined}
                    className={`group relative flex items-center text-left transition-all duration-200 cursor-pointer rounded-xl ${
                      isSidebarCollapsed
                        ? 'p-2.5 justify-center'
                        : 'px-3 py-2.5 gap-3'
                    } ${
                      isActive
                        ? 'bg-[#FFE8BD] text-[#15221C] shadow-xs border border-[#BFC8C5] font-bold'
                        : 'bg-[#EEF9FA] hover:bg-[#C8F1E8] text-[#384640] hover:text-[#15221C] border border-[#BFC8C5]'
                    }`}
                  >
                    {/* Active Glowing Pill Indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#15221C] rounded-r-full shadow-xs" />
                    )}

                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition-transform group-hover:scale-105 border border-[#BFC8C5] ${
                        isActive
                          ? 'bg-[#C8F1E8] text-[#15221C]'
                          : 'bg-[#DEFDEF] text-[#15221C] group-hover:bg-[#FFE8BD]'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 text-[#15221C]" />
                    </div>

                    {!isSidebarCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`block text-xs font-bold truncate text-[#15221C]`}
                          >
                            {item.shortLabel}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md uppercase font-bold shrink-0 border border-[#BFC8C5] ${
                                isActive
                                  ? 'bg-[#C8F1E8] text-[#15221C]'
                                  : item.badgeHighlight
                                  ? 'bg-[#FADECF] text-[#7D2828] animate-pulse font-extrabold'
                                  : 'bg-[#EEF9FA] text-[#4A5852]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span
                          className={`block text-[10px] truncate leading-tight mt-0.5 ${
                            isActive ? 'text-[#1E2E27] font-medium' : 'text-[#4A5852] font-normal'
                          }`}
                        >
                          {item.desc}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Footer: Authority Info Card */}
            {!isSidebarCollapsed && (
              <div className="pt-2 mt-2 border-t border-[#BFC8C5] px-1">
                <div className="p-2.5 rounded-xl bg-[#EEF9FA] border border-[#BFC8C5] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#C8F1E8] border border-[#BFC8C5] text-[#15221C] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#15221C]" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-[#15221C] uppercase tracking-wider truncate">
                      Superadmin Managed
                    </span>
                    <span className="block text-[9px] text-[#4A5852] truncate">
                      Hard-copy verified profile
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Dynamic Main Content Workspace */}
        <main className="flex-1 min-w-0 w-full">
          {activeTab === 'outlet-requests' && (
            <SupplierOutletRequisitions
              userId={user?.user_id || 4}
              onRequestRestockFromSuperadmin={(prodId) => {
                setSelectedProductId(prodId);
                setActiveTab('request');
              }}
              onNavigateToTracking={() => setActiveTab('stock-sales-dispatch')}
            />
          )}
          {activeTab === 'stock-sales-dispatch' && (
            <SupplierStockSalesTracking
              userId={user?.user_id || 4}
              onNavigateToRequisitions={() => setActiveTab('outlet-requests')}
              onRequestStock={(prodId) => {
                setSelectedProductId(prodId);
                setActiveTab('request');
              }}
            />
          )}
          {activeTab === 'delivery-fleet' && (
            <SupplierDeliveryManagement userId={user?.user_id || 4} />
          )}
          {activeTab === 'request' && (
            <SupplierRequestStock
              initialProductId={selectedProductId}
              onRequisitionSubmitted={() => {
                setSelectedProductId(undefined);
                setActiveTab('history');
              }}
              onNavigateToSettings={() => setActiveTab('profile')}
            />
          )}
          {activeTab === 'history' && (
            <SupplierRequisitionHistory onNewRequisitionClick={() => setActiveTab('request')} />
          )}
          {activeTab === 'outlets' && (
            <SupplierAllocatedOutlets
              onNavigateToCatalog={() => setActiveTab('request')}
              onRequestStock={(prodId) => {
                setSelectedProductId(prodId);
                setActiveTab('request');
              }}
            />

          )}
          {activeTab === 'profile' && <SupplierProfileView onViewAllocatedOutlets={() => setActiveTab('outlets')} />}
          {activeTab === 'transactions' && <SupplierTransactionsView />}
        </main>
      </div>

      {/* Commercial Digital Wallet & Top-up Modal */}
      <SupplierWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        initialBalance={walletBalance}
        userId={user?.user_id}
        onWalletUpdated={(newBal) => {
          setWalletBalance(newBal);
          localStorage.setItem('fizzdrop_supplier_wallet', newBal.toString());
        }}
      />
    </div>
  );
};

export default AdminDashboard;
