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
  CreditCard,
  Printer,
  RotateCcw,
  Store,
  Boxes,
  TrendingUp,
  Receipt,
  Building,
} from 'lucide-react';
import { ReturnStockModal } from '../../components/Modals/ReturnStockModal';
import { useAuth } from '../../context/AuthContext';
import { InvoiceModal } from '../../components/Invoice/InvoiceModal';

export interface RequisitionItemRecord {
  id: number;
  product_id: number;
  requested_quantity: number;
  approved_quantity: number;
  brand?: string;
  flavor_variant?: string;
  category?: string;
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
  depot_address?: string;
  phone_number?: string;
  trade_license_number?: string;
  status: string; // PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED, DISPATCHED, COMPLETED
  urgency: string; // LOW, NORMAL, CRITICAL
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;
  invoice_number?: string;
  total_amount?: number;
  fulfilled_amount?: number;
  refund_amount?: number;
  due_amount?: number;
  supplier_remarks?: string;
  admin_remarks?: string;
  created_at: string;
  updated_at: string;
  items?: RequisitionItemRecord[];
  total_requested_cases?: number;
  total_approved_cases?: number;
}

export interface OutletDispatchRecord {
  id: number;
  requisition_code: string;
  outlet_id?: number;
  outlet_name?: string;
  branch_name?: string;
  area?: string;
  franchise_name?: string;
  product_id?: number;
  product_name?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  urgency?: string;
  is_so_purchase?: boolean;
  sales_officer_name?: string;
  sales_officer_code?: string;
  outlet_remarks?: string;
  created_date?: string;
  updated_date?: string;
}

interface SupplierRequisitionHistoryProps {
  onNewRequisitionClick?: () => void;
}

