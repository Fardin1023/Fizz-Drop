import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Building2,
  MapPin,
  Users,
  Target,
  DollarSign,
  Package,
  Calendar,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Send,
  FileText,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  Award,
  Truck,
  Percent,
  Store,
  Eye,
  ExternalLink,
  BarChart2,
  PieChart,
  Navigation,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import rsmLogo from '../../assets/img/rsm-logo.jpg';
import DeliveryFleetMap, { type VehicleDispatch } from '../../components/Map/DeliveryFleetMap';

interface RegionalSalesManager {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  division: string;
  target_sales: number;
  district_count?: number;
  asm_count?: number;
  total_sales_cases?: number;
  total_revenue?: number;
  overall_profit?: number;
  overall_loss?: number;
  achievement_percentage?: number;
}

interface AsmCard {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  district_id: number;
  district_name: string;
  division: string;
  target_sales: number;
  total_sales_cases: number;
  total_revenue: number;
  overall_profit: number;
  overall_loss: number;
  achievement_percentage: number;
  total_sos: number;
  total_outlets: number;
  active_orders_count: number;
  total_product_demands_cases: number;
  reports_count: number;
  has_submitted_report: boolean;
  latest_report?: any;
}

interface ProductDemandItem {
  product_id: number;
  product_name: string;
  brand: string;
  category: string;
  sku: string;
  total_cases_demanded: number;
  total_demand_value: number;
}

interface SalesManagerReport {
  id: number;
  report_type: string;
  asm_id: number;
  rsm_id: number;
  district_id: number;
  district_name: string;
  division: string;
  reporting_period: string;
  total_sales_cases: number;
  total_revenue: number;
  overall_profit: number;
  overall_loss: number;
  so_count: number;
  active_orders_count: number;
  product_demands_json?: string;
  so_activities_json?: string;
  notes: string;
  status: string;
  submitted_at: string;
}

