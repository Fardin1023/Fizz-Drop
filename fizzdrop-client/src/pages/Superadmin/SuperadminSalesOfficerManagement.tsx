import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  KeyRound,
  Trash2,
  Edit2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  Compass,
  Store,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { parseAllocatedAreas } from '../../constants/cityAreas';

export interface SalesOfficerItem {
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
  created_at?: string;
  user_id?: number;
}

export interface SupplierSummary {
  id: number;
  business_name: string;
  district_name?: string;
  division_name?: string;
  allocated_areas?: string;
}

export const SuperadminSalesOfficerManagement: React.FC = () => {
  const [officers, setOfficers] = useState<SalesOfficerItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('ALL');
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<SalesOfficerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('Officer123!');
  const [formPhone, setFormPhone] = useState('');
  const [formSupplierId, setFormSupplierId] = useState<number | string>('');
  const [formCity, setFormCity] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formNotes, setFormNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [officersRes, suppliersRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/sales-officers'),
        fetch('http://localhost:8080/api/v1/suppliers'),
      ]);

      if (officersRes.ok) {
        const data = await officersRes.json();
        setOfficers(Array.isArray(data) ? data : []);
      }
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        const supList = Array.isArray(data) ? data : [];
        setSuppliers(supList);
        if (supList.length > 0 && !formSupplierId) {
          setFormSupplierId(supList[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching sales officer management data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Selected supplier object for form dropdowns
  const selectedSupplierObj = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(formSupplierId)) || suppliers[0];
  }, [suppliers, formSupplierId]);

  const allocatedMap = useMemo(() => {
    return parseAllocatedAreas(selectedSupplierObj?.allocated_areas);
  }, [selectedSupplierObj]);

  const allocatedCities = useMemo(() => {
    const keys = Object.keys(allocatedMap);
    return keys.length > 0 ? keys : [selectedSupplierObj?.district_name || 'Dhaka'];
  }, [allocatedMap, selectedSupplierObj]);

  const availableAreasForSelectedCity = useMemo(() => {
    const areas = allocatedMap[formCity] || [];
    return areas.length > 0 ? areas : ['Gulshan', 'Central'];
  }, [allocatedMap, formCity]);

  // When formSupplierId changes, update formCity and formArea
  const handleSupplierChange = (supId: string | number) => {
    setFormSupplierId(supId);
    const sup = suppliers.find((s) => String(s.id) === String(supId));
    if (sup) {
      const map = parseAllocatedAreas(sup.allocated_areas);
      const cities = Object.keys(map);
      const firstCity = cities.length > 0 ? cities[0] : (sup.district_name || 'Dhaka');
      setFormCity(firstCity);
      const areas = map[firstCity] || [];
      setFormArea(areas.length > 0 ? areas[0] : 'Gulshan');
    }
  };

  // When formCity changes, update formArea
  const handleCityChange = (newCity: string) => {
    setFormCity(newCity);
    const areas = allocatedMap[newCity] || [];
    setFormArea(areas.length > 0 ? areas[0] : '');
  };

  const handleOpenCreateModal = () => {
    setEditingOfficer(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('Officer123!');
    setFormPhone('');
    setFormStatus('ACTIVE');
    setFormNotes('');
    setErrorMsg(null);

    if (suppliers.length > 0) {
      handleSupplierChange(suppliers[0].id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (so: SalesOfficerItem) => {
    setEditingOfficer(so);
    setFormName(so.name);
    setFormEmail(so.email || '');
    setFormPassword('');
    setFormPhone(so.phone);
    setFormSupplierId(so.supplier_id);
    setFormCity(so.city);
    setFormArea(so.assigned_area);
    setFormStatus(so.status);
    setFormNotes(so.notes || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Officer full name is required');
      return;
    }
    if (!formPhone.trim()) {
      setErrorMsg('Contact phone number is required');
      return;
    }
    if (!formArea.trim()) {
      setErrorMsg('Assigned municipal area is required');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const isEdit = Boolean(editingOfficer);
    const url = isEdit
      ? `http://localhost:8080/api/v1/sales-officers/${editingOfficer?.id}`
      : 'http://localhost:8080/api/v1/sales-officers';
    const method = isEdit ? 'PUT' : 'POST';

    const payload: any = {
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      supplier_id: Number(formSupplierId),
      city: formCity,
      assigned_area: formArea,
      status: formStatus,
      notes: formNotes.trim() || undefined,
    };

    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to save Sales Officer');
      }

      setSuccessMsg(
        isEdit
          ? `Sales Officer ${data.name} (${data.officer_code}) updated successfully!`
          : `Sales Officer Account created for ${data.name} (${data.officer_code})! Login credentials provisioned.`
      );
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (so: SalesOfficerItem) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate and remove Sales Officer "${so.name}" (${so.officer_code})? Wholesale deliveries to ${so.assigned_area} will need reassignment.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/v1/sales-officers/${so.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg(`Sales Officer ${so.name} (${so.officer_code}) removed.`);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Failed to remove Sales Officer');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error');
    }
  };

  // Unique filter lists
  const uniqueCities = Array.from(new Set(officers.map((so) => so.city).filter(Boolean)));

  const filteredOfficers = useMemo(() => {
    return officers.filter((so) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        so.name.toLowerCase().includes(term) ||
        so.officer_code.toLowerCase().includes(term) ||
        (so.email && so.email.toLowerCase().includes(term)) ||
        (so.phone && so.phone.includes(term)) ||
        so.city.toLowerCase().includes(term) ||
        so.assigned_area.toLowerCase().includes(term) ||
        (so.supplier_name && so.supplier_name.toLowerCase().includes(term));

      const matchesSupplier =
        selectedSupplierFilter === 'ALL' || String(so.supplier_id) === String(selectedSupplierFilter);

      const matchesCity =
        selectedCityFilter === 'ALL' || so.city.toLowerCase() === selectedCityFilter.toLowerCase();

      const matchesStatus =
        selectedStatusFilter === 'ALL' || so.status.toUpperCase() === selectedStatusFilter.toUpperCase();

      return matchesSearch && matchesSupplier && matchesCity && matchesStatus;
    });
  }, [officers, search, selectedSupplierFilter, selectedCityFilter, selectedStatusFilter]);

  // Key KPI Metrics
  const totalOfficers = officers.length;
  const activeOfficers = officers.filter((o) => o.status === 'ACTIVE').length;
  const totalOutletsCovered = officers.reduce((sum, o) => sum + (o.outlet_count || 0), 0);
  const coveredAreasCount = new Set(officers.map((o) => `${o.city}_${o.assigned_area}`)).size;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900 ml-3">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-700 hover:text-rose-900 ml-3">✕</button>
        </div>
      )}

      {/* 1. Header Information Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-zinc-900">
                  Sales Officer Accounts & Territory Allotment
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  Superadmin Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl mt-1 leading-relaxed">
                Superadmin regulates Sales Officer credentials, allocates designated territory municipal zones, and binds them to regional suppliers. Suppliers sell wholesale inventory directly to Sales Officers, who manage retail outlets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Sales Officer Account</span>
            </button>

            <button
              onClick={fetchData}
              className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Refresh officers"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Sales Officers</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-700 font-mono">{totalOfficers}</span>
            <span className="text-xs text-slate-500 font-medium">officers</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Provisioned territory reps</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Field Officers</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">{activeOfficers}</span>
            <span className="text-xs text-slate-500 font-medium">active</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Authorized for distribution</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Allocated Municipal Areas</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{coveredAreasCount}</span>
            <span className="text-xs text-slate-500 font-medium">zones</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Assigned coverage areas</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Retail Outlets Supervised</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700 font-mono">{totalOutletsCovered}</span>
            <span className="text-xs text-slate-500 font-medium">branches</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Stores managed by officers</p>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3 flex flex-col gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, email, area, supplier..."
              className="w-full pl-8 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          <span className="text-xs font-mono text-slate-500">
            Showing <strong className="text-blue-700">{filteredOfficers.length}</strong> of {officers.length} Sales Officers
          </span>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            <Filter className="w-3 h-3 text-blue-600" />
            <span>Filters:</span>
          </div>

          {/* Supplier Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 font-medium">Supplier:</span>
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Suppliers ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-slate-400 font-medium">City:</span>
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {(selectedSupplierFilter !== 'ALL' || selectedCityFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedSupplierFilter('ALL');
                setSelectedCityFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSearch('');
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Sales Officers Table / Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 space-y-2 bg-white rounded-3xl border border-slate-200">
          <div className="w-7 h-7 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <span className="font-mono">Loading Sales Officers directory...</span>
        </div>
      ) : filteredOfficers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-700 text-sm">No Sales Officers Found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click "Create Sales Officer Account" above to provision a territory representative and link them to an authorized supplier.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Sales Officer Profile</th>
                  <th className="px-4 py-3.5">Login Credentials</th>
                  <th className="px-4 py-3.5">Linked Supplier</th>
                  <th className="px-4 py-3.5">Assigned Territory</th>
                  <th className="px-4 py-3.5 text-center">Retail Outlets</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOfficers.map((so) => (
                  <tr key={so.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Profile */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20 shrink-0">
                          {so.officer_code.split('-')[1] || 'SO'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {so.officer_code}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID #{so.id}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-0.5">{so.name}</h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {so.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Login Credentials */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {so.email || `${so.officer_code.toLowerCase()}@fizzdrop.com`}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <KeyRound className="w-2.5 h-2.5 text-slate-400" />
                          <span>Pass: Officer123!</span>
                        </div>
                      </div>
                    </td>

                    {/* Linked Supplier */}
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          {so.supplier_name || `Supplier #${so.supplier_id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Supplier ID: #{so.supplier_id}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Territory */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          <MapPin className="w-2.5 h-2.5 text-blue-600" />
                          {so.city}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          <Compass className="w-2.5 h-2.5 text-amber-600" />
                          {so.assigned_area}
                        </span>
                      </div>
                    </td>

                    {/* Outlets in Jurisdiction */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        <Store className="w-3 h-3 text-emerald-600" />
                        {so.outlet_count || 0} Stores
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          so.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {so.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(so)}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Edit Officer & Territory"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(so)}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Deactivate Officer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CREATE / EDIT SALES OFFICER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-scale-up">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold tracking-wide uppercase">
                    {editingOfficer ? `Edit Sales Officer: ${editingOfficer.name}` : 'Provision Sales Officer Account'}
                  </h3>
                  <p className="text-xs text-blue-200/80">
                    {editingOfficer
                      ? 'Modify assignment, credentials, or reallocate territory'
                      : 'Create login credentials and allocate municipal zone under an authorized supplier'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-blue-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold">{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Officer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Tariq Rahman"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold"
                />
              </div>

              {/* Email & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Official Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="officer@fizzdrop.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {editingOfficer ? 'Update Password (optional)' : 'Login Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingOfficer ? 'Leave blank to keep current' : 'Officer123!'}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Phone & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+880 1711-002201"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Officer Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized to Distribute)</option>
                    <option value="INACTIVE">INACTIVE (Suspended)</option>
                  </select>
                </div>
              </div>

              {/* Linked Supplier */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Linked Regional Supplier *
                </label>
                <select
                  value={formSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold text-slate-800"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_name} (ID #{s.id} • {s.division_name || 'Dhaka'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  The supplier will dispatch wholesale stock directly to this Sales Officer.
                </p>
              </div>

              {/* City & Municipal Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Assigned City *
                  </label>
                  <select
                    value={formCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold"
                  >
                    {allocatedCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Assigned Municipal Area *
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold">1 Area per Officer</span>
                  </div>
                  <select
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-semibold"
                  >
                    {availableAreasForSelectedCity.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Assignment Scope & Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Primary territory contact for supermarket retail branches..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingOfficer ? 'Save Changes' : 'Create Account & Grant Access'}</span>
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

export default SuperadminSalesOfficerManagement;
