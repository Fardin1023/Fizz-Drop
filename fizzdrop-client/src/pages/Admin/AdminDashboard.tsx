import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from './AdminLogin';
import { SupplierAvailableProducts } from './SupplierAvailableProducts';
import { SupplierRequestStock } from './SupplierRequestStock';
import { SupplierRequisitionHistory } from './SupplierRequisitionHistory';
import { SupplierProfileView } from './SupplierProfileView';
import { SupplierTransactionsView } from './SupplierTransactionsView';
import { SupplierAllocatedOutlets } from './SupplierAllocatedOutlets';
import { SupplierOutletRequisitions } from './SupplierOutletRequisitions';
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
  Wallet,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';

export const AdminDashboard: React.FC = () => {
  const { user, isSupplier, isSuperadmin, isAuthenticated, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'outlet-requests' | 'request' | 'history' | 'outlets' | 'profile' | 'transactions'>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);

  const fetchWallet = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/supplier/wallet?userId=${user?.user_id || 4}`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setWalletBalance(Number(data.wallet_balance || 0));
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
      id: 'catalog' as const,
      label: 'Available Products Catalog',
      shortLabel: 'Available Catalog',
      desc: 'Master items supplied by Superadmin',
      icon: Package,
      gradient: 'from-blue-600 via-indigo-600 to-cyan-600',
      badge: 'Catalog',
    },
    {
      id: 'outlet-requests' as const,
      label: 'Area Demands & Requisitions',
      shortLabel: 'Area Demands',
      desc: 'Restock orders channeled via assigned Sales Officers',
      icon: Store,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      badge: 'Area Demands',
      badgeHighlight: false,
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
    <div className="min-h-screen bg-slate-50/70 text-zinc-900 flex flex-col pb-16 selection:bg-blue-500/20 selection:text-blue-900">
      
      {/* Real-time Animated Notification Pop-up Window */}
      <NotificationPopup
        notification={popupNotification}
        onDismiss={dismissPopup}
        onAction={() => setActiveTab('history')}
      />

      {/* Top Admin Sub-Header (Ultra-Compact, Fixed at Top & Static) */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Top Row: Title, Role Badge, Home Navigation, and Controls */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {/* Home / Storefront Navigation Button */}
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs shrink-0"
                title="Return to Customer Storefront / Home"
              >
                <Home className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>

              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Truck className="w-3.5 h-3.5" />
              </div>

              <span className="font-oswald font-bold tracking-tight uppercase text-zinc-900 text-xs sm:text-sm truncate">
                Regional Supplier & Logistics Portal
              </span>

              <span className="rounded-full font-mono font-bold text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider shrink-0">
                {isSuperadmin ? 'Role 4: Superadmin' : 'Role 3: Supplier'}
              </span>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline truncate">
                ({user?.email})
              </span>

              {/* Supplier Commercial Wallet Pill */}
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-indigo-500/20 border border-emerald-500/30 text-emerald-800 font-bold text-xs transition-all cursor-pointer shadow-2xs group"
                title="Manage Commercial Wallet, Banking Accounts & Top-up"
              >
                <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Wallet className="w-3 h-3" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold leading-none">Wallet</span>
                  <span className="font-oswald text-xs font-black text-emerald-700 leading-tight">
                    ৳{walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-sans font-bold ml-0.5 hidden sm:inline">
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
                onSelectNotification={() => setActiveTab('history')}
                isScrolled={true}
              />

              <button
                onClick={logout}
                className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sign out of Supplier Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
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
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-2 sm:p-2.5 sticky top-[58px] flex flex-col gap-1.5 transition-all">
            
            {/* Sidebar Header: Toggle button and section title */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 tracking-wider uppercase truncate">
                    Supplier Hub
                  </span>
                </div>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                  isSidebarCollapsed ? 'mx-auto' : ''
                }`}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
                    onClick={() => setActiveTab(item.id)}
                    title={isSidebarCollapsed ? `${item.label} - ${item.desc}` : undefined}
                    className={`group relative flex items-center text-left transition-all duration-200 cursor-pointer rounded-xl ${
                      isSidebarCollapsed
                        ? 'p-2.5 justify-center'
                        : 'px-3 py-2.5 gap-3'
                    } ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-md shadow-indigo-500/15`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    {/* Active Glowing Pill Indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-xs" />
                    )}

                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-inner'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-xs'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {!isSidebarCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`block text-xs font-bold truncate ${
                              isActive ? 'text-white' : 'text-slate-800'
                            }`}
                          >
                            {item.shortLabel}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md uppercase font-bold shrink-0 ${
                                isActive
                                  ? 'bg-white/25 text-white'
                                  : item.badgeHighlight
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span
                          className={`block text-[10px] truncate leading-tight mt-0.5 ${
                            isActive ? 'text-white/80 font-normal' : 'text-slate-400 font-normal'
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
              <div className="pt-2 mt-2 border-t border-slate-100 px-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider truncate">
                      Superadmin Managed
                    </span>
                    <span className="block text-[9px] text-slate-500 truncate">
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
          {activeTab === 'catalog' && (
            <SupplierAvailableProducts
              onRequestStock={(prodId) => {
                setSelectedProductId(prodId);
                setActiveTab('request');
              }}
            />
          )}
          {activeTab === 'outlet-requests' && (
            <SupplierOutletRequisitions
              userId={user?.user_id || 4}
              onRequestRestockFromSuperadmin={(prodId) => {
                setSelectedProductId(prodId);
                setActiveTab('request');
              }}
            />
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
              onNavigateToCatalog={() => setActiveTab('catalog')}
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
        }}
      />
    </div>
  );
};

export default AdminDashboard;
