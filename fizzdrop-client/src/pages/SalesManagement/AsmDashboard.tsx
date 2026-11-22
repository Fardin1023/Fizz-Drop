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
  Plus,
  UserCheck,
  Activity,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import asmLogo from '../../assets/img/asm-logo.jpg';

interface AreaSalesManager {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  district_id: number;
  district_name: string;
  division: string;
  rsm_id: number;
  rsm_name?: string;
  target_sales: number;
}

interface RegionalSalesManager {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  division: string;
  target_sales: number;
}

interface CityItem {
  city: string;
  outlets_count: number;
}

interface SalesOfficerItem {
  id: number;
  officer_code: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  assigned_area: string;
  status: string;
  monthly_target: number;
  outlet_count: number;
  psr_count: number;
  total_purchased_cases: number;
  outlet_channeled_cases: number;
  sales_cases: number;
  sales_revenue: number;
  profit_earned: number;
  loss_amount: number;
}

interface SoActivityItem {
  activity_type: string;
  id: number;
  code: string;
  quantity: number;
  status: string;
  activity_time: string;
  is_so_purchase: boolean;
  product_name: string;
  brand: string;
  category: string;
  so_name: string;
  assigned_area: string;
  city: string;
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

export const AsmDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allAsms, setAllAsms] = useState<AreaSalesManager[]>([]);
  const [selectedAsmId, setSelectedAsmId] = useState<number | null>(null);
  const [selectedAsm, setSelectedAsm] = useState<AreaSalesManager | null>(null);
  const [supervisingRsm, setSupervisingRsm] = useState<RegionalSalesManager | null>(null);
  const [summary, setSummary] = useState<any>({});
  const [cities, setCities] = useState<CityItem[]>([]);
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficerItem[]>([]);
  const [soActivities, setSoActivities] = useState<SoActivityItem[]>([]);
  const [productDemands, setProductDemands] = useState<ProductDemandItem[]>([]);
  const [reports, setReports] = useState<SalesManagerReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit Report Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<string>('November 2026');
  const [reportNotes, setReportNotes] = useState<string>('Consolidated district performance across cities and Sales Officers.');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [selectedReportViewer, setSelectedReportViewer] = useState<SalesManagerReport | null>(null);

  const activeTab = searchParams.get('tab') || 'officers';

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
  };

  // Fetch all 64 ASMs initially
  useEffect(() => {
    const fetchAsms = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/sales-management/asm/all');
        if (res.ok) {
          const data = await res.json();
          if (data.asms && data.asms.length > 0) {
            setAllAsms(data.asms);
            const asmParam = searchParams.get('asmId');
            const defaultId = asmParam ? Number(asmParam) : data.asms[0].id;
            setSelectedAsmId(defaultId);
          }
        }
      } catch (err) {
        console.error('Failed to load ASMs:', err);
      }
    };
    fetchAsms();
  }, []);

  // Fetch specific ASM Dashboard details
  const fetchAsmData = async (asmId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/sales-management/asm/${asmId}/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAsm(data.asm);
        setSupervisingRsm(data.rsm);
        setSummary(data.summary || {});
        setCities(data.cities || []);
        setSalesOfficers(data.sales_officers || []);
        setSoActivities(data.so_activities || []);
        setProductDemands(data.product_demands || []);
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error loading ASM dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAsmId) {
      fetchAsmData(selectedAsmId);
      const params = new URLSearchParams(searchParams);
      params.set('asmId', String(selectedAsmId));
      setSearchParams(params, { replace: true });
    }
  }, [selectedAsmId]);

  // Group ASMs by Division for cleanly structured dropdown
  const asmsByDivision = useMemo(() => {
    const map = new Map<string, AreaSalesManager[]>();
    allAsms.forEach((a) => {
      const list = map.get(a.division) || [];
      list.push(a);
      map.set(a.division, list);
    });
    return Array.from(map.entries());
  }, [allAsms]);

  // Submit Combined Report to RSM
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsmId) return;

    setSubmittingReport(true);
    setSubmitSuccessMsg(null);

    try {
      const res = await fetch(`http://localhost:8080/api/v1/sales-management/asm/${selectedAsmId}/submit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: reportPeriod,
          notes: reportNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit report');
      }

      setSubmitSuccessMsg(data.message || 'Combined report successfully transmitted to RSM!');
      fetchAsmData(selectedAsmId);
      setTimeout(() => {
        setIsSubmitModalOpen(false);
        setSubmitSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting report:', err);
    } finally {
      setSubmittingReport(false);
    }
  };

  const targetAmount = selectedAsm?.target_sales ? Number(selectedAsm.target_sales) : 2500000;
  const currentRevenue = summary.total_revenue ? Number(summary.total_revenue) : 0;
  const achievementPct = targetAmount > 0 ? Math.min(100, Math.round((currentRevenue * 100) / targetAmount)) : 0;

  return (
    <div className="min-h-screen bg-[#F0F5F2] text-[#102618] flex flex-col font-sans selection:bg-[#6B9479] selection:text-white asm-theme">
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-40 bg-[#F0F5F2]/95 backdrop-blur-md border-b border-[#C8DCD0] px-4 sm:px-6 py-3 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={asmLogo}
              alt="FizzDrop ASM Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shadow-sm border border-[#C8DCD0] shrink-0 transform hover:scale-105 transition-transform bg-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0] px-2 py-0.5 rounded-full">
                  District Command
                </span>
                <span className="text-xs text-[#607C6B] font-mono">64 Districts System</span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#102618] flex items-center gap-1.5">
                <span>FizzDrop Area Sales Manager (ASM) Portal</span>
                <Sparkles className="w-4 h-4 text-[#588367] animate-pulse" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* District / ASM Switcher grouped by Division */}
            <div className="relative">
              <select
                value={selectedAsmId || ''}
                onChange={(e) => setSelectedAsmId(Number(e.target.value))}
                className="bg-white hover:bg-[#F5FAF7] text-[#193824] text-xs font-bold rounded-xl border border-[#C8DCD0] px-3.5 py-2 pr-8 focus:ring-2 focus:ring-[#6B9479] focus:outline-none transition appearance-none cursor-pointer shadow-xs"
              >
                {asmsByDivision.map(([division, list]) => (
                  <optgroup key={division} label={`── ${division} Division (${list.length} Districts) ──`}>
                    {list.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.district_name} District • {a.name} ({a.code})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#607C6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => selectedAsmId && fetchAsmData(selectedAsmId)}
              className="p-2 rounded-xl bg-white hover:bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0] transition cursor-pointer shadow-xs"
              title="Refresh District Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#588367]' : ''}`} />
            </button>

            <Link
              to={supervisingRsm ? `/rsm?rsmId=${supervisingRsm.id}` : '/rsm'}
              className="px-3.5 py-2 rounded-xl bg-[#193824] hover:bg-[#244833] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#DEEAE1]" />
              <span>Regional Manager (RSM)</span>
            </Link>

            <Link
              to="/sales-officer"
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0] text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <span>SO Portal</span>
              <ExternalLink className="w-3 h-3 text-[#607C6B]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner: Assigned District ASM Identity & Supervising RSM */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-white via-[#F5FAF7] to-[#DEEAE1] text-[#102618] border border-[#C8DCD0] p-6 sm:p-7 shadow-xs space-y-4">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-[#A9C2AF]/20 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-10 w-60 h-60 rounded-full bg-[#DEEAE1]/60 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <img
                src={asmLogo}
                alt="Area Sales Manager Emblem"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-sm border-2 border-[#C8DCD0] shrink-0 bg-white"
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-lg bg-[#193824] text-[#F0F5F2] shadow-xs">
                    {selectedAsm?.code || 'ASM'}
                  </span>
                  <span className="text-xs bg-white text-[#193824] border border-[#C8DCD0] px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-xs">
                    <MapPin className="w-3 h-3 text-[#588367]" />
                    {selectedAsm?.district_name || 'District'} District
                  </span>
                  <span className="text-xs bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0] px-2 py-0.5 rounded-lg font-bold">
                    {selectedAsm?.division || 'Division'} Division
                  </span>
                  {supervisingRsm && (
                    <span className="text-xs bg-white text-[#193824] border border-[#C8DCD0] px-2.5 py-0.5 rounded-lg font-bold shadow-xs">
                      Supervising RSM: <strong className="text-[#588367]">{supervisingRsm.name}</strong> ({supervisingRsm.code})
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#102618] tracking-tight">
                  {selectedAsm?.name || 'Area Sales Manager'}
                </h2>
                <p className="text-xs text-[#365340] max-w-2xl flex flex-wrap items-center gap-3">
                  <span>Email: <strong className="text-[#193824] font-semibold">{selectedAsm?.email}</strong></span>
                  <span>•</span>
                  <span>Phone: <strong className="text-[#193824] font-semibold">{selectedAsm?.phone}</strong></span>
                  <span>•</span>
                  <span>Cities / Upazilas: <strong className="text-[#588367] font-bold">{cities.length}</strong></span>
                  <span>•</span>
                  <span>Field Sales Officers: <strong className="text-[#588367] font-bold">{salesOfficers.length}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Action: Compile & Submit Combined Report to RSM */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-[#193824] hover:bg-[#244833] text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4 text-[#DEEAE1]" />
                <span>Submit Combined Report to RSM</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Animated KPI Cards (Sales, Demands, Profit, Loss) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: District Sales */}
          <div className="p-5 rounded-3xl bg-white border border-[#C8DCD0] shadow-xs relative overflow-hidden group hover:border-[#6B9479] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#607C6B]">Total District Sales</span>
              <div className="w-9 h-9 rounded-xl bg-[#DEEAE1] text-[#193824] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#102618] tracking-tight">
                  {(summary.total_sales_cases ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-[#607C6B] font-medium">Cases</span>
              </div>
              <p className="text-xs text-[#588367] font-mono font-bold mt-1">
                ৳{(summary.total_revenue ?? 0).toLocaleString()} Revenue
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#C8DCD0] flex items-center justify-between text-[10px] text-[#607C6B]">
              <span>Target: ৳{targetAmount.toLocaleString()}</span>
              <span className="text-[#193824] font-bold">{achievementPct}% Achieved</span>
            </div>
          </div>

          {/* Card 2: Product Demands */}
          <div className="p-5 rounded-3xl bg-white border border-[#C8DCD0] shadow-xs relative overflow-hidden group hover:border-[#6B9479] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#607C6B]">Product Demands</span>
              <div className="w-9 h-9 rounded-xl bg-[#DEEAE1] text-[#193824] flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#102618] tracking-tight">
                  {(summary.total_product_demands_cases ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-[#607C6B] font-medium">Cases Req.</span>
              </div>
              <p className="text-xs text-[#588367] font-mono font-bold mt-1">
                {productDemands.length} Beverage Lines
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#C8DCD0] flex items-center justify-between text-[10px] text-[#607C6B]">
              <span>Channeled by SOs</span>
              <span className="text-[#193824] font-bold">{summary.total_outlets ?? 0} Outlets</span>
            </div>
          </div>

          {/* Card 3: Overall Profit */}
          <div className="p-5 rounded-3xl bg-white border border-[#C8DCD0] shadow-xs relative overflow-hidden group hover:border-[#6B9479] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#607C6B]">Overall Profit</span>
              <div className="w-9 h-9 rounded-xl bg-[#DEEAE1] text-[#193824] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#2E7D46] tracking-tight">
                  ৳{(summary.overall_profit ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#365340] font-medium mt-1">
                District Wholesale Profit Margin
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#C8DCD0] flex items-center justify-between text-[10px] text-[#607C6B]">
              <span>Wholesale Margin</span>
              <span className="text-[#193824] font-bold font-mono">12.5% avg</span>
            </div>
          </div>

          {/* Card 4: Overall Loss */}
          <div className="p-5 rounded-3xl bg-white border border-[#C8DCD0] shadow-xs relative overflow-hidden group hover:border-[#6B9479] transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#607C6B]">Overall Loss</span>
              <div className="w-9 h-9 rounded-xl bg-[#DEEAE1] text-[#193824] flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#b91c1c] tracking-tight">
                  ৳{(summary.overall_loss ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-[#607C6B] font-medium mt-1">
                Returns, Damaged & Refund Claims
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#C8DCD0] flex items-center justify-between text-[10px] text-[#607C6B]">
              <span>District Risk Status</span>
              <span className="text-[#193824] font-bold font-mono">Settled</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#C8DCD0] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('officers')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'officers'
                ? 'bg-[#193824] text-[#F0F5F2] shadow-md'
                : 'bg-white hover:bg-[#DEEAE1] text-[#365340] hover:text-[#193824] border border-[#C8DCD0] shadow-xs'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Cities & Sales Officers ({salesOfficers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'bg-[#193824] text-[#F0F5F2] shadow-md'
                : 'bg-white hover:bg-[#DEEAE1] text-[#365340] hover:text-[#193824] border border-[#C8DCD0] shadow-xs'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live SO Activity Feed ({soActivities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('demands')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'demands'
                ? 'bg-[#193824] text-[#F0F5F2] shadow-md'
                : 'bg-white hover:bg-[#DEEAE1] text-[#365340] hover:text-[#193824] border border-[#C8DCD0] shadow-xs'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Demands ({productDemands.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-[#193824] text-[#F0F5F2] shadow-md'
                : 'bg-white hover:bg-[#DEEAE1] text-[#365340] hover:text-[#193824] border border-[#C8DCD0] shadow-xs'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Reports Submitted to RSM ({reports.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CITIES & SALES OFFICERS (SO) */}
        {/* ========================================================================= */}
        {activeTab === 'officers' && (
          <div className="space-y-6">
            {/* Cities in this District */}
            <div className="p-4 rounded-3xl bg-white border border-[#C8DCD0] shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#607C6B] block">
                Cities / Upazilas in {selectedAsm?.district_name} District:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {cities.map((c, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[#DEEAE1]/70 border border-[#C8DCD0] text-xs font-bold text-[#193824] flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#588367]" />
                    <span>{c.city}</span>
                    {c.outlets_count > 0 && (
                      <span className="text-[10px] text-[#588367] font-mono">({c.outlets_count} outlets)</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Sales Officers List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#102618] tracking-tight">
                    Sales Officers under {selectedAsm?.district_name}
                  </h3>
                  <p className="text-xs text-[#607C6B]">
                    The ASM monitors each Sales Officer's stock demands, buffer reservations, and retail sales.
                  </p>
                </div>
                <Link
                  to="/sales-officer"
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#DEEAE1] text-[#193824] text-xs font-bold transition flex items-center gap-1.5 border border-[#C8DCD0] shadow-xs"
                >
                  <span>Open SO Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#607C6B]" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salesOfficers.map((so) => (
                  <div
                    key={so.id}
                    className="p-5 rounded-3xl bg-white border border-[#C8DCD0] hover:border-[#6B9479] hover:shadow-xs transition space-y-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[#588367] text-xs font-bold">
                          <MapPin className="w-3.5 h-3.5 text-[#588367]" />
                          <span>{so.city} • {so.assigned_area}</span>
                        </div>
                        <h4 className="text-base font-black text-[#102618] tracking-tight mt-0.5">
                          {so.name}
                        </h4>
                      </div>
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0]">
                        {so.officer_code}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#607C6B]">
                      {so.email} • {so.phone}
                    </p>

                    {/* SO Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-[#F5FAF7] border border-[#C8DCD0] text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-[#607C6B] block uppercase">Stock Req.</span>
                        <span className="font-bold text-[#102618]">{so.total_purchased_cases} cs</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#607C6B] block uppercase">Outlets Channeled</span>
                        <span className="font-bold text-[#588367]">{so.outlet_channeled_cases} cs</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#607C6B] block uppercase">Profit Earned</span>
                        <span className="font-bold text-[#2E7D46]">৳{Number(so.profit_earned).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#607C6B] block uppercase">Loss / Claims</span>
                        <span className="font-bold text-[#b91c1c]">৳{Number(so.loss_amount).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#607C6B] pt-1">
                      <span>{so.outlet_count} Retail Outlets</span>
                      <span>•</span>
                      <span>{so.psr_count} Pre-Sales Reps (PSR)</span>
                      <span>•</span>
                      <span className="text-[#2E7D46] font-bold">{so.status}</span>
                    </div>
                  </div>
                ))}

                {salesOfficers.length === 0 && (
                  <div className="col-span-full p-8 text-center rounded-3xl bg-white border border-[#C8DCD0] text-[#607C6B] italic shadow-xs">
                    No Sales Officers deployed yet for {selectedAsm?.district_name}. New SOs created in Superadmin will automatically appear here under this ASM.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE SO ACTIVITY FEED */}
        {/* ========================================================================= */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-[#102618] tracking-tight flex items-center gap-2">
                <span>Whatever the SO Does, the ASM Gets a Report of That</span>
                <span className="text-xs bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0] px-2.5 py-0.5 rounded-full font-mono font-bold">
                  Live Feed
                </span>
              </h3>
              <p className="text-xs text-[#607C6B]">
                Real-time activity audit log of stock requests, buffer orders, outlet dispatches, and field sales in this district.
              </p>
            </div>

            <div className="space-y-2.5">
              {soActivities.map((act, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-[#C8DCD0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#6B9479] hover:shadow-xs transition shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#DEEAE1] text-[#193824]">
                      {act.activity_type === 'SO_REQUISITION' ? (
                        <Truck className="w-4 h-4 text-[#193824]" />
                      ) : (
                        <Package className="w-4 h-4 text-[#193824]" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#102618]">{act.product_name || 'Beverage Product'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DEEAE1] text-[#193824] font-mono font-semibold">
                          {act.brand} • {act.category}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5FAF7] border border-[#C8DCD0] text-[#607C6B]">
                          {act.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#607C6B]">
                        Officer: <strong className="text-[#102618]">{act.so_name}</strong> ({act.assigned_area}, {act.city})
                        {act.is_so_purchase && ' • Direct SO Buffer Stock Purchase'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between text-xs font-mono">
                    <span className="font-black text-[#588367] text-sm">{act.quantity} Cases</span>
                    <span className="text-[10px] text-[#607C6B]">
                      {act.activity_time ? new Date(act.activity_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
                    </span>
                  </div>
                </div>
              ))}

              {soActivities.length === 0 && (
                <div className="p-8 text-center rounded-3xl bg-white border border-[#C8DCD0] text-[#607C6B] italic shadow-xs">
                  No recent activities recorded for Sales Officers in {selectedAsm?.district_name}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PRODUCT DEMANDS IN DISTRICT */}
        {/* ========================================================================= */}
        {activeTab === 'demands' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-[#102618] tracking-tight flex items-center gap-2">
                <span>Product Demands in {selectedAsm?.district_name} District</span>
                <span className="text-xs bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0] px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {productDemands.length} Products
                </span>
              </h3>
              <p className="text-xs text-[#607C6B]">
                Detailed demand breakdown by category and brand requested across retail outlets in this district.
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-[#C8DCD0] overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#DEEAE1] text-[#193824] font-bold uppercase tracking-wider border-b border-[#C8DCD0]">
                  <tr>
                    <th className="p-3.5">Beverage Product</th>
                    <th className="p-3.5">Category & Brand</th>
                    <th className="p-3.5">Product SKU</th>
                    <th className="p-3.5 text-right">Demanded Cases</th>
                    <th className="p-3.5 text-right">Wholesale Value (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C8DCD0]">
                  {productDemands.map((p) => (
                    <tr key={p.product_id} className="hover:bg-[#F5FAF7] transition">
                      <td className="p-3.5 font-bold text-[#102618] flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-[#588367] shrink-0" />
                        <span>{p.product_name}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#DEEAE1] text-[#193824] font-medium text-[11px]">
                          {p.brand} • {p.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[#607C6B]">{p.sku}</td>
                      <td className="p-3.5 text-right font-mono font-black text-[#588367] text-sm">
                        {p.total_cases_demanded} cs
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-[#102618]">
                        ৳{Number(p.total_demand_value).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {productDemands.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#607C6B] italic">
                        No product demands logged yet in {selectedAsm?.district_name}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REPORTS SUBMITTED TO RSM */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#102618] tracking-tight flex items-center gap-2">
                  <span>Reports Given to Regional Sales Manager</span>
                  <span className="text-xs bg-[#DEEAE1] text-[#193824] border border-[#C8DCD0] px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {reports.length} Reports
                  </span>
                </h3>
                <p className="text-xs text-[#607C6B]">
                  Consolidated reports transmitted from this ASM to Regional Sales Manager {supervisingRsm?.name} ({selectedAsm?.division} Division).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#193824] hover:bg-[#244833] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Combined Report</span>
              </button>
            </div>

            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-3xl bg-white border border-[#C8DCD0] hover:border-[#6B9479] transition space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-[#193824] text-white font-mono shadow-xs">
                        {rep.reporting_period}
                      </span>
                      <span className="text-xs text-[#607C6B]">Division: {rep.division}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#607C6B]">
                      Submitted: {new Date(rep.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#F5FAF7] border border-[#C8DCD0] font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-[#607C6B] block uppercase">Sales Volume</span>
                      <span className="font-bold text-[#102618]">{rep.total_sales_cases} Cases</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#607C6B] block uppercase">Revenue</span>
                      <span className="font-bold text-[#588367]">৳{Number(rep.total_revenue).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#607C6B] block uppercase">Overall Profit</span>
                      <span className="font-bold text-[#2E7D46]">৳{Number(rep.overall_profit).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#607C6B] block uppercase">Overall Loss</span>
                      <span className="font-bold text-[#b91c1c]">৳{Number(rep.overall_loss).toLocaleString()}</span>
                    </div>
                  </div>

                  {rep.notes && (
                    <div className="p-3 rounded-xl bg-[#F5FAF7] text-xs text-[#365340] italic border border-[#C8DCD0]">
                      "{rep.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#2E7D46] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D46]" />
                      <span>Transmitted to Regional Sales Manager</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedReportViewer(rep)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#DEEAE1] text-[#193824] text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-[#C8DCD0] shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#588367]" />
                      <span>View Full Report</span>
                    </button>
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <div className="p-10 text-center rounded-3xl bg-white border border-[#C8DCD0] text-[#607C6B] space-y-3 shadow-xs">
                  <FileText className="w-8 h-8 text-[#A9C2AF] mx-auto" />
                  <p className="font-bold text-sm text-[#102618]">No Reports Submitted for {selectedAsm?.district_name} Yet</p>
                  <p className="text-xs">
                    Click "Submit Combined Report to RSM" above to compile this district's sales, product demands, and profit/loss and send it to your RSM.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Submit Combined Report to RSM */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193824]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#C8DCD0] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-[#102618]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={asmLogo}
                  alt="ASM Emblem"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#C8DCD0] shrink-0 shadow-sm p-0.5 bg-white"
                />
                <div>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#193824] text-white">
                    Consolidated District Submission
                  </span>
                  <h3 className="text-xl font-black text-[#102618] mt-1">
                    Submit Combined Report to RSM
                  </h3>
                  <p className="text-xs text-[#607C6B]">
                    Recipient: <strong className="text-[#102618]">{supervisingRsm?.name}</strong> ({selectedAsm?.division} Regional Sales Manager)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-xl bg-white hover:bg-[#DEEAE1] text-[#607C6B] hover:text-[#193824] border border-[#C8DCD0] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Live Metrics Preview */}
            <div className="p-4 rounded-2xl bg-[#F5FAF7] border border-[#C8DCD0] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#193824] block">
                Live Compiled Metrics from Sales Officers & Outlets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-white border border-[#C8DCD0]">
                  <span className="text-[9px] text-[#607C6B] block uppercase">Sales Volume</span>
                  <span className="font-black text-[#102618]">{summary.total_sales_cases ?? 0} cs</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-[#C8DCD0]">
                  <span className="text-[9px] text-[#607C6B] block uppercase">Revenue</span>
                  <span className="font-black text-[#588367]">৳{(summary.total_revenue ?? 0).toLocaleString()}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-[#C8DCD0]">
                  <span className="text-[9px] text-[#607C6B] block uppercase">Overall Profit</span>
                  <span className="font-black text-[#2E7D46]">৳{(summary.overall_profit ?? 0).toLocaleString()}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-[#C8DCD0]">
                  <span className="text-[9px] text-[#607C6B] block uppercase">Overall Loss</span>
                  <span className="font-black text-[#b91c1c]">৳{(summary.overall_loss ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#193824] uppercase mb-1">
                  Reporting Period *
                </label>
                <input
                  type="text"
                  required
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  placeholder="e.g. November 2026"
                  className="w-full bg-white border border-[#C8DCD0] rounded-xl px-3 py-2 text-xs text-[#102618] focus:outline-none focus:ring-2 focus:ring-[#6B9479] font-bold shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#193824] uppercase mb-1">
                  Operational Commentary / Report Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Summarize product demands, sales officer execution, supply shortages, or field observations..."
                  className="w-full bg-white border border-[#C8DCD0] rounded-xl p-3 text-xs text-[#102618] focus:outline-none focus:ring-2 focus:ring-[#6B9479] leading-relaxed shadow-xs"
                />
              </div>

              {submitSuccessMsg && (
                <div className="p-3 rounded-xl bg-[#DEEAE1] border border-[#C8DCD0] text-[#193824] text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D46] shrink-0" />
                  <span>{submitSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C8DCD0]">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#DEEAE1] text-[#365340] font-bold text-xs cursor-pointer border border-[#C8DCD0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-5 py-2.5 rounded-xl bg-[#193824] hover:bg-[#244833] text-white font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submittingReport ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{submittingReport ? 'Transmitting...' : 'Confirm & Transmit to RSM'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Specific Report */}
      {selectedReportViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193824]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#C8DCD0] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-[#102618]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={asmLogo}
                  alt="ASM Emblem"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#C8DCD0] shrink-0 shadow-sm p-0.5 bg-white"
                />
                <div>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#193824] text-white">
                    {selectedReportViewer.district_name} District Report
                  </span>
                  <h3 className="text-xl font-black text-[#102618] mt-1">
                    Transmitted Report Details
                  </h3>
                  <p className="text-xs text-[#607C6B]">
                    Period: {selectedReportViewer.reporting_period} • Submitted: {new Date(selectedReportViewer.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportViewer(null)}
                className="p-1.5 rounded-xl bg-white hover:bg-[#DEEAE1] text-[#607C6B] hover:text-[#193824] border border-[#C8DCD0] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-[#F5FAF7] border border-[#C8DCD0] text-xs font-mono">
              <div>
                <span className="text-[9px] text-[#607C6B] uppercase block">Sales Cases</span>
                <span className="font-black text-[#102618]">{selectedReportViewer.total_sales_cases} cs</span>
              </div>
              <div>
                <span className="text-[9px] text-[#607C6B] uppercase block">Revenue</span>
                <span className="font-black text-[#588367]">৳{Number(selectedReportViewer.total_revenue).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-[#607C6B] uppercase block">Profit</span>
                <span className="font-black text-[#2E7D46]">৳{Number(selectedReportViewer.overall_profit).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-[#607C6B] uppercase block">Loss</span>
                <span className="font-black text-[#b91c1c]">৳{Number(selectedReportViewer.overall_loss).toLocaleString()}</span>
              </div>
            </div>

            {selectedReportViewer.notes && (
              <div className="p-3.5 rounded-xl bg-[#F5FAF7] text-xs text-[#365340] border border-[#C8DCD0]">
                <span className="text-[10px] text-[#193824] uppercase font-bold block mb-1">Commentary:</span>
                "{selectedReportViewer.notes}"
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReportViewer(null)}
                className="px-4 py-2 rounded-xl bg-[#193824] hover:bg-[#244833] text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsmDashboard;
