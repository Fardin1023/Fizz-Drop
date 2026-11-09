import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  UserCheck,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  Check,
  X
} from 'lucide-react';

export interface PsrItem {
  id: number;
  psr_code: string;
  name: string;
  phone: string;
  email: string;
  sales_officer_id: number;
  sales_officer_name?: string;
  sales_officer_code?: string;
  sub_route: string;
  assigned_area: string;
  status: string;
  notes?: string;
  outlet_count?: number;
  active_orders_count?: number;
  pending_refunds_count?: number;
  created_at?: string;
}

export interface SalesOfficerOption {
  id: number;
  officer_code: string;
  name: string;
  assigned_area: string;
  city: string;
  phone: string;
  email?: string;
}

export const SuperadminPsrManagement: React.FC = () => {
  const [psrs, setPsrs] = useState<PsrItem[]>([]);
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPsr, setEditingPsr] = useState<PsrItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('Psr123!');
  const [formPhone, setFormPhone] = useState('');
  const [formSalesOfficerId, setFormSalesOfficerId] = useState<number | string>('');
  const [formArea, setFormArea] = useState('');
  const [formSubRoute, setFormSubRoute] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Reassign Sales Officer Quick Modal
  const [reassignModalPsr, setReassignModalPsr] = useState<PsrItem | null>(null);
  const [reassignTargetOfficerId, setReassignTargetOfficerId] = useState<number | string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [psrRes, soRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/psr/all'),
        fetch('http://localhost:8080/api/v1/sales-officers'),
      ]);

      if (psrRes.ok) {
        const psrData = await psrRes.json();
        setPsrs(Array.isArray(psrData) ? psrData : []);
      }
      if (soRes.ok) {
        const soData = await soRes.json();
        setSalesOfficers(Array.isArray(soData) ? soData : []);
        if (soData.length > 0 && !formSalesOfficerId) {
          setFormSalesOfficerId(soData[0].id);
          setFormArea(soData[0].assigned_area);
        }
      }
    } catch (err) {
      console.error('Failed to load PSR management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingPsr(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('Psr123!');
    setFormPhone('+880181');
    const defaultSo = salesOfficers[0];
    setFormSalesOfficerId(defaultSo ? defaultSo.id : '');
    setFormArea(defaultSo ? defaultSo.assigned_area : '');
    setFormSubRoute('');
    setFormNotes('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (psr: PsrItem) => {
    setEditingPsr(psr);
    setFormName(psr.name);
    setFormEmail(psr.email || '');
    setFormPassword('');
    setFormPhone(psr.phone);
    setFormSalesOfficerId(psr.sales_officer_id);
    setFormArea(psr.assigned_area);
    setFormSubRoute(psr.sub_route);
    setFormNotes(psr.notes || '');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleOfficerChange = (officerId: number | string) => {
    setFormSalesOfficerId(officerId);
    const so = salesOfficers.find((o) => String(o.id) === String(officerId));
    if (so) {
      setFormArea(so.assigned_area);
    }
  };

  const handleSavePsr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formEmail.trim() || !formSalesOfficerId || !formSubRoute.trim()) {
      setErrorMsg('Please complete all required fields (Name, Phone, Email, Sales Officer, Sub-Route).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: any = {
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim().toLowerCase(),
      sales_officer_id: Number(formSalesOfficerId),
      sub_route: formSubRoute.trim(),
      assigned_area: formArea.trim(),
      notes: formNotes.trim(),
    };
    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }

    try {
      const url = editingPsr
        ? `http://localhost:8080/api/v1/psr/${editingPsr.id}`
        : 'http://localhost:8080/api/v1/psr';
      const method = editingPsr ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || resData.message || 'Operation failed');
      }

      setSuccessMsg(
        editingPsr
          ? `PSR account for ${formName} successfully updated & assigned!`
          : `New PSR account created & assigned to Sales Officer successfully!`
      );

      setTimeout(() => {
        setIsModalOpen(false);
        fetchData();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving Pre-Sales Officer account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Reassign Sales Officer
  const handleQuickReassign = async () => {
    if (!reassignModalPsr || !reassignTargetOfficerId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/${reassignModalPsr.id}/assign-sales-officer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_officer_id: Number(reassignTargetOfficerId) }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || resJson.message || 'Failed to reassign');

      setReassignModalPsr(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error reassigning Sales Officer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (psr: PsrItem) => {
    const newStatus = psr.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`http://localhost:8080/api/v1/psr/${psr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Distinct filter lists
  const distinctAreas = useMemo(() => {
    const set = new Set<string>();
    psrs.forEach((p) => {
      if (p.assigned_area) set.add(p.assigned_area);
    });
    return Array.from(set);
  }, [psrs]);

  // Filtered PSR list
  const filteredPsrs = useMemo(() => {
    return psrs.filter((p) => {
      const term = search.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        p.psr_code.toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term) ||
        p.phone.toLowerCase().includes(term) ||
        p.sub_route.toLowerCase().includes(term) ||
        (p.sales_officer_name || '').toLowerCase().includes(term);

      const matchesOfficer =
        selectedOfficerFilter === 'ALL' || String(p.sales_officer_id) === String(selectedOfficerFilter);
      const matchesArea =
        selectedAreaFilter === 'ALL' || p.assigned_area.toLowerCase() === selectedAreaFilter.toLowerCase();
      const matchesStatus =
        selectedStatusFilter === 'ALL' || p.status.toUpperCase() === selectedStatusFilter.toUpperCase();

      return matchesSearch && matchesOfficer && matchesArea && matchesStatus;
    });
  }, [psrs, search, selectedOfficerFilter, selectedAreaFilter, selectedStatusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Overview Card */}
      <div className="rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Superadmin Field Management
            </span>
            <span className="text-xs bg-black/20 text-white font-semibold px-2 py-0.5 rounded-full">
              Multi-Route Retail Beat
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Pre-Sales Officers (PSR) & Territory Assignment
          </h2>
          <p className="text-xs text-orange-100 max-w-2xl leading-relaxed">
            Create field Pre-Sales Representative accounts, assign each representative to a designated Territory Sales Officer, and define dedicated sub-route beats for shop order booking and refund inspections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Refresh PSR Accounts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-white text-orange-700 font-bold text-xs shadow-md hover:bg-orange-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 text-orange-600" />
            <span>Create New PSR Account</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Field PSRs</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{psrs.length}</span>
            <span className="text-[11px] text-emerald-600 font-medium">Active in territory</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Sales Officers</span>
            <span className="text-2xl font-black text-blue-700 font-mono mt-0.5 block">{salesOfficers.length}</span>
            <span className="text-[11px] text-slate-400">Across Dhaka division</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sub-Route Beats</span>
            <span className="text-2xl font-black text-amber-700 font-mono mt-0.5 block">
              {new Set(psrs.map((p) => p.sub_route)).size}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">Field corridors</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Outlets Under Route</span>
            <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
              {psrs.reduce((acc, p) => acc + (p.outlet_count || 0), 0)}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Mapped retail shops</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PSR name, code, sub-route, phone, or sales officer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Sales Officer */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={selectedOfficerFilter}
                onChange={(e) => setSelectedOfficerFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Sales Officers</option>
                {salesOfficers.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.name} ({so.assigned_area})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Area */}
            {distinctAreas.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => setSelectedAreaFilter(e.target.value)}
                  className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Areas</option>
                  {distinctAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PSR Directory Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-slate-900">
              Pre-Sales Representatives Registry ({filteredPsrs.length})
            </h3>
            <p className="text-xs text-slate-500">
              All field personnel assigned to territory sales officers with active sub-routes.
            </p>
          </div>
        </div>

        {filteredPsrs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No Pre-Sales Officers found</p>
            <p>Try clearing filters or click "Create New PSR Account".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">PSR Code</th>
                  <th className="p-3">Representative Name</th>
                  <th className="p-3">Contact Info</th>
                  <th className="p-3">Assigned Sales Officer</th>
                  <th className="p-3">Designated Sub-Route</th>
                  <th className="p-3">Territory Area</th>
                  <th className="p-3 text-center">Outlets</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPsrs.map((psr) => {
                  const isActive = psr.status === 'ACTIVE';
                  return (
                    <tr key={psr.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3">
                        <span className="font-mono font-bold text-orange-600 px-2 py-0.5 rounded bg-orange-50 border border-orange-200">
                          {psr.psr_code}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{psr.name}</div>
                        {psr.notes && (
                          <div className="text-[10px] text-slate-400 italic max-w-xs truncate" title={psr.notes}>
                            {psr.notes}
                          </div>
                        )}
                      </td>

                      <td className="p-3 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{psr.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-300" />
                          <span>{psr.email}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {psr.sales_officer_name || 'Assigned Officer'}
                            </span>
                            <span className="text-[10px] font-mono text-blue-600 block">
                              {psr.sales_officer_code || `SO-${psr.sales_officer_id}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block max-w-xs truncate" title={psr.sub_route}>
                          {psr.sub_route}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {psr.assigned_area}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-mono font-bold text-slate-800">
                          {psr.outlet_count ?? 0}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(psr)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Click to toggle active / inactive"
                        >
                          {psr.status}
                        </button>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reassign Sales Officer Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setReassignModalPsr(psr);
                              setReassignTargetOfficerId(psr.sales_officer_id);
                            }}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="Reassign to another Sales Officer"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Reassign SO</span>
                          </button>

                          {/* Edit PSR Trigger */}
                          <button
                            type="button"
                            onClick={() => openEditModal(psr)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                            title="Edit PSR profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CREATE / EDIT PRE-SALES OFFICER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-5 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wide">
                    {editingPsr ? 'Edit Pre-Sales Officer' : 'Provision New Pre-Sales Officer'}
                  </h3>
                  <p className="text-xs text-orange-100">
                    Assign field personnel to Territory Sales Officer & sub-route.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-orange-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePsr} className="p-6 space-y-4 text-xs">
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Representative Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kabir Hossain"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+8801819001101"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="kabir.psr@fizzdrop.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingPsr ? 'New Password (Leave blank to keep unchanged)' : 'Initial Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Psr123!"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* ASSIGN TO SALES OFFICER (CORE USER REQUEST) */}
              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-orange-900 font-bold">
                  <UserCheck className="w-4 h-4 text-orange-600" />
                  <span>Assign to Territory Sales Officer *</span>
                </div>
                <p className="text-[11px] text-orange-700">
                  Select which Sales Officer this PSR reports to. The PSR will forward all outlet orders and refund requests to this officer.
                </p>
                <select
                  required
                  value={formSalesOfficerId}
                  onChange={(e) => handleOfficerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-orange-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Choose Sales Officer --</option>
                  {salesOfficers.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.name} ({so.officer_code}) — Zone: {so.assigned_area} ({so.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Territory Area & Designated Sub-Route */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Territory Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gulshan"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Designated Sub-Route *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gulshan 2 - Circle North Sub-Route"
                    value={formSubRoute}
                    onChange={(e) => setFormSubRoute(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Field Operations Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Assigned to morning convenience store beat along North Circle..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPsr ? 'Save Changes' : 'Create PSR Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK REASSIGN SALES OFFICER */}
      {reassignModalPsr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-slate-900">
                  Reassign Sales Officer
                </h3>
              </div>
              <button
                onClick={() => setReassignModalPsr(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{reassignModalPsr.name}</p>
              <p className="text-slate-500">
                Code: <span className="font-mono font-bold text-orange-600">{reassignModalPsr.psr_code}</span> • Sub-Route: {reassignModalPsr.sub_route}
              </p>
              <p className="text-slate-500">
                Current Sales Officer: <strong className="text-blue-700">{reassignModalPsr.sales_officer_name || 'Assigned Officer'}</strong>
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select New Sales Officer *
              </label>
              <select
                value={reassignTargetOfficerId}
                onChange={(e) => setReassignTargetOfficerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {salesOfficers.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.name} ({so.officer_code}) — {so.assigned_area} ({so.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignModalPsr(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleQuickReassign}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuperadminPsrManagement;
