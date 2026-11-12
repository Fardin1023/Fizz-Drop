import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from '../Admin/AdminLogin';
import { OutletManagement } from '../Admin/OutletManagement';
import { DatabaseExplorer } from '../Admin/DatabaseExplorer';
import { SqlQueryConsole } from '../Admin/SqlQueryConsole';
import { DatabaseConfigModal } from '../Admin/DatabaseConfigModal';
import { StockDistributionView } from '../Admin/StockDistributionView';
import { SuperadminRequisitionsHub } from './SuperadminRequisitionsHub';
import { SuperadminProductCatalog } from './SuperadminProductCatalog';
import { SuperadminMerchandiseCatalog } from './SuperadminMerchandiseCatalog';
import { SuperadminSupplierManagement } from './SuperadminSupplierManagement';
import { SuperadminSalesOfficerManagement } from './SuperadminSalesOfficerManagement';
import { SuperadminPsrManagement } from './SuperadminPsrManagement';
import { SuperadminCommercialLogs } from './SuperadminCommercialLogs';
import { SuperadminDeliveryManagement } from './SuperadminDeliveryManagement';
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
  ChevronLeft,
  ChevronRight,
  Menu,
  Sparkles,
  TrendingUp,
  UserCheck,
  Store,
  Truck,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getNotificationDestination } from '../../utils/notificationRouter';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';
import superadminLogo from '../../assets/img/superadmin-logo.jpg';

