import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RefreshCw,
  Search,
  Eye,
  X,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface RequisitionItemRecord {
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
}

export interface RequisitionRecord {
  id: number;
  requisition_code: string;
  supplier_id: number;
  supplier_name?: string;
  district_id: number;
  district_name?: string;
  division_name?: string;
  status: string; // PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED, DISPATCHED, COMPLETED
  urgency: string; // LOW, NORMAL, CRITICAL
  supplier_remarks?: string;
  admin_remarks?: string;
  created_at: string;
  updated_at: string;
  items?: RequisitionItemRecord[];
  total_requested_cases?: number;
  total_approved_cases?: number;
}

interface SupplierRequisitionHistoryProps {
  onNewRequisitionClick?: () => void;
}

export const SupplierRequisitionHistory: React.FC<SupplierRequisitionHistoryProps> = ({
  onNewRequisitionClick,
}) => {
  const { token, user } = useAuth();
  const [requisitions, setRequisitions] = useState<RequisitionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal details state
  const [selectedTicket, setSelectedTicket] = useState<RequisitionRecord | null>(null);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/supplier/requisitions?userId=${user?.user_id || 4}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRequisitions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5 animate-spin" />
            PENDING REVIEW
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
            REJECTED
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
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
          CRITICAL
        </span>
      );
    }
    if (u === 'LOW') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
          LOW
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
        STANDARD
      </span>
    );
  };

  const filtered = requisitions.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch =
      r.requisition_code.toLowerCase().includes(term) ||
      (r.district_name || '').toLowerCase().includes(term) ||
      (r.supplier_remarks || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Control & Toolbar */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket ID, district, or remarks..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-800 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses ({requisitions.length})</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIALLY_APPROVED">Partially Fulfilled</option>
            <option value="REJECTED">Declined</option>
          </select>

          <button
            onClick={fetchRequisitions}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"
            title="Refresh Requisitions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {onNewRequisitionClick && (
            <button
              onClick={onNewRequisitionClick}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Create New Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {loading && requisitions.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <span className="font-mono">Loading regional requisition tickets...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-zinc-700">No stock requisitions found.</p>
            <p className="text-[11px] text-slate-400">
              Submit your first regional stock order using the "Request Products" tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Tracking Code</th>
                  <th className="py-3.5 px-4">Target Region</th>
                  <th className="py-3.5 px-4">Urgency</th>
                  <th className="py-3.5 px-4 text-center">SKUs & Cases</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs text-blue-700 block">
                        {req.requisition_code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: #{req.id}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-900 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{req.district_name || 'Dhaka'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pl-5 font-mono">
                        {req.division_name || 'Dhaka'} Division
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getUrgencyBadge(req.urgency)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs text-zinc-900">
                        {req.items?.length || 0} lines
                      </span>
                      <span className="text-[10px] font-mono text-blue-600 block font-semibold">
                        {req.total_requested_cases || 0} cases
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(req.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTicket(req)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1 ml-auto transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-600">
                  REQUISITION DETAILS
                </span>
                <h3 className="font-oswald text-xl font-black text-zinc-900">
                  {selectedTicket.requisition_code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <span className="mt-0.5 block">{getStatusBadge(selectedTicket.status)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target District</span>
                <span className="font-bold text-zinc-900 mt-0.5 block">{selectedTicket.district_name || 'Dhaka'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Urgency</span>
                <span className="mt-0.5 block">{getUrgencyBadge(selectedTicket.urgency)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted</span>
                <span className="font-mono text-zinc-700 mt-0.5 block">{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Remarks Section */}
            {(selectedTicket.supplier_remarks || selectedTicket.admin_remarks) && (
              <div className="space-y-2 text-xs">
                {selectedTicket.supplier_remarks && (
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                    <span className="font-bold text-blue-900 block mb-0.5">Supplier Order Remarks:</span>
                    <p className="text-blue-800">{selectedTicket.supplier_remarks}</p>
                  </div>
                )}
                {selectedTicket.admin_remarks && (
                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                    <span className="font-bold text-purple-900 block mb-0.5">Superadmin Review & Dispatch Notes:</span>
                    <p className="text-purple-800">{selectedTicket.admin_remarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-zinc-700">Requested Product Lines</h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-mono text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Product Item</th>
                      <th className="py-2 px-3 text-center">Requested Qty</th>
                      <th className="py-2 px-3 text-center">Approved Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTicket.items?.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-zinc-900 block">
                            Product #{item.product_id}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-900">
                          {item.requested_quantity} cases
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                          {item.approved_quantity} cases
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Ticket Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierRequisitionHistory;
