import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Compass,
  Store,
  RefreshCw,
} from 'lucide-react';
import { parseAllocatedAreas } from '../../constants/cityAreas';
import type { SupplierRecord } from './SuperadminSupplierManagement';

export interface SalesOfficerRecord {
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
  outlet_count?: number;
  supplier_name?: string;
  created_at?: string;
}

interface SuperadminSalesOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierRecord | null;
  onOfficerChanged?: () => void;
}

export const SuperadminSalesOfficerModal: React.FC<SuperadminSalesOfficerModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onOfficerChanged,
}) => {
  const [officers, setOfficers] = useState<SalesOfficerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [notes, setNotes] = useState('');

  // Parse supplier's allocated areas
  const allocatedMap = parseAllocatedAreas(supplier?.allocated_areas);
  const allocatedCities = Object.keys(allocatedMap);

  const fetchOfficers = async () => {
    if (!supplier) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/sales-officers?supplierId=${supplier.id}`);
      if (res.ok) {
        const data = await res.json();
        setOfficers(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to fetch Sales Officers');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error to backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplier) {
      fetchOfficers();
      setError(null);
      setSuccess(null);

      // Default city & area selection
      const initialCity = allocatedCities.length > 0 ? allocatedCities[0] : (supplier.district_name || 'Dhaka');
      setSelectedCity(initialCity);
      const initialAreas = allocatedMap[initialCity] || [];
      setSelectedArea(initialAreas.length > 0 ? initialAreas[0] : 'Central');
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
    }
  }, [isOpen, supplier?.id]);

  // When selectedCity changes, update selectedArea to first available
  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    const availableAreas = allocatedMap[newCity] || [];
    setSelectedArea(availableAreas.length > 0 ? availableAreas[0] : '');
  };

  const availableAreasForCity = allocatedMap[selectedCity] || [];

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;

    if (!name.trim()) {
      setError('Please provide the Sales Officer full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }
    if (!selectedArea.trim()) {
      setError('Please select an assigned area from the supplier allotment.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:8080/api/v1/sales-officers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          supplier_id: supplier.id,
          city: selectedCity,
          assigned_area: selectedArea,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to assign Sales Officer');
      }

      setSuccess(`Sales Officer ${data.name} (${data.officer_code}) successfully assigned to ${data.assigned_area}, ${data.city}!`);
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      fetchOfficers();
      if (onOfficerChanged) onOfficerChanged();
    } catch (err: any) {
      setError(err.message || 'Error creating Sales Officer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOfficer = async (officer: SalesOfficerRecord) => {
    if (!window.confirm(`Are you sure you want to remove Sales Officer "${officer.name}" (${officer.officer_code})? Any pending dispatches to area ${officer.assigned_area} will need reassignment.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`http://localhost:8080/api/v1/sales-officers/${officer.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to remove Sales Officer');
      }

      setSuccess(`Sales Officer ${officer.name} (${officer.officer_code}) removed.`);
      fetchOfficers();
      if (onOfficerChanged) onOfficerChanged();
    } catch (err: any) {
      setError(err.message || 'Error deleting Sales Officer');
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-xl font-bold tracking-wide uppercase">
                  Manage Sales Officers
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {supplier.business_name}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Assign and regulate territory Sales Officers. Each officer is allocated one specific area strictly within this supplier's approved allotment.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-indigo-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">✕</button>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{success}</span>
              </div>
              <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-800 font-bold ml-2">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Existing Sales Officers (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    Assigned Sales Officers ({officers.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={fetchOfficers}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                  <span>Loading assigned officers...</span>
                </div>
              ) : officers.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-600 text-sm">No Sales Officers Assigned Yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Use the form on the right to assign a Sales Officer for each municipal area in {supplier.business_name}'s territory.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {officers.map((so) => (
                    <div
                      key={so.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {so.officer_code.split('-')[1] || 'SO'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {so.officer_code}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {so.status}
                              </span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900 mt-0.5">
                              {so.name}
                            </h5>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteOfficer(so)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove Sales Officer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Area and Contact Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          <MapPin className="w-2.5 h-2.5 text-blue-600" />
                          {so.city}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          <Compass className="w-2.5 h-2.5 text-amber-600" />
                          Area: {so.assigned_area}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Store className="w-2.5 h-2.5 text-emerald-600" />
                          {so.outlet_count || 0} Outlets in Area
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-slate-100">
                        <span className="font-mono text-[11px] text-slate-700 font-semibold flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {so.phone}
                        </span>
                        {so.email && (
                          <span className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" /> {so.email}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Assign New Sales Officer Form (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Plus className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  Assign New Sales Officer
                </h4>
              </div>

              <form onSubmit={handleCreateOfficer} className="space-y-3.5">
                {/* Officer Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Officer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tariqul Islam"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1711-..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@email.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* City Allocation */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    City (from Supplier Allotment) *
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-semibold"
                  >
                    {allocatedCities.length > 0 ? (
                      allocatedCities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))
                    ) : (
                      <option value={supplier.district_name || 'Dhaka'}>
                        {supplier.district_name || 'Dhaka'}
                      </option>
                    )}
                  </select>
                </div>

                {/* Area Allocation (Strictly from Supplier's Allotment) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Assigned Municipal Area *
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold">
                      1 Area per Officer
                    </span>
                  </div>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-semibold"
                  >
                    {availableAreasForCity.length > 0 ? (
                      availableAreasForCity.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))
                    ) : (
                      <option value="Gulshan">Gulshan</option>
                    )}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Area selection is strictly restricted to areas allocated by Superadmin to this supplier.
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Officer Assignment Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Primary contact for supermarket chains"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Assign Sales Officer to Area</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Total active officers for this supplier: <strong className="text-slate-800">{officers.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
