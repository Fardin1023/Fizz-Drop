import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from './AdminLogin';
import { ProductManagement } from './ProductManagement';
import { SupplierRequestStock } from './SupplierRequestStock';
import { SupplierRequisitionHistory } from './SupplierRequisitionHistory';
import { SupplierProfileSettings } from './SupplierProfileSettings';
import {
  Package,
  LogOut,
  Crown,
  ArrowRight,
  Truck,
  ClipboardList,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../../components/Notifications/NotificationDropdown';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';

export const AdminDashboard: React.FC = () => {
  const { user, isSupplier, isSuperadmin, isAuthenticated, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'request' | 'history' | 'profile'>('catalog');

  const {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
    markAsRead,
    markAllAsRead,
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

  return (
    <div className="min-h-screen bg-slate-50/70 text-zinc-900 flex flex-col pb-16 selection:bg-blue-500/20 selection:text-blue-900">
      
      {/* Real-time Animated Notification Pop-up Window */}
      <NotificationPopup
        notification={popupNotification}
        onDismiss={dismissPopup}
        onAction={() => setActiveTab('history')}
      />

      {/* Superadmin Notification Banner if Superadmin is visiting this page */}
      {isSuperadmin && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white px-4 py-2 text-xs flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <Crown className="w-4 h-4 text-amber-300" />
              You are logged in as Superadmin. For Database SQL, Franchise Outlets & Requisition Approvals, switch to Superadmin Center.
            </span>
            <Link
              to="/superadmin"
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <span>Go to Superadmin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Top Admin Sub-Header (Small, Fixed & Static for Maximum Content Visibility) */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Top Row: Title, Role Badge, and Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h1 className="font-oswald text-sm sm:text-base font-bold tracking-tight uppercase text-zinc-900 truncate">
                  Regional Supplier & Logistics Portal
                </h1>
                <span className="rounded-full font-mono font-bold text-[9px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider shrink-0">
                  {isSuperadmin ? 'Role 4: Superadmin' : 'Role 3: Supplier'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden lg:inline truncate">
                  ({user?.email})
                </span>
              </div>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onSelectNotification={() => setActiveTab('history')}
                isScrolled={true}
              />

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sign out of Supplier Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Supplier Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 mt-1.5 border-t border-slate-100/80 scrollbar-none">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Catalog & Outlets Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('request')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'request'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Request Stock (New Requisition)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Requisition History & Status</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`font-semibold flex items-center transition-colors cursor-pointer whitespace-nowrap px-3 py-1 rounded-lg text-xs gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Depot & Territory Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 flex-1 w-full min-w-0">
        {activeTab === 'catalog' && <ProductManagement />}
        {activeTab === 'request' && (
          <SupplierRequestStock
            onRequisitionSubmitted={() => setActiveTab('history')}
            onNavigateToSettings={() => setActiveTab('profile')}
          />
        )}
        {activeTab === 'history' && (
          <SupplierRequisitionHistory onNewRequisitionClick={() => setActiveTab('request')} />
        )}
        {activeTab === 'profile' && <SupplierProfileSettings />}
      </main>
    </div>
  );
};

export default AdminDashboard;
