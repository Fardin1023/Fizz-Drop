import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Building2,
  Store,
  Package,
  Truck,
  MapPin,
  Phone,
  Mail,
  Compass,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Send,
  Boxes,
  Clock,
  ArrowRight,
  TrendingUp,
  LogOut,
  Home,
  ShieldCheck,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLogin from '../Admin/AdminLogin';

interface TerritoryOutlet {
  outlet_id: number;
  outlet_name: string;
  franchise_name?: string;
  branch_name?: string;
  location_address: string;
  city?: string;
  area?: string;
  contact_phone?: string;
  status: string;
  total_shelf_stock?: number;
}

interface ProductItem {
  product_id: number;
  brand: string;
  flavor_variant: string;
  category?: string;
  sku?: string;
  base_price?: number;
  supplier_price?: number;
  outlet_price?: number;
  retail_price?: number;
  image_url?: string;
  depot_buffer_stock?: number;
}

interface OfficerProfile {
  id: number;
  officer_code: string;
  name: string;
  email?: string;
  phone: string;
  supplier_id: number;
  district_id?: number;
  city: string;
  assigned_area: string;
  status: string;
  notes?: string;
  supplier_name?: string;
}

interface SupplierInfo {
  id: number;
  business_name: string;
  depot_address?: string;
  phone_number?: string;
  allocated_areas?: string;
}

