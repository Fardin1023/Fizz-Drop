import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  MapPin,
  Phone,
  Trash2,
  AlertCircle,
  X,
  Warehouse,
  RefreshCw,
  CheckCircle2,
  Search,
  Filter,
  Compass,
  Building2,
  Store,
  Layers,
  ChevronDown,
  ChevronUp,
  Globe,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CITY_AREAS_MAP } from '../../constants/cityAreas';
import {
  COMMON_FRANCHISE_BRANDS,
  extractFranchiseName,
  extractBranchName,
  groupOutletsByFranchise,
  type FranchiseGroup,
} from '../../utils/franchiseUtils';

export interface OutletItem {
  outlet_id: number;
  outlet_name: string;
  franchise_name?: string;
  branch_name?: string;
  location_address: string;
  city?: string;
  area?: string;
  contact_phone?: string;
  status: string;
  created_date?: string;
  district_id?: number;
  district_name?: string;
  division_name?: string;
}

interface OutletManagementProps {
  onOutletChanged?: () => void;
}

export const OutletManagement: React.FC<OutletManagementProps> = ({ onOutletChanged }) => {
  const { token } = useAuth();
  const authToken = token || localStorage.getItem('fizzdrop_token');

  const [outlets, setOutlets] = useState<OutletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState('ALL');
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GROUPED' | 'LIST'>('GROUPED');
  const [expandedFranchises, setExpandedFranchises] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Form states
  const [franchiseName, setFranchiseName] = useState('Shwapno');
  const [customFranchiseName, setCustomFranchiseName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [outletName, setOutletName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [districtId, setDistrictId] = useState<number | ''>('');
  const [allDistricts, setAllDistricts] = useState<{ id: number; name: string; division: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDistricts = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/v1/districts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllDistricts(data);
          const dMatch = data.find((d) => d.name.toLowerCase() === 'dhaka');
          if (dMatch) setDistrictId(dMatch.id);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/outlets');
      if (res.ok) {
        const data = await res.json();
        const normalized: OutletItem[] = (Array.isArray(data) ? data : []).map((o: any) => {
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
            created_date: o.created_date ?? o.createdDate,
            district_id: o.district_id ?? o.districtId,
            district_name: o.district_name ?? o.districtName,
            division_name: o.division_name ?? o.divisionName,
          };
        });

        setOutlets(normalized);

        // Auto-expand all franchises by default
        const initialExpanded: Record<string, boolean> = {};
        normalized.forEach((item) => {
          if (item.franchise_name) initialExpanded[item.franchise_name] = true;
        });
        setExpandedFranchises((prev) => ({ ...initialExpanded, ...prev }));
      }
    } catch (err) {
      console.error('Error fetching outlets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
    fetchDistricts();
  }, []);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const matchedDistrict = allDistricts.find(
      (d) => d.name.toLowerCase() === newCity.toLowerCase()
    );
    if (matchedDistrict) {
      setDistrictId(matchedDistrict.id);
    }
    const suggestedAreas = CITY_AREAS_MAP[newCity] || [];
    if (suggestedAreas.length > 0) {
      setArea(suggestedAreas[0]);
    } else {
      setArea('');
    }
  };

  const openAddModalForFranchise = (fName?: string) => {
    setFormError(null);
    if (fName) {
      setFranchiseName(fName);
      setCustomFranchiseName('');
      setBranchName('');
    } else {
      setFranchiseName('Shwapno');
      setCustomFranchiseName('');
      setBranchName('');
    }
    setOutletName('');
    setLocationAddress('');
    setContactPhone('');
    setIsModalOpen(true);
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const resolvedFranchise =
      franchiseName === 'CUSTOM'
        ? customFranchiseName.trim()
        : franchiseName.trim();

    if (!resolvedFranchise) {
      setFormError('Please enter or select a Franchise / Chain Brand.');
      return;
    }

    const resolvedBranch = branchName.trim() || `${area ? area + ' ' : ''}Branch`;
    const resolvedOutletName =
      outletName.trim() || `${resolvedFranchise} — ${resolvedBranch}`;

    if (!locationAddress.trim()) {
      setFormError('Location address is required.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('http://localhost:8080/api/outlets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          outlet_name: resolvedOutletName,
          franchise_name: resolvedFranchise,
          branch_name: resolvedBranch,
          location_address: locationAddress.trim(),
          city: city.trim(),
          area: area.trim(),
          contact_phone: contactPhone.trim(),
          status,
          district_id: districtId ? Number(districtId) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to create franchise branch');
      }

      setIsModalOpen(false);
      setActionMsg(`Successfully added ${resolvedFranchise} (${resolvedBranch}) to database!`);
      setTimeout(() => setActionMsg(null), 4000);
      fetchOutlets();
      if (onOutletChanged) onOutletChanged();
    } catch (err: any) {
      setFormError(err.message || 'Error communicating with server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOutlet = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove outlet "${name}"?`)) {
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`http://localhost:8080/api/outlets/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete outlet');
        return;
      }

      setActionMsg(`Removed outlet '${name}' successfully.`);
      setTimeout(() => setActionMsg(null), 3000);
      fetchOutlets();
      if (onOutletChanged) onOutletChanged();
    } catch (err: any) {
      alert(err.message || 'Error communicating with server');
    }
  };

  const toggleFranchiseCollapse = (fName: string) => {
    setExpandedFranchises((prev) => ({
      ...prev,
      [fName]: !prev[fName],
    }));
  };

  // Filter options
  const uniqueFranchises = Array.from(
    new Set(outlets.map((o) => o.franchise_name).filter(Boolean) as string[])
  );

  const availableCities = Array.from(
    new Set(outlets.map((o) => o.city || o.district_name).filter(Boolean) as string[])
  );

  const availableAreas = Array.from(
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

  // Filtered outlets
  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const oFranchise = (o.franchise_name || '').toLowerCase();
      const oBranch = (o.branch_name || '').toLowerCase();
      const oCity = (o.city || o.district_name || '').toLowerCase();
      const oArea = (o.area || '').toLowerCase();
      const oAddr = (o.location_address || '').toLowerCase();
      const term = search.toLowerCase();

      const matchesSearch =
        !term ||
        o.outlet_name.toLowerCase().includes(term) ||
        oFranchise.includes(term) ||
        oBranch.includes(term) ||
        oAddr.includes(term) ||
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

  // Group filtered outlets by franchise chain
  const franchiseGroups: FranchiseGroup<OutletItem>[] = useMemo(() => {
    return groupOutletsByFranchise(filteredOutlets);
  }, [filteredOutlets]);

  // High-level statistics
  const totalFranchisesCount = uniqueFranchises.length;
  const totalBranchesCount = outlets.length;
  const uniqueDivisionsCount = Array.from(
    new Set(outlets.map((o) => o.division_name).filter(Boolean))
  ).length;
  const uniqueCitiesCount = availableCities.length;

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Action Notification */}
      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMsg}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Franchise & Outlets Summary Analytics Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 sm:p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-3 h-3 text-cyan-400" />
              <span>Multi-Division Franchise & Branch Network</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-oswald uppercase tracking-wide text-white">
              Franchise Outlets & Regional Branches
            </h2>
            <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
              Consolidated master view of major franchise brands (e.g. Shwapno, Unimart, Agora) with all their physical branches organized across municipal divisions and cities.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="block font-oswald text-xl sm:text-2xl font-bold text-cyan-300">
                {totalFranchisesCount}
              </span>
              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
                Franchise Chains
              </span>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="block font-oswald text-xl sm:text-2xl font-bold text-emerald-300">
                {totalBranchesCount}
              </span>
              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
                Active Branches
              </span>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="block font-oswald text-xl sm:text-2xl font-bold text-amber-300">
                {uniqueDivisionsCount}
              </span>
              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
                Divisions
              </span>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="block font-oswald text-xl sm:text-2xl font-bold text-purple-300">
                {uniqueCitiesCount}
              </span>
              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
                Cities
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Filters & View Toggle */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 flex flex-col gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by franchise, branch, city or area..."
              className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('GROUPED')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'GROUPED'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="View branches grouped under parent Franchise Chains"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>By Franchise</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="View all individual branch cards in a grid"
              >
                <Store className="w-3.5 h-3.5" />
                <span>All Branches</span>
              </button>
            </div>

            <button
              onClick={fetchOutlets}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh outlets list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={() => openAddModalForFranchise()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Franchise Outlet</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            <Filter className="w-3 h-3 text-indigo-600" />
            <span>Filter By:</span>
          </div>

          {/* Franchise Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
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
                    {f} ({count} {count === 1 ? 'branch' : 'branches'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium">City:</span>
            <select
              value={selectedCityFilter}
              onChange={(e) => {
                setSelectedCityFilter(e.target.value);
                setSelectedAreaFilter('ALL');
              }}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Cities ({availableCities.length})</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Compass className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <span className="text-slate-400 font-medium">Area:</span>
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Areas ({availableAreas.length})</option>
              {availableAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {(selectedFranchiseFilter !== 'ALL' ||
            selectedCityFilter !== 'ALL' ||
            selectedAreaFilter !== 'ALL' ||
            search) && (
            <button
              onClick={() => {
                setSelectedFranchiseFilter('ALL');
                setSelectedCityFilter('ALL');
                setSelectedAreaFilter('ALL');
                setSearch('');
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 ml-auto flex items-center gap-1 cursor-pointer"
            >
              <span>Reset Filters</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Workspace */}
      {loading && outlets.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-500 space-y-2">
          <div className="w-7 h-7 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <span className="font-mono">Loading franchise outlets & branches...</span>
        </div>
      ) : filteredOutlets.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white border border-slate-200/90 p-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-zinc-900">No Franchise Outlets Match Filter</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No branches found for the chosen franchise chain, city, or area.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedFranchiseFilter('ALL');
              setSelectedCityFilter('ALL');
              setSelectedAreaFilter('ALL');
              setSearch('');
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'GROUPED' ? (
        /* HIERARCHICAL VIEW: Branches grouped under Parent Franchise Chains */
        <div className="space-y-4">
          {franchiseGroups.map((group) => {
            const isExpanded = expandedFranchises[group.franchiseName] !== false;

            return (
              <div
                key={group.franchiseName}
                className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Franchise Brand Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-blue-50/20 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-oswald text-lg sm:text-xl font-bold uppercase tracking-wide text-zinc-900 truncate">
                          {group.franchiseName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {group.totalBranches} {group.totalBranches === 1 ? 'Branch' : 'Branches'}
                        </span>
                      </div>

                      {/* Division & City coverage badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {group.divisions.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs"
                          >
                            <Globe className="w-2.5 h-2.5 text-blue-500" />
                            {d} Division
                          </span>
                        ))}

                        {group.cities.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80"
                          >
                            <MapPin className="w-2.5 h-2.5 text-blue-600" />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => openAddModalForFranchise(group.franchiseName)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      title={`Add another physical branch under ${group.franchiseName}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Branch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFranchiseCollapse(group.franchiseName)}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse branch list' : 'Expand branch list'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Branches List inside this Franchise */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {group.branches.map((outlet) => (
                        <div
                          key={outlet.outlet_id}
                          className="rounded-2xl border border-slate-200/90 hover:border-blue-400 p-4 bg-slate-50/50 hover:bg-white flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group"
                        >
                          <div>
                            {/* Top row: Branch Name & Status */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                                  <Store className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">
                                    {outlet.branch_name || outlet.outlet_name}
                                  </h4>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ID #{outlet.outlet_id}
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                                  outlet.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {outlet.status}
                              </span>
                            </div>

                            {/* Location Tags: Division, City & Municipal Area */}
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

                            {/* Address & Phone */}
                            <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
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

                          {/* Branch Footer Action */}
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400">
                              Registered Branch
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteOutlet(outlet.outlet_id, outlet.outlet_name)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete branch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT LIST GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutlets.map((outlet) => (
            <div
              key={outlet.outlet_id}
              className="rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-wide block">
                        {outlet.franchise_name}
                      </span>
                      <h4 className="font-bold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">
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

                {/* Location Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
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

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">
                  OUTLET-#{outlet.outlet_id}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteOutlet(outlet.outlet_id, outlet.outlet_name)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete outlet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* "Register New Outlet & Branch" Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-zinc-900">
                    Add Franchise Branch Outlet
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Register a new physical retail branch under a franchise chain
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="m-5 mb-0 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOutlet} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* 1. Parent Franchise Chain Selection */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Parent Franchise Brand / Chain *
                </label>

                {/* Quick Brand Selector Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_FRANCHISE_BRANDS.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        setFranchiseName(brand);
                        setCustomFranchiseName('');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        franchiseName === brand
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white hover:bg-indigo-100/70 text-indigo-900 border border-indigo-200/80'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFranchiseName('CUSTOM')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      franchiseName === 'CUSTOM'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white hover:bg-indigo-100/70 text-indigo-900 border border-indigo-200/80'
                    }`}
                  >
                    + Custom Brand
                  </button>
                </div>

                {franchiseName === 'CUSTOM' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customFranchiseName}
                      onChange={(e) => setCustomFranchiseName(e.target.value)}
                      placeholder="Type custom franchise chain name (e.g. Almas Super Shop)..."
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 focus:border-indigo-500 text-xs text-slate-900 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 2. Branch Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  Branch Identifier / Name *
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Joydebpur Branch, Gulshan 2 Outlet, GEC Circle Branch"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-900 outline-none placeholder-slate-400 transition-all font-medium"
                />
              </div>

              {/* 3. Division, City and Area Configuration */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    City & Area Location Settings *
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 font-mono">
                    Multi-City Allotment
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City / District Hub *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 outline-none cursor-pointer font-medium"
                    >
                      {Object.keys(CITY_AREAS_MAP).map((cName) => (
                        <option key={cName} value={cName}>
                          {cName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Allocated Municipal Area / Zone *
                    </label>
                    <input
                      type="text"
                      list="area-suggestions"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Joydebpur, Gulshan, Agrabad"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 outline-none placeholder-slate-400 transition-all font-medium"
                    />
                    <datalist id="area-suggestions">
                      {(CITY_AREAS_MAP[city] || []).map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Quick Area Suggestion Pills */}
                {CITY_AREAS_MAP[city] && CITY_AREAS_MAP[city].length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold text-blue-700 block mb-1">
                      Quick Select Common Areas in {city}:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {CITY_AREAS_MAP[city].slice(0, 10).map((suggestedArea) => (
                        <button
                          key={suggestedArea}
                          type="button"
                          onClick={() => setArea(suggestedArea)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                            area === suggestedArea
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {suggestedArea}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Street Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Location Street Address *
                </label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  required
                  placeholder="e.g. Joydebpur Rd, Gazipur / Plot 14, Road 11, Block D"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 outline-none placeholder-slate-400 transition-all"
                />
              </div>

              {/* 5. Phone & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+880 1700-112233"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 outline-none placeholder-slate-400 font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 text-xs text-slate-900 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Live Record Preview:
                </span>
                <span className="font-semibold text-slate-800">
                  {franchiseName === 'CUSTOM' ? (customFranchiseName || 'Brand') : franchiseName} — {branchName || (area ? `${area} Branch` : 'Main Branch')} ({city})
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Franchise Branch</span>
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

export default OutletManagement;
