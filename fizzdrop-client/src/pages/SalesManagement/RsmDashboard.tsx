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
    <div className="min-h-screen bg-[#E5FAFB] text-[#163A3C] flex flex-col font-sans selection:bg-[#36A4AB] selection:text-white rsm-theme">
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-40 bg-[#E5FAFB]/95 backdrop-blur-md border-b border-[#CDE2E3] px-4 sm:px-6 py-3 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={rsmLogo}
              alt="FizzDrop RSM Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shadow-sm border border-[#CDE2E3] shrink-0 transform hover:scale-105 transition-transform bg-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] px-2 py-0.5 rounded-full">
                  Regional Command
                </span>
                <span className="text-xs text-[#48686A] font-mono">6 Divisions System</span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#112627] flex items-center gap-1.5">
                <span>FizzDrop RSM Executive Portal</span>
                <Sparkles className="w-4 h-4 text-[#2A969C] animate-pulse" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Division / RSM Switcher */}
            <div className="relative">
              <select
                value={selectedRsmId || ''}
                onChange={(e) => setSelectedRsmId(Number(e.target.value))}
                className="bg-white hover:bg-[#F4FDFE] text-[#163A3C] text-xs font-bold rounded-xl border border-[#CDE2E3] px-3.5 py-2 pr-8 focus:ring-2 focus:ring-[#36A4AB] focus:outline-none transition appearance-none cursor-pointer shadow-xs"
              >
                {rsms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.division} Division • {r.name} ({r.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#48686A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => selectedRsmId && fetchRsmData(selectedRsmId)}
              className="p-2 rounded-xl bg-white hover:bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] transition cursor-pointer shadow-xs"
              title="Refresh Division Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2A969C]' : ''}`} />
            </button>

            <Link
              to="/asm"
              className="px-3.5 py-2 rounded-xl bg-[#163A3C] hover:bg-[#235356] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Users className="w-3.5 h-3.5 text-[#E5FAFB]" />
              <span>Area Managers (ASM)</span>
            </Link>

            <Link
              to="/sales-officer"
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <span>SO Portal</span>
              <ExternalLink className="w-3 h-3 text-[#48686A]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner: Assigned Regional Sales Manager & Division Identity */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-white via-[#F4FDFE] to-[#DCF1F2] border border-[#CDE2E3] p-6 shadow-sm space-y-4">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-[#36A4AB]/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-10 w-60 h-60 rounded-full bg-[#DCF1F2]/60 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <img
                src={rsmLogo}
                alt="Regional Sales Manager Emblem"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-sm border-2 border-[#CDE2E3] shrink-0 bg-white"
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-lg bg-[#163A3C] text-[#E5FAFB] shadow-xs">
                    {selectedRsm?.code || 'RSM'}
                  </span>
                  <span className="text-xs bg-white text-[#163A3C] border border-[#CDE2E3] px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-xs">
                    <MapPin className="w-3 h-3 text-[#2A969C]" />
                    {selectedRsm?.division || 'Division'} Regional Division
                  </span>
                  <span className="text-xs bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] px-2 py-0.5 rounded-lg font-bold">
                    {asms.length} Assigned Districts
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#112627] tracking-tight">
                  {selectedRsm?.name || 'Regional Sales Manager'}
                </h2>
                <p className="text-xs text-[#3B5759] max-w-2xl flex flex-wrap items-center gap-3">
                  <span>Email: <strong className="text-[#163A3C] font-semibold">{selectedRsm?.email}</strong></span>
                  <span>•</span>
                  <span>Phone: <strong className="text-[#163A3C] font-semibold">{selectedRsm?.phone}</strong></span>
                  <span>•</span>
                  <span>Districts Covered: <strong className="text-[#2A969C] font-bold">{asms.length} Area Sales Managers (ASMs)</strong></span>
                </p>
              </div>
            </div>

            {/* Division Target & Achievement Gauge */}
            <div className="bg-white/90 backdrop-blur-md border border-[#CDE2E3] rounded-2xl p-4 min-w-[240px] space-y-2 text-right shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#48686A] font-bold uppercase tracking-wider">
                <span>Monthly Target</span>
                <span className="font-mono text-[#112627] font-extrabold">৳{targetAmount.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-[#DCF1F2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#36A4AB] to-[#163A3C] rounded-full transition-all duration-700"
                  style={{ width: `${achievementPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#48686A]">Achieved: ৳{currentRevenue.toLocaleString()}</span>
                <span className="font-black text-[#163A3C]">{achievementPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Animated KPI Cards (Sales, Demands, Profit, Loss) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sales */}
          <div className="p-5 rounded-3xl bg-white border border-[#CDE2E3] shadow-xs relative overflow-hidden group hover:border-[#36A4AB] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#48686A]">Total Division Sales</span>
              <div className="w-9 h-9 rounded-xl bg-[#DCF1F2] text-[#163A3C] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#112627] tracking-tight">
                  {(summary.total_sales_cases ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-[#48686A] font-medium">Cases</span>
              </div>
              <p className="text-xs text-[#2A969C] font-mono font-bold mt-1">
                ৳{(summary.total_revenue ?? 0).toLocaleString()} Revenue
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#CDE2E3] flex items-center justify-between text-[10px] text-[#48686A]">
              <span>Across {asms.length} Districts</span>
              <span className="text-[#163A3C] font-bold">{summary.total_sos ?? 0} Active SOs</span>
            </div>
          </div>

          {/* Card 2: Product Demands */}
          <div className="p-5 rounded-3xl bg-white border border-[#CDE2E3] shadow-xs relative overflow-hidden group hover:border-[#36A4AB] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#48686A]">Product Demands</span>
              <div className="w-9 h-9 rounded-xl bg-[#DCF1F2] text-[#163A3C] flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#112627] tracking-tight">
                  {(summary.total_product_demands_cases ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-[#48686A] font-medium">Cases Req.</span>
              </div>
              <p className="text-xs text-[#2A969C] font-mono font-bold mt-1">
                {productDemands.length} Beverage Lines
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#CDE2E3] flex items-center justify-between text-[10px] text-[#48686A]">
              <span>Wholesale Market Demand</span>
              <span className="text-[#163A3C] font-bold">{summary.total_outlets ?? 0} Retail Outlets</span>
            </div>
          </div>

          {/* Card 3: Overall Profit */}
          <div className="p-5 rounded-3xl bg-white border border-[#CDE2E3] shadow-xs relative overflow-hidden group hover:border-[#36A4AB] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#48686A]">Overall Profit</span>
              <div className="w-9 h-9 rounded-xl bg-[#DCF1F2] text-[#163A3C] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#167a68] tracking-tight">
                  ৳{(summary.overall_profit ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#48686A] font-medium mt-1">
                Wholesale Channel Gross Margin
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#CDE2E3] flex items-center justify-between text-[10px] text-[#48686A]">
              <span>Operating Margin</span>
              <span className="text-[#163A3C] font-bold font-mono">12.5% avg</span>
            </div>
          </div>

          {/* Card 4: Overall Loss */}
          <div className="p-5 rounded-3xl bg-white border border-[#CDE2E3] shadow-xs relative overflow-hidden group hover:border-[#36A4AB] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#48686A]">Overall Loss</span>
              <div className="w-9 h-9 rounded-xl bg-[#DCF1F2] text-[#163A3C] flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#b91c1c] tracking-tight">
                  ৳{(summary.overall_loss ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#48686A] font-medium mt-1">
                Returns, Expired & Damaged Claims
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#CDE2E3] flex items-center justify-between text-[10px] text-[#48686A]">
              <span>Write-off Risk</span>
              <span className="text-[#163A3C] font-bold font-mono">Low</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#CDE2E3] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('asms')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'asms'
                ? 'bg-[#163A3C] text-white shadow-md'
                : 'bg-white hover:bg-[#DCF1F2] text-[#3B5759] hover:text-[#163A3C] border border-[#CDE2E3] shadow-xs'
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
                ? 'bg-[#163A3C] text-white shadow-md'
                : 'bg-white hover:bg-[#DCF1F2] text-[#3B5759] hover:text-[#163A3C] border border-[#CDE2E3] shadow-xs'
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
                ? 'bg-[#163A3C] text-white shadow-md'
                : 'bg-white hover:bg-[#DCF1F2] text-[#3B5759] hover:text-[#163A3C] border border-[#CDE2E3] shadow-xs'
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
                ? 'bg-[#163A3C] text-white shadow-md ring-2 ring-[#36A4AB]'
                : 'bg-white hover:bg-[#DCF1F2] text-[#3B5759] hover:text-[#163A3C] border border-[#CDE2E3] shadow-xs'
            }`}
          >
            <Navigation className="w-4 h-4 text-[#2A969C] animate-pulse" />
            <span>Regional Fleet Movements Map</span>
            <span className="w-2 h-2 rounded-full bg-[#36A4AB] animate-ping" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DISTRICT AREA SALES MANAGERS (ASM) TRACKING */}
        {/* ========================================================================= */}
        {activeTab === 'asms' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#112627] tracking-tight flex items-center gap-2">
                  <span>Area Sales Managers under {selectedRsm?.division} Division</span>
                  <span className="text-xs bg-[#DCF1F2] border border-[#CDE2E3] text-[#163A3C] px-2 py-0.5 rounded-full font-mono">
                    {asms.length} Districts
                  </span>
                </h3>
                <p className="text-xs text-[#48686A]">
                  Each Area Sales Manager oversees the cities, Sales Officers, and retail demands within their assigned district.
                </p>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-[#48686A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search district or ASM name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#CDE2E3] text-xs rounded-xl pl-9 pr-3 py-2 text-[#163A3C] placeholder-[#67888A] focus:outline-none focus:ring-2 focus:ring-[#36A4AB] shadow-xs"
                />
              </div>
            </div>

            {/* Grid of ASM District Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAsms.map((asm) => (
                <div
                  key={asm.id}
                  className="rounded-3xl bg-white border border-[#CDE2E3] hover:border-[#36A4AB] p-5 shadow-xs space-y-4 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: District Name & ASM Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-[#2A969C] text-xs font-bold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{asm.district_name} District</span>
                        </div>
                        <h4 className="text-base font-black text-[#112627] tracking-tight mt-0.5">
                          {asm.name}
                        </h4>
                      </div>
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3]">
                        {asm.code}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#48686A]">
                      {asm.email} • {asm.phone}
                    </p>

                    {/* Sales & Demands Matrix */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#F4FDFE] border border-[#CDE2E3] text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[#67888A] block uppercase font-bold">Sales Volume</span>
                        <span className="font-black text-[#112627]">{asm.total_sales_cases} cs</span>
                        <span className="text-[10px] text-[#2A969C] block font-bold">৳{asm.total_revenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#67888A] block uppercase font-bold">Profit / Loss</span>
                        <span className="font-black text-[#167a68]">৳{asm.overall_profit.toLocaleString()}</span>
                        <span className="text-[10px] text-[#b91c1c] block font-bold">-৳{asm.overall_loss.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Target Achievement Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#48686A]">
                        <span>District Target: ৳{Number(asm.target_sales).toLocaleString()}</span>
                        <span className="text-[#112627] font-mono font-bold">{asm.achievement_percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#DCF1F2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#36A4AB] to-[#163A3C] rounded-full transition-all duration-500"
                          style={{ width: `${asm.achievement_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions & Report Status */}
                  <div className="pt-3 border-t border-[#CDE2E3] flex items-center justify-between gap-2">
                    {asm.has_submitted_report ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#167a68] bg-[#DCF1F2] border border-[#CDE2E3] px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-[#167a68]" />
                        <span>Report Received</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-[#b45309]" />
                        <span>Awaiting Report</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {asm.latest_report && (
                        <button
                          type="button"
                          onClick={() => setSelectedReportModal(asm.latest_report)}
                          className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                          title="View Combined Report"
                        >
                          <Eye className="w-3 h-3 text-[#2A969C]" />
                          <span>Report</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAsmFilter(asm.id);
                          setActiveTab('fleet-map');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-[#DCF1F2] hover:bg-[#CDE2E3] text-[#163A3C] border border-[#CDE2E3] text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                        title={`Track live delivery movements for ${asm.name} (${asm.district_name})`}
                      >
                        <Navigation className="w-3 h-3 text-[#2A969C]" />
                        <span>Fleet</span>
                      </button>
                      <Link
                        to={`/asm?asmId=${asm.id}`}
                        className="px-2.5 py-1 rounded-xl bg-[#163A3C] hover:bg-[#235356] text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Open ASM</span>
                        <ArrowUpRight className="w-3 h-3 text-[#E5FAFB]" />
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
              <h3 className="text-lg font-black text-[#112627] tracking-tight flex items-center gap-2">
                <span>Product Demands Across {selectedRsm?.division} Division</span>
                <span className="text-xs bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] px-2 py-0.5 rounded-full font-mono">
                  {productDemands.length} Products
                </span>
              </h3>
              <p className="text-xs text-[#48686A]">
                Aggregated beverage market demand from retail outlets channeled via Area Sales Managers and Sales Officers.
              </p>
            </div>

            {/* Category Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoryBreakdown.map((cat) => (
                <div
                  key={cat.category}
                  className="p-4 rounded-2xl bg-white border border-[#CDE2E3] space-y-1.5 shadow-xs"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#67888A]">Category Demand</span>
                  <h4 className="text-sm font-black text-[#112627]">{cat.category}</h4>
                  <div className="flex items-baseline justify-between pt-1 font-mono">
                    <span className="text-lg font-black text-[#2A969C]">{cat.cases} cs</span>
                    <span className="text-xs text-[#48686A]">৳{cat.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Demands Table */}
            <div className="rounded-3xl bg-white border border-[#CDE2E3] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#DCF1F2] text-[#163A3C] font-bold uppercase tracking-wider border-b border-[#CDE2E3]">
                    <tr>
                      <th className="p-3.5">Beverage Product</th>
                      <th className="p-3.5">Category & Brand</th>
                      <th className="p-3.5">Product SKU</th>
                      <th className="p-3.5 text-right">Demanded Cases</th>
                      <th className="p-3.5 text-right">Wholesale Value (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CDE2E3]">
                    {productDemands.map((p) => (
                      <tr key={p.product_id} className="hover:bg-[#F4FDFE] transition">
                        <td className="p-3.5 font-bold text-[#112627] flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-[#2A969C] shrink-0" />
                          <span>{p.product_name}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] font-medium text-[11px]">
                            {p.brand} • {p.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[#48686A]">{p.sku}</td>
                        <td className="p-3.5 text-right font-mono font-black text-[#2A969C] text-sm">
                          {p.total_cases_demanded} cs
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-[#112627]">
                          ৳{Number(p.total_demand_value).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {productDemands.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#67888A] italic">
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
              <h3 className="text-lg font-black text-[#112627] tracking-tight flex items-center gap-2">
                <span>District Reports Feed (ASM to RSM)</span>
                <span className="text-xs bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] px-2 py-0.5 rounded-full font-mono">
                  {reports.length} Reports
                </span>
              </h3>
              <p className="text-xs text-[#48686A]">
                Consolidated operational reports submitted by Area Sales Managers for review by the Regional Sales Manager.
              </p>
            </div>

            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-3xl bg-white border border-[#CDE2E3] hover:border-[#36A4AB] transition space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-[#163A3C] text-white font-mono shadow-xs">
                        {rep.district_name} District
                      </span>
                      <span className="text-xs text-[#48686A] font-medium">Period: {rep.reporting_period}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#67888A]">
                      Submitted: {new Date(rep.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#F4FDFE] border border-[#CDE2E3] font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-[#67888A] block uppercase font-bold">Sales Volume</span>
                      <span className="font-bold text-[#112627]">{rep.total_sales_cases} Cases</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#67888A] block uppercase font-bold">Revenue</span>
                      <span className="font-bold text-[#2A969C]">৳{Number(rep.total_revenue).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#67888A] block uppercase font-bold">Overall Profit</span>
                      <span className="font-bold text-[#167a68]">৳{Number(rep.overall_profit).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#67888A] block uppercase font-bold">Overall Loss</span>
                      <span className="font-bold text-[#b91c1c]">৳{Number(rep.overall_loss).toLocaleString()}</span>
                    </div>
                  </div>

                  {rep.notes && (
                    <div className="p-3 rounded-xl bg-[#F4FDFE] text-xs text-[#3B5759] italic border border-[#CDE2E3]">
                      "{rep.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#167a68] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#167a68]" />
                      <span>Transmitted & Verified to RSM</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedReportModal(rep)}
                      className="px-3 py-1.5 rounded-xl bg-[#163A3C] hover:bg-[#235356] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E5FAFB]" />
                      <span>Inspect Breakdown</span>
                    </button>
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <div className="p-12 text-center rounded-3xl bg-white border border-[#CDE2E3] text-[#67888A] space-y-2 shadow-xs">
                  <FileText className="w-8 h-8 text-[#48686A] mx-auto" />
                  <p className="font-bold text-sm text-[#112627]">No Combined Reports Received Yet</p>
                  <p className="text-xs text-[#48686A]">
                    Area Sales Managers can generate and submit consolidated reports from the ASM District Portal.
                  </p>
                  <Link
                    to="/asm"
                    className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#163A3C] hover:bg-[#235356] text-white text-xs font-bold shadow-xs"
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#CDE2E3] shadow-xs">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-lg bg-[#163A3C] text-white shadow-xs">
                    {selectedRsm?.code || 'RSM'} FLEET COMMAND
                  </span>
                  <span className="text-xs bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2A969C] animate-ping" />
                    <span>{selectedRsm?.division} Regional Movement</span>
                  </span>
                  <span className="text-xs bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] px-2.5 py-0.5 rounded-lg font-mono font-bold">
                    🔒 STRICT REGION ISOLATION
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#112627] tracking-tight flex items-center gap-2">
                  <span>Regional Delivery Fleet Telemetry & Route Movements</span>
                </h3>
                <p className="text-xs text-[#3B5759] max-w-3xl">
                  Live tracking of vehicle movements and transit dispatches flowing through your division's hierarchy:
                  <strong className="text-[#163A3C]"> RSM ({selectedRsm?.division})</strong> ➔
                  <strong className="text-[#2A969C]"> ASMs ({asms.length} Districts)</strong> ➔
                  <strong className="text-[#163A3C]"> Sales Officers (SOs)</strong> ➔
                  <strong className="text-[#2A969C]"> Regional Suppliers</strong> ➔
                  <strong className="text-[#167a68]"> Delivery Teams & Vehicles</strong>.
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
                    className="w-full bg-white border border-[#CDE2E3] text-xs rounded-xl px-3 py-2.5 text-[#163A3C] pr-8 focus:ring-2 focus:ring-[#36A4AB] focus:outline-none cursor-pointer appearance-none font-bold shadow-xs"
                  >
                    <option value="">All {asms.length} District ASMs</option>
                    {asms.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.district_name} — {a.name} ({a.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#48686A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => selectedRsmId && fetchRsmFleet(selectedRsmId, selectedAsmFilter)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#163A3C] hover:bg-[#235356] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="Sync Live Fleet Dispatches"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFleet ? 'animate-spin text-[#2A969C]' : 'text-[#DCF1F2]'}`} />
                  <span>Sync Fleet</span>
                </button>
              </div>
            </div>

            {/* District Depot Switcher Bar */}
            <div className="bg-white p-4 rounded-3xl border border-[#CDE2E3] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] text-base">
                    🏭
                  </span>
                  <div>
                    <h4 className="font-bold text-[#112627] text-sm flex items-center gap-2">
                      <span>Switch District Supplier Depot Location</span>
                      <span className="text-[10px] font-mono text-[#163A3C] bg-[#DCF1F2] px-2 py-0.5 rounded-full border border-[#CDE2E3]">
                        {asms.length} Districts Available
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#48686A]">
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
                    className="w-full bg-white border border-[#CDE2E3] text-xs rounded-xl px-3 py-2.5 text-[#163A3C] pr-8 focus:ring-2 focus:ring-[#36A4AB] focus:outline-none cursor-pointer appearance-none font-bold font-mono shadow-xs"
                  >
                    <option value="">🗺️ All {asms.length} Districts (Division Depots Overview)</option>
                    {asms.map((a) => (
                      <option key={a.id} value={a.district_id}>
                        📍 {a.district_name} District — ASM: {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#48686A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Quick Select District Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[#CDE2E3] scrollbar-thin">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistrictId(null);
                    setSelectedAsmFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                    selectedDistrictId === null
                      ? 'bg-[#163A3C] text-white shadow-xs font-black'
                      : 'bg-[#F4FDFE] hover:bg-[#DCF1F2] text-[#3B5759] border border-[#CDE2E3]'
                  }`}
                >
                  <span>🗺️ All Districts</span>
                  <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full text-white">
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
                          ? 'bg-[#163A3C] text-white shadow-xs font-black'
                          : 'bg-[#F4FDFE] hover:bg-[#DCF1F2] text-[#3B5759] border border-[#CDE2E3]'
                      }`}
                    >
                      <span>📍 {a.district_name}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#2A969C] animate-ping" />}
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
            <div className="bg-white rounded-3xl border border-[#CDE2E3] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CDE2E3] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#DCF1F2] text-[#163A3C] border border-[#CDE2E3] flex items-center justify-center font-bold text-lg shadow-xs">
                    🚚
                  </div>
                  <div>
                    <h4 className="font-bold text-[#112627] text-base">
                      {selectedRsm?.division} Regional Delivery Teams & Vehicles
                    </h4>
                    <p className="text-xs text-[#48686A]">
                      {fleetTeams.length} delivery teams assigned under your regional suppliers and Sales Officers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[#48686A]">
                    Active Trips: <strong className="text-[#112627]">{fleetDispatches.length} Dispatches</strong>
                  </span>
                  <span className="text-[#48686A]">
                    Stores in Region: <strong className="text-[#167a68]">{divisionOutlets.length} Outlets</strong>
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
                          ? 'bg-white border-[#163A3C] shadow-sm ring-2 ring-[#163A3C]/30'
                          : 'bg-[#F4FDFE] hover:bg-white border-[#CDE2E3] hover:border-[#36A4AB]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#167a68]" />
                          <span className="font-mono font-bold text-xs text-[#112627]">
                            {team.vehicle_registration_no}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isMoving
                            ? 'bg-[#DCF1F2] text-[#163A3C] border border-[#36A4AB] animate-pulse'
                            : 'bg-white text-[#48686A] border border-[#CDE2E3]'
                        }`}>
                          {isMoving ? 'ON ROUTE' : team.status || 'AVAILABLE'}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-bold text-[#112627]">{team.team_name}</p>
                        <p className="text-[11px] text-[#48686A]">
                          Supplier: <strong className="text-[#163A3C]">{team.supplier_name || 'Regional Supplier'}</strong>
                        </p>
                        <p className="text-[11px] text-[#48686A]">
                          Driver: <strong className="text-[#163A3C]">{team.driver_name}</strong> ({team.driver_phone || 'N/A'})
                        </p>
                      </div>

                      {activeDisp && (
                        <div className="mt-3 pt-2 border-t border-[#CDE2E3] flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#2A969C] font-bold">{activeDisp.sub_route}</span>
                          <span className="text-[#67888A]">{activeDisp.dispatch_code}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {fleetTeams.length === 0 && (
                  <div className="col-span-full p-8 text-center text-[#67888A] rounded-2xl bg-[#F4FDFE] border border-[#CDE2E3]">
                    <Truck className="w-8 h-8 text-[#48686A] mx-auto mb-2" />
                    <p className="font-bold text-xs text-[#112627]">No Delivery Teams Configured in {selectedRsm?.division} Division</p>
                    <p className="text-[11px] text-[#48686A] mt-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#163A3C]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#CDE2E3] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[#163A3C]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={rsmLogo}
                  alt="RSM Emblem"
                  className="w-12 h-12 rounded-xl object-cover border border-[#CDE2E3] shrink-0 shadow-xs bg-white"
                />
                <div>
                  <span className="text-xs font-mono font-black uppercase px-2 py-0.5 rounded-md bg-[#163A3C] text-white shadow-xs">
                    {selectedReportModal.district_name} District Report
                  </span>
                  <h3 className="text-xl font-black text-[#112627] mt-1">
                    Consolidated District Performance
                  </h3>
                  <p className="text-xs text-[#48686A]">
                    Period: {selectedReportModal.reporting_period} • Division: {selectedReportModal.division}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportModal(null)}
                className="p-1.5 rounded-xl bg-white hover:bg-[#DCF1F2] text-[#48686A] hover:text-[#163A3C] border border-[#CDE2E3] transition cursor-pointer shadow-xs"
              >
                ✕
              </button>
            </div>

            {/* Financial Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#F4FDFE] border border-[#CDE2E3] font-mono text-xs">
              <div>
                <span className="text-[10px] text-[#67888A] uppercase block font-bold">Total Sales</span>
                <span className="text-base font-black text-[#112627]">{selectedReportModal.total_sales_cases} cs</span>
              </div>
              <div>
                <span className="text-[10px] text-[#67888A] uppercase block font-bold">Revenue</span>
                <span className="text-base font-black text-[#2A969C]">৳{Number(selectedReportModal.total_revenue).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#67888A] uppercase block font-bold">Profit</span>
                <span className="text-base font-black text-[#167a68]">৳{Number(selectedReportModal.overall_profit).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#67888A] uppercase block font-bold">Loss</span>
                <span className="text-base font-black text-[#b91c1c]">৳{Number(selectedReportModal.overall_loss).toLocaleString()}</span>
              </div>
            </div>

            {selectedReportModal.notes && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#48686A] uppercase">Operational Notes:</span>
                <p className="p-3 rounded-xl bg-[#F4FDFE] border border-[#CDE2E3] text-xs text-[#3B5759]">
                  {selectedReportModal.notes}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReportModal(null)}
                className="px-4 py-2 rounded-xl bg-[#163A3C] hover:bg-[#235356] text-white text-xs font-bold cursor-pointer shadow-xs"
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
