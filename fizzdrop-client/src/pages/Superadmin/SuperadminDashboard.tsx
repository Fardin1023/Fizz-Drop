import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from '../Admin/AdminLogin';
import { OutletManagement } from '../Admin/OutletManagement';
import { DatabaseExplorer } from '../Admin/DatabaseExplorer';
import { SqlQueryConsole } from '../Admin/SqlQueryConsole';
import { DatabaseConfigModal } from '../Admin/DatabaseConfigModal';
import { StockDistributionView } from '../Admin/StockDistributionView';
import { SuperadminRequisitionsHub } from './SuperadminRequisitionsHub';
import {
  ShieldCheck,
  Building2,
  Database,
  Terminal,
  LogOut,
  Settings,
  ArrowUpRight,
  Radio,
  Boxes,
  ClipboardList,
  Home,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';

export const SuperadminDashboard: React.FC = () => {
  const { user, isSuperadmin, isAuthenticated, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'requisitions' | 'tables' | 'outlets' | 'inventory' | 'query'>('requisitions');
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

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col pb-16 selection:bg-blue-500/20 selection:text-blue-900 relative">
      
      {/* Real-time Animated Notification Pop-up Window */}
      <NotificationPopup
        notification={popupNotification}
        onDismiss={dismissPopup}
        onAction={() => setActiveTab('requisitions')}
      />

      {/* Security-Developer Dot-Matrix Subtle Technical Grid Background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

      {/* Soft Homepage-Style Cyan & Blue Ambient Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-50">
        <div className="absolute -top-[10%] left-1/4 w-[550px] h-[450px] bg-blue-400/10 rounded-full blur-[140px]" />
        <div className="absolute top-[20%] -right-[5%] w-[450px] h-[350px] bg-cyan-400/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] left-1/3 w-[500px] h-[400px] bg-indigo-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Security-Developer Executive Header (Small, Fixed at Top & Static for Maximum Content Visibility) */}
      <div className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Top Row: Title, Security Pill, Storefront Access, and Quick Controls */}
          <div className="flex items-center justify-between gap-3">
            {/* Identity & Superadmin Brand with Security Pill */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Home / Storefront Navigation Button */}
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/90 border border-slate-200 transition-colors shadow-2xs shrink-0"
                title="Return to Customer Storefront / Home"
              >
                <Home className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>

              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>

              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h1 className="font-oswald font-bold tracking-tight uppercase text-zinc-900 text-sm sm:text-base truncate">
                  Superadmin Operations Hub
                </h1>
                <span className="rounded-full font-mono font-bold text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Radio className="w-2 h-2 animate-pulse text-emerald-600" />
                  ROOT: SECURE
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden lg:inline truncate">
                  ({user?.email})
                </span>
              </div>
            </div>

            {/* Quick Live Telemetry Badges & User Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsDbConfigOpen(true)}
                className={`border font-bold font-mono px-2 py-1 text-[11px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                  dbStatus?.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                }`}
                title="Configure Database Connection"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dbStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{dbStatus?.connected ? 'DB: ONLINE' : 'CONFIG DB'}</span>
                <Settings className="w-3 h-3 opacity-70" />
              </button>

              <Link
                to="/admin"
                className="bg-white hover:bg-slate-50 border border-slate-200 font-semibold text-slate-700 hover:text-blue-600 px-2 py-1 text-[11px] rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                title="Open Supplier Product Portal"
              >
                <span>Supplier Portal</span>
                <ArrowUpRight className="w-3 h-3 text-blue-600" />
              </Link>

              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onSelectNotification={() => setActiveTab('requisitions')}
                isScrolled={true}
              />

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sign out of Superadmin"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Segmented Security-Developer Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 mt-1.5 border-t border-slate-100/80 scrollbar-none">
            <button
              onClick={() => setActiveTab('requisitions')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'requisitions'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Regional Requisitions Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'tables'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Database Entity Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('outlets')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'outlets'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Franchise Outlets & Locations</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Franchise Stock & Supply Distribution</span>
            </button>

            <button
              onClick={() => setActiveTab('query')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'query'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>SQL Query Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 flex-1 w-full min-w-0">
        {activeTab === 'requisitions' && <SuperadminRequisitionsHub />}
        {activeTab === 'tables' && (
          <DatabaseExplorer onOpenQueryWithTable={handleOpenQueryWithTable} />
        )}
        {activeTab === 'outlets' && <OutletManagement />}
        {activeTab === 'inventory' && <StockDistributionView />}
        {activeTab === 'query' && (
          <SqlQueryConsole initialQuery={consoleInitialQuery} />
        )}
      </main>

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