export const SuperadminDashboard: React.FC = () => {
  const { user, isSuperadmin, isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['products', 'merchandise', 'requisitions', 'suppliers', 'sales-officers', 'psr-officers', 'deliveries', 'logs', 'tables', 'outlets', 'inventory', 'query'];
  const initialTab = (searchParams.get('tab') as any) || 'products';
  const [activeTab, setActiveTab] = useState<'products' | 'merchandise' | 'requisitions' | 'suppliers' | 'sales-officers' | 'psr-officers' | 'deliveries' | 'logs' | 'tables' | 'outlets' | 'inventory' | 'query'>(
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
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
      desc: 'Aiven Cloud tables, schemas & records',
      icon: Database,
      gradient: 'from-amber-600 via-orange-600 to-red-600',
      badge: 'Aiven Cloud',
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
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col pb-16 selection:bg-blue-500/20 selection:text-blue-900 relative">
      
      {/* Real-time Animated Notification Pop-up Window */}
      <NotificationPopup
        notification={popupNotification}
        onDismiss={dismissPopup}
        onAction={handleNotificationClick}
      />

      {/* Security-Developer Dot-Matrix Subtle Technical Grid Background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

      {/* Soft Homepage-Style Cyan & Blue Ambient Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-50">
        <div className="absolute -top-[10%] left-1/4 w-[550px] h-[450px] bg-blue-400/10 rounded-full blur-[140px]" />
        <div className="absolute top-[20%] -right-[5%] w-[450px] h-[350px] bg-cyan-400/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] left-1/3 w-[500px] h-[400px] bg-indigo-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Superadmin Executive Master Banner (Catchy Purple & Indigo Authority Bar) */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 text-white px-4 py-2.5 text-xs border-b border-indigo-800/40 shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Crown className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
            <span className="font-semibold text-slate-100 truncate">
              You are logged in as <strong className="text-amber-200">Superadmin</strong>. Master authority over catalog, Aiven Cloud database, and regional supplier allotments.
            </span>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-all shadow-xs shrink-0 border border-white/20 hover:border-white/30 cursor-pointer"
            title="Open Regional Supplier Portal"
          >
            <span>Open Supplier Portal</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
          </Link>
        </div>
      </div>

      {/* Clean Top Header (Upper navigation tabs removed) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between gap-2.5">
            {/* Identity & Superadmin Brand with Sidebar Toggle */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                title={isSidebarCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
              >
                {isSidebarCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              <Link
                to="/"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs shrink-0"
                title="Return to Customer Storefront / Home"
              >
                <Home className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>

              <img
                src={superadminLogo}
                alt="Superadmin Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-md shadow-indigo-500/25 border border-indigo-400/40 shrink-0"
              />

              <span className="font-oswald font-bold tracking-tight uppercase text-zinc-900 text-xs sm:text-sm truncate">
                Superadmin Operations Hub
              </span>

              <span className="rounded-full font-mono font-bold text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Radio className="w-2 h-2 animate-pulse text-emerald-600" />
                ROOT: SECURE
              </span>
            </div>

            {/* Quick Live Telemetry Badges & User Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline truncate">
                ({user?.email})
              </span>

              <button
                onClick={() => setIsDbConfigOpen(true)}
                className={`border font-bold font-mono px-2 py-0.5 text-[11px] rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                  dbStatus?.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                }`}
                title="Configure Database Connection"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dbStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{dbStatus?.connected ? 'AIVEN: CONNECTED' : 'CONFIG DB'}</span>
                <Settings className="w-3 h-3 opacity-70" />
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
                className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sign out of Superadmin"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Layout: Catchy Animated Left Sidebar + Dynamic Content Canvas */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3.5 sm:mt-4 flex-1 w-full min-w-0 flex flex-col md:flex-row items-start gap-4 lg:gap-5">
        
        {/* Catchy Animated Left Navigation Sidebar */}
        <aside
          className={`transition-all duration-300 ease-in-out shrink-0 w-full md:sticky md:top-16 z-30 ${
            isSidebarCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'
          }`}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-sm p-2 sm:p-2.5 space-y-1.5">
            {/* Sidebar Section Title */}
            <div className="px-2 py-1.5 flex items-center justify-between border-b border-slate-100 mb-1">
              {!isSidebarCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={superadminLogo}
                    alt="Superadmin Emblem"
                    className="w-5 h-5 rounded-md object-cover shadow-2xs border border-indigo-300/40 shrink-0"
                  />
                  <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase truncate">
                    Central Operations Matrix
                  </span>
                </div>
              ) : (
                <img
                  src={superadminLogo}
                  alt="Superadmin"
                  className="w-7 h-7 rounded-lg object-cover shadow-2xs mx-auto border border-indigo-300/40"
                />
              )}
              
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Navigation Item Buttons with Animated Hover and Active States */}
            <div className="space-y-1">
              {navSections.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left rounded-xl transition-all duration-200 cursor-pointer group relative overflow-hidden flex items-center ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'p-2.5 gap-3'
                    } ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-md shadow-indigo-500/20 font-bold scale-[1.01]`
                        : 'bg-white hover:bg-slate-50 hover:translate-x-0.5 text-slate-700 border border-transparent hover:border-slate-200'
                    }`}
                    title={item.label}
                  >
                    {/* Active Glowing Left Pill Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-xs" />
                    )}

                    {/* Icon Container with subtle animation */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Text Details (Hidden when Collapsed) */}
                    {!isSidebarCollapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
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

            {/* Sidebar Footer: Aiven Cloud Live Telemetry */}
            {!isSidebarCollapsed && (
              <div className="pt-2 mt-2 border-t border-slate-100 px-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider truncate">
                        Aiven Cloud MySQL
                      </span>
                      <span className="block text-[9px] font-mono text-emerald-600 truncate">
                        MySQL 8.4.11 Active
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDbConfigOpen(true)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="View Connection Details"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Dynamic Main Content Workspace */}
        <main className="flex-1 min-w-0 w-full">
          {activeTab === 'products' && <SuperadminProductCatalog />}
          {activeTab === 'merchandise' && <SuperadminMerchandiseCatalog />}
          {activeTab === 'requisitions' && <SuperadminRequisitionsHub />}
          {activeTab === 'suppliers' && <SuperadminSupplierManagement />}
          {activeTab === 'sales-officers' && <SuperadminSalesOfficerManagement />}
          {activeTab === 'psr-officers' && <SuperadminPsrManagement />}
          {activeTab === 'deliveries' && <SuperadminDeliveryManagement />}
          {activeTab === 'logs' && <SuperadminCommercialLogs />}
          {activeTab === 'tables' && (
            <DatabaseExplorer onOpenQueryWithTable={handleOpenQueryWithTable} />
          )}
          {activeTab === 'outlets' && <OutletManagement />}
          {activeTab === 'inventory' && <StockDistributionView />}
          {activeTab === 'query' && (
            <SqlQueryConsole initialQuery={consoleInitialQuery} />
          )}
        </main>
      </div>

      {/* Database Connection Config Modal */}
      <DatabaseConfigModal
        isOpen={isDbConfigOpen}
        onClose={() => setIsDbConfigOpen(false)}
        onConfigSaved={fetchTelemetry}
      />
    </div>
  );
};

export default SuperadminDashboard;
