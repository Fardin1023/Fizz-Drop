import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Building,
  MapPin,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  Mail,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  CITY_AREAS_MAP,
  getAvailableAreasForCity,
  parseAllocatedAreas,
  serializeAllocatedAreas,
} from '../../constants/cityAreas';

export interface DistrictItem {
  id: number;
  name: string;
  division: string;
}

export interface SupplierRecord {
  id: number;
  user_id: number;
  user_email?: string;
  business_name: string;
  trade_license_number: string;
  primary_district_id: number;
  district_name?: string;
  division_name?: string;
  covered_district_ids?: string;
  covered_district_ids_list?: number[];
  assigned_districts?: Array<{ id: number; name: string; division: string }>;
  allocated_areas?: string;
  depot_address: string;
  phone_number: string;
  default_payment_method?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  mobile_banking_number?: string;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

const PAYMENT_METHODS = [
  { id: 'CORPORATE_BANK_TRANSFER', label: 'Corporate Bank Transfer (BEFTN / RTGS)' },
  { id: 'COMPANY_CHEQUE', label: 'Account Payee Company Cheque' },
  { id: 'BKASH_MERCHANT', label: 'bKash Corporate Merchant Gateway' },
  { id: 'NAGAD_CORPORATE', label: 'Nagad Corporate Wallet Transfer' },
  { id: 'CASH_ON_DEPOT_DELIVERY', label: 'Cash on Depot Dispatch (Secured Delivery)' },
];

export const SuperadminSupplierManagement: React.FC = () => {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Supplier123!');
  const [tradeLicense, setTradeLicense] = useState('');
  const [depotAddress, setDepotAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('Dhaka');
  const [coveredDistrictIds, setCoveredDistrictIds] = useState<number[]>([]);
  const [primaryDistrictId, setPrimaryDistrictId] = useState<number>(1);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('CORPORATE_BANK_TRANSFER');
  const [bankName, setBankName] = useState('Dutch-Bangla Bank PLC');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [mobileBankingNumber, setMobileBankingNumber] = useState('');
  const [isVerified, setIsVerified] = useState(true);

  // Allocated municipal & neighborhood areas state
  const [allocatedAreasMap, setAllocatedAreasMap] = useState<Record<string, string[]>>({});
  const [newAreaInput, setNewAreaInput] = useState<Record<string, string>>({});

  const toggleAreaForCity = (cityName: string, area: string) => {
    setAllocatedAreasMap((prev) => {
      const current = prev[cityName] || [];
      const updated = current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area];
      return { ...prev, [cityName]: updated };
    });
  };

  const toggleAllAreasForCity = (cityName: string, allAreas: string[]) => {
    setAllocatedAreasMap((prev) => {
      const current = prev[cityName] || [];
      const isAllSelected = allAreas.length > 0 && allAreas.every((a) => current.includes(a));
      return {
        ...prev,
        [cityName]: isAllSelected ? [] : [...allAreas],
      };
    });
  };

  const handleAddCustomArea = (cityName: string) => {
    const custom = (newAreaInput[cityName] || '').trim();
    if (!custom) return;
    setAllocatedAreasMap((prev) => {
      const current = prev[cityName] || [];
      if (current.includes(custom)) return prev;
      return { ...prev, [cityName]: [...current, custom] };
    });
    setNewAreaInput((prev) => ({ ...prev, [cityName]: '' }));
  };

  // Status feedback
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [distRes, suppRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/districts'),
        fetch('http://localhost:8080/api/v1/suppliers'),
      ]);

