import React, { useState, useEffect } from 'react';
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

export const AdminDashboard: React.FC = () => {
  const { user, isSupplier, isSuperadmin, isAuthenticated, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'request' | 'history' | 'profile'>('catalog');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

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

      {/* Top Admin Sub-Header (Sticky & Dynamic Shrinking on Scroll) */}
      <div
        className={`sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 transition-all duration-300 ease-in-out ${
          isScrolled ? 'shadow-md py-1' : 'shadow-2xs py-2.5 sm:py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 transition-all duration-300 ease-in-out ${
              isScrolled ? 'py-0.5' : 'py-1 sm:py-1.5'
            }`}
          >
            {/* Title & Supplier Role Badge */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div
                className={`bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 transition-all duration-300 ease-in-out ${
                  isScrolled ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-xl' : 'w-10 h-10 rounded-2xl'
                }`}
              >
                <Truck className={`transition-all duration-300 ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1
                    className={`font-oswald font-bold tracking-tight uppercase text-zinc-900 transition-all duration-300 ${
                      isScrolled ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
                    }`}
                  >
                    Regional Supplier & Logistics Portal
                  </h1>
                  <span
                    className={`rounded-full font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider transition-all duration-300 ${
                      isScrolled ? 'text-[9px] px-2 py-0.2' : 'text-[10px] px-2.5 py-0.5'
                    }`}
                  >
                    {isSuperadmin ? 'Role 4: Superadmin' : 'Role 3: Region-Bound Supplier'}
                  </span>
                </div>
                {/* Secondary subtitle collapses smoothly when scrolled */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isScrolled ? 'max-h-0 opacity-0' : 'max-h-8 opacity-100 mt-0.5'
                  }`}
                >
                  <p className="text-[11px] text-slate-500 truncate">
                    Logged in as <code className="text-zinc-800 font-semibold">{user?.email}</code> • Region-bound catalog, stock requisitions & depot setup
                  </p>
                </div>
              </div>
            </div>

            {/* User Controls */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {!isScrolled && (
                <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline transition-opacity duration-300">
                  Depot Operations
                </span>
              )}

              {/* Logout Button */}
              <button
                onClick={logout}
                className={`text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all duration-300 cursor-pointer ${
                  isScrolled ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'
                }`}
                title="Sign out of Supplier Portal"
              >
                <LogOut className={`transition-all duration-300 ${isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </button>
            </div>
          </div>

          {/* Supplier Sub-Navigation Tabs */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto transition-all duration-300 ease-in-out scrollbar-none ${
              isScrolled
                ? 'pt-1 pb-1 border-t border-slate-100/70'
                : 'pt-2 pb-2.5 sm:pb-3 border-t border-slate-100'
            }`}
          >
            <button
              onClick={() => setActiveTab('catalog')}
              className={`font-semibold flex items-center transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isScrolled
                  ? 'px-3 py-1 rounded-lg text-[11px] gap-1.5'
                  : 'px-4 py-2 rounded-xl text-xs gap-2'
              } ${
                activeTab === 'catalog'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Package className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Catalog & Outlets Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('request')}
              className={`font-semibold flex items-center transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isScrolled
                  ? 'px-3 py-1 rounded-lg text-[11px] gap-1.5'
                  : 'px-4 py-2 rounded-xl text-xs gap-2'
              } ${
                activeTab === 'request'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Truck className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Request Stock (New Requisition)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`font-semibold flex items-center transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isScrolled
                  ? 'px-3 py-1 rounded-lg text-[11px] gap-1.5'
                  : 'px-4 py-2 rounded-xl text-xs gap-2'
              } ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <ClipboardList className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Requisition History & Status</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`font-semibold flex items-center transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isScrolled
                  ? 'px-3 py-1 rounded-lg text-[11px] gap-1.5'
                  : 'px-4 py-2 rounded-xl text-xs gap-2'
              } ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:text-blue-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <MapPin className={`transition-all ${isScrolled ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              <span>Depot & Territory Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1 w-full min-w-0">
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
