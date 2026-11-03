import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  MapPin,
  Phone,
  Search,
  Filter,
  Compass,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  Building,
  Building2,
  Store,
  Layers,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parseAllocatedAreas } from '../../constants/cityAreas';
import { SupplyStockModal, type OutletOption } from './SupplyStockModal';
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

  const [outlets, setOutlets] = useState<AllocatedOutlet[]>([]);
  const [profile, setProfile] = useState<SupplierProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState('ALL');
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GROUPED' | 'LIST'>('GROUPED');

  // Supply Stock Modal state
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [selectedOutletForSupply, setSelectedOutletForSupply] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [outletsRes, profileRes] = await Promise.all([
        fetch(`http://localhost:8080/api/outlets?userId=${userId}`),
        fetch(`http://localhost:8080/api/v1/supplier/profile?userId=${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
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
    } catch (err) {
      console.error('Error fetching supplier allocated outlets:', err);
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
  const uniqueFranchises = Array.from(
    new Set(outlets.map((o) => o.franchise_name).filter(Boolean) as string[])
  );

  const filterableCities = Array.from(
    new Set(outlets.map((o) => o.city || o.district_name).filter(Boolean) as string[])
  );

  const filterableAreas = Array.from(
    new Set(
      outlets
        .filter(
          (o) =>
            selectedCityFilter === 'ALL' ||
            (o.city || o.district_name)?.toLowerCase() === selectedCityFilter.toLowerCase()
        )
        .map((o) => o.area)
        .filter(Boolean) as string[]
    )
  );

  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const oFranchise = (o.franchise_name || '').toLowerCase();
      const oBranch = (o.branch_name || '').toLowerCase();
      const oCity = (o.city || o.district_name || '').toLowerCase();
      const oArea = (o.area || '').toLowerCase();
      const term = search.toLowerCase();

      const matchesSearch =
        !term ||
        o.outlet_name.toLowerCase().includes(term) ||
        oFranchise.includes(term) ||
        oBranch.includes(term) ||
        o.location_address.toLowerCase().includes(term) ||
        oCity.includes(term) ||
        oArea.includes(term);

      const matchesFranchise =
        selectedFranchiseFilter === 'ALL' ||
        (o.franchise_name || '').toLowerCase() === selectedFranchiseFilter.toLowerCase();

      const matchesCity =
        selectedCityFilter === 'ALL' || oCity === selectedCityFilter.toLowerCase();

      const matchesArea =
        selectedAreaFilter === 'ALL' || oArea.includes(selectedAreaFilter.toLowerCase());

      return matchesSearch && matchesFranchise && matchesCity && matchesArea;
    });
  }, [outlets, search, selectedFranchiseFilter, selectedCityFilter, selectedAreaFilter]);

  const franchiseGroups: FranchiseGroup<AllocatedOutlet>[] = useMemo(() => {
    return groupOutletsByFranchise(filteredOutlets);
  }, [filteredOutlets]);

  const handleOpenSupplyModal = (outletId: number) => {
    setSelectedOutletForSupply(outletId);
    setIsSupplyModalOpen(true);
  };

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
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-zinc-900">
                  Allocated Franchise Outlets & Branches
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Assigned Zone
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl mt-1 leading-relaxed">
                Physical retail branches located within your authorized territorial allotment. Organize dispatches by franchise chain (e.g. Shwapno) across all approved municipal zones.
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
              title="Refresh allocated outlets"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Territory Allocation Coverage Summary */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Your Authorized Regional Coverage & Municipal Areas:</span>
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
                        {zones.length} Zones
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
              placeholder="Search by franchise, branch or area..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('GROUPED')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'GROUPED'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>By Franchise</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>All Branches</span>
              </button>
            </div>

            <span className="text-xs font-mono text-slate-500">
              Showing <strong className="text-blue-700">{filteredOutlets.length}</strong> of {outlets.length} branches
            </span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            <Filter className="w-3 h-3 text-indigo-600" />
            <span>Filter Outlets:</span>
          </div>

          {/* Franchise Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 font-medium">Franchise:</span>
            <select
              value={selectedFranchiseFilter}
              onChange={(e) => setSelectedFranchiseFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Franchises ({uniqueFranchises.length})</option>
              {uniqueFranchises.map((f) => {
                const count = outlets.filter((o) => o.franchise_name === f).length;
                return (
                  <option key={f} value={f}>
                    {f} ({count})
                  </option>
                );
              })}
            </select>
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
              <option value="ALL">All Covered Cities ({filterableCities.length})</option>
              {filterableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <Compass className="w-3 h-3 text-cyan-600 shrink-0" />
            <span className="text-slate-400 font-medium">Area:</span>
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Allocated Areas ({filterableAreas.length})</option>
              {filterableAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {(selectedFranchiseFilter !== 'ALL' || selectedCityFilter !== 'ALL' || selectedAreaFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedFranchiseFilter('ALL');
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

      {/* 3. Outlets Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <span className="font-mono">Loading outlets in allocated areas...</span>
        </div>
      ) : filteredOutlets.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white border border-slate-200/90 p-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-zinc-900">No Outlets Found in Selected Area</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {outlets.length === 0
                ? 'No franchise outlets have been registered in your allocated municipal zones yet. Superadmin can register outlets with matching City and Area tags in the Franchise Outlets manager.'
                : 'No outlets match your current search and filter criteria.'}
            </p>
          </div>
          {(selectedFranchiseFilter !== 'ALL' || selectedCityFilter !== 'ALL' || selectedAreaFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedFranchiseFilter('ALL');
                setSelectedCityFilter('ALL');
                setSelectedAreaFilter('ALL');
                setSearch('');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'GROUPED' ? (
        /* HIERARCHICAL VIEW BY FRANCHISE BRAND */
        <div className="space-y-4">
          {franchiseGroups.map((group) => (
            <div
              key={group.franchiseName}
              className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden"
            >
              {/* Franchise Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-amber-50/20 to-orange-50/20 border-b border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-oswald text-lg font-bold uppercase tracking-wide text-zinc-900">
                        {group.franchiseName}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {group.totalBranches} {group.totalBranches === 1 ? 'Branch' : 'Branches'} in Territory
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {group.cities.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200"
                        >
                          <MapPin className="w-2.5 h-2.5 text-blue-600" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Branches Grid */}
              <div className="p-4 sm:p-5 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {group.branches.map((outlet) => (
                    <div
                      key={outlet.outlet_id}
                      className="rounded-2xl border border-slate-200/90 hover:border-amber-400 p-4 bg-slate-50/50 hover:bg-white flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="font-bold text-sm text-zinc-900 group-hover:text-amber-700 transition-colors">
                                {outlet.branch_name || outlet.outlet_name}
                              </h5>
                              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                                ID #{outlet.outlet_id}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 font-mono ${
                              outlet.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {outlet.status}
                          </span>
                        </div>

                        {/* City and Area Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {outlet.division_name && (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80">
                              <Globe className="w-2.5 h-2.5 text-purple-500" />
                              {outlet.division_name}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            <MapPin className="w-2.5 h-2.5 text-blue-500" />
                            {outlet.city || outlet.district_name || 'City'}
                          </span>

                          {outlet.area && (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[10px] px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                              <Compass className="w-2.5 h-2.5 text-cyan-600" />
                              {outlet.area}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
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

                      {/* Dispatch Stock Action Button */}
                      <div className="pt-3 mt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenSupplyModal(outlet.outlet_id)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5 text-white" />
                          <span>Dispatch Stock to this Branch</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* FLAT LIST VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutlets.map((outlet) => (
            <div
              key={outlet.outlet_id}
              className="rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold font-mono text-amber-700 uppercase tracking-wide block">
                        {outlet.franchise_name}
                      </span>
                      <h4 className="font-bold text-sm text-zinc-900 group-hover:text-amber-700 transition-colors">
                        {outlet.branch_name || outlet.outlet_name}
                      </h4>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 font-mono ${
                      outlet.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {outlet.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    <MapPin className="w-2.5 h-2.5 text-blue-500" />
                    {outlet.city || outlet.district_name || 'City'}
                  </span>

                  {outlet.area && (
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-[10px] px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                      <Compass className="w-2.5 h-2.5 text-cyan-600" />
                      {outlet.area}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-start gap-1.5 leading-snug">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{outlet.location_address}</span>
                  </p>

                  {outlet.contact_phone && (
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{outlet.contact_phone}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenSupplyModal(outlet.outlet_id)}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Truck className="w-3.5 h-3.5 text-white" />
                  <span>Dispatch Stock to this Branch</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supply Stock Modal with outlet pre-selected */}
      <SupplyStockModal
        isOpen={isSupplyModalOpen}
        onClose={() => {
          setIsSupplyModalOpen(false);
          setSelectedOutletForSupply(null);
        }}
        onSuccess={() => {
          setIsSupplyModalOpen(false);
          fetchData();
        }}
        onRequestStock={onRequestStock}
        initialOutletId={selectedOutletForSupply || undefined}
        outlets={modalOutlets}
      />
    </div>
  );
};

export default SupplierAllocatedOutlets;
