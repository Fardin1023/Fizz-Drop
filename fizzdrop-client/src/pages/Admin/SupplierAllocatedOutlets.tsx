import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Store,
  Users,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Search,
  Filter,
  Compass,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  Building,
  Layers,
  Globe,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parseAllocatedAreas } from '../../constants/cityAreas';
import { SupplyStockModal, type OutletOption, type SalesOfficerOption } from './SupplyStockModal';
import {
  extractFranchiseName,
  extractBranchName,
  groupOutletsByFranchise,
  type FranchiseGroup,
} from '../../utils/franchiseUtils';

export interface AllocatedOutlet {
  outlet_id: number;
  outlet_name: string;
  franchise_name?: string;
  branch_name?: string;
  location_address: string;
  city?: string;
  area?: string;
  contact_phone?: string;
  status: string;
  district_name?: string;
  division_name?: string;
}

export interface SalesOfficerData {
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
  outlet_count?: number;
}

interface SupplierProfileData {
  business_name?: string;
  primary_district_id?: number;
  district_name?: string;
  division_name?: string;
  allocated_areas?: string;
  assigned_districts?: { id: number; name: string; division: string }[];
}

interface SupplierAllocatedOutletsProps {
  onNavigateToCatalog?: () => void;
  onRequestStock?: (productId?: number) => void;
}