      if (distRes.ok) {
        const distData = await distRes.json();
        setDistricts(Array.isArray(distData) ? distData : []);
      }
      if (suppRes.ok) {
        const suppData = await suppRes.json();
        setSuppliers(Array.isArray(suppData) ? suppData : []);
      }
    } catch (e) {
      console.error('Error fetching suppliers data:', e);
      setErrorMsg('Failed to load supplier records from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group districts by division
  const groupedDistricts = districts.reduce<Record<string, DistrictItem[]>>((acc, d) => {
    const div = d.division || 'Other';
    if (!acc[div]) acc[div] = [];
    acc[div].push(d);
    return acc;
  }, {});

  const divisionsList = Object.keys(groupedDistricts).sort();
  const currentCitiesInDivision = groupedDistricts[selectedDivision] || [];

  const handleDivisionChange = (newDiv: string) => {
    setSelectedDivision(newDiv);
    const citiesInDiv = groupedDistricts[newDiv] || [];
    const firstCity = citiesInDiv.length > 0 ? citiesInDiv[0] : null;
    const firstCityId = firstCity ? firstCity.id : 1;
    setCoveredDistrictIds([firstCityId]);
    setPrimaryDistrictId(firstCityId);
    if (firstCity) {
      setAllocatedAreasMap({
        [firstCity.name]: getAvailableAreasForCity(firstCity.name).slice(0, 5),
      });
    }
  };

  const toggleDistrict = (districtId: number, cityName?: string) => {
    setCoveredDistrictIds((prev) => {
      if (prev.includes(districtId)) {
        if (prev.length === 1) {
          setErrorMsg('A supplier must be allotted at least one city in the chosen division.');
          return prev;
        }
        const next = prev.filter((id) => id !== districtId);
        if (primaryDistrictId === districtId) {
          setPrimaryDistrictId(next[0]);
        }
        return next;
      } else {
        const next = [...prev, districtId];
        if (cityName) {
          setAllocatedAreasMap((amap) => {
            if (!amap[cityName] || amap[cityName].length === 0) {
              return {
                ...amap,
                [cityName]: getAvailableAreasForCity(cityName).slice(0, 5),
              };
            }
            return amap;
          });
        }
        return next;
      }
    });
  };

  const handleSelectAllInDivision = () => {
    const allIds = currentCitiesInDivision.map((d) => d.id);
    setCoveredDistrictIds(allIds);
    setAllocatedAreasMap((prev) => {
      const nextMap = { ...prev };
      for (const c of currentCitiesInDivision) {
        if (!nextMap[c.name] || nextMap[c.name].length === 0) {
          nextMap[c.name] = getAvailableAreasForCity(c.name).slice(0, 4);
        }
      }
      return nextMap;
    });
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setEditingUserId(null);
    setBusinessName('');
    setEmail('');
    setPassword('Supplier123!');
    setTradeLicense(`TRD-${Date.now().toString().slice(-6)}`);
    setDepotAddress('');
    setPhoneNumber('+88017');
    setSelectedDivision('Dhaka');
    
    const dhakaCities = groupedDistricts['Dhaka'] || [];
    const firstDhaka = dhakaCities.length > 0 ? dhakaCities[0] : null;
    const firstDhakaId = firstDhaka ? firstDhaka.id : 1;
    setCoveredDistrictIds([firstDhakaId]);
    setPrimaryDistrictId(firstDhakaId);
    setAllocatedAreasMap({
      'Dhaka': ['Gulshan', 'Banani', 'Uttara', 'Dhanmondi', 'Mirpur'],
    });
    setNewAreaInput({});
    setDefaultPaymentMethod('CORPORATE_BANK_TRANSFER');
    setBankName('Dutch-Bangla Bank PLC');
    setBankAccountNumber('');
    setBankAccountName('');
    setMobileBankingNumber('');
    setIsVerified(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: SupplierRecord) => {
    setIsEditing(true);
    setEditingId(s.id);
    setEditingUserId(s.user_id);
    setBusinessName(s.business_name || '');
    setEmail(s.user_email || '');
    setPassword('');
    setTradeLicense(s.trade_license_number || '');
    setDepotAddress(s.depot_address || '');
    setPhoneNumber(s.phone_number || '');
    
    const div = s.division_name || 'Dhaka';
    setSelectedDivision(div);

    const covered = s.covered_district_ids_list && s.covered_district_ids_list.length > 0
      ? s.covered_district_ids_list
      : (s.primary_district_id ? [s.primary_district_id] : [1]);
    
    setCoveredDistrictIds(covered);
    setPrimaryDistrictId(s.primary_district_id || covered[0]);
    setAllocatedAreasMap(parseAllocatedAreas(s.allocated_areas));
    setNewAreaInput({});
    setDefaultPaymentMethod(s.default_payment_method || 'CORPORATE_BANK_TRANSFER');
    setBankName(s.bank_name || 'Dutch-Bangla Bank PLC');
    setBankAccountNumber(s.bank_account_number || '');
    setBankAccountName(s.bank_account_name || s.business_name || '');
    setMobileBankingNumber(s.mobile_banking_number || s.phone_number || '');
    setIsVerified(s.is_verified ?? true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!businessName.trim()) {
      setErrorMsg('Supplier business or agency name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('A valid supplier login email is required.');
      return;
    }
    if (!isEditing && !password.trim()) {
      setErrorMsg('Please specify an initial login password for the supplier.');
      return;
    }
    if (coveredDistrictIds.length === 0) {
      setErrorMsg('You must allot at least one city in the selected division to this supplier.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        business_name: businessName.trim(),
        email: email.trim().toLowerCase(),
        division_name: selectedDivision,
        covered_district_ids: coveredDistrictIds,
        allocated_areas: serializeAllocatedAreas(allocatedAreasMap),
        primary_district_id: primaryDistrictId,
        depot_address: depotAddress.trim(),
        phone_number: phoneNumber.trim(),
        trade_license_number: tradeLicense.trim(),
        default_payment_method: defaultPaymentMethod,
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_account_name: bankAccountName.trim(),
        mobile_banking_number: mobileBankingNumber.trim(),
        is_verified: isVerified,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      if (isEditing && editingUserId) {
        payload.user_id = editingUserId;
      }

      const url = isEditing && editingId
        ? `http://localhost:8080/api/v1/suppliers/${editingId}`
        : 'http://localhost:8080/api/v1/suppliers';

      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save supplier profile.');
      }

      setSuccessMsg(isEditing ? 'Supplier profile and city allotment updated successfully!' : 'Supplier account created and credentials provisioned!');
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the supplier account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: SupplierRecord) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove supplier "${s.business_name}" (${s.user_email || 'ID: ' + s.id})?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/v1/suppliers/${s.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setSuccessMsg(`Supplier "${s.business_name}" successfully removed.`);
        await fetchData();
      } else {
        const d = await res.json();
        setErrorMsg(d.error || 'Failed to remove supplier.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting supplier account.');
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      (s.business_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.depot_address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.division_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivision =
      divisionFilter === 'ALL' || (s.division_name || '').toLowerCase() === divisionFilter.toLowerCase();

    return matchesSearch && matchesDivision;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Control Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Central Superadmin Authority
            </span>
            <span className="text-xs text-slate-400 font-medium">Physical Application Verification</span>
          </div>
          <h2 className="text-xl font-bold font-oswald text-slate-900 tracking-tight uppercase">
            Supplier Accounts & Regional City Allotment
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Superadmin registers regional suppliers from physical contract dossiers. Allot operational divisions, multiple cities, payment credentials, and system login emails.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Supplier Account</span>
        </button>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Registered Suppliers</span>
          <span className="text-2xl font-bold font-oswald text-slate-900 mt-1 block">{suppliers.length}</span>
          <span className="text-[10px] text-indigo-600 font-medium">Authorized Distributors</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Covered Divisions</span>
          <span className="text-2xl font-bold font-oswald text-slate-900 mt-1 block">
            {new Set(suppliers.map(s => s.division_name).filter(Boolean)).size}
          </span>
          <span className="text-[10px] text-cyan-600 font-medium">Administrative Hubs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Allotted Cities</span>
          <span className="text-2xl font-bold font-oswald text-slate-900 mt-1 block">
            {suppliers.reduce((acc, s) => acc + (s.covered_district_ids_list?.length || 1), 0)}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">Total Franchise City Links</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Verified Profiles</span>
          <span className="text-2xl font-bold font-oswald text-slate-900 mt-1 block">
            {suppliers.filter(s => s.is_verified).length}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">Ready for Stock Dispatch</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search supplier, email, division, city..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium shrink-0">Division:</span>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Divisions</option>
            {divisionsList.map((div) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
          <button
            onClick={fetchData}
            title="Refresh Supplier List"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Suppliers Grid / List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-500 font-medium">Loading registered suppliers...</span>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Supplier Profiles Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'No suppliers match your search filters.' : 'Click "Create Supplier Account" to register a regional supplier and allot coverage cities.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => {
            const assignedCities = s.assigned_districts || [];
            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {s.division_name || 'Dhaka'} Division
                        </span>
                        {s.is_verified ? (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            VERIFIED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            PENDING
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 truncate" title={s.business_name}>
                        {s.business_name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{s.user_email || `supplier_${s.user_id}@fizzdrop.com`}</span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Allotted Cities & Municipal Areas by Superadmin */}
                  <div className="mb-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        Allotted Cities & Areas ({assignedCities.length || s.covered_district_ids_list?.length || 1})
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Hub: {s.district_name || 'Dhaka'}</span>
                    </div>

                    <div className="space-y-1.5">
                      {(assignedCities.length > 0 ? assignedCities : [{ id: s.primary_district_id, name: s.district_name || 'Dhaka', division: s.division_name || 'Dhaka' }]).map((c) => {
                        const parsedAreas = parseAllocatedAreas(s.allocated_areas);
                        const cityAreas = parsedAreas[c.name] || [];
                        return (
                          <div key={c.id} className="p-2 rounded-lg bg-white border border-slate-200/90 shadow-2xs">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  c.id === s.primary_district_id
                                    ? 'bg-indigo-600 text-white border-indigo-700'
                                    : 'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                {c.name} {c.id === s.primary_district_id && '★'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {cityAreas.length > 0 ? `${cityAreas.length} zones` : 'All municipal areas'}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {cityAreas.length > 0 ? (
                                cityAreas.map((area, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-medium"
                                  >
                                    {area}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">Entire municipal district</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Depot & Payment Meta */}
                  <div className="space-y-1.5 text-[11px] text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-slate-500 shrink-0">License:</span>
                      <span className="font-mono text-slate-800 truncate">{s.trade_license_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-800">{s.phone_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-slate-800 truncate">
                        {s.default_payment_method ? s.default_payment_method.replace(/_/g, ' ') : 'Corporate Transfer'}
                      </span>
                    </div>
                    {s.bank_name && (
                      <div className="text-[10px] text-slate-500 font-mono truncate pl-4">
                        {s.bank_name} {s.bank_account_number ? `(${s.bank_account_number})` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: #{s.id} (UID: {s.user_id})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-indigo-600" />
                      <span>Edit Allotment</span>
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Deactivate Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT SUPPLIER ACCOUNT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-oswald uppercase tracking-wide">
                    {isEditing ? 'Modify Supplier Allotment & Profile' : 'Superadmin: Provision Regional Supplier Account'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Enter physical contract details, configure division & allotted cities, and grant credentials.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Credentials & Access */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  1. Login Credentials for Supplier
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supplier Login Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rajshahi.supplier@fizzdrop.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Provided by Superadmin to supplier</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isEditing ? 'Update Password (leave blank to keep)' : 'Initial Password *'}
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isEditing ? '••••••••' : 'Default: Supplier123!'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Supplier logs in with this password</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Business & Contact */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  2. Business & Physical Depot Info (Hard-Copy)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business / Agency Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Padma Regional Logistics Hub"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Trade License Number
                    </label>
                    <input
                      type="text"
                      value={tradeLicense}
                      onChange={(e) => setTradeLicense(e.target.value)}
                      placeholder="e.g. TRD-RSH-2026-9901"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Physical Depot Address
                    </label>
                    <input
                      type="text"
                      value={depotAddress}
                      onChange={(e) => setDepotAddress(e.target.value)}
                      placeholder="e.g. Plot 14, Station Road, Industrial Zone, Rajshahi"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+8801700112233"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVerified}
                        onChange={(e) => setIsVerified(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Mark Verified & Authorized for Stock Dispatches
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 3: Division & Multi-City Allotment */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    3. Regional Division & Allotted Cities (Strictly Allotted by Superadmin)
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllInDivision}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Select All Cities in Division
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Division *
                  </label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {divisionsList.map((div) => (
                      <option key={div} value={div}>
                        {div} Division
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    A supplier operates strictly within one division and covers cities inside that division.
                  </span>
                </div>

                {/* Cities checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Allotted Cities / District Hubs in {selectedDivision} ({coveredDistrictIds.length} selected) *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                    {currentCitiesInDivision.map((c) => {
                      const isChecked = coveredDistrictIds.includes(c.id);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => toggleDistrict(c.id, c.name)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer text-left ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Hub City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Regional Hub City
                  </label>
                  <select
                    value={primaryDistrictId}
                    onChange={(e) => setPrimaryDistrictId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {districts
                      .filter((d) => coveredDistrictIds.includes(d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (Primary Hub)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Specific Municipal / Neighborhood Area Allotment for Selected Cities */}
                <div className="pt-2 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">
                        Specific Municipal & Neighborhood Area Allotment
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Specify the exact operating zones and commercial hubs for each allotted city
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {districts
                      .filter((d) => coveredDistrictIds.includes(d.id))
                      .map((c) => {
                        const cityName = c.name;
                        const availableAreas = getAvailableAreasForCity(cityName);
                        const selectedForCity = allocatedAreasMap[cityName] || [];
                        const isAllSelected = availableAreas.length > 0 && availableAreas.every((a) => selectedForCity.includes(a));

                        return (
                          <div key={c.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                <span className="text-xs font-bold text-slate-900">{cityName} City</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                  {selectedForCity.length} areas allocated
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => toggleAllAreasForCity(cityName, availableAreas)}
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                                >
                                  {isAllSelected ? 'Deselect All' : 'Select All Areas'}
                                </button>
                              </div>
                            </div>

                            {/* Predefined area chips */}
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50/80 rounded-lg border border-slate-100">
                              {availableAreas.map((area) => {
                                const isAreaSelected = selectedForCity.includes(area);
                                return (
                                  <button
                                    type="button"
                                    key={area}
                                    onClick={() => toggleAreaForCity(cityName, area)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                      isAreaSelected
                                        ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}
                                  >
                                    <span>{area}</span>
                                    {isAreaSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Area entry for custom local zones */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                placeholder={`Add custom area/zone in ${cityName}...`}
                                value={newAreaInput[cityName] || ''}
                                onChange={(e) => setNewAreaInput({ ...newAreaInput, [cityName]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomArea(cityName);
                                  }
                                }}
                                className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddCustomArea(cityName)}
                                className="px-3 py-1 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 rounded-lg cursor-pointer shrink-0"
                              >
                                + Add Zone
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Section 4: Payment Method Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  4. Payment Method & Financial Account Details
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Payment Method *
                  </label>
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bank Fields */}
                {(defaultPaymentMethod === 'CORPORATE_BANK_TRANSFER' || defaultPaymentMethod === 'COMPANY_CHEQUE') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Dutch-Bangla Bank PLC"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="e.g. 102.120.99841"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        placeholder="e.g. Padma Logistics Depot Ltd"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Banking Fields */}
                {(defaultPaymentMethod === 'BKASH_MERCHANT' || defaultPaymentMethod === 'NAGAD_CORPORATE') && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Corporate Mobile Banking Number (bKash / Nagad)
                    </label>
                    <input
                      type="text"
                      value={mobileBankingNumber}
                      onChange={(e) => setMobileBankingNumber(e.target.value)}
                      placeholder="e.g. +8801733445566"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving to Database...' : isEditing ? 'Save Allotment Changes' : 'Create Supplier & Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
