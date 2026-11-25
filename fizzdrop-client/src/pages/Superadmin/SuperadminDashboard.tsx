import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from '../Admin/AdminLogin';
import {
  ShieldCheck,
  Building2,
  Database,
  Terminal,
  LogOut,
  Settings,
  Radio,
  Boxes,
  ClipboardList,
  Home,
  Package,
  Users,
  Crown,
  ArrowRight,
  Sparkles,
  TrendingUp,
  UserCheck,
  Store,
  Truck,
  Navigation,
  Gift,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getNotificationDestination } from '../../utils/notificationRouter';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
import superadminLogo from '../../assets/img/superadmin-logo.jpg';
import { SuperadminSidebarNav, type SuperadminTab } from './SuperadminSidebarNav';

// Code-split dynamic tabs with React.lazy to minimize initial JavaScript parse time and boost Lighthouse performance
const SuperadminProductCatalog = lazy(() =>
  import('./SuperadminProductCatalog').then((m) => ({ default: m.SuperadminProductCatalog }))
);
const SuperadminMerchandiseCatalog = lazy(() =>
  import('./SuperadminMerchandiseCatalog').then((m) => ({ default: m.SuperadminMerchandiseCatalog }))
);
const SuperadminOffersManagement = lazy(() =>
  import('./SuperadminOffersManagement').then((m) => ({ default: m.SuperadminOffersManagement }))
);
const SuperadminFreeStockManagement = lazy(() =>
  import('./SuperadminFreeStockManagement').then((m) => ({ default: m.SuperadminFreeStockManagement }))
);
const SuperadminRequisitionsHub = lazy(() =>
  import('./SuperadminRequisitionsHub').then((m) => ({ default: m.SuperadminRequisitionsHub }))
);
const SuperadminSupplierManagement = lazy(() =>
  import('./SuperadminSupplierManagement').then((m) => ({ default: m.SuperadminSupplierManagement }))
);
const SuperadminSalesOfficerManagement = lazy(() =>
  import('./SuperadminSalesOfficerManagement').then((m) => ({ default: m.SuperadminSalesOfficerManagement }))
);
const SuperadminPsrManagement = lazy(() =>
  import('./SuperadminPsrManagement').then((m) => ({ default: m.SuperadminPsrManagement }))
);
const SuperadminCommercialLogs = lazy(() =>
  import('./SuperadminCommercialLogs').then((m) => ({ default: m.SuperadminCommercialLogs }))
);
const SuperadminDeliveryManagement = lazy(() =>
  import('./SuperadminDeliveryManagement').then((m) => ({ default: m.SuperadminDeliveryManagement }))
);
const OutletManagement = lazy(() =>
  import('../Admin/OutletManagement').then((m) => ({ default: m.OutletManagement }))
);
const DatabaseExplorer = lazy(() =>
  import('../Admin/DatabaseExplorer').then((m) => ({ default: m.DatabaseExplorer }))
);
const SqlQueryConsole = lazy(() =>
  import('../Admin/SqlQueryConsole').then((m) => ({ default: m.SqlQueryConsole }))
);
const StockDistributionView = lazy(() =>
  import('../Admin/StockDistributionView').then((m) => ({ default: m.StockDistributionView }))
);
const DatabaseConfigModal = lazy(() =>
  import('../Admin/DatabaseConfigModal').then((m) => ({ default: m.DatabaseConfigModal }))
);

const TabLoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse" role="status" aria-label="Loading module content">
    <div className="h-28 bg-[#FFF9F0] rounded-3xl border border-[#D9CBB8] p-5 flex flex-col justify-center space-y-2.5 shadow-xs">
      <div className="h-3.5 bg-[#D9CBB8] rounded-md w-1/4" />
      <div className="h-6 bg-[#D9CBB8] rounded-lg w-1/2" />
      <div className="h-3 bg-[#F2E6D5] rounded-md w-2/3" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="h-24 bg-[#FFF9F0] rounded-2xl border border-[#D9CBB8] p-4 shadow-xs" />
      <div className="h-24 bg-[#FFF9F0] rounded-2xl border border-[#D9CBB8] p-4 shadow-xs" />
      <div className="h-24 bg-[#FFF9F0] rounded-2xl border border-[#D9CBB8] p-4 shadow-xs" />
    </div>
    <div className="h-80 bg-[#FFF9F0] rounded-3xl border border-[#D9CBB8] p-6 shadow-xs" />
  </div>
);

