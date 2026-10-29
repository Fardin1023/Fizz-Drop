import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  Eye,
  AlertTriangle,
  Boxes,
  X,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';

const getBrandImage = (brand: string): string => {
  const b = (brand || '').toLowerCase();
  if (b.includes('pepsi')) return pepsiImg;
  if (b.includes('7up') || b.includes('seven')) return sevenUpImg;
  if (b.includes('dew') || b.includes('mountain')) return dewImg;
  if (b.includes('mirinda')) return mirindaImg;
  if (b.includes('slice')) return sliceImg;
  if (b.includes('aquafina') || b.includes('water')) return aquafinaImg;
  return pepsiImg;
};

interface RequisitionOverviewItem {
  id: number;
  product_id: number;
  requested_quantity: number;
  approved_quantity: number;
  brand?: string;
  flavor_variant?: string;
  packaging?: string;
  size_volume?: string;
  sku?: string;
  base_price?: number;
  image_url?: string;
  regional_stock?: number;
  central_stock?: number;
}

interface RequisitionTicket {
  id: number;
  requisition_code: string;
  supplier_id: number;
  supplier_name?: string;
  district_id: number;
  district_name?: string;
  division_name?: string;
  status: string; // PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED
  urgency: string; // LOW, NORMAL, CRITICAL
  supplier_remarks?: string;
  admin_remarks?: string;
  created_at: string;
  updated_at: string;
  items?: RequisitionOverviewItem[];
  total_requested_cases?: number;
  total_approved_cases?: number;
}

interface DistrictOption {
  id: number;
  name: string;
  division: string;
}