export const SupplierRequisitionHistory: React.FC<SupplierRequisitionHistoryProps> = ({
  onNewRequisitionClick,
}) => {
  const { token, user } = useAuth();
  const [activeSection, setActiveSection] = useState<'dispatches' | 'superadmin'>('dispatches');
  const [requisitions, setRequisitions] = useState<RequisitionRecord[]>([]);
  const [outletDispatches, setOutletDispatches] = useState<OutletDispatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal details state
  const [selectedTicket, setSelectedTicket] = useState<RequisitionRecord | null>(null);
  const [invoiceTicket, setInvoiceTicket] = useState<RequisitionRecord | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [returnTicket, setReturnTicket] = useState<RequisitionRecord | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<OutletDispatchRecord | null>(null);

  const fetchRequisitions = async () => {
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
    }
  };

  const fetchOutletDispatches = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/inventory/supplier/outlet-requisitions?userId=${user?.user_id || 4}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setOutletDispatches(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching outlet dispatches:', err);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchRequisitions(), fetchOutletDispatches()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
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

  const formatPaymentBadge = (method?: string, status?: string, dueAmount?: number) => {
    const m = (method || 'BANK').toUpperCase();
    let name = 'Bank Wire';
    if (m.includes('BKASH')) name = 'bKash B2B';
    else if (m.includes('NET_30')) name = 'Net-30';
    else if (m.includes('CHEQUE')) name = 'Cheque';

    const st = (status || 'Authorized').toUpperCase();
    const isRefunded = st.includes('REFUND');
    const isDue = st.includes('DUE') || (dueAmount !== undefined && dueAmount > 0);

    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
          <CreditCard className="w-2.5 h-2.5 text-indigo-600" />
          {name}
        </span>
        {isDue ? (
          <span className="block text-[9px] font-mono font-bold text-rose-600 animate-pulse">
            Payment Due: ৳{Number(dueAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        ) : (
          <span className={`block text-[9px] font-mono font-bold ${isRefunded ? 'text-amber-600' : 'text-slate-400'}`}>
            {isRefunded ? 'Settled + Refunded' : (status || 'Authorized')}
          </span>
        )}
      </div>
    );
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

  const filteredDispatches = outletDispatches.filter((od) => {
    const term = search.toLowerCase();
    const matchesSearch =
      od.requisition_code.toLowerCase().includes(term) ||
      (od.outlet_name || '').toLowerCase().includes(term) ||
      (od.branch_name || '').toLowerCase().includes(term) ||
      (od.area || '').toLowerCase().includes(term) ||
      (od.product_name || '').toLowerCase().includes(term) ||
      (od.sales_officer_name || '').toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DISPATCHED' && (od.status === 'DISPATCHED' || od.status === 'COMPLETED')) ||
      (statusFilter === 'PENDING' && od.status === 'PENDING') ||
      od.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('dispatches')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs ${
              activeSection === 'dispatches'
                ? 'bg-teal-600 text-white shadow-teal-600/25 ring-2 ring-teal-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Outlet & SO Order Dispatches</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === 'dispatches' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {outletDispatches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('superadmin')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs ${
              activeSection === 'superadmin'
                ? 'bg-blue-600 text-white shadow-blue-600/25 ring-2 ring-blue-500/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Superadmin Depot Requisitions</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === 'superadmin' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {requisitions.length}
            </span>
          </button>
        </div>

        <button
          onClick={refreshAll}
          className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          title="Refresh All Transactions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Control & Toolbar */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeSection === 'dispatches'
                ? 'Search by order code, outlet, SO, or product...'
                : 'Search by ticket ID, district, or remarks...'
            }
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-800 font-medium focus:outline-none cursor-pointer"
          >
            {activeSection === 'dispatches' ? (
              <>
                <option value="ALL">All Dispatches ({outletDispatches.length})</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="PENDING">Pending Delivery</option>
              </>
            ) : (
              <>
                <option value="ALL">All Statuses ({requisitions.length})</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PARTIALLY_APPROVED">Partially Fulfilled</option>
                <option value="REJECTED">Declined</option>
              </>
            )}
          </select>

          {activeSection === 'superadmin' && onNewRequisitionClick && (
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

      {/* Main Table: Either Outlet & SO Dispatches or Superadmin Depot Requisitions */}
      {activeSection === 'dispatches' ? (
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
          {loading && outletDispatches.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto" />
              <span className="font-mono">Loading order dispatch transactions...</span>
            </div>
          ) : filteredDispatches.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <Store className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-zinc-700">No order dispatch records found.</p>
              <p className="text-[11px] text-slate-400">
                Dispatched outlet restock orders and SO territory stock purchases will be recorded here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Order Code</th>
                    <th className="py-3.5 px-4">Order Channel / Type</th>
                    <th className="py-3.5 px-4">Destination Outlet / Territory</th>
                    <th className="py-3.5 px-4">Sales Officer</th>
                    <th className="py-3.5 px-4">Product SKU</th>
                    <th className="py-3.5 px-4 text-center">Cases Dispatched</th>
                    <th className="py-3.5 px-4 text-right">Wholesale Rate</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Dispatched At</th>
                    <th className="py-3.5 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDispatches.map((od) => {
                    const isDispatched = od.status === 'DISPATCHED' || od.status === 'COMPLETED' || od.status === 'DELIVERED';
                    return (
                      <tr key={od.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-xs text-teal-700 block">
                            {od.requisition_code}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID #{od.id}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {od.is_so_purchase ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Boxes className="w-2.5 h-2.5 text-indigo-600" />
                              SO BUFFER PURCHASE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-50 text-teal-700 border border-teal-200">
                              <Store className="w-2.5 h-2.5 text-teal-600" />
                              OUTLET DEMAND
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {od.outlet_name || (od.is_so_purchase ? 'Territory Buffer Storage' : 'Retail Outlet')}
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {od.branch_name ? `${od.branch_name} • ` : ''}{od.area || 'Regional Zone'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {od.sales_officer_name || 'Assigned Officer'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {od.sales_officer_code || 'SO'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">
                            {od.product_name || 'Beverage Case'}
                          </span>
                          {od.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mt-0.5">
                              {od.category}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-black text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            {od.quantity} cases
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                          ৳{Number(od.unit_price || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          ৳{Number(od.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4">
                          {isDispatched ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              DISPATCHED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-2.5 h-2.5 animate-spin" />
                              PENDING
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {od.updated_date
                            ? `${new Date(od.updated_date).toLocaleDateString()} ${new Date(od.updated_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : od.created_date
                            ? `${new Date(od.created_date).toLocaleDateString()} ${new Date(od.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedDispatch(od)}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ml-auto"
                            title="View Dispatch Slip"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Superadmin Depot Requisitions Table */
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
                Submit your first regional stock order using the "Request Stock" tab.
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
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Submitted Date</th>
                    <th className="py-3.5 px-4 text-right">Actions & Invoice</th>
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
                        {req.invoice_number || `INV-${req.requisition_code.replace('REQ-', '')}`}
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
                      <span className="font-mono font-bold text-xs text-zinc-900 block">
                        {req.items?.length || 0} lines
                      </span>
                      {req.items && req.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center my-1">
                          {Array.from(new Set(req.items.map((i) => i.category).filter(Boolean))).map((cat, cIdx) => (
                            <span
                              key={cIdx}
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                      {req.due_amount !== undefined && req.due_amount > 0 ? (
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-mono font-bold text-indigo-700 block bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Given: {req.total_approved_cases ?? 0} ({(req.total_approved_cases || 0) > (req.total_requested_cases || 0) ? `+${(req.total_approved_cases || 0) - (req.total_requested_cases || 0)} extra` : 'Partial'})
                          </span>
                          <span className="text-[9px] font-mono font-bold text-rose-600 block bg-rose-50 px-1 rounded border border-rose-200 animate-pulse">
                            ⚠️ Due: ৳{Number(req.due_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      ) : req.status === 'PENDING' ? (
                        <span className="text-[10px] font-mono text-blue-600 block font-semibold">
                          {req.total_requested_cases || 0} cases requested
                        </span>
                      ) : req.status === 'PARTIALLY_APPROVED' ? (
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-mono font-bold text-emerald-700 block bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Given: {req.total_approved_cases ?? 0} / {req.total_requested_cases || 0}
                          </span>
                          {req.refund_amount !== undefined && req.refund_amount > 0 && (
                            <span className="text-[9px] font-mono font-bold text-amber-700 block bg-amber-50 px-1 rounded border border-amber-200">
                              ✓ ৳{Number(req.refund_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })} Refunded
                            </span>
                          )}
                        </div>
                      ) : req.status === 'APPROVED' ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 block bg-emerald-50 px-1.5 py-0.5 rounded">
                          Given: {req.total_approved_cases ?? req.total_requested_cases} (Full)
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-rose-600 block bg-rose-50 px-1.5 py-0.5 rounded">
                          0 cases (Refunded)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {formatPaymentBadge(req.payment_method, req.payment_status, req.due_amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(req.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.due_amount !== undefined && req.due_amount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceTicket(req);
                              setIsInvoiceOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs animate-bounce"
                            title="Complete Remaining Payment for Additional Stock"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Remaining</span>
                          </button>
                        )}

                        {(req.status === 'APPROVED' || req.status === 'PARTIALLY_APPROVED') && (
                          <button
                            type="button"
                            onClick={() => setReturnTicket(req)}
                            className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            title="File Stock Return or Replacement Claim"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Return / Exchange</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceTicket(req);
                            setIsInvoiceOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title="Download Official Tax Invoice (PDF / Print)"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Invoice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTicket(req)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="View Requisition Scope & Notes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

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

            {/* Commercial & Payment Details */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-blue-50/40 border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment & Commercial Settlement
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-600">
                  Invoice Ref: <span className="text-zinc-900">{selectedTicket.invoice_number || `INV-${new Date().getFullYear()}-${String(selectedTicket.id).padStart(4, '0')}`}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Method</span>
                  <div className="mt-0.5">
                    {formatPaymentBadge(selectedTicket.payment_method, selectedTicket.payment_status)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Initial Authorized</span>
                  <span className="font-mono font-bold text-zinc-800 mt-0.5 block">
                    ৳{selectedTicket.total_amount ? Number(selectedTicket.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Stock Delivered</span>
                  <span className="font-mono font-bold text-emerald-700 mt-0.5 block">
                    ৳{selectedTicket.fulfilled_amount ? Number(selectedTicket.fulfilled_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : (selectedTicket.total_amount ? Number(selectedTicket.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Leftover Refund Returned</span>
                  <span className="font-mono font-black text-amber-800 mt-0.5 block">
                    {selectedTicket.refund_amount !== undefined && selectedTicket.refund_amount > 0
                      ? `৳${Number(selectedTicket.refund_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ✓`
                      : '৳0.00 (Fully Settled)'}
                  </span>
                </div>
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
                    {selectedTicket.items?.map((item, idx) => {
                      const isPending = selectedTicket.status === 'PENDING';
                      const isAllowed = item.approved_quantity > 0;
                      return (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 block font-oswald text-xs">
                                {item.brand ? `${item.brand} ${item.flavor_variant || ''}` : `Product #${item.product_id}`}
                              </span>
                              {item.category && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {item.category}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku || `FD-${item.product_id}`} • {item.packaging || 'Case'} ({item.size_volume || '500ml'})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-900">
                            {item.requested_quantity} cases
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {isPending ? (
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                                Pending Review
                              </span>
                            ) : isAllowed && item.approved_quantity < item.requested_quantity ? (
                              <div className="space-y-0.5">
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 block">
                                  ✓ {item.approved_quantity} cases Allowed
                                </span>
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[9px] border border-amber-200 block">
                                  {item.requested_quantity - item.approved_quantity} shortfall (Refunded)
                                </span>
                              </div>
                            ) : isAllowed ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                                ✓ {item.approved_quantity} cases Allowed
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                                ✕ Not Allowed (0)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
              {(selectedTicket.status === 'APPROVED' || selectedTicket.status === 'PARTIALLY_APPROVED') && (
                <button
                  type="button"
                  onClick={() => {
                    const t = selectedTicket;
                    setSelectedTicket(null);
                    setReturnTicket(t);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Return Stock / Request Exchange</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setInvoiceTicket(selectedTicket);
                  setIsInvoiceOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>Download Official Tax Invoice (PDF / Print)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Ticket Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Return / Exchange Modal */}
      <ReturnStockModal
        isOpen={!!returnTicket}
        requisition={returnTicket}
        onClose={() => setReturnTicket(null)}
        onSuccess={fetchRequisitions}
      />

      {/* Official B2B Commercial Tax Invoice Modal & Downloader */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        invoice={invoiceTicket}
        onClose={() => setIsInvoiceOpen(false)}
        onPaymentSettled={fetchRequisitions}
      />

      {/* Outlet & SO Order Dispatch Receipt Modal */}
      {selectedDispatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-teal-600">
                  DISPATCH ORDER TRANSACTION RECORD
                </span>
                <h3 className="font-oswald text-xl font-black text-zinc-900">
                  {selectedDispatch.requisition_code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDispatch(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Transaction Type</span>
                <span className="font-bold text-teal-700 mt-0.5 block">
                  {selectedDispatch.is_so_purchase ? 'Sales Officer Buffer Stock' : 'Retail Outlet Restock'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Status</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedDispatch.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination Outlet</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedDispatch.outlet_name || 'Territory Buffer Storage'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedDispatch.branch_name ? `${selectedDispatch.branch_name} • ` : ''}{selectedDispatch.area}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sales Officer</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedDispatch.sales_officer_name || 'Assigned Officer'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedDispatch.sales_officer_code}
                </span>
              </div>
            </div>

            {/* Product & Financial Ledger */}
            <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Product SKU:</span>
                <strong className="text-slate-900">{selectedDispatch.product_name}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Cases Dispatched:</span>
                <span className="font-mono font-black text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded">
                  {selectedDispatch.quantity} cases
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Wholesale Unit Price:</span>
                <span className="font-mono font-medium">৳{Number(selectedDispatch.unit_price || 0).toFixed(2)} / case</span>
              </div>
              <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
                    Total Wholesale Invoice
                  </span>
                  <span className="text-[10px] text-slate-500">Credited to Regional Supplier Balance</span>
                </div>
                <strong className="text-xl font-black text-teal-800 font-mono">
                  ৳{Number(selectedDispatch.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {selectedDispatch.outlet_remarks && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Order Remarks</span>
                {selectedDispatch.outlet_remarks}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Print Dispatch Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDispatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierRequisitionHistory;
