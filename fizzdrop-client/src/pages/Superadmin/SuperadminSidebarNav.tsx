import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  Package,
  Users,
  Truck,
  Database,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Gift,
  Boxes,
  ClipboardList,
  Store,
  MapPin,
  TrendingUp,
  Terminal,
  Activity,
  Layers,
  ShieldCheck,
  UserCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';
import superadminLogo from '../../assets/img/superadmin-logo.jpg';

export type SuperadminTab =
  | 'products'
  | 'merchandise'
  | 'offers'
  | 'free-stocks'
  | 'requisitions'
  | 'suppliers'
  | 'sales-officers'
  | 'psr-officers'
  | 'deliveries'
  | 'fleet-tracker'
  | 'logs'
  | 'tables'
  | 'outlets'
  | 'inventory'
  | 'query';

interface NavItem {
  id: SuperadminTab;
  label: string;
  shortLabel: string;
  badge?: string;
  badgeHighlight?: boolean;
}

interface NavCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

interface SuperadminSidebarNavProps {
  activeTab: SuperadminTab;
  onTabChange: (tab: SuperadminTab) => void;
  userEmail?: string;
  unreadCount?: number;
  onOpenProfile?: () => void;
  onOpenDbConfig?: () => void;
  isDbConnected?: boolean;
}