export const RsmDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rsms, setRsms] = useState<RegionalSalesManager[]>([]);
  const [selectedRsmId, setSelectedRsmId] = useState<number | null>(null);
  const [selectedRsm, setSelectedRsm] = useState<RegionalSalesManager | null>(null);
  const [summary, setSummary] = useState<any>({});
  const [asms, setAsms] = useState<AsmCard[]>([]);
  const [productDemands, setProductDemands] = useState<ProductDemandItem[]>([]);
  const [reports, setReports] = useState<SalesManagerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportModal, setSelectedReportModal] = useState<SalesManagerReport | null>(null);

  // Regional Fleet Movements State (RSM -> ASMs -> SOs -> Suppliers -> Delivery Teams)
  const [fleetDispatches, setFleetDispatches] = useState<VehicleDispatch[]>([]);
  const [fleetTeams, setFleetTeams] = useState<any[]>([]);
  const [selectedFleetDispatch, setSelectedFleetDispatch] = useState<VehicleDispatch | null>(null);
  const [selectedAsmFilter, setSelectedAsmFilter] = useState<number | null>(null);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [divisionOutlets, setDivisionOutlets] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

  const activeTab = searchParams.get('tab') || 'asms';

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
  };

  // Fetch all 6 RSMs initially
  useEffect(() => {
    const fetchRsms = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/sales-management/rsm/all');
        if (res.ok) {
          const data = await res.json();
          if (data.rsms && data.rsms.length > 0) {
            setRsms(data.rsms);
            const rsmParam = searchParams.get('rsmId');
            const defaultId = rsmParam ? Number(rsmParam) : data.rsms[0].id;
            setSelectedRsmId(defaultId);
          }
        }
      } catch (err) {
        console.error('Failed to load RSMs:', err);
      }
    };
    fetchRsms();
  }, []);

  // Fetch specific RSM Dashboard details
  const fetchRsmData = async (rsmId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/sales-management/rsm/${rsmId}/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRsm(data.rsm);
        setSummary(data.summary || {});
        setAsms(data.asms || []);
        setProductDemands(data.product_demands || []);
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error loading RSM dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRsmId) {
      fetchRsmData(selectedRsmId);
      const params = new URLSearchParams(searchParams);
      params.set('rsmId', String(selectedRsmId));
      setSearchParams(params, { replace: true });
    }
  }, [selectedRsmId]);

  // Fetch RSM Fleet Movements strictly under their ASMs -> SOs -> Suppliers -> Delivery Teams
  const fetchRsmFleet = async (rsmId: number, asmId?: number | null) => {
    try {
      setLoadingFleet(true);
      const url = asmId
        ? `http://localhost:8080/api/v1/delivery/dispatches?rsmId=${rsmId}&asmId=${asmId}`
        : `http://localhost:8080/api/v1/delivery/dispatches?rsmId=${rsmId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: VehicleDispatch[] = Array.isArray(data) ? data : [];
        setFleetDispatches(list);
        if (list.length > 0) {
          setSelectedFleetDispatch((prev) => (prev && list.find((d) => d.id === prev.id) ? prev : list[0]));
        }
      } else {
        setFleetDispatches([]);
      }

      // Fetch delivery teams for this RSM hierarchy
      const teamsUrl = asmId
        ? `http://localhost:8080/api/v1/delivery/teams?rsmId=${rsmId}&asmId=${asmId}`
        : `http://localhost:8080/api/v1/delivery/teams?rsmId=${rsmId}`;
      const teamsRes = await fetch(teamsUrl);
      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setFleetTeams(Array.isArray(tData) ? tData : []);
      } else {
        setFleetTeams([]);
      }
    } catch (err) {
      console.error('Failed to load RSM fleet data:', err);
    } finally {
      setLoadingFleet(false);
    }
  };

  // Fetch division outlets
  useEffect(() => {
    fetch('http://localhost:8080/api/outlets')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const div = selectedRsm?.division?.toLowerCase();
          if (div) {
            setDivisionOutlets(data.filter((o: any) => o.division_name?.toLowerCase() === div));
          } else {
            setDivisionOutlets(data);
          }
        }
      })
      .catch(() => {});
  }, [selectedRsm?.division]);

  // Fetch all suppliers for depot location resolution
  useEffect(() => {
    fetch('http://localhost:8080/api/v1/suppliers')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSuppliers(data);
        }
      })
      .catch((err) => console.error('Failed to load suppliers:', err));
  }, []);

  // Map districts for this RSM's division from ASMs
  const availableDistricts = useMemo(() => {
    return asms.map((a) => ({
      id: a.district_id,
      name: a.district_name,
      division: a.division,
      asmName: a.name,
      asmCode: a.code,
      asmPhone: a.phone,
    }));
  }, [asms]);

  // Load fleet data whenever selected RSM or ASM filter changes
  useEffect(() => {
    if (selectedRsmId) {
      fetchRsmFleet(selectedRsmId, selectedAsmFilter);
    }
  }, [selectedRsmId, selectedAsmFilter]);

  // Polling for live fleet movements when on fleet-map tab
  useEffect(() => {
    if (activeTab === 'fleet-map' && selectedRsmId) {
      const interval = setInterval(() => {
        fetchRsmFleet(selectedRsmId, selectedAsmFilter);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedRsmId, selectedAsmFilter]);

  // Filter ASMs by search query
  const filteredAsms = useMemo(() => {
    if (!searchQuery.trim()) return asms;
    const q = searchQuery.toLowerCase();
    return asms.filter(
      (a) =>
        a.district_name.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q)
    );
  }, [asms, searchQuery]);

  // Product categories breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { cases: number; value: number }>();
    productDemands.forEach((p) => {
      const cat = p.category || 'Other';
      const curr = map.get(cat) || { cases: 0, value: 0 };
      curr.cases += p.total_cases_demanded || 0;
      curr.value += p.total_demand_value || 0;
      map.set(cat, curr);
    });
    return Array.from(map.entries()).map(([category, val]) => ({
      category,
      cases: val.cases,
      value: val.value,
    }));
  }, [productDemands]);

  const targetAmount = selectedRsm?.target_sales ? Number(selectedRsm.target_sales) : 15000000;
  const currentRevenue = summary.total_revenue ? Number(summary.total_revenue) : 0;
  const achievementPct = targetAmount > 0 ? Math.min(100, Math.round((currentRevenue * 100) / targetAmount)) : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={rsmLogo}
              alt="FizzDrop RSM Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shadow-lg shadow-emerald-900/30 border border-emerald-500/40 shrink-0 transform hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                  Regional Command
                </span>
                <span className="text-xs text-slate-400 font-mono">6 Divisions System</span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>FizzDrop RSM Executive Portal</span>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Division / RSM Switcher */}
            <div className="relative">
              <select
                value={selectedRsmId || ''}
                onChange={(e) => setSelectedRsmId(Number(e.target.value))}
                className="bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-bold rounded-xl border border-slate-700 px-3.5 py-2 pr-8 focus:ring-2 focus:ring-rose-500 focus:outline-none transition appearance-none cursor-pointer"
              >
                {rsms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.division} Division • {r.name} ({r.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => selectedRsmId && fetchRsmData(selectedRsmId)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh Division Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>

            <Link
              to="/asm"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition cursor-pointer active:scale-95"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Area Managers (ASM)</span>
            </Link>

            <Link
              to="/sales-officer"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <span>SO Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner: Assigned Regional Sales Manager & Division Identity */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/80 border border-slate-800 p-6 shadow-2xl space-y-4">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-10 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <img
                src={rsmLogo}
                alt="Regional Sales Manager Emblem"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-2xl border-2 border-emerald-500/40 shrink-0 bg-slate-900/60"
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-lg bg-rose-600 text-white shadow-xs">
                    {selectedRsm?.code || 'RSM'}
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    {selectedRsm?.division || 'Division'} Regional Division
                  </span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg font-bold">
                    {asms.length} Assigned Districts
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {selectedRsm?.name || 'Regional Sales Manager'}
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl flex flex-wrap items-center gap-3">
                  <span>Email: <strong className="text-slate-200">{selectedRsm?.email}</strong></span>
                  <span>•</span>
                  <span>Phone: <strong className="text-slate-200">{selectedRsm?.phone}</strong></span>
                  <span>•</span>
                  <span>Districts Covered: <strong className="text-rose-400">{asms.length} Area Sales Managers (ASMs)</strong></span>
                </p>
              </div>
            </div>

            {/* Division Target & Achievement Gauge */}
            <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 min-w-[240px] space-y-2 text-right">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                <span>Monthly Target</span>
                <span className="font-mono text-white">৳{targetAmount.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${achievementPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Achieved: ৳{currentRevenue.toLocaleString()}</span>
                <span className="font-black text-emerald-400">{achievementPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Animated KPI Cards (Sales, Demands, Profit, Loss) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sales */}
          <div className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/70 shadow-lg relative overflow-hidden group hover:border-blue-500/50 hover:bg-slate-800/90 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Division Sales</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {(summary.total_sales_cases ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">Cases</span>
              </div>
              <p className="text-xs text-blue-400 font-mono font-bold mt-1">
                ৳{(summary.total_revenue ?? 0).toLocaleString()} Revenue
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
              <span>Across {asms.length} Districts</span>
              <span className="text-blue-300 font-bold">{summary.total_sos ?? 0} Active SOs</span>
            </div>
          </div>

          {/* Card 2: Product Demands */}
          <div className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/70 shadow-lg relative overflow-hidden group hover:border-amber-500/50 hover:bg-slate-800/90 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Product Demands</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {(summary.total_product_demands_cases ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">Cases Req.</span>
              </div>
              <p className="text-xs text-amber-400 font-mono font-bold mt-1">
                {productDemands.length} Beverage Lines
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
              <span>Wholesale Market Demand</span>
              <span className="text-amber-300 font-bold">{summary.total_outlets ?? 0} Retail Outlets</span>
            </div>
          </div>

          {/* Card 3: Overall Profit */}
          <div className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/70 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 hover:bg-slate-800/90 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overall Profit</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                  ৳{(summary.overall_profit ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-emerald-400/80 font-medium mt-1">
                Wholesale Channel Gross Margin
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
              <span>Operating Margin</span>
              <span className="text-emerald-300 font-bold font-mono">12.5% avg</span>
            </div>
          </div>

          {/* Card 4: Overall Loss */}
          <div className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700/70 shadow-lg relative overflow-hidden group hover:border-rose-500/50 hover:bg-slate-800/90 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overall Loss</span>
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-rose-400 tracking-tight">
                  ৳{(summary.overall_loss ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-rose-400/80 font-medium mt-1">
                Returns, Expired & Damaged Claims
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
              <span>Write-off Risk</span>
              <span className="text-rose-300 font-bold font-mono">Low</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('asms')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'asms'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>District ASMs Tracking ({asms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('demands')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'demands'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Demands Breakdown</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Combined ASM Reports Feed ({reports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fleet-map')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'fleet-map'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30 ring-2 ring-rose-400'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70'
            }`}
          >
            <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Regional Fleet Movements Map</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DISTRICT AREA SALES MANAGERS (ASM) TRACKING */}
        {/* ========================================================================= */}
        {activeTab === 'asms' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Area Sales Managers under {selectedRsm?.division} Division</span>
                  <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                    {asms.length} Districts
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Each Area Sales Manager oversees the cities, Sales Officers, and retail demands within their assigned district.
                </p>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search district or ASM name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Grid of ASM District Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAsms.map((asm) => (
                <div
                  key={asm.id}
                  className="rounded-3xl bg-slate-800/70 border border-slate-700/80 hover:border-rose-500/50 p-5 shadow-lg space-y-4 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: District Name & ASM Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{asm.district_name} District</span>
                        </div>
                        <h4 className="text-base font-black text-white tracking-tight mt-0.5">
                          {asm.name}
                        </h4>
                      </div>
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-700">
                        {asm.code}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {asm.email} • {asm.phone}
                    </p>

                    {/* Sales & Demands Matrix */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Sales Volume</span>
                        <span className="font-black text-white">{asm.total_sales_cases} cs</span>
                        <span className="text-[10px] text-blue-400 block font-bold">৳{asm.total_revenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Profit / Loss</span>
                        <span className="font-black text-emerald-400">৳{asm.overall_profit.toLocaleString()}</span>
                        <span className="text-[10px] text-rose-400 block font-bold">-৳{asm.overall_loss.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Target Achievement Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>District Target: ৳{Number(asm.target_sales).toLocaleString()}</span>
                        <span className="text-white font-mono">{asm.achievement_percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${asm.achievement_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions & Report Status */}
                  <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                    {asm.has_submitted_report ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Report Received</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting Report</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {asm.latest_report && (
                        <button
                          type="button"
                          onClick={() => setSelectedReportModal(asm.latest_report)}
                          className="px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                          title="View Combined Report"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAsmFilter(asm.id);
                          setActiveTab('fleet-map');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                        title={`Track live delivery movements for ${asm.name} (${asm.district_name})`}
                      >
                        <Navigation className="w-3 h-3 text-cyan-300" />
                        <span>Fleet</span>
                      </button>
                      <Link
                        to={`/asm?asmId=${asm.id}`}
                        className="px-2.5 py-1 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Open ASM</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PRODUCT DEMANDS BREAKDOWN */}
        {/* ========================================================================= */}
        {activeTab === 'demands' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Product Demands Across {selectedRsm?.division} Division</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  {productDemands.length} Products
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Aggregated beverage market demand from retail outlets channeled via Area Sales Managers and Sales Officers.
              </p>
            </div>

            {/* Category Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoryBreakdown.map((cat) => (
                <div
                  key={cat.category}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Demand</span>
                  <h4 className="text-sm font-black text-white">{cat.category}</h4>
                  <div className="flex items-baseline justify-between pt-1 font-mono">
                    <span className="text-lg font-black text-amber-400">{cat.cases} cs</span>
                    <span className="text-xs text-slate-400">৳{cat.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Demands Table */}
            <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/70">
                    <tr>
                      <th className="p-3.5">Beverage Product</th>
                      <th className="p-3.5">Category & Brand</th>
                      <th className="p-3.5">Product SKU</th>
                      <th className="p-3.5 text-right">Demanded Cases</th>
                      <th className="p-3.5 text-right">Wholesale Value (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {productDemands.map((p) => (
                      <tr key={p.product_id} className="hover:bg-slate-700/30 transition">
                        <td className="p-3.5 font-bold text-white flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{p.product_name}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                            {p.brand} • {p.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{p.sku}</td>
                        <td className="p-3.5 text-right font-mono font-black text-amber-400 text-sm">
                          {p.total_cases_demanded} cs
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          ৳{Number(p.total_demand_value).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {productDemands.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                          No product demands logged yet for {selectedRsm?.division} division.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COMBINED ASM REPORTS FEED */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>District Reports Feed (ASM to RSM)</span>
                <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono">
                  {reports.length} Reports
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Consolidated operational reports submitted by Area Sales Managers for review by the Regional Sales Manager.
              </p>
            </div>

            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-3xl bg-slate-800/70 border border-slate-700/80 hover:border-rose-500/40 transition space-y-3 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-mono">
                        {rep.district_name} District
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Period: {rep.reporting_period}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Submitted: {new Date(rep.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-700/60 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Sales Volume</span>
                      <span className="font-bold text-white">{rep.total_sales_cases} Cases</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Revenue</span>
                      <span className="font-bold text-blue-400">৳{Number(rep.total_revenue).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Overall Profit</span>
                      <span className="font-bold text-emerald-400">৳{Number(rep.overall_profit).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Overall Loss</span>
                      <span className="font-bold text-rose-400">৳{Number(rep.overall_loss).toLocaleString()}</span>
                    </div>
                  </div>

                  {rep.notes && (
                    <div className="p-3 rounded-xl bg-slate-900/40 text-xs text-slate-300 italic border border-slate-800">
                      "{rep.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Transmitted & Verified to RSM</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedReportModal(rep)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Breakdown</span>
                    </button>
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <div className="p-12 text-center rounded-3xl bg-slate-800/40 border border-slate-800 text-slate-500 space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-bold text-sm text-slate-400">No Combined Reports Received Yet</p>
                  <p className="text-xs">
                    Area Sales Managers can generate and submit consolidated reports from the ASM District Portal.
                  </p>
                  <Link
                    to="/asm"
                    className="inline-block mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    Go to ASM Portal to Submit Report
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REGIONAL FLEET MOVEMENTS MAP (RSM -> ASM -> SO -> SUPPLIER -> TEAM) */}
        {/* ========================================================================= */}
        {activeTab === 'fleet-map' && (
          <div className="space-y-5">
            {/* 1. Header & Hierarchy Pipeline Banner */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-3xl border border-slate-700/80 shadow-lg">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-lg bg-rose-600 text-white shadow-xs">
                    {selectedRsm?.code || 'RSM'} FLEET COMMAND
                  </span>
                  <span className="text-xs bg-slate-900 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{selectedRsm?.division} Regional Movement</span>
                  </span>
                  <span className="text-xs bg-slate-900/90 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg font-mono font-bold">
                    🔒 STRICT REGION ISOLATION
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Regional Delivery Fleet Telemetry & Route Movements</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-3xl">
                  Live tracking of vehicle movements and transit dispatches flowing through your division's hierarchy:
                  <strong className="text-rose-300"> RSM ({selectedRsm?.division})</strong> ➔
                  <strong className="text-amber-300"> ASMs ({asms.length} Districts)</strong> ➔
                  <strong className="text-blue-300"> Sales Officers (SOs)</strong> ➔
                  <strong className="text-indigo-300"> Regional Suppliers</strong> ➔
                  <strong className="text-emerald-300"> Delivery Teams & Vehicles</strong>.
                  Movement from other regional managers is strictly excluded.
                </p>
              </div>

              {/* Hierarchy Quick Filter & Refresh Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                {/* Filter by specific ASM */}
                <div className="relative min-w-[220px]">
                  <select
                    value={selectedAsmFilter || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSelectedAsmFilter(val);
                      if (val) {
                        const match = asms.find((a) => a.id === val);
                        if (match) setSelectedDistrictId(match.district_id);
                      } else {
                        setSelectedDistrictId(null);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-2.5 text-white pr-8 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer appearance-none font-bold"
                  >
                    <option value="">All {asms.length} District ASMs</option>
                    {asms.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.district_name} — {a.name} ({a.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => selectedRsmId && fetchRsmFleet(selectedRsmId, selectedAsmFilter)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95"
                  title="Sync Live Fleet Dispatches"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFleet ? 'animate-spin text-rose-400' : 'text-slate-400'}`} />
                  <span>Sync Fleet</span>
                </button>
              </div>
            </div>

            {/* District Depot Switcher Bar */}
            <div className="bg-slate-800/80 p-4 rounded-3xl border border-slate-700/80 shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-base">
                    🏭
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>Switch District Supplier Depot Location</span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {asms.length} Districts Available
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Select any district in {selectedRsm?.division} division to view its registered supplier depot address, contact info, and GPS coordinates on the map.
                    </p>
                  </div>
                </div>

                {/* District Dropdown Selector */}
                <div className="relative min-w-[260px]">
                  <select
                    value={selectedDistrictId || ''}
                    onChange={(e) => {
                      const distId = e.target.value ? Number(e.target.value) : null;
                      setSelectedDistrictId(distId);
                      if (distId) {
                        const matchAsm = asms.find((a) => a.district_id === distId);
                        if (matchAsm) setSelectedAsmFilter(matchAsm.id);
                      } else {
                        setSelectedAsmFilter(null);
                      }
                    }}
                    className="w-full bg-slate-900 border border-amber-500/50 text-xs rounded-xl px-3 py-2.5 text-amber-300 pr-8 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer appearance-none font-bold font-mono shadow-xs"
                  >
                    <option value="">🗺️ All {asms.length} Districts (Division Depots Overview)</option>
                    {asms.map((a) => (
                      <option key={a.id} value={a.district_id}>
                        📍 {a.district_name} District — ASM: {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Quick Select District Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-700/60 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistrictId(null);
                    setSelectedAsmFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                    selectedDistrictId === null
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-slate-900/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <span>🗺️ All Districts</span>
                  <span className="text-[10px] bg-slate-950/40 px-1.5 py-0.2 rounded-full">
                    {asms.length}
                  </span>
                </button>

                {asms.map((a) => {
                  const isSelected = selectedDistrictId === a.district_id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedDistrictId(a.district_id);
                        setSelectedAsmFilter(a.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                          : 'bg-slate-900/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span>📍 {a.district_name}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive Delivery Fleet Map */}
            <div className="space-y-4">
              <DeliveryFleetMap
                dispatches={fleetDispatches}
                selectedDispatchId={selectedFleetDispatch?.id}
                onSelectDispatch={(disp) => setSelectedFleetDispatch(disp)}
                allowedOutlets={divisionOutlets}
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={(id) => {
                  setSelectedDistrictId(id);
                  if (id) {
                    const matchAsm = asms.find((a) => a.district_id === id);
                    if (matchAsm) setSelectedAsmFilter(matchAsm.id);
                  } else {
                    setSelectedAsmFilter(null);
                  }
                }}
                availableDistricts={availableDistricts}
                suppliers={suppliers}
                divisionName={selectedRsm?.division}
                height="600px"
              />
            </div>

            {/* 3. Delivery Fleet Teams & Moving Vehicles Roster */}
            <div className="bg-slate-800/80 rounded-3xl border border-slate-700/80 p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                    🚚
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">
                      {selectedRsm?.division} Regional Delivery Teams & Vehicles
                    </h4>
                    <p className="text-xs text-slate-400">
                      {fleetTeams.length} delivery teams assigned under your regional suppliers and Sales Officers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">
                    Active Trips: <strong className="text-white">{fleetDispatches.length} Dispatches</strong>
                  </span>
                  <span className="text-slate-400">
                    Stores in Region: <strong className="text-emerald-400">{divisionOutlets.length} Outlets</strong>
                  </span>
                </div>
              </div>

              {/* Delivery Teams Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fleetTeams.map((team) => {
                  const activeDisp = fleetDispatches.find(
                    (d) => d.delivery_team_id === team.id || d.vehicle_registration_no === team.vehicle_registration_no
                  );
                  const isMoving = activeDisp && (activeDisp.status === 'IN_TRANSIT' || activeDisp.status === 'BOARDED');
                  return (
                    <div
                      key={team.id}
                      onClick={() => activeDisp && setSelectedFleetDispatch(activeDisp)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedFleetDispatch?.id === activeDisp?.id
                          ? 'bg-slate-900 border-rose-500 shadow-md ring-1 ring-rose-500'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="font-mono font-bold text-xs text-white">
                            {team.vehicle_registration_no}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isMoving
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {isMoving ? 'ON ROUTE' : team.status || 'AVAILABLE'}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-bold text-slate-200">{team.team_name}</p>
                        <p className="text-[11px] text-slate-400">
                          Supplier: <strong className="text-slate-300">{team.supplier_name || 'Regional Supplier'}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Driver: <strong className="text-slate-300">{team.driver_name}</strong> ({team.driver_phone || 'N/A'})
                        </p>
                      </div>

                      {activeDisp && (
                        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-amber-400 font-bold">{activeDisp.sub_route}</span>
                          <span className="text-slate-400">{activeDisp.dispatch_code}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {fleetTeams.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-500 rounded-2xl bg-slate-900/40 border border-slate-800">
                    <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-xs text-slate-400">No Delivery Teams Configured in {selectedRsm?.division} Division</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Delivery teams will appear here once allocated to regional suppliers and Area Sales Managers in this territory.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Full Report Breakdown Viewer */}
      {selectedReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={rsmLogo}
                  alt="RSM Emblem"
                  className="w-12 h-12 rounded-xl object-cover border border-emerald-500/40 shrink-0 shadow-md"
                />
                <div>
                  <span className="text-xs font-mono font-black uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white">
                    {selectedReportModal.district_name} District Report
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    Consolidated District Performance
                  </h3>
                  <p className="text-xs text-slate-400">
                    Period: {selectedReportModal.reporting_period} • Division: {selectedReportModal.division}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Total Sales</span>
                <span className="text-base font-black text-white">{selectedReportModal.total_sales_cases} cs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Revenue</span>
                <span className="text-base font-black text-blue-400">৳{Number(selectedReportModal.total_revenue).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Profit</span>
                <span className="text-base font-black text-emerald-400">৳{Number(selectedReportModal.overall_profit).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Loss</span>
                <span className="text-base font-black text-rose-400">৳{Number(selectedReportModal.overall_loss).toLocaleString()}</span>
              </div>
            </div>

            {selectedReportModal.notes && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Operational Notes:</span>
                <p className="p-3 rounded-xl bg-slate-800 text-xs text-slate-200">
                  {selectedReportModal.notes}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReportModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RsmDashboard;
