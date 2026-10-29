import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, Heart, MapPin, ChevronDown, Menu, X, ShieldCheck, Crown } from 'lucide-react';

export interface Outlet {
  branchId: number | string;
  branchName: string;
}

interface NavigationProps {
  cartCount?: number;
  outlets?: Outlet[];
  selectedBranch?: number | string;
  onSelectBranch?: (branchId: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  cartCount = 0,
  outlets = [],
  selectedBranch = '',
  onSelectBranch,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-oswald text-2xl font-black tracking-tight uppercase text-zinc-900 dark:text-zinc-50">
              Fizz<span className="text-indigo-600">Drop</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <Link to="/shop" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Shop
            </Link>
            <Link to="/beverages" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Beverages
            </Link>
            <Link to="/shop" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
              <span>Deals</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase">
                Hot
              </span>
            </Link>

            {/* Supplier Portal Link (Products Only) */}
            <Link
              to="/admin"
              className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Supplier Portal</span>
            </Link>

            {/* Superadmin HUD Link (Outlets & Database) */}
            <Link
              to="/superadmin"
              className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Crown className="w-3.5 h-3.5 text-emerald-500" />
              <span>Superadmin</span>
            </Link>
          </nav>

          {/* Search, Outlet Selector & User Actions */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="hidden lg:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search flavors, drops..."
                className="pl-9 pr-4 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-indigo-500 text-zinc-800 dark:text-zinc-200 outline-none w-44 transition-all"
              />
            </div>

            {/* Dynamic Outlet Dropdown */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => onSelectBranch && onSelectBranch(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer max-w-[130px] truncate pr-1"
              >
                <option value="" className="bg-white dark:bg-zinc-900">
                  {outlets.length > 0 ? 'All Outlets' : 'No Outlets (Add in Superadmin)'}
                </option>
                {outlets.map((outlet) => (
                  <option
                    key={outlet.branchId}
                    value={outlet.branchId}
                    className="bg-white dark:bg-zinc-900"
                  >
                    {outlet.branchName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0 pointer-events-none" />
            </div>

            {/* Wishlist */}
            <Link
              to="/shop"
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Cart Icon */}
            <Link
              to="/shop"
              className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Account / Admin Portal */}
            <Link
              to="/superadmin"
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              aria-label="Superadmin Portal"
              title="Superadmin & Database Controls"
            >
              <Crown className="w-5 h-5 text-emerald-500" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4 space-y-3">
          {/* Mobile Outlet Selector */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300">
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => {
                onSelectBranch && onSelectBranch(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="w-full bg-transparent font-medium focus:outline-none"
            >
              <option value="" className="bg-white dark:bg-zinc-900">
                {outlets.length > 0 ? 'All Outlets' : 'No Outlets (Add in Superadmin)'}
              </option>
              {outlets.map((outlet) => (
                <option
                  key={outlet.branchId}
                  value={outlet.branchId}
                  className="bg-white dark:bg-zinc-900"
                >
                  {outlet.branchName}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 py-1"
          >
            Shop All Catalog
          </Link>
          <Link
            to="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold text-indigo-600 dark:text-indigo-400 py-1"
          >
            📦 Supplier Portal (Products Only)
          </Link>
          <Link
            to="/superadmin"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold text-purple-600 dark:text-purple-400 py-1"
          >
            👑 Superadmin (Outlets & Database)
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navigation;