export const SuperadminSidebarNav: React.FC<SuperadminSidebarNavProps> = ({
  activeTab,
  onTabChange,
  userEmail = 'admin@fizzdrop.com',
  unreadCount = 0,
  onOpenProfile,
  onOpenDbConfig,
  isDbConnected = true,
}) => {
  // Navigation expansion state (default: expanded on desktop, toggleable)
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isProfileHovered, setIsProfileHovered] = useState<boolean>(false);
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories: NavCategory[] = [
    {
      id: 'dashboard',
      title: 'DASHBOARD & CATALOG',
      icon: LayoutGrid,
      items: [
        { id: 'products', label: 'Master Products & Catalog', shortLabel: 'Master Products' },
        { id: 'merchandise', label: 'Official Merchandise Hub', shortLabel: 'Merchandise', badge: 'Lifestyle' },
        { id: 'offers', label: 'District Trade Schemes', shortLabel: 'Trade Schemes', badge: 'Bonus' },
        { id: 'free-stocks', label: 'Free Stocks & Subsidy Ledger', shortLabel: 'Free Stocks', badge: 'Subsidy' },
        {
          id: 'requisitions',
          label: 'Regional Requisitions Hub',
          shortLabel: 'Requisitions',
          badge: unreadCount > 0 ? `${unreadCount} NEW` : undefined,
          badgeHighlight: unreadCount > 0,
        },
      ],
    },
    {
      id: 'users',
      title: 'USER & TERRITORY DATA',
      icon: Users,
      items: [
        { id: 'suppliers', label: 'Supplier Accounts & Allotment', shortLabel: 'Suppliers' },
        { id: 'sales-officers', label: 'Sales Officer Territory', shortLabel: 'Sales Officers' },
        { id: 'psr-officers', label: 'PSR Field Officers', shortLabel: 'PSR Officers' },
        { id: 'outlets', label: 'Retail Outlets Management', shortLabel: 'Outlets' },
      ],
    },
    {
      id: 'logistics',
      title: 'LOGISTICS & FLEET',
      icon: Truck,
      items: [
        { id: 'deliveries', label: 'Vehicle Delivery Trips', shortLabel: 'Deliveries' },
        { id: 'fleet-tracker', label: 'Live Delivery Fleet Map', shortLabel: 'Fleet Tracker', badge: 'Live GPS' },
      ],
    },
    {
      id: 'audit',
      title: 'AUDIT & SYSTEM TOOLS',
      icon: Activity,
      items: [
        { id: 'logs', label: 'Commercial Logs & Ledger', shortLabel: 'Commercial Logs' },
        { id: 'inventory', label: 'Stock Distribution Matrix', shortLabel: 'Distribution' },
        { id: 'tables', label: 'Database Tables Explorer', shortLabel: 'DB Explorer' },
        { id: 'query', label: 'Live SQL Query Console', shortLabel: 'SQL Console' },
      ],
    },
  ];

  // Helper to find which category is currently active
  const activeCategory = categories.find((cat) => cat.items.some((item) => item.id === activeTab)) || categories[0];

  const handleMouseEnterCategory = (catId: string) => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    setHoveredCategory(catId);
  };

  const handleMouseLeaveCategory = () => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null);
    }, 200);
  };

  const userName = userEmail.split('@')[0].replace('.', ' ');
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <aside
      className="relative z-40 shrink-0 select-none transition-all duration-300"
      aria-label="Superadmin Primary Navigation"
    >
      <div className="flex items-start">
        {/* ================= 1. PALE MINT GREEN ICON CAPSULE RAIL ================= */}
        <div className="w-16 sm:w-[70px] bg-[#A9C2AF] text-[#102618] rounded-[32px] p-3 py-4 shadow-xl border border-[#8FA996] flex flex-col items-center justify-between min-h-[580px] lg:min-h-[640px] shrink-0 relative transition-colors duration-300">
          {/* Top Brand Logo with Deep Forest & Mint Glow Accent */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" title="Superadmin Operations Hub">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#193824] via-[#2D533A] to-[#193824] p-0.5 shadow-md shadow-[#193824]/25 flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-[#193824] rounded-[14px] flex items-center justify-center">
                  <div className="w-5 h-5 rounded-lg bg-[#274833] flex items-center justify-center text-[#CFE0D2] border border-[#8FA996]/30">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="6" cy="12" r="2" />
                      <circle cx="18" cy="12" r="2" />
                      <circle cx="12" cy="6" r="2" />
                      <circle cx="12" cy="18" r="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-8 h-px bg-[#193824]/20 my-1" />
          </div>

          {/* Navigation Category Icon Buttons */}
          <div className="flex-1 flex flex-col items-center justify-center gap-5 my-2 w-full">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isCatActive = cat.items.some((item) => item.id === activeTab);
              const isHovered = hoveredCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  className="relative flex items-center justify-center w-full"
                  onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                  onMouseLeave={handleMouseLeaveCategory}
                >
                  <button
                    onClick={() => {
                      if (!isExpanded) {
                        setIsExpanded(true);
                      }
                      // Switch to first item in category if not already active in it
                      if (!isCatActive && cat.items.length > 0) {
                        onTabChange(cat.items[0].id);
                      }
                    }}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer group ${
                      isCatActive
                        ? 'bg-[#193824] text-[#EBF5EE] shadow-md shadow-[#193824]/30 border border-[#102618]'
                        : 'text-[#193824] hover:text-[#0A1C12] hover:bg-[#9BB7A2]/60'
                    }`}
                    title={cat.title}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </button>

                  {/* Active Indicator Bar (Deep forest green vertical pill on the right side) */}
                  {isCatActive && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#193824] rounded-l-full shadow-md shadow-[#193824]/40" />
                  )}

                  {/* Hover Popover Flyout Menu (Shown when collapsed or hovered) */}
                  {(!isExpanded || isHovered) && isHovered && (
                    <div
                      className="absolute left-[72px] top-1/2 -translate-y-1/2 z-50 bg-[#16251C] text-[#FFFDF7] rounded-2xl shadow-2xl border border-[#2B4A34] p-2 min-w-[210px] animate-fade-in backdrop-blur-md"
                      onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                      onMouseLeave={handleMouseLeaveCategory}
                    >
                      <div className="px-3 py-1.5 border-b border-[#25432D] mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#B8CBBE]">
                          {cat.title}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {cat.items.map((subItem) => {
                          const isSubActive = activeTab === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => {
                                onTabChange(subItem.id);
                                setHoveredCategory(null);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#254A32] text-[#EBFFD8] border border-[#8FA996]/50 font-bold'
                                  : 'text-[#CFD8D1] hover:bg-[#254A32]/70 hover:text-white'
                              }`}
                            >
                              <span>{subItem.shortLabel}</span>
                              {subItem.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#102618] text-[#B8CBBE] border border-[#274833] font-mono">
                                  {subItem.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Avatar with Interactive Hover Profile Pill */}
          <div
            className="relative flex items-center justify-center mt-3"
            onMouseEnter={() => setIsProfileHovered(true)}
            onMouseLeave={() => setIsProfileHovered(false)}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-[#193824] shadow-md border border-[#8FA996] cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
              <img
                src={superadminLogo}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover border-2 border-[#A9C2AF]"
              />
            </div>

            {/* Profile Popout Pill (as seen in mockup: Ada Merlin | PROFILE) */}
            {isProfileHovered && (
              <div className="absolute left-[58px] bottom-0 z-50 flex items-center gap-3 bg-[#FFFDF7] text-[#102618] px-3.5 py-1.5 rounded-full shadow-2xl border border-[#8FA996] animate-fade-in whitespace-nowrap">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#102618] leading-tight">
                    {displayName || 'Super Admin'}
                  </span>
                  <span className="text-[10px] text-[#54735E] leading-tight font-medium">
                    Root Administrator
                  </span>
                </div>
                <button
                  onClick={onOpenProfile}
                  className="px-2.5 py-1 rounded-full bg-[#193824] text-[#EBF5EE] text-[10px] font-black uppercase tracking-wider hover:bg-[#102618] transition-colors cursor-pointer border border-[#2D533A]"
                >
                  PROFILE
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. EXPANDED CLEAN WARM-CREAM DRAWER ================= */}
        {isExpanded && (
          <div className="w-64 sm:w-72 bg-[#FFFDF7] rounded-[32px] p-5 shadow-2xl border border-[#D9CBB8] flex flex-col justify-between min-h-[580px] lg:min-h-[640px] ml-2 animate-fade-in transition-all duration-300">
            <div>
              {/* Header: "Admin" with Status Indicator */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5DECF] mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-[#101B14] tracking-tight">Admin</h2>
                  <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" title="System Online" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#CFE0D2] text-[#122018] border border-[#B8CBBE]">
                  V2.4 OPS
                </span>
              </div>

              {/* Categorized Navigation Groups */}
              <div className="space-y-5 max-h-[460px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-1.5">
                    {/* Category Title */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#7A6E5D] px-3">
                      {cat.title}
                    </div>

                    {/* Nav Items in this category */}
                    <div className="space-y-0.5">
                      {cat.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-[#CFE0D2] text-[#101B14] font-bold border-l-3 border-[#101B14] shadow-xs pl-2.5'
                                : 'text-[#3D483F] hover:bg-[#F2E6D5] hover:text-[#101B14]'
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md uppercase shrink-0 ${
                                  isActive
                                    ? 'bg-[#101B14] text-[#EBFFD8] shadow-2xs'
                                    : item.badgeHighlight
                                    ? 'bg-[#912828] text-white animate-pulse'
                                    : 'bg-[#F2E6D5] text-[#5A645D] border border-[#D9CBB8]'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Collapse Toggle Button & Tooltip (matches mockup circle arrow) */}
            <div className="pt-4 border-t border-[#E5DECF] flex items-center justify-center relative group">
              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-full border border-[#D9CBB8] text-[#5A645D] hover:text-[#101B14] hover:bg-[#F2E6D5] hover:border-[#B8CBBE] flex items-center justify-center transition-all cursor-pointer shadow-xs hover:scale-105"
                title="Collapse Navigation"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Tooltip on hover */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#101B14] text-[#EBFFD8] border border-[#25332A] text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                Collapse Navigation
              </div>
            </div>
          </div>
        )}

        {/* Expand Navigation Button (When Drawer is Collapsed) */}
        {!isExpanded && (
          <div className="ml-2 self-end mb-4">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 bg-[#A9C2AF] text-[#102618] hover:bg-[#9BB7A2] text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-[#8FA996] transition-all cursor-pointer hover:scale-105"
              title="Expand Navigation Drawer"
            >
              <div className="w-4 h-4 rounded-full border border-[#102618]/30 flex items-center justify-center">
                <ChevronRight className="w-3 h-3 text-[#102618]" />
              </div>
              <span className="hidden sm:inline">Expand Navigation</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