export const SuperadminRequisitionsHub: React.FC = () => {
  const { token } = useAuth();
  const [requisitions, setRequisitions] = useState<RequisitionTicket[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

  // Reconciliation Modal state
  const [activeReconciliation, setActiveReconciliation] = useState<RequisitionTicket | null>(null);
  const [approvedQuantities, setApprovedQuantities] = useState<Record<number, number>>({});
  const [adminRemarks, setAdminRemarks] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDistrictsAndTickets = async () => {
    setLoading(true);
    try {
      const [distRes, reqRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/districts'),
        fetch('http://localhost:8080/api/v1/admin/requisitions'),
      ]);

      if (distRes.ok) {
        const distData = await distRes.json();
        setDistricts(Array.isArray(distData) ? distData : []);
      }

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequisitions(Array.isArray(reqData) ? reqData : []);
      }
    } catch (err) {
      console.error('Error fetching admin requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistrictsAndTickets();
  }, []);

  const handleOpenReconciliation = async (ticket: RequisitionTicket) => {
    setFormError(null);
    setAdminRemarks(ticket.admin_remarks || '');

    try {
      const res = await fetch(`http://localhost:8080/api/v1/admin/requisitions/${ticket.id}/stock-overview`);
      if (res.ok) {
        const fullTicket: RequisitionTicket = await res.json();
        setActiveReconciliation(fullTicket);

        // Prepopulate approved quantities with requested quantities if stock available
        const initialApproved: Record<number, number> = {};
        fullTicket.items?.forEach((it) => {
          // If already approved/partially approved, use that, else requested
          initialApproved[it.id] = it.approved_quantity > 0 ? it.approved_quantity : it.requested_quantity;
        });
        setApprovedQuantities(initialApproved);
      } else {
        setActiveReconciliation(ticket);
      }
    } catch (err) {
      console.error('Error opening reconciliation:', err);
      setActiveReconciliation(ticket);
    }
  };

  const handleApproveAction = async (actionType: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT') => {
    if (!activeReconciliation) return;
    setFormError(null);

    if ((actionType === 'APPROVE_PARTIAL' || actionType === 'REJECT') && !adminRemarks.trim()) {
      setFormError(`Please provide administrative remarks when executing a ${actionType.toLowerCase().replace('_', ' ')} action.`);
      return;
    }

    setSubmittingAction(true);

    try {
      const itemsPayload = activeReconciliation.items?.map((it) => ({
        item_id: it.id,
        approved_quantity: actionType === 'APPROVE_FULL'
          ? it.requested_quantity
          : (actionType === 'REJECT' ? 0 : (approvedQuantities[it.id] ?? it.requested_quantity)),
      }));

      const payload = {
        action: actionType,
        admin_remarks: adminRemarks.trim(),
        items: itemsPayload,
      };

      const res = await fetch(`http://localhost:8080/api/v1/admin/requisitions/${activeReconciliation.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process requisition action');
      }

      setActionMsg(`Requisition ${activeReconciliation.requisition_code} successfully processed (${actionType})!`);
      setActiveReconciliation(null);
      fetchDistrictsAndTickets();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Error processing action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredTickets = requisitions.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch =
      r.requisition_code.toLowerCase().includes(term) ||
      (r.supplier_name || '').toLowerCase().includes(term) ||
      (r.district_name || '').toLowerCase().includes(term) ||
      (r.supplier_remarks || '').toLowerCase().includes(term);

    const matchesDistrict = districtFilter === 'ALL' || String(r.district_id) === String(districtFilter);
    const matchesStatus = statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesUrgency = urgencyFilter === 'ALL' || r.urgency.toUpperCase() === urgencyFilter.toUpperCase();

    return matchesSearch && matchesDistrict && matchesStatus && matchesUrgency;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5 animate-spin" />
            PENDING
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" />
            APPROVED
          </span>
        );
      case 'PARTIALLY_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-2.5 h-2.5" />
            PARTIALLY FULFILLED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-2.5 h-2.5" />
            DECLINED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
            {s}
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const u = (urgency || '').toUpperCase();
    if (u === 'CRITICAL') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
          CRITICAL STOCK-OUT
        </span>
      );
    }
    if (u === 'LOW') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
          LOW PRIORITY
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
        STANDARD
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMsg}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Pending Tickets
            </span>
            <span className="font-oswald text-2xl font-black text-amber-600">
              {requisitions.filter((r) => r.status === 'PENDING').length}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Awaiting Superadmin action</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Critical Requisitions
            </span>
            <span className="font-oswald text-2xl font-black text-rose-600">
              {requisitions.filter((r) => r.urgency === 'CRITICAL' && r.status === 'PENDING').length}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">High operational urgency</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Total Fulfillments
            </span>
            <span className="font-oswald text-2xl font-black text-emerald-600">
              {requisitions.filter((r) => r.status === 'APPROVED' || r.status === 'PARTIALLY_APPROVED').length}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Dispatched to regional depots</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Active Districts
            </span>
            <span className="font-oswald text-2xl font-black text-blue-600">
              {districts.length}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Across all 8 divisions</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by tracking code, supplier name, district..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* District Filter (All 64) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Districts ({districts.length})</option>
              {districts.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name} ({d.division})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-800 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIALLY_APPROVED">Partially Fulfilled</option>
            <option value="REJECTED">Declined</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-800 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Urgencies</option>
            <option value="CRITICAL">Critical Stock-Out</option>
            <option value="NORMAL">Standard Routine</option>
            <option value="LOW">Low Buffer</option>
          </select>

          <button
            onClick={fetchDistrictsAndTickets}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"
            title="Refresh Tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tickets Queue Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {loading && requisitions.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <span className="font-mono">Loading supplier requisitions queue...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-zinc-700">No stock requisition tickets match your criteria.</p>
            <p className="text-[11px] text-slate-400">
              New orders submitted by region-bound suppliers will appear here for allocation review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ticket Token</th>
                  <th className="py-3.5 px-4">Supplier & Depot</th>
                  <th className="py-3.5 px-4">Operating District</th>
                  <th className="py-3.5 px-4">Urgency</th>
                  <th className="py-3.5 px-4 text-center">Requested Items</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submission Time</th>
                  <th className="py-3.5 px-4 text-right">Reconciliation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs text-blue-700 block">
                        {t.requisition_code}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Queue #{t.id}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-zinc-900 block truncate max-w-[200px]">
                        {t.supplier_name || 'Central Beverage Logistics Hub'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Supplier #{t.supplier_id}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-900 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{t.district_name || 'Dhaka'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pl-5 font-mono">
                        {t.division_name || 'Dhaka'} Division
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getUrgencyBadge(t.urgency)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs text-zinc-900">
                        {t.items?.length || 0} lines
                      </span>
                      <span className="text-[10px] font-mono text-blue-600 block font-semibold">
                        {t.total_requested_cases || 0} total cases
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(t.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenReconciliation(t)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ml-auto transition-all cursor-pointer shadow-2xs ${
                          t.status === 'PENDING'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t.status === 'PENDING' ? 'Reconcile & Allocate' : 'View Audit'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dual-Column Reconciliation Modal */}
      {activeReconciliation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      SUPERADMIN RECONCILIATION
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {activeReconciliation.requisition_code}
                    </span>
                  </div>
                  <h3 className="font-oswald text-xl font-black text-zinc-900 uppercase">
                    Stock Requisition & Regional Allocation Check
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setActiveReconciliation(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Metadata Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Supplier Depot</span>
                <span className="font-bold text-zinc-900 truncate block mt-0.5">
                  {activeReconciliation.supplier_name || 'Central Beverage Depot'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Operating Region</span>
                <span className="font-bold text-blue-700 block mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {activeReconciliation.district_name || 'Dhaka'} ({activeReconciliation.division_name || 'Dhaka'})
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Urgency Level</span>
                <span className="mt-0.5 block">{getUrgencyBadge(activeReconciliation.urgency)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Queue Status</span>
                <span className="mt-0.5 block">{getStatusBadge(activeReconciliation.status)}</span>
              </div>
            </div>

            {/* Supplier Remarks Note if provided */}
            {activeReconciliation.supplier_remarks && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Supplier Logistics Remarks:</span>
                  <p className="text-amber-800 leading-snug mt-0.5">{activeReconciliation.supplier_remarks}</p>
                </div>
              </div>
            )}

            {/* Error prompt */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Dual Column Side-By-Side Reconciliation Grid */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-12 bg-slate-100 text-[11px] font-bold font-mono text-slate-600 uppercase border-b border-slate-200 py-2.5 px-4">
                <div className="col-span-4 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Product Line (Requested)</span>
                </div>
                <div className="col-span-2 text-center text-blue-700 font-extrabold">
                  Requested Qty
                </div>
                <div className="col-span-3 text-center text-emerald-700 font-extrabold flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Depot Stock ({activeReconciliation.district_name})</span>
                </div>
                <div className="col-span-3 text-right text-indigo-700 font-extrabold pr-2">
                  Approve / Allocate
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {activeReconciliation.items?.map((item) => {
                  const displayImg = item.image_url || getBrandImage(item.brand || 'Pepsi');
                  const currentApprove = approvedQuantities[item.id] ?? item.requested_quantity;
                  const isStockShortage = (item.regional_stock || 0) < item.requested_quantity;

                  return (
                    <div key={item.id} className="grid grid-cols-12 items-center p-3.5 text-xs hover:bg-slate-50/80 transition-colors">
                      {/* Left: Product Line */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 p-1 flex items-center justify-center shrink-0 border border-slate-200">
                          <img
                            src={displayImg}
                            alt={item.brand || 'Beverage'}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-900 block truncate font-oswald text-sm">
                            {item.brand} {item.flavor_variant}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            SKU: {item.sku || `FD-${item.product_id}`} • {item.size_volume}
                          </span>
                        </div>
                      </div>

                      {/* Requested Cases */}
                      <div className="col-span-2 text-center">
                        <span className="font-mono font-black text-sm text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                          {item.requested_quantity} cases
                        </span>
                      </div>

                      {/* Right Column: Stock Reality Check */}
                      <div className="col-span-3 text-center space-y-0.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold">
                          <span>{item.regional_stock ?? 0}</span>
                          <span className="text-[10px] opacity-70">cases available</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 block">
                          Central Hub: {item.central_stock ?? 150} cases
                        </span>
                        {isStockShortage && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Local depot shortage (Transfer triggers from Central)
                          </span>
                        )}
                      </div>

                      {/* Allocation Counter */}
                      <div className="col-span-3 flex items-center justify-end gap-1.5 pr-2">
                        {activeReconciliation.status === 'PENDING' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={currentApprove}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setApprovedQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: isNaN(val) ? 0 : Math.max(0, val),
                                }));
                              }}
                              className="w-20 px-2 py-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
                            />
                            <span className="text-[11px] font-mono text-slate-500 font-semibold">cases</span>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            {item.approved_quantity} cases approved
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Remarks Input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                Superadmin Allocation Remarks / Audit Justification
              </label>
              <textarea
                rows={2}
                disabled={activeReconciliation.status !== 'PENDING' || submittingAction}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Log physical inspection notes, transfer batch tokens, or reasons for quantity adjustments..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none disabled:opacity-60"
              />
            </div>

            {/* Action Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveReconciliation(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer w-full sm:w-auto"
              >
                Close Reconciliation
              </button>

              {activeReconciliation.status === 'PENDING' ? (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Reject Button */}
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleApproveAction('REJECT')}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Decline Requisition</span>
                  </button>

                  {/* Partial / Adjusted Button */}
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleApproveAction('APPROVE_PARTIAL')}
                    className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Approve Adjusted Quantity</span>
                  </button>

                  {/* Approve Full Button */}
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleApproveAction('APPROVE_FULL')}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Approve Full Requisition</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs font-mono font-semibold text-slate-400">
                  Ticket already processed: {activeReconciliation.status}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminRequisitionsHub;