export const SuperadminDashboard: React.FC = () => {
  const { user, isSuperadmin, isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs: SuperadminTab[] = ['products', 'merchandise', 'offers', 'free-stocks', 'requisitions', 'suppliers', 'sales-officers', 'psr-officers', 'deliveries', 'fleet-tracker', 'logs', 'tables', 'outlets', 'inventory', 'query'];
  const initialTab = (searchParams.get('tab') as any) || 'products';
  const [activeTab, setActiveTab] = useState<SuperadminTab>(
    validTabs.includes(initialTab) ? initialTab : 'products'
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
    const dest = getNotificationDestination(n, 'SUPERADMIN');
    if (dest.path === '/superadmin' && validTabs.includes(dest.tab)) {
      handleTabChange(dest.tab);
    } else {
      navigate(dest.fullUrl);
    }
  };
  const [consoleInitialQuery, setConsoleInitialQuery] = useState<string>('SELECT * FROM Outlets LIMIT 25;');
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
  } = useNotifications('SUPERADMIN');

  const fetchTelemetry = async () => {
    try {
      const statusRes = await fetch('http://localhost:8080/api/db/status');
      if (statusRes.ok) {
        setDbStatus(await statusRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = () => {
        fetchTelemetry();
      };
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 bg-slate-50 text-slate-800">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <ShieldCheck className="w-5 h-5 text-blue-600 absolute inset-0 m-auto animate-pulse" />
        </div>
        <span className="text-xs font-mono text-slate-600 uppercase tracking-widest font-semibold">
          Authenticating Superadmin Security Clearance...
        </span>
      </div>
    );
  }

  // Guard: Only Superadmin can access this control center
  if (!isAuthenticated || !isSuperadmin) {
    return <AdminLogin requiredRole="superadmin" />;
  }

  const handleOpenQueryWithTable = (tableName: string) => {
    setConsoleInitialQuery(`SELECT * FROM \`${tableName}\` LIMIT 25;`);
    setActiveTab('query');
  };

  const navSections = [
    {
      id: 'products' as const,
      label: 'Master Products & Catalog',
      shortLabel: 'Master Products',
      desc: 'Input items & central stock benchmarks',
      icon: Package,
      gradient: 'from-blue-600 via-indigo-600 to-cyan-600',
      badge: 'Catalog',
    },
    {
      id: 'merchandise' as const,
      label: 'Official Merchandise Hub',
      shortLabel: 'Merchandise Hub',
      desc: 'Jackets, helmets, bikes & apparel',
      icon: Sparkles,
      gradient: 'from-amber-500 via-rose-500 to-indigo-600',
      badge: 'Lifestyle',
    },
    {
      id: 'offers' as const,
      label: 'District Trade Schemes & Offers',
      shortLabel: 'Trade Offers',
      desc: 'Free bonus stock offers for individual districts',
      icon: Gift,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      badge: 'Extra Stock',
    },
    {
      id: 'free-stocks' as const,
      label: 'Free Stocks & Subsidy Ledger',
      shortLabel: 'Free Stocks',
      desc: 'Track free bonus stocks offered, supplied & valuations',
      icon: Boxes,
      gradient: 'from-amber-600 via-orange-600 to-rose-600',
      badge: 'Subsidy',
    },
    {
      id: 'requisitions' as const,
      label: 'Regional Requisitions Hub',
      shortLabel: 'Requisitions Hub',
      desc: 'Review, approve & dispatch stock orders',
      icon: ClipboardList,
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      badge: unreadCount > 0 ? `${unreadCount} NEW` : 'Orders',
      badgeHighlight: unreadCount > 0,
    },
    {
      id: 'suppliers' as const,
      label: 'Supplier Accounts & Allotment',
      shortLabel: 'Supplier Accounts',
      desc: 'Create accounts & allot coverage cities',
      icon: Users,
      gradient: 'from-purple-600 via-pink-600 to-rose-600',
      badge: 'Allotment',
    },
    {
      id: 'sales-officers' as const,
      label: 'Sales Officer Accounts & Territory',
      shortLabel: 'Sales Officers',
      desc: 'Provision officer accounts, link suppliers & assign areas',
      icon: UserCheck,
      gradient: 'from-blue-600 via-cyan-600 to-teal-600',
      badge: 'Territory',
    },
    {
      id: 'psr-officers' as const,
      label: 'Pre-Sales (PSR) Accounts & Routes',
      shortLabel: 'Pre-Sales (PSR)',
      desc: 'Provision PSR accounts, assign to Sales Officers & sub-routes',
      icon: Store,
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      badge: 'Field Beats',
    },
    {
      id: 'deliveries' as const,
      label: 'Vehicle Fleets & Outlet Deliveries',
      shortLabel: 'Fleet Deliveries',
      desc: 'Monitor supplier delivery teams, vehicle trips & subroute dispatches',
      icon: Truck,
      gradient: 'from-purple-600 via-indigo-600 to-blue-600',
      badge: 'Fleets',
    },
    {
      id: 'fleet-tracker' as const,
      label: 'Live Fleet GPS Map Tracker',
      shortLabel: 'Fleet Map Tracker',
      desc: 'Real-time multi-vehicle OpenStreetMap tracking across all suppliers',
      icon: Navigation,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      badge: 'Live GPS',
    },
    {
      id: 'logs' as const,
      label: 'Supplier & Outlet Commercial Logs',
      shortLabel: 'Commercial Logs',
      desc: 'Profit, shelf stocks, prices & audit logs',
      icon: TrendingUp,
      gradient: 'from-teal-600 via-emerald-600 to-indigo-600',
      badge: 'Audit Logs',
    },
    {
      id: 'outlets' as const,
      label: 'Franchise Outlets & Locations',
      shortLabel: 'Franchise Outlets',
      desc: 'Manage retail branch locations & hubs',
      icon: Building2,
      gradient: 'from-cyan-600 via-teal-600 to-blue-600',
      badge: 'Retail',
    },
    {
      id: 'inventory' as const,
      label: 'Stock & Supply Distribution',
      shortLabel: 'Stock Distribution',
      desc: 'Outlet inventory balances & live levels',
      icon: Boxes,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      badge: 'Inventory',
    },
    {
      id: 'tables' as const,
      label: 'Database Entity Explorer',
      shortLabel: 'Entity Explorer',
      desc: 'Oracle Database 23ai tables, schemas & records',
      icon: Database,
      gradient: 'from-amber-600 via-orange-600 to-red-600',
      badge: 'Oracle 23ai',
    },
    {
      id: 'query' as const,
      label: 'SQL Query Terminal',
      shortLabel: 'SQL Terminal',
      desc: 'Direct relational database execution',
      icon: Terminal,
      gradient: 'from-rose-600 via-red-600 to-amber-600',
      badge: 'Engine',
    },
  ];

  return (
    <div className="superadmin-theme min-h-screen bg-[#FFF9F0] text-[#19241D] flex flex-col pb-16 selection:bg-[#B8CBBE] selection:text-[#101B14] relative">
      
      {/* Real-time Animated Notification Pop-up Window */}
      <NotificationPopup
        notification={popupNotification}
        onDismiss={dismissPopup}
        onAction={handleNotificationClick}
      />

      {/* Warm Biscuit Dot-Matrix Subtle Technical Grid Background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#D9CBB8_1.2px,transparent_1.2px)] [background-size:20px_20px] opacity-60" />

      {/* Soft Sage & Sand Ambient Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute -top-[10%] left-1/4 w-[550px] h-[450px] bg-[#CFE0D2]/35 rounded-full blur-[140px]" />
        <div className="absolute top-[20%] -right-[5%] w-[450px] h-[350px] bg-[#B8CBBE]/25 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] left-1/3 w-[500px] h-[400px] bg-[#F2E6D5]/60 rounded-full blur-[150px]" />
      </div>

      {/* Superadmin Executive Master Banner (Sage & Cream Theme Bar) */}
      <div className="bg-gradient-to-r from-[#B8CBBE] via-[#CFE0D2] to-[#B8CBBE] text-[#122018] px-4 py-2.5 text-xs border-b border-[#D9CBB8] shadow-xs relative z-50">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Crown className="w-4 h-4 text-[#122018] shrink-0 animate-pulse" />
            <span className="font-semibold text-[#122018] truncate">
              You are logged in as <strong className="text-[#0A140F] underline decoration-[#122018]/40">Superadmin</strong>. Master authority over catalog, Oracle Database, and regional supplier allotments.
            </span>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFF9F0] hover:bg-[#F2E6D5] text-[#122018] font-bold text-xs transition-all shadow-xs shrink-0 border border-[#D9CBB8] hover:border-[#B8CBBE] cursor-pointer"
            title="Open Regional Supplier Portal"
          >
            <span>Open Supplier Portal</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#122018]" />
          </Link>
        </div>
      </div>

      {/* Top Navbar with Integrated Horizontal Navigation Tabs Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#F2E6D5]/95 backdrop-blur-md border-b border-[#D9CBB8] shadow-xs">
        {/* Top Header Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between gap-2.5">
            {/* Identity & Superadmin Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold text-[#19241D] hover:text-[#0C1710] bg-[#FFF9F0] hover:bg-[#CFE0D2] border border-[#D9CBB8] transition-colors shadow-2xs shrink-0"
                title="Return to Customer Storefront / Home"
              >
                <Home className="w-3.5 h-3.5 text-[#19241D]" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>

              <img
                src={superadminLogo}
                alt="Superadmin Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-xs border border-[#B8CBBE] shrink-0 transform hover:scale-105 transition-transform"
              />

              <span className="font-oswald font-bold tracking-tight uppercase text-[#101B14] text-xs sm:text-sm truncate">
                Superadmin Operations Hub
              </span>

              <span className="rounded-full font-mono font-bold text-[9px] px-2 py-0.5 bg-[#CFE0D2] text-[#122018] border border-[#B8CBBE] uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Radio className="w-2 h-2 animate-pulse text-[#122018]" />
                ROOT: SECURE
              </span>
            </div>

            {/* Quick Live Telemetry Badges & User Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-[#5A645D] font-mono hidden md:inline truncate">
                ({user?.email})
              </span>

              <button
                onClick={() => setIsDbConfigOpen(true)}
                className={`border font-bold font-mono px-2 py-0.5 text-[11px] rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                  dbStatus?.connected
                    ? 'bg-[#B8CBBE] border-[#A2B8AA] text-[#122018] hover:bg-[#CFE0D2]'
                    : 'bg-[#CFE0D2] border-[#B8CBBE] text-[#122018] hover:bg-[#B8CBBE]'
                }`}
                title="Configure Database Connection"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dbStatus?.connected ? 'bg-[#122018]' : 'bg-[#7A634B]'}`} />
                <span>
                  {dbStatus?.active_engine?.toLowerCase().includes('oracle')
                    ? 'ORACLE: CONNECTED'
                    : dbStatus?.connected
                    ? 'AIVEN: CONNECTED'
                    : 'CONFIG DB'}
                </span>
                <Settings className="w-3 h-3 opacity-80" />
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
                className="p-1 rounded-md text-[#5A645D] hover:text-[#912828] bg-[#FFF9F0] hover:bg-[#F2E6D5] border border-[#D9CBB8] transition-colors cursor-pointer"
                title="Sign out of Superadmin"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Layout: Left Dual-Tone Navbar + Dynamic Workspace Canvas */}
      <div className="max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-5 flex-1 w-full min-w-0">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Superadmin Dual-Tone Floating/Fixed Navigation Rail */}
          <div className="sticky top-20 shrink-0 self-start">
            <SuperadminSidebarNav
              activeTab={activeTab}
              onTabChange={handleTabChange}
              userEmail={user?.email}
              unreadCount={unreadCount}
              onOpenDbConfig={() => setIsDbConfigOpen(true)}
              isDbConnected={dbStatus?.connected}
            />
          </div>

          {/* Dynamic Main Content Workspace */}
          <main className="flex-1 w-full min-w-0" id="superadmin-main-content" aria-label="Main Operations Workspace">
            <Suspense fallback={<TabLoadingSkeleton />}>
              {activeTab === 'products' && <SuperadminProductCatalog />}
            {activeTab === 'merchandise' && <SuperadminMerchandiseCatalog />}
            {activeTab === 'offers' && <SuperadminOffersManagement />}
            {activeTab === 'free-stocks' && <SuperadminFreeStockManagement />}
            {activeTab === 'requisitions' && <SuperadminRequisitionsHub />}
            {activeTab === 'suppliers' && <SuperadminSupplierManagement />}
            {activeTab === 'sales-officers' && <SuperadminSalesOfficerManagement />}
            {activeTab === 'psr-officers' && <SuperadminPsrManagement />}
            {activeTab === 'deliveries' && <SuperadminDeliveryManagement showMap={false} initialSubTab="trips" />}
            {activeTab === 'fleet-tracker' && <SuperadminDeliveryManagement showMap={true} initialSubTab="map" />}
            {activeTab === 'logs' && <SuperadminCommercialLogs />}
            {activeTab === 'tables' && (
              <DatabaseExplorer onOpenQueryWithTable={handleOpenQueryWithTable} />
            )}
            {activeTab === 'outlets' && <OutletManagement />}
            {activeTab === 'inventory' && <StockDistributionView />}
            {activeTab === 'query' && (
              <SqlQueryConsole initialQuery={consoleInitialQuery} />
            )}
          </Suspense>
        </main>
        </div>
      </div>

      {/* Database Connection Config Modal */}
      {isDbConfigOpen && (
        <Suspense fallback={null}>
          <DatabaseConfigModal
            isOpen={isDbConfigOpen}
            onClose={() => setIsDbConfigOpen(false)}
            onConfigSaved={fetchTelemetry}
          />
        </Suspense>
      )}
    </div>
  );
};

export default SuperadminDashboard;
