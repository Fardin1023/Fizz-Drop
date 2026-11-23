import React, { useState } from 'react';
import {
  Store,
  TrendingUp,
  Tag,
  Gift,
  Truck,
  Package,
  ClipboardList,
  Users,
  Building,
  Receipt,
  Wallet,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import supplierLogo from '../../assets/img/supplier-logo.jpg';

export type SupplierTab =
  | 'outlet-requests'
  | 'stock-sales-dispatch'
  | 'price-board'
  | 'offers'
  | 'delivery-fleet'
  | 'request'
  | 'history'
  | 'outlets'
  | 'profile'
  | 'transactions';

interface SupplierSidebarNavProps {
  activeTab: SupplierTab;
  onTabChange: (tab: SupplierTab) => void;
  userEmail?: string;
  unreadCount?: number;
  offersBadgeCount?: number;
  walletBalance?: number;
  onOpenWallet?: () => void;
  onLogout?: () => void;
}

export const SupplierSidebarNav: React.FC<SupplierSidebarNavProps> = ({
  activeTab,
  onTabChange,
  userEmail = 'supplier@fizzdrop.com',
  unreadCount = 0,
  offersBadgeCount = 0,
  walletBalance = 0,
  onOpenWallet,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Formatted User Name
  const rawName = userEmail.split('@')[0].replace(/[._-]/g, ' ');
  const displayName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1) || 'Regional Supplier';

  const navItems = [
    {
      id: 'outlet-requests' as SupplierTab,
      label: 'Dashboard & Demands',
      shortLabel: 'Dashboard',
      icon: Store,
      badge: unreadCount > 0 ? `${unreadCount}` : undefined,
      badgeHighlight: unreadCount > 0,
    },
    {
      id: 'stock-sales-dispatch' as SupplierTab,
      label: 'Sales Insights',
      shortLabel: 'Sales Insights',
      icon: TrendingUp,
    },
    {
      id: 'offers' as SupplierTab,
      label: 'Coupons & Trade Schemes',
      shortLabel: 'Coupons',
      icon: Gift,
      badge: offersBadgeCount > 0 ? `${offersBadgeCount}` : 'Bonus',
      badgeHighlight: offersBadgeCount > 0,
    },
    {
      id: 'price-board' as SupplierTab,
      label: 'Price Board',
      shortLabel: 'Price Board',
      icon: Tag,
    },
    {
      id: 'delivery-fleet' as SupplierTab,
      label: 'Vehicle Deliveries',
      shortLabel: 'Deliveries',
      icon: Truck,
    },
    {
      id: 'request' as SupplierTab,
      label: 'Request Stock',
      shortLabel: 'Request Stock',
      icon: Package,
    },
    {
      id: 'history' as SupplierTab,
      label: 'Order History',
      shortLabel: 'Order History',
      icon: ClipboardList,
    },
    {
      id: 'outlets' as SupplierTab,
      label: 'Team & Sales Officers',
      shortLabel: 'Team Members',
      icon: Users,
    },
    {
      id: 'profile' as SupplierTab,
      label: 'Assigned Territory',
      shortLabel: 'File Manager',
      icon: Building,
    },
    {
      id: 'transactions' as SupplierTab,
      label: 'Commercial Ledger',
      shortLabel: 'Statements',
      icon: Receipt,
    },
  ];

  return (
    <aside
      className={`shrink-0 select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16 sm:w-[72px]' : 'w-64 sm:w-72'
      }`}
      aria-label="Supplier Primary Navigation"
    >
      <div className="bg-[#DEFDEF]/95 backdrop-blur-xl rounded-[32px] p-3 sm:p-4 border border-[#BFC8C5] shadow-xl sticky top-[58px] flex flex-col justify-between min-h-[640px] transition-all">
        {/* ================= TOP SECTION: TRAFFIC LIGHT DOTS & PROFILE CARD ================= */}
        <div>
          {/* macOS Style Window Traffic Light Dots & Collapse Toggle */}
          <div className="flex items-center justify-between pb-3 px-1 border-b border-[#BFC8C5]/60 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-2xs" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-2xs" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-2xs" />
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-[#4A5852] hover:text-[#15221C] hover:bg-[#C8F1E8] transition-colors cursor-pointer spt-nav-toggle"
              title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-[#15221C]" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5 text-[#15221C]" />
              )}
            </button>
          </div>

          {/* User Profile Card (As seen in Jimmy Shergill mockup) */}
          {!isCollapsed ? (
            <div
              onClick={() => onTabChange('profile')}
              className="bg-[#EEF9FA] hover:bg-[#C8F1E8]/70 border border-[#BFC8C5] rounded-2xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs mb-4 transition-all duration-150 cursor-pointer group"
              title="View Supplier Profile & Territory"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={supplierLogo}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover border border-[#BFC8C5] group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-white" />
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-bold text-[#15221C] truncate leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-[#4A5852] truncate leading-tight font-medium">
                    {userEmail}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#4A5852] shrink-0 group-hover:text-[#15221C] transition-colors" />
            </div>
          ) : (
            <div
              onClick={() => onTabChange('profile')}
              className="relative flex items-center justify-center my-1 mb-4 cursor-pointer group"
              title={`${displayName} (${userEmail})`}
            >
              <img
                src={supplierLogo}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#BFC8C5] shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="absolute bottom-0 right-1 w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-white" />
            </div>
          )}

          {/* ================= MIDDLE SECTION: NAVIGATION LIST ================= */}
          <nav className="flex flex-col gap-1 max-h-[440px] overflow-y-auto pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center transition-all duration-150 cursor-pointer rounded-2xl spt-nav-item ${
                    isCollapsed
                      ? 'p-2.5 justify-center'
                      : 'px-3 py-2.5 gap-3 justify-between'
                  } ${
                    isActive
                      ? 'spt-nav-active'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-[#15221C] stroke-[2.2]' : 'text-[#384640] stroke-[1.8]'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="text-xs font-semibold truncate leading-none">
                        {item.shortLabel}
                      </span>
                    )}
                  </div>

                  {/* Badge Pill (like the '25' badge in mockup) */}
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border border-[#BFC8C5] ${
                        item.badgeHighlight
                          ? 'bg-[#FADECF] text-[#7D2828] animate-pulse font-black'
                          : isActive
                          ? 'bg-[#C8F1E8] text-[#15221C]'
                          : 'bg-[#C8F1E8] text-[#15221C]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Collapsed Badge Dot */}
                  {isCollapsed && item.badgeHighlight && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF5F56] border border-white" />
                  )}
                </button>
              );
            })}

            {/* Wallet Quick Access Nav Row (As seen in Jimmy Shergill mockup) */}
            {onOpenWallet && (
              <button
                onClick={onOpenWallet}
                title={
                  isCollapsed
                    ? `Wallet Balance: ৳${walletBalance.toLocaleString('en-US')}`
                    : undefined
                }
                className={`group relative flex items-center transition-all duration-150 cursor-pointer rounded-2xl spt-nav-item ${
                  isCollapsed
                    ? 'p-2.5 justify-center'
                    : 'px-3 py-2.5 gap-3 justify-between'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Wallet className="w-4 h-4 shrink-0 text-[#384640] stroke-[1.8] group-hover:scale-110 transition-transform" />
                  {!isCollapsed && (
                    <span className="text-xs font-semibold truncate leading-none">
                      Wallet
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFE8BD] text-[#15221C] border border-[#BFC8C5] shrink-0">
                    ৳{Math.round(walletBalance).toLocaleString('en-US')}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        {/* ================= BOTTOM PINNED SECTION: LOGOUT ================= */}
        <div className="pt-3 border-t border-[#BFC8C5]/60 mt-2">
          {onLogout && (
            <button
              onClick={onLogout}
              title={isCollapsed ? 'Logout of Supplier Portal' : undefined}
              className={`w-full group flex items-center transition-all duration-150 cursor-pointer rounded-2xl spt-nav-logout ${
                isCollapsed
                  ? 'p-2.5 justify-center'
                  : 'px-3 py-2.5 gap-3'
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0 stroke-[1.8] group-hover:scale-110 transition-transform text-[#4A5852] group-hover:text-[#7D2828]" />
              {!isCollapsed && (
                <span className="text-xs font-semibold leading-none truncate">
                  Logout
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
