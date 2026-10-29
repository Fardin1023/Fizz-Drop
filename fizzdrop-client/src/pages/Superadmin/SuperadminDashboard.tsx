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
  Lock,
  Boxes,
  ClipboardList,
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
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

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

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 25) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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

      {/* Security-Developer Executive Header (Clean, Light, Technical, Sticky & Dynamic Shrinking on Scroll) */}
      <div
        className={`sticky top-16 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 transition-all duration-300 ease-in-out ${
          isScrolled ? 'shadow-md py-1' : 'shadow-xs py-3 sm:py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all duration-300 ${
              isScrolled ? 'py-0.5' : 'py-1'
            }`}
          >
            {/* Identity & Superadmin Brand with Security Pill */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div
                className={`bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 ring-4 ring-blue-50 shrink-0 transition-all duration-300 ${
                  isScrolled ? 'w-8 h-8 rounded-xl ring-2' : 'w-11 h-11 rounded-2xl ring-4'
                }`}
              >
                <ShieldCheck className={`text-white drop-shadow-xs transition-all duration-300 ${isScrolled ? 'w-4 h-4' : 'w-6 h-6'}`} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1
                    className={`font-oswald font-bold tracking-tight uppercase text-zinc-900 flex items-center gap-2 transition-all duration-300 ${
                      isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                    }`}
                  >
                    Superadmin Operations Hub
                  </h1>
                  <span
                    className={`rounded-full font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-all duration-300 ${
                      isScrolled ? 'text-[9px] px-2 py-0.2' : 'text-[10px] px-2.5 py-0.5'
                    }`}
                  >
                    <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
                    ROOT: SECURE
                  </span>
                </div>
                {/* Secondary details collapse smoothly when scrolled */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isScrolled ? 'max-h-0 opacity-0' : 'max-h-8 opacity-100 mt-0.5'
                  }`}
                >
                  <p className="text-xs text-slate-500 flex items-center gap-2 truncate">
                    <code className="text-blue-700 font-mono font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{user?.email}</code>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600" /> 64 Districts • Full Jurisdiction
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Live Telemetry Badges */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end md:self-auto">
              <button
                onClick={() => setIsDbConfigOpen(true)}
                className={`border font-bold font-mono flex items-center transition-all cursor-pointer shadow-2xs ${
                  isScrolled ? 'px-2.5 py-1 text-[11px] rounded-lg gap-1' : 'px-3 py-1.5 text-xs rounded-xl gap-1.5'
                } ${
                  dbStatus?.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80'
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100/80'
                }`}
                title="Configure Database Connection"
              >
                <span className={`w-2 h-2 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{dbStatus?.connected ? 'DB: ONLINE' : 'CONFIG DB'}</span>
                <Settings className="w-3 h-3 opacity-70" />
              </button>

              {/* Switch to Supplier Portal */}
              <Link
                to="/admin"
                className={`bg-white hover:bg-slate-50 border border-slate-200 font-semibold text-slate-700 hover:text-blue-600 flex items-center transition-all shadow-2xs ${
                  isScrolled ? 'px-2.5 py-1 text-[11px] rounded-lg gap-1' : 'px-3 py-1.5 text-xs rounded-xl gap-1'
                }`}
                title="Open Supplier Product Portal"
              >
                <span>Supplier Portal</span>
                <ArrowUpRight className="w-3 h-3 text-blue-600" />
              </Link>

              {/* Notification Bell Dropdown */}
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onSelectNotification={() => setActiveTab('requisitions')}
                isScrolled={isScrolled}
              />

              {/* Logout Button */}
              <button
                onClick={logout}
                className={`text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer ${
                  isScrolled ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
                }`}
                title="Sign out of Superadmin"
              >
                <LogOut className={`transition-all ${isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </button>
            </div>
          </div>

          {/* Segmented Security-Developer Navigation Tabs */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto transition-all duration-300 ease-in-out scrollbar-none ${
              isScrolled ? 'mt-1 pt-1 border-t border-slate-100/70' : 'mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100'
            }`}
          >
            <button
              onClick={() => setActiveTab('requisitions')}
              className={`font-semibold flex items-center transition-all cursor-pointer whitespace-nowrap ${
                isScrolled ? 'px-3 py-1 text-[11px] rounded-lg gap-1.5' : 'px-4 py-2 text-xs rounded-xl gap-2'
              } ${
                activeTab === 'requisitions'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <ClipboardList className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Regional Requisitions Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              className={`font-semibold flex items-center transition-all cursor-pointer whitespace-nowrap ${
                isScrolled ? 'px-3 py-1 text-[11px] rounded-lg gap-1.5' : 'px-4 py-2 text-xs rounded-xl gap-2'
              } ${
                activeTab === 'tables'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Database className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Database Entity Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('outlets')}
              className={`font-semibold flex items-center transition-all cursor-pointer whitespace-nowrap ${
                isScrolled ? 'px-3 py-1 text-[11px] rounded-lg gap-1.5' : 'px-4 py-2 text-xs rounded-xl gap-2'
              } ${
                activeTab === 'outlets'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Building2 className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Franchise Outlets & Locations</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`font-semibold flex items-center transition-all cursor-pointer whitespace-nowrap ${
                isScrolled ? 'px-3 py-1 text-[11px] rounded-lg gap-1.5' : 'px-4 py-2 text-xs rounded-xl gap-2'
              } ${
                activeTab === 'inventory'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Boxes className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Franchise Stock & Supply Distribution</span>
            </button>

            <button
              onClick={() => setActiveTab('query')}
              className={`font-semibold flex items-center transition-all cursor-pointer whitespace-nowrap ${
                isScrolled ? 'px-3 py-1 text-[11px] rounded-lg gap-1.5' : 'px-4 py-2 text-xs rounded-xl gap-2'
              } ${
                activeTab === 'query'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 font-bold'
                  : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200/80'
              }`}
            >
              <Terminal className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>SQL Query Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1 w-full min-w-0">
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
