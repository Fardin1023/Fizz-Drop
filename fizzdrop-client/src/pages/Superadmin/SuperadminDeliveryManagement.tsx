import React, { useState, useEffect, useMemo } from 'react';
import DeliveryFleetMap, { type VehicleDispatch, type DispatchItem } from '../../components/Map/DeliveryFleetMap';
import {
  Truck,
  Users,
  Route,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Boxes,
  Building,
  Navigation,
  Layers,
  MapPin,
  RotateCcw,
  Crosshair,
  Compass,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { DeliveryTeam } from '../Admin/SupplierDeliveryManagement';

export interface SuperadminDeliveryManagementProps {
  initialSubTab?: 'all' | 'map' | 'trips';
  showMap?: boolean;
}

interface RsmOption {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  division: string;
  district_count?: number;
  asm_count?: number;
}

interface AsmOption {
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
}

interface DistrictItem {
  id: number;
  name: string;
  division: string;
}

interface SalesOfficerItem {
  id: number;
  name: string;
  phone?: string;
  assigned_area?: string;
  city?: string;
  district_id?: number;
  supplier_id?: number;
}

interface SupplierItem {
  id: number;
  business_name: string;
  primary_district_id?: number;
  division_name?: string;
  warehouse_address?: string;
  phone?: string;
}

export const SuperadminDeliveryManagement: React.FC<SuperadminDeliveryManagementProps> = ({
  initialSubTab = 'all',
  showMap = true,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [dispatches, setDispatches] = useState<VehicleDispatch[]>([]);
  const [teams, setTeams] = useState<DeliveryTeam[]>([]);
  const [rsms, setRsms] = useState<RsmOption[]>([]);
  const [asms, setAsms] = useState<AsmOption[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficerItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [allOutlets, setAllOutlets] = useState<any[]>([]);

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'map' | 'trips'>(
    !showMap ? 'trips' : initialSubTab
  );

  // Hierarchical Multi-Tier Filters
  const [selectedRsmId, setSelectedRsmId] = useState<number | null>(null);
  const [selectedAsmId, setSelectedAsmId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedSoId, setSelectedSoId] = useState<number | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedVehicleReg, setSelectedVehicleReg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);

  useEffect(() => {
    if (!showMap) {
      setActiveSubTab('trips');
    } else if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, showMap]);

  // Fetch all necessary data for Superadmin national view
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        resDisp,
        resTeams,
        resRsms,
        resAsms,
        resDists,
        resSos,
        resSups,
        resOutlets,
      ] = await Promise.all([
        fetch('http://localhost:8080/api/v1/delivery/dispatches?all=true'),
        fetch('http://localhost:8080/api/v1/delivery/teams?all=true'),
        fetch('http://localhost:8080/api/v1/sales-management/rsm/all'),
        fetch('http://localhost:8080/api/v1/sales-management/asm/all'),
        fetch('http://localhost:8080/api/v1/pricing/districts'),
        fetch('http://localhost:8080/api/v1/sales-officers'),
        fetch('http://localhost:8080/api/v1/suppliers'),
        fetch('http://localhost:8080/api/outlets'),
      ]);

      if (resDisp.ok) {
        const d = await resDisp.json();
        setDispatches(Array.isArray(d) ? d : []);
      }
      if (resTeams.ok) {
        const t = await resTeams.json();
        setTeams(Array.isArray(t) ? t : []);
      }
      if (resRsms.ok) {
        const r = await resRsms.json();
        setRsms(Array.isArray(r.rsms) ? r.rsms : (Array.isArray(r) ? r : []));
      }
      if (resAsms.ok) {
        const a = await resAsms.json();
        setAsms(Array.isArray(a.asms) ? a.asms : (Array.isArray(a) ? a : []));
      }
      if (resDists.ok) {
        const dt = await resDists.json();
        setDistricts(Array.isArray(dt) ? dt : []);
      }
      if (resSos.ok) {
        const so = await resSos.json();
        setSalesOfficers(Array.isArray(so) ? so : []);
      }
      if (resSups.ok) {
        const sp = await resSups.json();
        setSuppliers(Array.isArray(sp) ? sp : []);
      }
      if (resOutlets.ok) {
        const out = await resOutlets.json();
        setAllOutlets(Array.isArray(out) ? out : []);
      }
    } catch (e) {
      console.error('Failed to load superadmin delivery & hierarchy data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Selected RSM Object
  const selectedRsmObj = useMemo(() => {
    return rsms.find((r) => r.id === selectedRsmId) || null;
  }, [rsms, selectedRsmId]);

  // Selected ASM Object
  const selectedAsmObj = useMemo(() => {
    return asms.find((a) => a.id === selectedAsmId) || null;
  }, [asms, selectedAsmId]);

  // Cascading Available ASMs
  const cascadingAsms = useMemo(() => {
    if (!selectedRsmId || !selectedRsmObj) return asms;
    const rsmDiv = selectedRsmObj.division.toLowerCase();
    return asms.filter(
      (a) => a.rsm_id === selectedRsmId || (a.division && a.division.toLowerCase() === rsmDiv)
    );
  }, [asms, selectedRsmId, selectedRsmObj]);

  // Cascading Available Districts
  const cascadingDistricts = useMemo(() => {
    if (selectedAsmObj && selectedAsmObj.district_id) {
      return districts.filter((d) => d.id === selectedAsmObj.district_id);
    }
    if (selectedRsmObj) {
      const rsmDiv = selectedRsmObj.division.toLowerCase();
      return districts.filter((d) => d.division && d.division.toLowerCase() === rsmDiv);
    }
    return districts;
  }, [districts, selectedAsmObj, selectedRsmObj]);

  // Cascading Available Sales Officers
  const cascadingSos = useMemo(() => {
    return salesOfficers.filter((so) => {
      if (selectedDistrictId && so.district_id !== selectedDistrictId) return false;
      if (selectedAsmObj && so.district_id !== selectedAsmObj.district_id) return false;
      if (selectedRsmObj && so.district_id) {
        const d = districts.find((dist) => dist.id === so.district_id);
        if (d && d.division.toLowerCase() !== selectedRsmObj.division.toLowerCase()) return false;
      }
      if (selectedSupplierId && so.supplier_id !== selectedSupplierId) return false;
      return true;
    });
  }, [salesOfficers, selectedDistrictId, selectedAsmObj, selectedRsmObj, selectedSupplierId, districts]);

  // Cascading Available Suppliers
  const cascadingSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      if (selectedDistrictId && sup.primary_district_id !== selectedDistrictId) return false;
      if (selectedRsmObj && sup.division_name) {
        if (sup.division_name.toLowerCase() !== selectedRsmObj.division.toLowerCase()) return false;
      }
      return true;
    });
  }, [suppliers, selectedDistrictId, selectedRsmObj]);

  // Cascading Available Vehicles / Delivery Teams
  const cascadingVehicles = useMemo(() => {
    return teams.filter((t) => {
      if (selectedSupplierId && t.supplier_id !== selectedSupplierId) return false;
      if (selectedDistrictId) {
        const s = suppliers.find((sup) => sup.id === t.supplier_id);
        if (s && s.primary_district_id !== selectedDistrictId) return false;
      }
      return true;
    });
  }, [teams, selectedSupplierId, selectedDistrictId, suppliers]);

  // Filter Dispatches by All Cascading Criteria
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      // 1. Supplier / Depot Filter
      if (selectedSupplierId && d.supplier_id !== selectedSupplierId) {
        return false;
      }

      // 2. District Filter
      if (selectedDistrictId) {
        const sup = suppliers.find((s) => s.id === d.supplier_id);
        const matchesSupplierDistrict = sup && sup.primary_district_id === selectedDistrictId;
        const matchesItemOutletDistrict = d.items?.some((item) => {
          const out = allOutlets.find((o) => (o.outlet_id ?? o.branch_id ?? o.id) === item.outlet_id);
          return out && (out.district_id === selectedDistrictId || out.districtId === selectedDistrictId);
        });
        const distObj = districts.find((dist) => dist.id === selectedDistrictId);
        const matchesSubroute = distObj && (d.sub_route || '').toLowerCase().includes(distObj.name.toLowerCase());
        if (!matchesSupplierDistrict && !matchesItemOutletDistrict && !matchesSubroute) {
          return false;
        }
      }

      // 3. ASM Filter
      if (selectedAsmObj && selectedAsmObj.district_id) {
        const asmDistId = selectedAsmObj.district_id;
        const sup = suppliers.find((s) => s.id === d.supplier_id);
        const matchesSupplierDistrict = sup && sup.primary_district_id === asmDistId;
        const matchesItemOutletDistrict = d.items?.some((item) => {
          const out = allOutlets.find((o) => (o.outlet_id ?? o.branch_id ?? o.id) === item.outlet_id);
          return out && (out.district_id === asmDistId || out.districtId === asmDistId);
        });
        const matchesSubroute = (d.sub_route || '').toLowerCase().includes(selectedAsmObj.district_name.toLowerCase());
        if (!matchesSupplierDistrict && !matchesItemOutletDistrict && !matchesSubroute) {
          return false;
        }
      }

      // 4. RSM / Division Filter
      if (selectedRsmObj) {
        const divName = selectedRsmObj.division.toLowerCase();
        const sup = suppliers.find((s) => s.id === d.supplier_id);
        const matchesSupplierDiv = sup && sup.division_name && sup.division_name.toLowerCase() === divName;
        const matchesItemOutletDiv = d.items?.some((item) => {
          const out = allOutlets.find((o) => (o.outlet_id ?? o.branch_id ?? o.id) === item.outlet_id);
          return out && out.division_name && out.division_name.toLowerCase() === divName;
        });
        if (!matchesSupplierDiv && !matchesItemOutletDiv) {
          return false;
        }
      }

      // 5. Sales Officer Filter
      if (selectedSoId) {
        const so = salesOfficers.find((s) => s.id === selectedSoId);
        if (so) {
          const matchesSoSupplier = so.supplier_id && d.supplier_id === so.supplier_id;
          const matchesSoArea = so.assigned_area && (d.sub_route || '').toLowerCase().includes(so.assigned_area.toLowerCase());
          const matchesSoCity = so.city && (d.sub_route || '').toLowerCase().includes(so.city.toLowerCase());
          if (!matchesSoSupplier && !matchesSoArea && !matchesSoCity) {
            return false;
          }
        }
      }

      // 6. Vehicle Reg Filter
      if (selectedVehicleReg && d.vehicle_registration_no !== selectedVehicleReg) {
        return false;
      }

      // 7. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'IN_TRANSIT') {
          if (d.status !== 'IN_TRANSIT' && d.status !== 'DISPATCHED' && d.status !== 'BOARDED') return false;
        } else if (statusFilter === 'REDIRECTED') {
          if (!d.items?.some((i) => i.reallocated_to_outlet_id != null)) return false;
        } else if (statusFilter === 'CANCELLED') {
          if (!d.items?.some((i) => i.stop_status === 'CANCELLED')) return false;
        } else if (statusFilter === 'DELIVERED' || statusFilter === 'COMPLETED') {
          if (d.status !== 'DELIVERED' && d.status !== 'COMPLETED') return false;
        } else if (d.status !== statusFilter) {
          return false;
        }
      }

      // 8. Search query
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchCode = d.dispatch_code.toLowerCase().includes(term);
        const matchReg = (d.vehicle_registration_no || '').toLowerCase().includes(term);
        const matchDriver = (d.driver_name || '').toLowerCase().includes(term);
        const matchTeam = (d.team_name || '').toLowerCase().includes(term);
        const matchRoute = (d.sub_route || '').toLowerCase().includes(term);
        const matchOutlet = d.items?.some((i) => (i.outlet_name || '').toLowerCase().includes(term));
        if (!matchCode && !matchReg && !matchDriver && !matchTeam && !matchRoute && !matchOutlet) {
          return false;
        }
      }

      return true;
    });
  }, [
    dispatches,
    selectedSupplierId,
    selectedDistrictId,
    selectedAsmObj,
    selectedRsmObj,
    selectedSoId,
    selectedVehicleReg,
    statusFilter,
    search,
    suppliers,
    allOutlets,
    districts,
    salesOfficers,
  ]);

  // Filtered Outlets for Map Display
  const filteredOutlets = useMemo(() => {
    if (selectedDistrictId) {
      return allOutlets.filter((o) => (o.district_id ?? o.districtId) === selectedDistrictId);
    }
    if (selectedRsmObj) {
      const div = selectedRsmObj.division.toLowerCase();
      return allOutlets.filter((o) => o.division_name && o.division_name.toLowerCase() === div);
    }
    return allOutlets;
  }, [allOutlets, selectedDistrictId, selectedRsmObj]);

  // District options formatted for DeliveryFleetMap
  const districtOptions = useMemo(() => {
    return asms.map((a) => ({
      id: a.district_id,
      name: a.district_name,
      division: a.division,
      asmName: a.name,
      asmCode: a.code,
      asmPhone: a.phone,
    }));
  }, [asms]);

  // Reset all filters to National Overview
  const handleResetFilters = () => {
    setSelectedRsmId(null);
    setSelectedAsmId(null);
    setSelectedDistrictId(null);
    setSelectedSoId(null);
    setSelectedSupplierId(null);
    setSelectedVehicleReg(null);
    setStatusFilter('ALL');
    setSearch('');
    setExpandedTripId(null);
  };

  // Division Pills
  const divisions = ['ALL', ...Array.from(new Set(rsms.map((r) => r.division).filter(Boolean)))];

  // Active breadcrumb summary string
  const activeScopeParts = [];
  if (selectedRsmObj) activeScopeParts.push(`RSM: ${selectedRsmObj.division}`);
  if (selectedAsmObj) activeScopeParts.push(`ASM: ${selectedAsmObj.name}`);
  if (selectedDistrictId) {
    const d = districts.find((dist) => dist.id === selectedDistrictId);
    if (d) activeScopeParts.push(`District: ${d.name}`);
  }
  if (selectedSoId) {
    const so = salesOfficers.find((s) => s.id === selectedSoId);
    if (so) activeScopeParts.push(`SO: ${so.name}`);
  }
  if (selectedSupplierId) {
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (sup) activeScopeParts.push(`Depot: ${sup.business_name}`);
  }
  if (selectedVehicleReg) activeScopeParts.push(`Vehicle: ${selectedVehicleReg}`);

  const activeScopeText = activeScopeParts.length > 0 ? activeScopeParts.join(' ➔ ') : 'National Overview (All 8 Divisions & 64 Districts)';

  // KPI calculations on filtered dispatches
  const inTransitCount = filteredDispatches.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'DISPATCHED' || d.status === 'BOARDED').length;
  const deliveredCount = filteredDispatches.filter((d) => d.status === 'DELIVERED' || d.status === 'COMPLETED').length;
  const totalDeliveredCases = filteredDispatches.reduce((acc, d) => acc + (d.total_cases || 0), 0);

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
              SUPERADMIN COMMAND CENTER
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold font-mono">
              National Delivery Fleets, Depots & Sub-Routes
            </span>
          </div>
          <h2 className="font-oswald text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-600" />
            <span>National Fleet GPS Tracker & Hierarchical Operations Map</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
            Live interactive tracking across Bangladesh. Drill down seamlessly from National Overview into any specific RSM division, ASM area, district depot, Sales Officer, supplier logistics hub, or individual moving delivery vehicle.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-2xs"
            title="Reset to National Overview"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Scope</span>
          </button>

          <button
            onClick={fetchAllData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all cursor-pointer border border-purple-200 shadow-2xs"
            title="Refresh Live Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Hierarchical Filter Console: RSM ➔ ASM ➔ District ➔ SO ➔ Supplier ➔ Vehicle */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        {/* Active Scope Breadcrumb Pill Bar */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-4 h-4 text-purple-600 shrink-0 animate-spin-slow" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-900 shrink-0">
              Active Focus:
            </span>
            <span className="text-xs font-black text-slate-900 truncate font-mono">
              {activeScopeText}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-800 font-bold text-[10px]">
              {filteredDispatches.length} Trips
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 font-bold text-[10px]">
              {filteredOutlets.length} Outlets
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-bold text-[10px]">
              {cascadingVehicles.length} Vehicles
            </span>
          </div>
        </div>

        {/* Division Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Building className="w-3 h-3 text-purple-600" />
            RSM Division:
          </span>
          {divisions.map((div) => {
            const isSelected =
              div === 'ALL'
                ? selectedRsmId === null
                : selectedRsmObj && selectedRsmObj.division.toLowerCase() === div.toLowerCase();

            return (
              <button
                key={div}
                type="button"
                onClick={() => {
                  if (div === 'ALL') {
                    setSelectedRsmId(null);
                    setSelectedAsmId(null);
                    setSelectedDistrictId(null);
                  } else {
                    const matchRsm = rsms.find((r) => r.division.toLowerCase() === div.toLowerCase());
                    if (matchRsm) {
                      setSelectedRsmId(matchRsm.id);
                      setSelectedAsmId(null);
                      setSelectedDistrictId(null);
                    }
                  }
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {div === 'ALL' ? '🌍 All Divisions' : div}
              </button>
            );
          })}
        </div>

        {/* 6-Level Cascading Dropdowns Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 pt-1">
          {/* 1. RSM Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              1. RSM (Division Manager)
            </label>
            <div className="relative">
              <select
                value={selectedRsmId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedRsmId(id);
                  setSelectedAsmId(null);
                  setSelectedDistrictId(null);
                  setSelectedSoId(null);
                  setSelectedSupplierId(null);
                  setSelectedVehicleReg(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-2 text-slate-800 pr-7 focus:ring-2 focus:ring-purple-500/20 focus:outline-none cursor-pointer appearance-none font-medium truncate"
              >
                <option value="">All 8 RSMs (National)</option>
                {rsms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.division} — {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. ASM Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              2. ASM (Area Sales Manager)
            </label>
            <div className="relative">
              <select
                value={selectedAsmId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedAsmId(id);
                  if (id) {
                    const match = asms.find((a) => a.id === id);
                    if (match) {
                      setSelectedDistrictId(match.district_id);
                      if (!selectedRsmId) setSelectedRsmId(match.rsm_id);
                    }
                  } else {
                    setSelectedDistrictId(null);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-2 text-slate-800 pr-7 focus:ring-2 focus:ring-purple-500/20 focus:outline-none cursor-pointer appearance-none font-medium truncate"
              >
                <option value="">
                  {selectedRsmObj ? `All ASMs in ${selectedRsmObj.division}` : 'All 64 ASMs'}
                </option>
                {cascadingAsms.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.district_name} — {a.name} ({a.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. District / Depot Location */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 block">
              3. District Depot Location
            </label>
            <div className="relative">
              <select
                value={selectedDistrictId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedDistrictId(id);
                  if (id) {
                    const matchAsm = asms.find((a) => a.district_id === id);
                    if (matchAsm) setSelectedAsmId(matchAsm.id);
                  } else {
                    setSelectedAsmId(null);
                  }
                }}
                className="w-full bg-purple-50/70 border border-purple-300 text-xs rounded-xl px-2.5 py-2 text-purple-900 pr-7 focus:ring-2 focus:ring-purple-500/20 focus:outline-none cursor-pointer appearance-none font-bold font-mono truncate"
              >
                <option value="">🗺️ All 64 Districts Depots</option>
                {cascadingDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    📍 {d.name} ({d.division})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Sales Officer Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              4. Sales Officer (SO)
            </label>
            <div className="relative">
              <select
                value={selectedSoId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedSoId(id);
                  if (id) {
                    const so = salesOfficers.find((s) => s.id === id);
                    if (so && so.supplier_id) setSelectedSupplierId(so.supplier_id);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-2 text-slate-800 pr-7 focus:ring-2 focus:ring-purple-500/20 focus:outline-none cursor-pointer appearance-none font-medium truncate"
              >
                <option value="">All Sales Officers</option>
                {cascadingSos.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.name} {so.assigned_area ? `(${so.assigned_area})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 5. Supplier / Logistics Depot */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              5. Supplier / Depot Hub
            </label>
            <div className="relative">
              <select
                value={selectedSupplierId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedSupplierId(id);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-2 text-slate-800 pr-7 focus:ring-2 focus:ring-purple-500/20 focus:outline-none cursor-pointer appearance-none font-medium truncate"
              >
                <option value="">All Suppliers & Depots</option>
                {cascadingSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏢 {s.business_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 6. Vehicle / Delivery Team */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              6. Vehicle / Delivery Team
            </label>
            <div className="relative">
              <select
                value={selectedVehicleReg || ''}
                onChange={(e) => {
                  setSelectedVehicleReg(e.target.value || null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-2 text-slate-800 pr-7 focus:ring-2 focus:ring-purple-500/20 focus:outline-none cursor-pointer appearance-none font-medium font-mono truncate"
              >
                <option value="">All Teams & Vehicles</option>
                {cascadingVehicles.map((t) => (
                  <option key={t.id} value={t.vehicle_registration_no}>
                    🚚 {t.vehicle_registration_no} ({t.team_name})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* District Quick Switcher Pills for Selected Division */}
        {cascadingDistricts.length > 0 && cascadingDistricts.length <= 25 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 scrollbar-none">
            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-purple-600" />
              Depots:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedDistrictId(null);
                setSelectedAsmId(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                selectedDistrictId === null
                  ? 'bg-purple-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              🗺️ All {cascadingDistricts.length} Depots
            </button>

            {cascadingDistricts.map((d) => {
              const isSelected = selectedDistrictId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDistrictId(d.id);
                    const match = asms.find((a) => a.district_id === d.id);
                    if (match) setSelectedAsmId(match.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-2xs font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  📍 {d.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Section Switcher Tabs (Map vs Manifests) */}
      {showMap && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('map')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'map'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Interactive Fleet & Depots Map</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
              activeSubTab === 'map' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              {filteredDispatches.length} Vehicles
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Map + Manifests Split View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('trips')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'trips'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Vehicle Trips & Manifests ({filteredDispatches.length})</span>
          </button>
        </div>
      )}

      {/* 4. Live OpenStreetMap National / Scoped Telemetry Map */}
      {showMap && (activeSubTab === 'map' || activeSubTab === 'all') && (
        <div className="space-y-4">
          <DeliveryFleetMap
            dispatches={filteredDispatches}
            selectedDispatchId={expandedTripId}
            onSelectDispatch={(disp) => setExpandedTripId(disp.id)}
            allowedOutlets={filteredOutlets}
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={(id) => {
              setSelectedDistrictId(id);
              if (id) {
                const matchAsm = asms.find((a) => a.district_id === id);
                if (matchAsm) setSelectedAsmId(matchAsm.id);
              }
            }}
            availableDistricts={districtOptions}
            suppliers={cascadingSuppliers}
            divisionName={selectedRsmObj?.division}
            height={activeSubTab === 'map' ? '640px' : '520px'}
          />

          {/* Delivery Teams & Moving Vehicles Live Roster */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-purple-500/20">
                  🚚
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    Active Delivery Fleets in Scope ({cascadingVehicles.length} Teams)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Live delivery crews and vehicles operating under the selected RSM ➔ ASM ➔ District hierarchy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500">
                  In-Transit: <strong className="text-blue-600">{inTransitCount}</strong>
                </span>
                <span className="text-slate-500">
                  Completed: <strong className="text-emerald-600">{deliveredCount}</strong>
                </span>
              </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cascadingVehicles.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-400">
                  No delivery teams found matching the active hierarchical filter.
                </div>
              ) : (
                cascadingVehicles.map((team) => {
                  const activeDisp = filteredDispatches.find(
                    (d) =>
                      d.delivery_team_id === team.id ||
                      d.vehicle_registration_no === team.vehicle_registration_no
                  );
                  const isDelivered = activeDisp && (activeDisp.status === 'DELIVERED' || activeDisp.status === 'COMPLETED');

                  return (
                    <div
                      key={team.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        activeDisp
                          ? 'bg-slate-50/80 border-purple-200 shadow-2xs hover:border-purple-300'
                          : 'bg-white border-slate-200 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-xs text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded border border-purple-200 block w-fit">
                            {team.vehicle_registration_no}
                          </span>
                          <h5 className="font-bold text-xs text-slate-900 mt-1">
                            {team.team_name}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Driver: {team.driver_name} (📞 {team.driver_phone})
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                            activeDisp
                              ? isDelivered
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {activeDisp ? activeDisp.status : 'AVAILABLE'}
                        </span>
                      </div>

                      {activeDisp && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5 text-[11px] font-mono">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Sub-Route:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[140px]">
                              {activeDisp.sub_route}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Cargo Load:</span>
                            <span className="font-bold text-purple-700">
                              {activeDisp.total_cases} cases
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedTripId(activeDisp.id);
                              setSelectedVehicleReg(activeDisp.vehicle_registration_no || null);
                            }}
                            className="w-full mt-2 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>Track on Map</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Trips & Manifests List Section */}
      {(!showMap || activeSubTab === 'trips' || activeSubTab === 'all') && (
        <div className="space-y-4">
          {/* Status & Search Strip */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Registration No, Trip Code, Driver, Team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-700 bg-white cursor-pointer font-medium"
              >
                <option value="ALL">All Delivery Statuses</option>
                <option value="DISPATCHED">Dispatched / Boarded</option>
                <option value="IN_TRANSIT">In-Transit / Live</option>
                <option value="REDIRECTED">Redirected Orders</option>
                <option value="CANCELLED">Cancelled Routes</option>
                <option value="DELIVERED">Delivered / Finalized</option>
              </select>
            </div>
          </div>

          {/* Trips Cards */}
          <div className="space-y-3">
            {filteredDispatches.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No vehicle dispatches matching criteria.
              </div>
            ) : (
              filteredDispatches.map((trip) => {
                const isExpanded = expandedTripId === trip.id;
                const isDelivered = trip.status === 'DELIVERED' || trip.status === 'COMPLETED';

                return (
                  <div
                    key={trip.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                  >
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          <Truck className="w-5 h-5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {trip.dispatch_code}
                            </span>
                            <span className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                              Vehicle Reg: {trip.vehicle_registration_no}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isDelivered
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : trip.status === 'IN_TRANSIT'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {trip.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="font-bold text-slate-900 flex items-center gap-1">
                              <Route className="w-3.5 h-3.5 text-indigo-600" />
                              Route: {trip.sub_route}
                            </span>
                            <span>•</span>
                            <span>Team: <strong>{trip.team_name}</strong></span>
                            <span>•</span>
                            <span>Driver: <strong>{trip.driver_name}</strong> (📞 {trip.driver_phone})</span>
                          </div>

                          <p className="text-[11px] text-slate-400">
                            Dispatched: {new Date(trip.dispatched_at).toLocaleString()}
                            {trip.delivered_at && ` • Delivered: ${new Date(trip.delivered_at).toLocaleString()}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end md:self-center">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Total Load
                          </span>
                          <span className="font-mono text-base font-black text-slate-900">
                            {trip.total_cases} Cases
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            to {trip.total_outlets} Outlets
                          </span>
                        </div>

                        <button
                          onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Manifest */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 border-t border-slate-200/80 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span>Stores Manifest & Assigned Product Demands</span>
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500">
                            Crew: {trip.team_members || trip.driver_name}
                          </span>
                        </div>

                        {!trip.items || trip.items.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No detailed items recorded.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3">Outlet Store</th>
                                  <th className="py-2.5 px-3">Address & Phone</th>
                                  <th className="py-2.5 px-3">Product Name</th>
                                  <th className="py-2.5 px-3 text-center">Demanded</th>
                                  <th className="py-2.5 px-3 text-center font-bold text-purple-700">Assigned</th>
                                  <th className="py-2.5 px-3 text-right">Value</th>
                                  <th className="py-2.5 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {trip.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                                      {item.outlet_name}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px]">
                                      <p>{item.outlet_address}</p>
                                      {item.outlet_phone && <p className="text-slate-400">📞 {item.outlet_phone}</p>}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans font-semibold text-indigo-700">
                                      {item.product_name}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-slate-500">
                                      {item.demanded_cases} cases
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-black text-purple-700 bg-purple-50/50">
                                      {item.assigned_cases} cases
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-700">
                                      ৳{Number(item.wholesale_profit || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                          isDelivered
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}
                                      >
                                        {isDelivered ? 'DELIVERED' : 'ASSIGNED'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDeliveryManagement;