export const SalesOfficerDashboard: React.FC = () => {
  const { user, isAuthenticated, logout, loginAsSalesOfficer, isSalesOfficer, isSuperadmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'outlets' | 'demands' | 'supplier-link'>('overview');
  
  // Dashboard Data State
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [outlets, setOutlets] = useState<TerritoryOutlet[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [allOfficers, setAllOfficers] = useState<OfficerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Distribution Modal State
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [selectedOutletForDist, setSelectedOutletForDist] = useState<number | string>('');
  const [selectedProductForDist, setSelectedProductForDist] = useState<number | string>('');
  const [distQuantity, setDistQuantity] = useState<number>(20);
  const [distNotes, setDistNotes] = useState<string>('');
  const [distSubmitting, setDistSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Request Products from Supplier Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqProductId, setReqProductId] = useState<number | string>('');
  const [reqQuantity, setReqQuantity] = useState<number>(30);
  const [reqUrgency, setReqUrgency] = useState<string>('NORMAL');
  const [reqNotes, setReqNotes] = useState<string>('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  // Search & Filters
  const [outletSearch, setOutletSearch] = useState('');
  const [demandStatusFilter, setDemandStatusFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED'>('ALL');

  const fetchDashboardData = async (targetOfficerId?: number) => {
    setLoading(true);
    try {
      const officerParam = targetOfficerId ? `officerId=${targetOfficerId}` : (user?.user_id ? `userId=${user.user_id}` : '');
      const [dashRes, allOffRes] = await Promise.all([
        fetch(`http://localhost:8080/api/v1/sales-officer/dashboard?${officerParam}`),
        fetch('http://localhost:8080/api/v1/sales-officers'),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setOfficer(data.sales_officer || null);
        setSupplier(data.supplier || null);
        setOutlets(data.outlets || []);
        setProducts(data.products || []);
        setRequisitions(data.requisitions || []);

        if (data.outlets && data.outlets.length > 0 && !selectedOutletForDist) {
          setSelectedOutletForDist(data.outlets[0].outlet_id);
        }
        if (data.products && data.products.length > 0 && !selectedProductForDist) {
          setSelectedProductForDist(data.products[0].product_id);
        }
      }

      if (allOffRes.ok) {
        const offList = await allOffRes.json();
        setAllOfficers(Array.isArray(offList) ? offList : []);
      }
    } catch (err) {
      console.error('Error fetching sales officer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.user_id]);

  const handleSwitchOfficer = async (off: OfficerProfile) => {
    await loginAsSalesOfficer(off.id, off.email);
    fetchDashboardData(off.id);
  };

  const handleDistributeStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutletForDist || !selectedProductForDist || distQuantity <= 0) {
      setActionErrorMsg('Please select an outlet, beverage product, and valid quantity');
      return;
    }

    setDistSubmitting(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('http://localhost:8080/api/v1/sales-officer/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: Number(selectedOutletForDist),
          product_id: Number(selectedProductForDist),
          quantity: distQuantity,
          notes: distNotes || `Territory stock allocation by Sales Officer ${officer?.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Distribution failed');
      }

      setActionSuccessMsg(data.message || `Successfully distributed ${distQuantity} cases to outlet!`);
      setIsDistributeModalOpen(false);
      fetchDashboardData(officer?.id);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setDistSubmitting(false);
    }
  };

  const handleRequestStockFromSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officer?.id || !reqProductId || reqQuantity <= 0) {
      setActionErrorMsg('Please select a beverage product and valid quantity');
      return;
    }

    setReqSubmitting(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch('http://localhost:8080/api/v1/sales-officer/request-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_officer_id: officer.id,
          product_id: Number(reqProductId),
          quantity: reqQuantity,
          urgency: reqUrgency,
          notes: reqNotes || `Stock request for ${officer.assigned_area} territory`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      // Real-time broadcast to Supplier browser tabs
      try {
        const bc = new BroadcastChannel('fizzdrop_realtime_events');
        const currentProd = products.find((p) => p.product_id === Number(reqProductId));
        bc.postMessage({
          recipientRole: 'SUPPLIER',
          recipientUserId: data.supplier_user_id,
          title: `New Product Request from Sales Officer ${officer.name}`,
          message: `Sales Officer ${officer.name} (${officer.assigned_area}) requested ${reqQuantity} cases of ${currentProd?.brand || 'Beverage'} ${currentProd?.flavor_variant || ''} (${reqUrgency} priority).`,
          type: 'SALES_OFFICER_REQUISITION',
          status: 'PENDING',
          referenceCode: data.requisition_code,
        });
        setTimeout(() => bc.close(), 100);
      } catch (err) {}

      setActionSuccessMsg(data.message || `Successfully submitted request for ${reqQuantity} cases to Supplier!`);
      setIsRequestModalOpen(false);
      setReqNotes('');
      fetchDashboardData(officer.id);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setReqSubmitting(false);
    }
  };

  // Filtered Territory Outlets
  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const term = outletSearch.toLowerCase();
      return (
        !term ||
        o.outlet_name.toLowerCase().includes(term) ||
        (o.franchise_name && o.franchise_name.toLowerCase().includes(term)) ||
        (o.branch_name && o.branch_name.toLowerCase().includes(term)) ||
        o.location_address.toLowerCase().includes(term)
      );
    });
  }, [outlets, outletSearch]);

  // Filtered Requisitions
  const filteredDemands = useMemo(() => {
    return requisitions.filter((r) => {
      if (demandStatusFilter === 'ALL') return true;
      if (demandStatusFilter === 'PENDING') return r.status === 'PENDING';
      return r.status === 'DISPATCHED' || r.status === 'COMPLETED';
    });
  }, [requisitions, demandStatusFilter]);

  // Quick stats
  const pendingDemandsCount = requisitions.filter((r) => r.status === 'PENDING').length;
  const totalAreaStock = outlets.reduce((sum, o) => sum + (o.total_shelf_stock || 0), 0);

  if (!isAuthenticated && !isSalesOfficer && !isSuperadmin) {
    return <AdminLogin requiredRole="any" />;
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-zinc-900 flex flex-col pb-16 selection:bg-blue-500/20 selection:text-blue-900">
      {/* 1. Top Navbar Fixed Subheader */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Left Brand & Home Link */}
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs"
                title="Return to Customer Storefront"
              >
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-oswald text-base font-bold uppercase tracking-wider text-slate-900">
                      Sales Officer Territory Portal
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      Territory Lead
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Wholesale distribution authority between Supplier and Retail Outlets
                  </p>
                </div>
              </div>
            </div>

            {/* Right Officer Info & Switcher */}
            <div className="flex items-center gap-2.5">
              {/* Officer Quick Profile Chip */}
              {officer && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="font-bold text-teal-600 block text-[11px] leading-tight">
                      {officer.name} ({officer.officer_code})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Zone: {officer.city} • {officer.assigned_area}
                    </span>
                  </div>
                </div>
              )}

              {/* Officer Switcher (Testing tool) */}
              {allOfficers.length > 1 && (
                <div className="relative">
                  <select
                    value={officer?.id || ''}
                    onChange={(e) => {
                      const selected = allOfficers.find((o) => String(o.id) === e.target.value);
                      if (selected) handleSwitchOfficer(selected);
                    }}
                    className="px-2.5 py-1.5 text-[11px] rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 focus:outline-none cursor-pointer"
                    title="Switch Sales Officer Account"
                  >
                    {allOfficers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.assigned_area})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => logout()}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5 flex-1 w-full">
        {/* Toast Alerts */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-scale-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900 ml-3">✕</button>
          </div>
        )}

        {actionErrorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs animate-shake">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg(null)} className="font-bold text-rose-700 hover:text-rose-900 ml-3">✕</button>
          </div>
        )}

        {/* 2. Territory Jurisdiction Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30 shrink-0">
                {officer?.officer_code.split('-')[1] || 'SO'}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    {officer?.officer_code || 'SO-TERRITORY'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {officer?.status || 'ACTIVE'}
                  </span>
                </div>
                <h2 className="font-oswald text-2xl sm:text-3xl font-bold uppercase tracking-wide bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                  {officer?.name || 'Assigned Sales Officer'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/90 pt-1">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Jurisdiction: {officer?.city} • {officer?.assigned_area} Zone
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    {officer?.phone}
                  </span>
                  {officer?.email && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        {officer.email}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Linked Supplier Hub Pill */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1 shrink-0 max-w-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                Assigned Wholesale Supplier Hub
              </span>
              <p className="font-bold text-sm text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">{supplier?.business_name || officer?.supplier_name || 'Central Regional Supplier'}</span>
              </p>
              {supplier?.depot_address && (
                <p className="text-[11px] text-blue-200/80 truncate">
                  Depot: {supplier.depot_address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Key Metric KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Retail Outlets in Area</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-700 font-mono">{outlets.length}</span>
              <span className="text-xs text-slate-500 font-medium">stores</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Physical retail branches</p>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending Outlet Demands</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-600 font-mono">{pendingDemandsCount}</span>
              <span className="text-xs text-slate-500 font-medium">orders</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting fulfillment</p>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Territory Shelf Stock</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 font-mono">{totalAreaStock}</span>
              <span className="text-xs text-slate-500 font-medium">units</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Stock across retail shelves</p>
          </div>

          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Catalog Variants</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-700 font-mono">{products.length}</span>
              <span className="text-xs text-slate-500 font-medium">beverages</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Available for distribution</p>
          </div>
        </div>

        {/* 4. Tab Navigation Strip */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'overview', label: 'Territory Hub & Stock Buffer', icon: Boxes },
              { id: 'outlets', label: `Retail Stores (${outlets.length})`, icon: Store },
              { id: 'demands', label: `Branch Demands (${pendingDemandsCount})`, icon: Clock },
              { id: 'supplier-link', label: 'Supplier Depot & Logistics', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Request Stock from Supplier Button */}
            <button
              onClick={() => {
                if (products.length > 0 && !reqProductId) setReqProductId(products[0].product_id);
                setIsRequestModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Request Products from Supplier</span>
            </button>

            {/* Quick Distribute Stock Trigger */}
            <button
              onClick={() => setIsDistributeModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Distribute Stock to Outlet</span>
          </button>
          </div>
        </div>

        {/* 5. TAB 1: OVERVIEW & WHOLESALE STOCK BUFFER */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Wholesale Beverage Inventory Buffer ({officer?.assigned_area})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Depot beverage cases supplied by {supplier?.business_name || 'Supplier'} to your territory. Distribute directly to branches in your zone.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fetchDashboardData(officer?.id)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Refresh stock levels"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>

              {/* Beverage Product Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {products.map((p) => (
                  <div
                    key={p.product_id}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs group"
                  >
                    <div>
                      {/* Top Brand & Category */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {p.sku || `SKU-${p.product_id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{p.category || 'Carbonated'}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                        {p.brand} {p.flavor_variant}
                      </h4>

                      {/* Stock Buffer Badge */}
                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Territory Buffer</span>
                          <span className="text-lg font-black text-emerald-700 font-mono">
                            {p.depot_buffer_stock ?? 50}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">cases</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Wholesale Rate</span>
                          <span className="text-xs font-bold text-slate-700 font-mono">
                            ৳{Number(p.supplier_price || p.base_price || 35).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductForDist(p.product_id);
                        setIsDistributeModalOpen(true);
                      }}
                      className="mt-3.5 w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Distribute to Branch</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. TAB 2: RETAIL OUTLETS IN TERRITORY */}
        {activeTab === 'outlets' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <Store className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Physical Retail Outlets ({officer?.assigned_area} Zone)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Supermarket and retail stores under your jurisdiction receiving wholesale dispatches.
                    </p>
                  </div>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={outletSearch}
                    onChange={(e) => setOutletSearch(e.target.value)}
                    placeholder="Search outlets by branch or address..."
                    className="w-full pl-8 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {filteredOutlets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Store className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-600 text-sm">No Retail Outlets Found in {officer?.assigned_area}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When Superadmin registers retail stores located in {officer?.assigned_area}, they will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredOutlets.map((o) => (
                    <div
                      key={o.outlet_id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-emerald-400 transition-all flex flex-col justify-between shadow-2xs group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                                {o.franchise_name || 'Retail Branch'}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {o.branch_name || o.outlet_name}
                              </h4>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              o.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>

                        {/* Shelf Stock Gauge */}
                        <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Shelf Inventory:</span>
                          <span className="font-black text-emerald-700 font-mono text-sm">
                            {o.total_shelf_stock || 0} units
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 pt-3 border-t border-slate-100 mt-2.5">
                          <p className="flex items-start gap-1.5 leading-snug">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{o.location_address}</span>
                          </p>
                          {o.contact_phone && (
                            <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{o.contact_phone}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOutletForDist(o.outlet_id);
                          setIsDistributeModalOpen(true);
                        }}
                        className="mt-3.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Supply Stock to this Store</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. TAB 3: BRANCH RESTOCK DEMANDS */}
        {activeTab === 'demands' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                      Incoming Branch Restock Demands
                    </h3>
                    <p className="text-xs text-slate-500">
                      Store requisition orders placed by retail branches in your {officer?.assigned_area} territory.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  {['ALL', 'PENDING', 'DISPATCHED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDemandStatusFilter(st as any)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        demandStatusFilter === st
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'ALL' ? 'All Orders' : st}
                    </button>
                  ))}
                </div>
              </div>

              {filteredDemands.length === 0 ? (
                <div className="p-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-600">No Branch Demands Found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When outlets in {officer?.assigned_area} place restock orders, they will appear here for your fulfillment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDemands.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {req.requisition_code}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(req.created_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{req.franchise_name || req.outlet_name}</span>
                          <span className="text-slate-400 font-normal">—</span>
                          <span className="text-blue-700">{req.product_name}</span>
                          <span className="font-mono text-slate-900 font-black">
                            ({req.quantity} units requested)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOutletForDist(req.outlet_id);
                              setSelectedProductForDist(req.product_id);
                              setDistQuantity(req.quantity);
                              setIsDistributeModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Fulfill Demand</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            Completed & Dispatched
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. TAB 4: SUPPLIER LOGISTICS & LINK */}
        {activeTab === 'supplier-link' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-slate-900">
                    Linked Supplier Regional Depot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your assigned wholesale partner providing beverage cases for {officer?.assigned_area}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Enterprise</span>
                  <h4 className="font-bold text-base text-slate-900">{supplier?.business_name || officer?.supplier_name}</h4>
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Depot: {supplier?.depot_address || 'Central Regional Warehouse Hub'}</span>
                  </p>
                  {supplier?.phone_number && (
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{supplier.phone_number}</span>
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 text-xs text-blue-900 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Distribution Mandate</span>
                  <p className="leading-relaxed">
                    As an authorized Sales Officer, you represent {supplier?.business_name} in the <strong>{officer?.assigned_area}</strong> territory zone. 
                    Retail outlets place demand requisitions with you, and wholesale buffer inventory is dispatched directly from this supplier hub to your field accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 9. DISTRIBUTE STOCK MODAL */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wide">
                    Distribute Stock to Branch
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Direct dispatch from {officer?.assigned_area} buffer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDistributeModalOpen(false)}
                className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDistributeStock} className="p-6 space-y-4">
              {/* Target Outlet */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Target Retail Store in {officer?.assigned_area} *
                </label>
                <select
                  value={selectedOutletForDist}
                  onChange={(e) => setSelectedOutletForDist(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {outlets.map((o) => (
                    <option key={o.outlet_id} value={o.outlet_id}>
                      {o.branch_name || o.outlet_name} ({o.franchise_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Beverage Product *
                </label>
                <select
                  value={selectedProductForDist}
                  onChange={(e) => setSelectedProductForDist(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand} {p.flavor_variant} (Buffer: {p.depot_buffer_stock ?? 50} cases)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Quantity Cases to Supply *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={distQuantity}
                  onChange={(e) => setDistQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-black text-emerald-800 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Delivery Receipt Notes
                </label>
                <input
                  type="text"
                  value={distNotes}
                  onChange={(e) => setDistNotes(e.target.value)}
                  placeholder="e.g. Regular weekly store replenishment"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={distSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {distSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch {distQuantity} Cases</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. REQUEST STOCK FROM SUPPLIER MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wide">
                    Request Stock from Supplier
                  </h3>
                  <p className="text-xs text-blue-100">
                    Order wholesale inventory for {officer?.assigned_area} territory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestStockFromSupplier} className="p-6 space-y-4">
              {/* Supplier Info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Assigned Regional Supplier
                </span>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{supplier?.business_name || officer?.supplier_name || 'Regional Logistics Hub'}</span>
                </p>
                {supplier?.depot_address && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Depot: {supplier.depot_address}
                  </p>
                )}
              </div>

              {/* Product */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Beverage Product *
                </label>
                <select
                  value={reqProductId}
                  onChange={(e) => setReqProductId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand} {p.flavor_variant} (Wholesale: ৳{Number(p.supplier_price || p.base_price || 35).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Quantity Cases Needed *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-black text-blue-800 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Requisition Urgency *
                </label>
                <select
                  value={reqUrgency}
                  onChange={(e) => setReqUrgency(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                >
                  <option value="NORMAL">Normal Restock (2-3 Days)</option>
                  <option value="HIGH">High Priority (Next Day)</option>
                  <option value="CRITICAL">Critical Rush (Immediate Surge)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Territory Justification / Demand Notes
                </label>
                <input
                  type="text"
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="e.g. Retail stores in Dhanmondi reporting low shelf stocks"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {reqSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Request to Supplier</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOfficerDashboard;
