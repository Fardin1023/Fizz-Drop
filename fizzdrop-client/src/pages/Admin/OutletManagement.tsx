import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface OutletItem {
  outlet_id: number;
  outlet_name: string;
  location_address: string;
  contact_phone?: string;
  status: string;
  created_date?: string;
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
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Form states
  const [outletName, setOutletName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/outlets');
      if (res.ok) {
        const data = await res.json();
        const normalized = (Array.isArray(data) ? data : []).map((o: any) => ({
          outlet_id: o.outlet_id ?? o.outletId,
          outlet_name: o.outlet_name ?? o.outletName ?? '',
          location_address: o.location_address ?? o.locationAddress ?? '',
          contact_phone: o.contact_phone ?? o.contactPhone ?? '',
          status: o.status ?? 'Active',
          created_date: o.created_date ?? o.createdDate,
        }));
        setOutlets(normalized);
      }
    } catch (err) {
      console.error('Error fetching outlets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!outletName.trim() || !locationAddress.trim()) {
      setFormError('Outlet name and location address are required.');
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
          outlet_name: outletName.trim(),
          outletName: outletName.trim(),
          location_address: locationAddress.trim(),
          locationAddress: locationAddress.trim(),
          contact_phone: contactPhone.trim(),
          contactPhone: contactPhone.trim(),
          status,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.error || 'Failed to create outlet.');
        return;
      }

      setActionMsg(`Registered outlet '${outletName}' successfully!`);
      setTimeout(() => setActionMsg(null), 3000);
      setOutletName('');
      setLocationAddress('');
      setContactPhone('');
      setIsModalOpen(false);
      fetchOutlets();
      if (onOutletChanged) onOutletChanged();
    } catch (err: any) {
      setFormError(err.message || 'Error communicating with server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOutlet = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove outlet #${id} ('${name}')?`)) {
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

  const filteredOutlets = outlets.filter((o) => {
    const matchesSearch =
      o.outlet_name.toLowerCase().includes(search.toLowerCase()) ||
      o.location_address.toLowerCase().includes(search.toLowerCase());
    const matchesBranch =
      selectedBranchId === 'ALL' || String(o.outlet_id) === String(selectedBranchId);
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Action Notification */}
      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean Control Toolbar in Light Security-Developer Theme */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search franchise outlets..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Branch / Outlet Dropdown Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Warehouse className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Franchise Branches ({outlets.length})</option>
              {outlets.map((o) => (
                <option key={o.outlet_id} value={String(o.outlet_id)}>
                  {o.outlet_name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono text-slate-500 px-2 hidden sm:inline font-semibold">
            <strong className="text-blue-700">{filteredOutlets.length}</strong> hubs shown
          </span>

          <button
            onClick={fetchOutlets}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
            title="Refresh outlets list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Franchise Outlet</span>
          </button>
        </div>
      </div>

      {/* Active Branch Filter Banner */}
      {selectedBranchId !== 'ALL' && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-blue-600" />
            <span>
              Filtered to Branch:{' '}
              <strong className="text-blue-950 font-bold">
                {outlets.find((o) => String(o.outlet_id) === String(selectedBranchId))?.outlet_name}
              </strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedBranchId('ALL')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Show All Branches</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Outlets Grid */}
      {loading && outlets.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-500 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <span className="font-mono">Loading franchise outlets...</span>
        </div>
      ) : filteredOutlets.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white border border-slate-200/90 p-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-zinc-900">No Outlets Registered Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Add your physical retail locations, distribution depots, and franchise branches here.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Register First Outlet
          </button>
        </div>
      ) : (
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
                      <Warehouse className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold font-oswald text-sm text-zinc-900 uppercase tracking-wide group-hover:text-blue-600 transition-colors">
                        {outlet.outlet_name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">
                        OUTLET-#{outlet.outlet_id}
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
                    {outlet.status || 'Active'}
                  </span>
                </div>

                <div className="space-y-1.5 mt-3 text-xs text-slate-600">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-600 mt-0.5" />
                    <span className="leading-relaxed text-slate-700">{outlet.location_address}</span>
                  </div>
                  {outlet.contact_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                      <span className="font-mono text-slate-600 font-semibold">{outlet.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>entity: Outlets</span>
                <button
                  onClick={() => handleDeleteOutlet(outlet.outlet_id, outlet.outlet_name)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove outlet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* "Register New Outlet" Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100/70 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-zinc-900">
                    Register New Outlet
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Inserts into <code className="text-blue-700 font-mono font-bold">Outlets</code> table
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

            <form onSubmit={handleCreateOutlet} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Outlet / Branch Name *
                </label>
                <input
                  type="text"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  required
                  placeholder="e.g. Gulshan Flagship Hub"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 outline-none placeholder-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Location Address *
                </label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  required
                  placeholder="e.g. Plot 14, Road 11, Gulshan-1, Dhaka"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 outline-none placeholder-slate-400 transition-all"
                />
              </div>

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
                      <span>Register Outlet</span>
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
