import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, Heart, MapPin, ChevronDown, Menu, X, ShieldCheck, Crown, Store } from 'lucide-react';
import fizzdropLogo from '../../assets/img/fizzdrop-logo.png';

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
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#DCE8E9] shadow-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 sm:h-24 items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center group transition-transform duration-200 hover:scale-105 shrink-0" title="FizzDrop Beverage Co.">
            <img
              src={fizzdropLogo}
              alt="FizzDrop Beverage Co."
              className="h-14 sm:h-18 w-auto max-w-[220px] sm:max-w-[280px] object-contain rounded-2xl bg-white shadow-xs border border-[#DCE8E9] group-hover:border-[#FF6A00] group-hover:shadow-md transition-all p-1"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-[#3D5558]">
            <Link to="/shop" className="hover:text-[#FF6A00] transition-colors font-bold">
              Shop
            </Link>
            <Link to="/beverages" className="hover:text-[#FF6A00] transition-colors font-bold">
              Beverages
            </Link>
            <Link to="/shop" className="hover:text-[#FF6A00] transition-colors flex items-center gap-1 font-bold">
              <span>Deals</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FF6A00]/15 text-[#FF6A00] font-black uppercase border border-[#FF6A00]/30 shadow-2xs">
                Hot
              </span>
            </Link>

            {/* Supplier Portal Link (Products Only) */}
            <Link
              to="/admin"
              className="px-2.5 py-1 rounded-xl bg-[#EDF7F7] border border-[#DCE8E9] text-[#1A282A] hover:bg-[#9BD8DA]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1A282A]" />
              <span>Supplier Portal</span>
            </Link>

            {/* Outlet Portal Link (Store POS & Stock) */}
            <Link
              to="/outlet"
              className="px-2.5 py-1 rounded-xl bg-[#65B016]/10 border border-[#65B016]/30 text-[#4B8510] hover:bg-[#65B016]/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Store className="w-3.5 h-3.5 text-[#65B016]" />
              <span>Outlet Portal</span>
            </Link>

            {/* Superadmin HUD Link (Outlets & Database) */}
            <Link
              to="/superadmin"
              className="px-2.5 py-1 rounded-xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 text-[#FF6A00] hover:bg-[#FF6A00]/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Crown className="w-3.5 h-3.5 text-[#FFB62A]" />
              <span>Superadmin</span>
            </Link>

            {/* Regional Sales Manager (RSM) Link */}
            <Link
              to="/rsm"
              className="px-2.5 py-1 rounded-xl bg-[#FFB62A]/15 border border-[#FFB62A]/35 text-[#D98E00] hover:bg-[#FFB62A]/25 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>RSM (6 Divisions)</span>
            </Link>

            {/* Area Sales Manager (ASM) Link */}
            <Link
              to="/asm"
              className="px-2.5 py-1 rounded-xl bg-[#9BD8DA]/30 border border-[#9BD8DA] text-[#1A282A] hover:bg-[#9BD8DA]/50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>ASM (64 Districts)</span>
            </Link>
          </nav>

          {/* Search, Outlet Selector & User Actions */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="hidden lg:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-[#6B8487]" />
              <input
                type="text"
                placeholder="Search flavors, drops..."
                className="pl-9 pr-4 py-1.5 text-xs rounded-xl bg-[#EDF7F7] border border-[#DCE8E9] focus:border-[#FF6A00] text-[#1A282A] outline-none w-44 transition-all shadow-xs placeholder-[#6B8487]"
              />
            </div>

            {/* Dynamic Outlet Dropdown */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDF7F7] border border-[#DCE8E9] text-xs font-medium text-[#1A282A] transition-colors shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => onSelectBranch && onSelectBranch(e.target.value)}
                className="bg-transparent font-bold focus:outline-none cursor-pointer max-w-[130px] truncate pr-1 text-[#1A282A]"
              >
                <option value="" className="bg-white text-[#1A282A]">
                  {outlets.length > 0 ? 'All Outlets' : 'No Outlets (Add in Superadmin)'}
                </option>
                {outlets.map((outlet) => (
                  <option
                    key={outlet.branchId}
                    value={outlet.branchId}
                    className="bg-white text-[#1A282A]"
                  >
                    {outlet.branchName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#6B8487] shrink-0 pointer-events-none" />
            </div>

            {/* Wishlist */}
            <Link
              to="/shop"
              className="p-2 rounded-xl text-[#3D5558] hover:text-[#FF6A00] hover:bg-[#EDF7F7] transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Cart Icon */}
            <Link
              to="/shop"
              className="relative p-2 rounded-xl text-[#3D5558] hover:text-[#FF6A00] hover:bg-[#EDF7F7] transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6A00] text-[10px] font-bold text-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Account / Admin Portal */}
            <Link
              to="/superadmin"
              className="p-2 rounded-xl text-[#3D5558] hover:text-[#FF6A00] hover:bg-[#EDF7F7] transition-colors cursor-pointer"
              aria-label="Superadmin Portal"
              title="Superadmin & Database Controls"
            >
              <Crown className="w-5 h-5 text-[#FFB62A]" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#3D5558] hover:text-[#FF6A00]"
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
            to="/outlet"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold text-emerald-600 dark:text-emerald-400 py-1"
          >
            🏪 Outlet Portal (Store POS & Stock)
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
          <Link
            to="/rsm"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold text-indigo-600 dark:text-indigo-400 py-1"
          >
            📊 Regional Sales Manager (RSM) Portal
          </Link>
          <Link
            to="/asm"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold text-blue-600 dark:text-blue-400 py-1"
          >
            🗺️ Area Sales Manager (ASM) Portal
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navigation;