export const SupplierAllocatedOutlets: React.FC<SupplierAllocatedOutletsProps> = ({
  onNavigateToCatalog,
  onRequestStock,
}) => {
  const { user, token } = useAuth();
  const userId = user?.user_id || 4;

  const [salesOfficers, setSalesOfficers] = useState<SalesOfficerData[]>([]);
  const [outlets, setOutlets] = useState<AllocatedOutlet[]>([]);
  const [profile, setProfile] = useState<SupplierProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'OFFICERS' | 'TERRITORY_OUTLETS'>('OFFICERS');

  // Supply Stock Modal state
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [selectedOfficerForSupply, setSelectedOfficerForSupply] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [outletsRes, profileRes, officersRes] = await Promise.all([
        fetch(`http://localhost:8080/api/outlets?userId=${userId}`),
        fetch(`http://localhost:8080/api/v1/supplier/profile?userId=${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`http://localhost:8080/api/v1/supplier/sales-officers?userId=${userId}`),
      ]);

      if (outletsRes.ok) {
        const data = await outletsRes.json();
        const normalized: AllocatedOutlet[] = (Array.isArray(data) ? data : []).map((o: any) => {
          const rawName = o.outlet_name ?? o.outletName ?? '';
          const rawFranchise = o.franchise_name ?? o.franchiseName;
          const rawBranch = o.branch_name ?? o.branchName;
          const oCity = o.city ?? o.district_name ?? o.districtName ?? '';
          const oArea = o.area ?? '';

          const fName = extractFranchiseName(rawName, rawFranchise);
          const bName = extractBranchName(rawName, rawBranch, oArea, oCity);

          return {
            outlet_id: o.outlet_id ?? o.outletId,
            outlet_name: rawName || `${fName} — ${bName}`,
            franchise_name: fName,
            branch_name: bName,
            location_address: o.location_address ?? o.locationAddress ?? '',
            city: oCity,
            area: oArea,
            contact_phone: o.contact_phone ?? o.contactPhone ?? '',
            status: o.status ?? 'Active',
            district_name: o.district_name ?? o.districtName,
            division_name: o.division_name ?? o.divisionName,
          };
        });
        setOutlets(normalized);
      }

      if (profileRes.ok) {
        const profData = await profileRes.json();
        setProfile(profData);
      }

      if (officersRes.ok) {
        const officersData = await officersRes.json();
        const list: SalesOfficerData[] = officersData?.sales_officers || officersData || [];
        setSalesOfficers(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Error fetching supplier data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const allocatedMap = parseAllocatedAreas(profile?.allocated_areas);
  const allocatedCities = Object.keys(allocatedMap);

  // Filter options
  const filterableCities = Array.from(
    new Set([
      ...salesOfficers.map((so) => so.city).filter(Boolean),
      ...outlets.map((o) => o.city || o.district_name).filter(Boolean),
    ] as string[])
  );

  const filterableAreas = Array.from(
    new Set([
      ...salesOfficers.map((so) => so.assigned_area).filter(Boolean),
      ...outlets.map((o) => o.area).filter(Boolean),
    ] as string[])
  );

  // Filtered Sales Officers
  const filteredOfficers = useMemo(() => {
    return salesOfficers.filter((so) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        so.name.toLowerCase().includes(term) ||
        so.officer_code.toLowerCase().includes(term) ||
        so.assigned_area.toLowerCase().includes(term) ||
        so.city.toLowerCase().includes(term) ||
        (so.phone && so.phone.includes(term));

      const matchesCity =
        selectedCityFilter === 'ALL' || so.city.toLowerCase() === selectedCityFilter.toLowerCase();

      const matchesArea =
        selectedAreaFilter === 'ALL' || so.assigned_area.toLowerCase() === selectedAreaFilter.toLowerCase();

      return matchesSearch && matchesCity && matchesArea;
    });
  }, [salesOfficers, search, selectedCityFilter, selectedAreaFilter]);

  // Map each Sales Officer to their covered outlets
  const officerWithOutlets = useMemo(() => {
    return filteredOfficers.map((so) => {
      const matchedOutlets = outlets.filter((o) => {
        const oArea = (o.area || '').toLowerCase();
        const soArea = so.assigned_area.toLowerCase();
        return oArea.includes(soArea) || soArea.includes(oArea);
      });
      return {
        ...so,
        outlets: matchedOutlets,
        activeOutletCount: matchedOutlets.length,
      };
    });
  }, [filteredOfficers, outlets]);

  const handleOpenSupplyModal = (officerId: number) => {
    setSelectedOfficerForSupply(officerId);
    setIsSupplyModalOpen(true);
  };

  const modalSalesOfficers: SalesOfficerOption[] = salesOfficers.map((so) => ({
    id: so.id,
    officer_code: so.officer_code,
    name: so.name,
    email: so.email,
    phone: so.phone,
    supplier_id: so.supplier_id,
    city: so.city,
    assigned_area: so.assigned_area,
    status: so.status,
    outlet_count: so.outlet_count,
  }));

  const modalOutlets: OutletOption[] = outlets.map((o) => ({
    outlet_id: o.outlet_id,
    outlet_name: o.outlet_name,
    franchise_name: o.franchise_name,
    branch_name: o.branch_name,
    location_address: o.location_address,
    city: o.city,
    area: o.area,
    division_name: o.division_name,
    status: o.status,
  }));

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* 1. Header Information Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-zinc-900">
                  Assigned Sales Officers & Territory Coverage
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Wholesale Channel
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl mt-1 leading-relaxed">
                Superadmin-assigned territory Sales Officers for your wholesale distribution. You supply inventory directly to each designated Sales Officer, who oversees retail stores in their allocated area.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Available Products</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}

            <button
              onClick={fetchData}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh assigned officers"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Territory Allocation Coverage Summary */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Superadmin Approved Allotment & Assigned Municipal Areas:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {allocatedCities.length > 0 ? (
              allocatedCities.map((cityName) => {
                const zones = allocatedMap[cityName] || [];
                return (
                  <div
                    key={cityName}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-blue-900 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        {cityName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {zones.length} Zones Allotted
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {zones.map((z, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium"
                        >
                          {z}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-800">
                Primary District: <strong>{profile?.district_name || 'Assigned Division'}</strong> (All municipal zones)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3 flex flex-col gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sales officers by name, code, area or phone..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('OFFICERS')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'OFFICERS'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sales Officers ({filteredOfficers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('TERRITORY_OUTLETS')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'TERRITORY_OUTLETS'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Territory Outlets by Area</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            <Filter className="w-3 h-3 text-indigo-600" />
            <span>Filter Officers:</span>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-medium">City:</span>
            <select
              value={selectedCityFilter}
              onChange={(e) => {
                setSelectedCityFilter(e.target.value);
                setSelectedAreaFilter('ALL');
              }}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Cities ({filterableCities.length})</option>
              {filterableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <Compass className="w-3 h-3 text-cyan-600 shrink-0" />
            <span className="text-slate-400 font-medium">Assigned Area:</span>
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Areas ({filterableAreas.length})</option>
              {filterableAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {(selectedCityFilter !== 'ALL' || selectedAreaFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedCityFilter('ALL');
                setSelectedAreaFilter('ALL');
                setSearch('');
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Content: Sales Officers or Territory Outlets */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 space-y-2">
          <div className="w-6 h-6 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto" />
          <span className="font-mono">Loading assigned Sales Officers and territory coverage...</span>
        </div>
      ) : filteredOfficers.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white border border-slate-200/90 p-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-zinc-900">No Sales Officers Assigned Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Superadmin assigns dedicated Sales Officers to your supplier account for each allocated municipal area. Once assigned, you can dispatch wholesale inventory directly to them.
            </p>
          </div>
          {(selectedCityFilter !== 'ALL' || selectedAreaFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedCityFilter('ALL');
                setSelectedAreaFilter('ALL');
                setSearch('');
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'OFFICERS' ? (
        /* SALES OFFICERS CARDS (DIRECT WHOLESALE CHANNELS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {officerWithOutlets.map((so) => (
            <div
              key={so.id}
              className="rounded-3xl bg-white border border-slate-200/90 hover:border-amber-400 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
            >
              <div>
                {/* Header: Officer Code & Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0 font-bold text-sm">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          {so.officer_code}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            so.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {so.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-zinc-900 group-hover:text-amber-700 transition-colors mt-0.5">
                        {so.name}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Assigned Jurisdiction Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3.5">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    {so.city}
                  </span>

                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                    <Compass className="w-3 h-3 text-amber-600" />
                    Area: {so.assigned_area}
                  </span>

                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-[10px] px-2 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Store className="w-3 h-3 text-emerald-600" />
                    {so.activeOutletCount} {so.activeOutletCount === 1 ? 'Outlet' : 'Outlets'} in Area
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <p className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold">{so.phone}</span>
                  </p>
                  {so.email && (
                    <p className="flex items-center gap-2 text-[11px] text-slate-600 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{so.email}</span>
                    </p>
                  )}
                  {so.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 mt-2">
                      "{so.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button: Supply Stock Directly to Sales Officer */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenSupplyModal(so.id)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Truck className="w-4 h-4 text-white" />
                  <span>Supply Stock to Sales Officer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TERRITORY OUTLETS GROUPED BY SALES OFFICER */
        <div className="space-y-4">
          {officerWithOutlets.map((so) => (
            <div
              key={so.id}
              className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden"
            >
              {/* Officer Group Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-amber-50/20 to-orange-50/20 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0 font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-oswald text-lg font-bold uppercase tracking-wide text-zinc-900">
                        Sales Officer: {so.name}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {so.officer_code}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-800">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        {so.city} ({so.assigned_area})
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {so.phone}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-amber-800">
                        {so.outlets.length} Outlets Covered
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSupplyModal(so.id)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Supply to {so.name.split(' ')[0]}</span>
                </button>
              </div>

              {/* Covered Outlets in this Sales Officer's Area */}
              <div className="p-4 sm:p-5 bg-white">
                {so.outlets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    No registered franchise outlets in {so.assigned_area} yet. New branches registered in this area will automatically map to this Sales Officer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {so.outlets.map((outlet) => (
                      <div
                        key={outlet.outlet_id}
                        className="rounded-2xl border border-slate-200/90 p-4 bg-slate-50/40 hover:bg-white flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                                <Store className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-sm text-zinc-900">
                                  {outlet.branch_name || outlet.outlet_name}
                                </h5>
                                <span className="text-[10px] font-mono text-slate-400">
                                  ID #{outlet.outlet_id} • {outlet.franchise_name}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 font-mono ${
                                outlet.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {outlet.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <p className="flex items-start gap-1.5 leading-snug">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate">{outlet.location_address}</span>
                            </p>
                            {outlet.contact_phone && (
                              <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{outlet.contact_phone}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="text-[10px] font-semibold text-indigo-700">
                            Supplied via {so.officer_code}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {outlet.area}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supply Stock Modal with Sales Officer Preselected */}
      <SupplyStockModal
        isOpen={isSupplyModalOpen}
        onClose={() => {
          setIsSupplyModalOpen(false);
          setSelectedOfficerForSupply(null);
        }}
        onSuccess={() => {
          setIsSupplyModalOpen(false);
          fetchData();
        }}
        onRequestStock={onRequestStock}
        initialOfficerId={selectedOfficerForSupply || undefined}
        salesOfficers={modalSalesOfficers}
        outlets={modalOutlets}
        userId={userId}
      />
    </div>
  );
};

export default SupplierAllocatedOutlets;
