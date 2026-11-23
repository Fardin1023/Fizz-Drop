import React, { useState } from 'react';
import {
  Home,
  TrendingUp,
  GraduationCap,
  Users,
  Bell,
  Search,
  Plus,
  Folder,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Navigation,
  Truck,
  Clock,
  Gift,
  Boxes,
  Building2,
  Store,
} from 'lucide-react';
import salesOfficerLogo from '../../assets/img/sales-officer-logo.jpg';

export type SalesOfficerTab =
  | 'overview'
  | 'orders-tracking'
  | 'network'
  | 'fleet-tracking'
  | 'profit-ledger'
  | 'distributions'
  | 'outlets'
  | 'demands'
  | 'offers'
  | 'psr-team'
  | 'supplier-link';

interface SalesOfficerSidebarNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  officerName?: string;
  officerEmail?: string;
  officerCode?: string;
  assignedArea?: string;
  city?: string;
  unreadCount?: number;
  ordersCount?: number;
  demandsCount?: number;
  offersCount?: number;
  fleetCount?: number;
  outletsCount?: number;
  onOpenRequestStockModal?: () => void;
  onLogout?: () => void;
}

export const SalesOfficerSidebarNav: React.FC<SalesOfficerSidebarNavProps> = ({
  activeTab,
  onTabChange,
  officerName = 'Farhan Tamzid',
  officerEmail = 'tamzid@fizzdrop.com',
  officerCode = 'SO-DHA-607',
  assignedArea = 'Gulshan & Banani Zone',
  city = 'Dhaka',
  unreadCount = 0,
  ordersCount = 0,
  demandsCount = 0,
  offersCount = 0,
  fleetCount = 0,
  outletsCount = 0,
  onOpenRequestStockModal,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const navItems = [
    {
      id: 'overview',
      label: 'Home',
      sublabel: 'Territory Hub',
      icon: Home,
    },
    {
      id: 'orders-tracking',
      label: 'Progress Tracker',
      sublabel: `Track Orders (${ordersCount})`,
      icon: TrendingUp,
      badge: ordersCount > 0 ? String(ordersCount) : undefined,
    },
    {
      id: 'network',
      label: 'Explore Network',
      sublabel: 'Suppliers & PSRs',
      icon: GraduationCap,
    },
    {
      id: 'outlets',
      label: 'Community',
      sublabel: `Retail Stores (${outletsCount})`,
      icon: Users,
    },
    {
      id: 'fleet-tracking',
      label: 'Fleet Tracking',
      sublabel: `Live Fleet Map (${fleetCount})`,
      icon: Navigation,
    },
    {
      id: 'demands',
      label: 'Store Demands',
      sublabel: `Pending Demands (${demandsCount})`,
      icon: Clock,
    },
    {
      id: 'distributions',
      label: 'Distributions',
      sublabel: 'Outlet Restock',
      icon: Truck,
    },
    {
      id: 'offers',
      label: 'Trade Schemes',
      sublabel: `Bonus Offers (${offersCount})`,
      icon: Gift,
      badge: offersCount > 0 ? (offersCount < 10 ? `0${offersCount}` : String(offersCount)) : undefined,
      badgeHighlight: true,
    },
  ];

  // Quick folders list matching "My Courses" in the mockup
  const folderItems = [
    {
      id: 'area-nexus',
      label: `Project ${city || 'Dhaka'}`,
      sublabel: assignedArea || 'Territory Coverage',
      onClick: () => onTabChange('overview'),
    },
    {
      id: 'buffer-hub',
      label: 'Team hub',
      sublabel: 'Buffer Stock Ledger',
      onClick: () => onTabChange('overview'),
    },
    {
      id: 'fleet-taskforce',
      label: 'Taskforce',
      sublabel: 'Delivery Fleet Telemetry',
      onClick: () => onTabChange('fleet-tracking'),
    },
    {
      id: 'perf-forge',
      label: 'Idea forge',
      sublabel: 'Performance & Demand',
      onClick: () => onTabChange('demands'),
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sublabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={`shrink-0 select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16 sm:w-[72px]' : 'w-64 sm:w-72'
      }`}
      aria-label="Sales Officer Primary Navigation"
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-[32px] p-3 sm:p-4 border border-[#D7DEE8] shadow-lg shadow-slate-200/50 sticky top-[68px] flex flex-col justify-between min-h-[640px] transition-all">
        {/* ================= TOP SECTION ================= */}
        <div>
          {/* Top User Profile Card & Toggle (Daniel Bright Style) */}
          {!isCollapsed ? (
            <div className="pb-3 border-b border-[#E6EBF1] mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar with lime-green outline ring */}
                  <div className="relative shrink-0">
                    <img
                      src={salesOfficerLogo}
                      alt={officerName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#4ADE80] ring-2 ring-[#86EFAC]/40 shadow-xs"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-white" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-bold text-[#0F172A] truncate leading-tight">
                      {officerName}
                    </span>
                    <span className="text-xs text-[#64748B] truncate leading-tight mt-0.5">
                      {officerEmail}
                    </span>
                  </div>
                </div>

                {/* More Options / Collapse Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#F4F6F8] transition-colors cursor-pointer shrink-0"
                  title="Collapse navigation"
                >
                  <MoreHorizontal className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Search Bar Input (Daniel Bright Style) */}
              <div className="mt-3.5 relative">
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-[#D7DEE8] bg-[#F8FAFC] focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-transparent text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 text-[10px] p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed Pill Top Avatar & Expand Trigger */
            <div className="flex flex-col items-center pb-3 border-b border-[#E6EBF1] mb-3">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="relative group cursor-pointer transition-transform hover:scale-105"
                title={`${officerName} (Click to expand)`}
              >
                <img
                  src={salesOfficerLogo}
                  alt={officerName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#4ADE80] ring-2 ring-[#86EFAC]/40 shadow-xs"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-white" />
              </button>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="mt-2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#F4F6F8] transition-colors"
                title="Expand navigation"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ================= PRIMARY NAVIGATION ITEMS ================= */}
          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'network' && (activeTab === 'psr-team' || activeTab === 'supplier-link'));

              if (isCollapsed) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={`w-full py-2.5 flex items-center justify-center rounded-2xl transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-[#E6EBF1] text-[#0F172A] font-bold shadow-2xs'
                        : 'text-slate-600 hover:bg-[#F4F6F8] hover:text-[#0F172A]'
                    }`}
                    title={`${item.label} (${item.sublabel})`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#0F172A]' : 'text-slate-600'}`} />
                    {item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full px-3 py-2 rounded-2xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-[#E6EBF1] text-[#0F172A] font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-[#F4F6F8] hover:text-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#0F172A]' : 'text-slate-500 group-hover:text-[#0F172A]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        item.badgeHighlight
                          ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Notification Tab Item (matching Notifications 02 pill badge in mockup) */}
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => onTabChange('demands')}
                className="w-full py-2.5 flex items-center justify-center rounded-2xl text-slate-600 hover:bg-[#F4F6F8] hover:text-[#0F172A] transition-all cursor-pointer relative"
                title={`Notifications (${unreadCount})`}
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>
            ) : (
              <div className="w-full px-3 py-2 rounded-2xl flex items-center justify-between text-xs font-semibold text-slate-600 hover:bg-[#F4F6F8] hover:text-[#0F172A] transition-all">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span>Notifications</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                  {unreadCount < 10 ? `0${unreadCount}` : unreadCount}
                </span>
              </div>
            )}
          </nav>

          {/* ================= SECONDARY SECTION ("My Courses +" style) ================= */}
          {!isCollapsed && (
            <div className="mt-5 pt-4 border-t border-[#E6EBF1] space-y-2">
              <div className="flex items-center justify-between px-3 text-xs">
                <span className="font-semibold text-slate-400">My Territory</span>
                {onOpenRequestStockModal && (
                  <button
                    type="button"
                    onClick={onOpenRequestStockModal}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#F4F6F8] transition-colors cursor-pointer"
                    title="Request Wholesale Stock Buffer (+)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {folderItems.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={f.onClick}
                    className="w-full px-3 py-1.5 rounded-xl flex items-center gap-2.5 text-xs text-slate-600 hover:text-[#0F172A] hover:bg-[#F4F6F8] transition-colors cursor-pointer group text-left"
                    title={f.sublabel}
                  >
                    <Folder className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                    <span className="truncate">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= BOTTOM LOGOUT SECTION ================= */}
        <div className="pt-3 border-t border-[#E6EBF1] mt-3">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={`w-full flex items-center gap-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ${
                isCollapsed ? 'justify-center py-2.5' : 'px-3 py-2'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-600" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
