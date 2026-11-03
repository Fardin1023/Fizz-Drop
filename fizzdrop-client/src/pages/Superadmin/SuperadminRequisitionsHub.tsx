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
  Check,
  CreditCard,
  Printer,
  Sparkles,
  RotateCcw,
  DollarSign,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { broadcastRealtimeEvent } from '../../utils/broadcast';
import { InvoiceModal } from '../../components/Invoice/InvoiceModal';
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
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;
  invoice_number?: string;
  total_amount?: number;
  fulfilled_amount?: number;
  refund_amount?: number;
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
  const [allowStockOptions, setAllowStockOptions] = useState<Record<number, boolean>>({});
  const [adminRemarks, setAdminRemarks] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditingProcessed, setIsEditingProcessed] = useState<boolean>(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [pendingActionType, setPendingActionType] = useState<'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT' | null>(null);
  const [centralInventory, setCentralInventory] = useState<any[]>([]);
  const [showCentralPool, setShowCentralPool] = useState<boolean>(true);

  // Return claims review states
  const [activeHubTab, setActiveHubTab] = useState<'requisitions' | 'returns'>('requisitions');
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('ALL');
  const [selectedReturnForReview, setSelectedReturnForReview] = useState<any | null>(null);
  const [returnDecisionRemarks, setReturnDecisionRemarks] = useState<string>('');
  const [submittingReturnDecision, setSubmittingReturnDecision] = useState<boolean>(false);

  // Commercial Invoice Modal state
  const [invoiceTicket, setInvoiceTicket] = useState<any | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);

  const formatPaymentBadge = (method?: string, status?: string) => {
    const m = (method || 'BANK_TRANSFER').toUpperCase();
    const st = (status || 'PENDING').toUpperCase();

    const labelMap: Record<string, string> = {
      BANK_TRANSFER: 'Bank Wire / EFT',
      BKASH_MERCHANT: 'bKash B2B Merchant',
      NET_30_CREDIT: 'Net-30 Corporate',
      CASH_ON_DELIVERY: 'Cheque on Delivery',
    };

    const statusBadgeClass =
      st.includes('PAID') || st.includes('SETTLED')
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : st.includes('REFUND')
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : st === 'AUTHORIZED'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-amber-100 text-amber-800 border-amber-200';

    const displayStatus = st.includes('REFUND')
      ? 'SETTLED + REFUNDED'
      : st.replace(/_/g, ' ');

    return (
      <div className="space-y-1">
        <span className="font-semibold text-zinc-800 text-[11px] block truncate">
          {labelMap[m] || m}
        </span>
        <span
          className={`inline-block px-1.5 py-0.2 rounded font-mono font-bold text-[9px] border uppercase ${statusBadgeClass}`}
        >
          {displayStatus}
        </span>
      </div>
    );
  };

  const fetchDistrictsAndTickets = async () => {
    setLoading(true);
    try {
      const [distRes, reqRes, centralRes, returnsRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/districts'),
        fetch('http://localhost:8080/api/v1/admin/requisitions'),
        fetch('http://localhost:8080/api/v1/admin/central-inventory'),
        fetch('http://localhost:8080/api/v1/admin/returns'),
      ]);

      if (distRes.ok) {
        const distData = await distRes.json();
        setDistricts(Array.isArray(distData) ? distData : []);
      }

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequisitions(Array.isArray(reqData) ? reqData : []);
      }

      if (centralRes.ok) {
        const centralData = await centralRes.json();
        setCentralInventory(Array.isArray(centralData) ? centralData : []);
      }

      if (returnsRes && returnsRes.ok) {
        const returnsData = await returnsRes.json();
        setReturnRequests(Array.isArray(returnsData) ? returnsData : []);
      }
    } catch (err) {
      console.error('Error fetching admin requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const categoryStockSummary = React.useMemo(() => {
    const summary: Record<string, { totalCases: number; skuCount: number; fixedPerSku: number }> = {};
    centralInventory.forEach((item) => {
      const cat = item.category || 'General';
      if (!summary[cat]) {
        summary[cat] = { totalCases: 0, skuCount: 0, fixedPerSku: item.available_stock || 1000 };
      }
      summary[cat].totalCases += (item.available_stock || 0);
      summary[cat].skuCount += 1;
    });
    return summary;
  }, [centralInventory]);

  useEffect(() => {
    fetchDistrictsAndTickets();
  }, []);

  const handleOpenReconciliation = async (ticket: RequisitionTicket) => {
    setFormError(null);
    setAdminRemarks(ticket.admin_remarks || '');
    setIsEditingProcessed(false);
    setConfirmModalOpen(false);
    setPendingActionType(null);

    try {
      const res = await fetch(`http://localhost:8080/api/v1/admin/requisitions/${ticket.id}/stock-overview`);
      if (res.ok) {
        const fullTicket: RequisitionTicket = await res.json();
        setActiveReconciliation(fullTicket);

        // Prepopulate approved quantities & allow options
        const initialApproved: Record<number, number> = {};
        const initialAllow: Record<number, boolean> = {};

        fullTicket.items?.forEach((it) => {
          const isAllowed = fullTicket.status === 'REJECTED'
            ? false
            : (it.approved_quantity > 0 || fullTicket.status === 'PENDING');
          initialAllow[it.id] = isAllowed;
          initialApproved[it.id] = it.approved_quantity > 0 ? it.approved_quantity : it.requested_quantity;
        });

        setApprovedQuantities(initialApproved);
        setAllowStockOptions(initialAllow);
      } else {
        setActiveReconciliation(ticket);
      }
    } catch (err) {
      console.error('Error opening reconciliation:', err);
      setActiveReconciliation(ticket);
    }
  };

  const handleSetAllowAll = (allow: boolean) => {
    if (!activeReconciliation?.items) return;
    const newAllow: Record<number, boolean> = {};
    const newApproved: Record<number, number> = {};
    activeReconciliation.items.forEach((it) => {
      newAllow[it.id] = allow;
      newApproved[it.id] = allow ? it.requested_quantity : 0;
    });
    setAllowStockOptions(newAllow);
    setApprovedQuantities(newApproved);
  };

  const handleToggleItemAllow = (itemId: number, allow: boolean, requestedQty: number) => {
    setAllowStockOptions((prev) => ({ ...prev, [itemId]: allow }));
    if (!allow) {
      setApprovedQuantities((prev) => ({ ...prev, [itemId]: 0 }));
    } else {
      setApprovedQuantities((prev) => ({
        ...prev,
        [itemId]: prev[itemId] && prev[itemId] > 0 ? prev[itemId] : requestedQty,
      }));
    }
  };

  // Live financial & stock calculation for reconciliation
  const reconciliationSummary = React.useMemo(() => {
    if (!activeReconciliation?.items) {
      return { totalReqCases: 0, totalAppCases: 0, originalTotal: 0, fulfilledTotal: 0, refundAmount: 0, dueAmount: 0 };
    }
    let totalReqCases = 0;
    let totalAppCases = 0;
    let originalSubtotal = 0;
    let fulfilledSubtotal = 0;

    activeReconciliation.items.forEach((it) => {
      const isAllowed = allowStockOptions[it.id] ?? true;
      const appQty = isAllowed ? (approvedQuantities[it.id] ?? it.requested_quantity) : 0;
      const price = Number(it.supplier_price || it.base_price || 0);
      totalReqCases += (it.requested_quantity || 0);
      totalAppCases += appQty;
      originalSubtotal += (it.requested_quantity || 0) * price;
      fulfilledSubtotal += appQty * price;
    });

    const vatMultiplier = 1.05;
    const originalTotalWithVat = Number((originalSubtotal * vatMultiplier).toFixed(2));
    const recordedTotal = Number(activeReconciliation.total_amount || 0);

    // Billed original total: prioritize recorded authorized total
    const originalTotal = (recordedTotal > 0) ? recordedTotal : originalTotalWithVat;

    let fulfilledTotal = originalTotal;
    let refundAmount = 0;
    let dueAmount = 0;

    if (totalAppCases === totalReqCases) {
      // Exact full fulfillment: delivered amount matches authorized billed amount. No extra fee!
      fulfilledTotal = originalTotal;
      refundAmount = 0;
      dueAmount = 0;
    } else if (totalAppCases < totalReqCases) {
      // Shortfall / partial approval: calculate proportional delivery and leftover refund
      const fraction = totalReqCases > 0 ? (totalAppCases / totalReqCases) : 0;
      fulfilledTotal = Number((originalTotal * fraction).toFixed(2));
      refundAmount = Math.max(0, Number((originalTotal - fulfilledTotal).toFixed(2)));
      dueAmount = 0;
    } else {
      // Extra stock approved over requested: calculate extra balance due strictly for extra cases
      const extraCases = totalAppCases - totalReqCases;
      const unitRate = totalReqCases > 0 ? (originalTotal / totalReqCases) : (originalSubtotal * vatMultiplier / (totalReqCases || 1));
      dueAmount = Math.max(0, Number((extraCases * unitRate).toFixed(2)));
      fulfilledTotal = Number((originalTotal + dueAmount).toFixed(2));
      refundAmount = 0;
    }

    return { totalReqCases, totalAppCases, originalTotal, fulfilledTotal, refundAmount, dueAmount };
  }, [activeReconciliation, approvedQuantities, allowStockOptions]);

  const handlePromptConfirmation = (actionType: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT') => {
    setFormError(null);
    setPendingActionType(actionType);
    setConfirmModalOpen(true);
  };

  const handleApproveAction = async (actionType: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT') => {
    if (!activeReconciliation) return;
    setFormError(null);
    setSubmittingAction(true);

    try {
      const itemsPayload = activeReconciliation.items?.map((it) => {
        let appQty = 0;
        if (actionType === 'REJECT') {
          appQty = 0;
        } else {
          const isAllowed = allowStockOptions[it.id] ?? true;
          appQty = isAllowed
            ? (approvedQuantities[it.id] !== undefined ? approvedQuantities[it.id] : it.requested_quantity)
            : 0;
        }
        return {
          item_id: it.id,
          approved_quantity: appQty,
        };
      });

      const totalApprovedQty = itemsPayload?.reduce((acc, curr) => acc + curr.approved_quantity, 0) || 0;
      const totalReqQty = activeReconciliation.items?.reduce((acc, curr) => acc + curr.requested_quantity, 0) || 0;

      let effectiveAction = actionType;
      if (totalApprovedQty === 0) {
        effectiveAction = 'REJECT';
      } else if (totalApprovedQty < totalReqQty) {
        effectiveAction = 'APPROVE_PARTIAL';
      } else {
        effectiveAction = 'APPROVE_FULL';
      }

      const defaultRemarks = effectiveAction === 'APPROVE_PARTIAL'
        ? (adminRemarks.trim() || `Approved ${totalApprovedQty} of ${totalReqQty} cases requested. Leftover payment refund processed.`)
        : adminRemarks.trim();

      const payload = {
        action: effectiveAction,
        admin_remarks: defaultRemarks,
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

      const updated = await res.json();

      // Broadcast real-time update to Supplier Portal
      broadcastRealtimeEvent({
        type: 'REQUISITION_ACTION',
        recipientRole: 'SUPPLIER',
        recipientUserId: updated.supplier_id,
        title: `Requisition ${updated.status?.replace('_', ' ')}: ${updated.requisition_code}`,
        message: `Superadmin has reviewed ticket ${updated.requisition_code} (${updated.total_approved_cases || 0}/${updated.total_requested_cases || 0} cases permitted).`,
        referenceCode: updated.requisition_code,
        referenceId: updated.id,
        status: updated.status,
      });

      setActionMsg(`Requisition ${activeReconciliation.requisition_code} stock allowance options confirmed and committed successfully!`);
      setConfirmModalOpen(false);
      setPendingActionType(null);
      setActiveReconciliation(null);
      fetchDistrictsAndTickets();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Error processing action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleProcessReturnDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedReturnForReview) return;
    setSubmittingReturnDecision(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/admin/returns/${selectedReturnForReview.id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          decision,
          admin_remarks: returnDecisionRemarks.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to process return decision');
      }

      const updated = await res.json();
      setActionMsg(`Return Claim ${updated.return_code} has been successfully ${decision === 'APPROVE' ? 'APPROVED (Central stock restored & refund/replacement settled)' : 'REJECTED'}!`);
      setSelectedReturnForReview(null);
      setReturnDecisionRemarks('');
      fetchDistrictsAndTickets();
      setTimeout(() => setActionMsg(null), 4500);
    } catch (err: any) {
      alert(err.message || 'Error processing return decision');
    } finally {
      setSubmittingReturnDecision(false);
    }
  };

  const filteredReturnRequests = returnRequests.filter((ret) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      (ret.return_code && ret.return_code.toLowerCase().includes(s)) ||
      (ret.requisition_code && ret.requisition_code.toLowerCase().includes(s)) ||
      (ret.supplier_name && ret.supplier_name.toLowerCase().includes(s)) ||
      (ret.reason_details && ret.reason_details.toLowerCase().includes(s));
    const matchStatus = returnStatusFilter === 'ALL' || ret.status === returnStatusFilter;
    return matchSearch && matchStatus;
  });

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

      {/* Central Warehouse Fixed Category Stock Pool Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 shadow-xl border border-blue-800/50 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[9px] font-mono font-bold uppercase tracking-wider">
                CENTRAL INVENTORY ALLOCATION POOL
              </span>
              <span className="text-xs text-blue-200 font-mono">Role 4: Superadmin Reserve</span>
            </div>
            <h3 className="font-oswald text-base font-bold uppercase text-white mt-0.5">
              Fixed Category Stock For Supplier Dispatches
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowCentralPool((prev) => !prev)}
            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>{showCentralPool ? 'Collapse Category Reserves' : 'Expand Category Reserves'}</span>
          </button>
        </div>

        {showCentralPool && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(categoryStockSummary).map(([catName, data]) => (
              <div
                key={catName}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 block truncate font-bold">
                    {catName}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-oswald text-xl font-black text-white">
                      {data.totalCases.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-blue-200 font-sans">cases</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span>{data.skuCount} SKUs</span>
                  <span className="text-emerald-400 font-bold">{data.fixedPerSku}/SKU</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hub Navigation Tabs: Stock Requisitions vs Returns & Claims */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveHubTab('requisitions')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeHubTab === 'requisitions'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-cyan-400" />
          <span>Stock Requisitions Hub ({requisitions.length})</span>
          {requisitions.filter((r) => r.status === 'PENDING').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black animate-pulse">
              {requisitions.filter((r) => r.status === 'PENDING').length} PENDING
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveHubTab('returns')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeHubTab === 'returns'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Stock Returns & Exchange Claims ({returnRequests.length})</span>
          {returnRequests.filter((r) => r.status === 'PENDING_REVIEW').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-bounce">
              {returnRequests.filter((r) => r.status === 'PENDING_REVIEW').length} TO REVIEW
            </span>
          )}
        </button>
      </div>

      {activeHubTab === 'returns' ? (
        /* Returns & Exchange Claims Management View */
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search return claims by return code, requisition code, supplier, or reason..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={returnStatusFilter}
                onChange={(e) => setReturnStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Return Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved & Refunded</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <button
                type="button"
                onClick={fetchDistrictsAndTickets}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Refresh Return Claims"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
            {filteredReturnRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RotateCcw className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <div className="text-sm font-bold text-slate-600">No return requests found</div>
                <div className="text-xs text-slate-400">
                  Regional suppliers file returns when stock needs to be returned for cash refund or exchanged for alternative products.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-3 px-4">Claim Code</th>
                      <th className="py-3 px-4">Requisition</th>
                      <th className="py-3 px-4">Supplier & Depot</th>
                      <th className="py-3 px-4">Resolution Mode</th>
                      <th className="py-3 px-4 text-center">Returned Qty</th>
                      <th className="py-3 px-4 text-right">Refund / Credit Value</th>
                      <th className="py-3 px-4">Policy Reason Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReturnRequests.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                          {ret.return_code}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {ret.requisition_code}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-zinc-900 block">{ret.supplier_name || 'Regional Depot'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{ret.district_name || 'Dhaka Depot'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {ret.return_type === 'REFUND_CASH' ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" /> Direct Cash Refund
                            </span>
                          ) : (
                            <span className="font-bold text-purple-700 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" /> Exchange: {ret.replacement_product_name || 'Replacement'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-zinc-800">
                          {ret.returned_quantity} cases
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600">
                          ৳{Number(ret.refund_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block text-[11px]">
                            {ret.reason_category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-500 block max-w-xs truncate" title={ret.reason_details}>
                            {ret.reason_details}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {ret.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                            </span>
                          ) : ret.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReturnForReview(ret);
                              setReturnDecisionRemarks(ret.admin_remarks || '');
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                              ret.status === 'PENDING_REVIEW'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{ret.status === 'PENDING_REVIEW' ? 'Review & Settle' : 'Inspect'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
      <>
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
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Urgency</th>
                  <th className="py-3.5 px-4 text-center">Requested Items</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submission Time</th>
                  <th className="py-3.5 px-4 text-right">Actions & Invoice</th>
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
                      {formatPaymentBadge(t.payment_method, t.payment_status)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getUrgencyBadge(t.urgency)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs text-zinc-900 block">
                        {t.items?.length || 0} lines
                      </span>
                      {t.status === 'PENDING' ? (
                        <span className="text-[10px] font-mono text-blue-600 block font-semibold">
                          {t.total_requested_cases || 0} cases requested
                        </span>
                      ) : t.status === 'PARTIALLY_APPROVED' ? (
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-mono font-bold text-emerald-700 block bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Given: {t.total_approved_cases ?? 0} / {t.total_requested_cases || 0}
                          </span>
                          {t.refund_amount !== undefined && t.refund_amount > 0 && (
                            <span className="text-[9px] font-mono font-bold text-amber-700 block bg-amber-50 px-1 rounded border border-amber-200">
                              Refund: ৳{Number(t.refund_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                      ) : t.status === 'APPROVED' ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 block bg-emerald-50 px-1.5 py-0.5 rounded">
                          Given: {t.total_approved_cases ?? t.total_requested_cases} (Full)
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-rose-600 block bg-rose-50 px-1.5 py-0.5 rounded">
                          0 / {t.total_requested_cases || 0} (Rejected)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(t.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceTicket(t);
                            setIsInvoiceOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Print / Save Official B2B Commercial Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Invoice</span>
                        </button>

                        <button
                          onClick={() => handleOpenReconciliation(t)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            t.status === 'PENDING'
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.status === 'PENDING' ? 'Reconcile' : 'Audit'}</span>
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
      </>
      )}

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

            {/* Commercial & Payment Method Overview Ribbon */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 block">
                    Commercial Settlement & Invoicing
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-bold text-zinc-900">
                      Method: {activeReconciliation.payment_method?.replace(/_/g, ' ') || 'Bank Wire Transfer'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-600 text-[11px]">
                      Invoice #: {activeReconciliation.invoice_number || `INV-${new Date().getFullYear()}-${String(activeReconciliation.id).padStart(4, '0')}`}
                    </span>
                    {activeReconciliation.payment_reference && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-600 text-[11px]">
                          Ref: {activeReconciliation.payment_reference}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                    Initial Authorized Amount
                  </span>
                  <span className="font-mono font-black text-sm text-indigo-700">
                    ৳{reconciliationSummary.originalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceTicket(activeReconciliation);
                    setIsInvoiceOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="View / Download Commercial Tax Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Invoice (PDF)</span>
                </button>
              </div>
            </div>

            {/* Live Financial Allocation & Leftover Refund Return Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Supplier Requested</span>
                <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">
                  {reconciliationSummary.totalReqCases} cases
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Billed: ৳{reconciliationSummary.originalTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Superadmin Giving</span>
                <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">
                  {reconciliationSummary.totalAppCases} cases
                </span>
                <span className="text-[10px] text-emerald-600 font-mono">
                  Delivered: ৳{reconciliationSummary.fulfilledTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </span>
              </div>

              {reconciliationSummary.dueAmount > 0 ? (
                <div className="col-span-2 p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-900 font-mono flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Additional Stock Allocated (Pending Invoice Due)
                    </span>
                    <span className="font-mono font-black text-sm text-indigo-900">
                      +৳{reconciliationSummary.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-800 mt-0.5">
                    🚀 Superadmin is allocating {reconciliationSummary.totalAppCases - reconciliationSummary.totalReqCases} extra cases over the requested quantity. The supplier invoice will update with a balance due of ৳{reconciliationSummary.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} to complete payment.
                  </p>
                </div>
              ) : (
                <div className="col-span-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-800 font-mono">
                      Leftover Amount Returned / Refunded
                    </span>
                    <span className="font-mono font-black text-sm text-amber-800">
                      ৳{reconciliationSummary.refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    {reconciliationSummary.refundAmount > 0
                      ? `⚠️ Stock given is less than requested (${reconciliationSummary.totalReqCases - reconciliationSummary.totalAppCases} cases shortfall). Leftover ৳${reconciliationSummary.refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} will be automatically returned to the supplier.`
                      : '✓ Full requested quantity is fulfilled. No refund required.'}
                  </p>
                </div>
              )}
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
              <div className="grid grid-cols-12 bg-slate-100 text-[11px] font-bold font-mono text-slate-600 uppercase border-b border-slate-200 py-2.5 px-4 items-center">
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
                <div className="col-span-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-indigo-700 font-extrabold">Stock Options</span>
                    {(activeReconciliation.status === 'PENDING' || isEditingProcessed) && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetAllowAll(true)}
                          className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[9px] font-bold cursor-pointer"
                          title="Allow stock for all items"
                        >
                          Allow All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllowAll(false)}
                          className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 text-[9px] font-bold cursor-pointer"
                          title="Disallow stock for all items"
                        >
                          Disallow All
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {activeReconciliation.items?.map((item) => {
                  const displayImg = item.image_url || getBrandImage(item.brand || 'Pepsi');
                  const isAllowed = allowStockOptions[item.id] ?? true;
                  const currentApprove = isAllowed ? (approvedQuantities[item.id] ?? item.requested_quantity) : 0;
                  const isStockShortage = (item.regional_stock || 0) < item.requested_quantity;
                  const canEdit = activeReconciliation.status === 'PENDING' || isEditingProcessed;

                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-12 items-center p-3.5 text-xs transition-colors ${
                        !isAllowed ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
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
                            Local shortage (Transfer from Central)
                          </span>
                        )}
                      </div>

                      {/* Option to Allow Stock or Not & Quantity Allocation */}
                      <div className="col-span-3 flex flex-col items-end gap-1.5 pr-2">
                        {canEdit ? (
                          <>
                            {/* Allow / Disallow Option Selector */}
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleItemAllow(item.id, true, item.requested_quantity)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                                  isAllowed
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-emerald-700'
                                }`}
                              >
                                Allow
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleItemAllow(item.id, false, item.requested_quantity)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                                  !isAllowed
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-rose-700'
                                }`}
                              >
                                Do Not Allow
                              </button>
                            </div>

                            {/* Quantity Input if Allowed */}
                            {isAllowed ? (
                              <div className="flex items-center gap-1 mt-0.5">
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
                                  className="w-16 px-1.5 py-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
                                />
                                <span className="text-[10px] font-mono text-slate-500 font-semibold">cases</span>
                                {currentApprove !== item.requested_quantity && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApprovedQuantities((prev) => ({ ...prev, [item.id]: item.requested_quantity }));
                                    }}
                                    className="text-[9px] text-blue-600 hover:underline font-mono"
                                    title="Reset to requested quantity"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-100/60 border border-rose-200 px-2 py-0.5 rounded">
                                0 cases (Disallowed)
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="text-right">
                            {item.approved_quantity > 0 ? (
                              <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                                ✓ {item.approved_quantity} cases Allowed
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
                                ✕ Stock Not Allowed
                              </span>
                            )}
                          </div>
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
                disabled={activeReconciliation.status !== 'PENDING' && !isEditingProcessed}
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

              {activeReconciliation.status === 'PENDING' || isEditingProcessed ? (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Disallow All Button */}
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handlePromptConfirmation('REJECT')}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Disallow All Stock (Full Refund)</span>
                  </button>

                  {/* Primary Decision Button based on actual current quantities */}
                  {reconciliationSummary.totalAppCases < reconciliationSummary.totalReqCases ? (
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => handlePromptConfirmation('APPROVE_PARTIAL')}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Dispatch Stock</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => handlePromptConfirmation('APPROVE_FULL')}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Dispatch Stock</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    Decision Status: {getStatusBadge(activeReconciliation.status)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingProcessed(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Modify / Re-confirm Stock Options</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Allowing/Disallowing Stock */}
      {confirmModalOpen && pendingActionType && activeReconciliation && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  pendingActionType === 'REJECT'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}
              >
                {pendingActionType === 'REJECT' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                  CONFIRMATION REQUIRED
                </span>
                <h3 className="font-oswald text-lg font-bold text-zinc-900 uppercase">
                  Confirm Stock Allowance Decision
                </h3>
              </div>
            </div>

            {/* Decision Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-mono">Requisition Ticket:</span>
                <span className="font-mono font-bold text-blue-700">{activeReconciliation.requisition_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-mono">Target Depot / Region:</span>
                <span className="font-bold text-zinc-900">{activeReconciliation.district_name || 'Dhaka'} Depot</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-mono">Stock Allowance:</span>
                <span className="font-mono font-bold text-zinc-900">
                  {reconciliationSummary.totalAppCases} / {reconciliationSummary.totalReqCases} Cases Given
                </span>
              </div>
              {reconciliationSummary.dueAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-indigo-900 font-mono font-bold">Additional Balance Due from Supplier:</span>
                  <span className="font-mono font-black text-indigo-700">
                    +৳{reconciliationSummary.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-mono">Leftover Refund to Supplier:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ৳{reconciliationSummary.refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-mono">Action Type:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                    reconciliationSummary.dueAmount > 0
                      ? 'bg-purple-100 text-purple-800'
                      : reconciliationSummary.totalAppCases === reconciliationSummary.totalReqCases
                      ? 'bg-emerald-100 text-emerald-800'
                      : reconciliationSummary.totalAppCases === 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {reconciliationSummary.dueAmount > 0
                    ? 'EXTRA STOCK DISPATCH (BALANCE DUE)'
                    : reconciliationSummary.totalAppCases === reconciliationSummary.totalReqCases
                    ? 'ALLOW FULL STOCK'
                    : reconciliationSummary.totalAppCases === 0
                    ? 'DISALLOW ALL STOCK'
                    : 'PARTIAL STOCK + LEFTOVER REFUND'}
                </span>
              </div>
            </div>

            {/* Line Items Allowance Summary */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase font-mono text-slate-500">
                Products Summary & Allowance:
              </span>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 text-xs">
                {activeReconciliation.items?.map((it) => {
                  const isAllowed = pendingActionType === 'REJECT' ? false : (allowStockOptions[it.id] ?? true);
                  const approvedQty = isAllowed
                    ? (approvedQuantities[it.id] !== undefined ? approvedQuantities[it.id] : it.requested_quantity)
                    : 0;

                  return (
                    <div key={it.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-zinc-900 block font-oswald">
                          {it.brand} {it.flavor_variant}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Requested: {it.requested_quantity} cases
                        </span>
                      </div>
                      <div className="text-right">
                        {isAllowed && approvedQty > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Allow: {approvedQty} cases
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Stock Disallowed (0)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Remarks Note */}
            {adminRemarks && (
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900">
                <span className="font-bold block text-[10px] uppercase font-mono text-purple-700">Audit Remarks:</span>
                <p className="mt-0.5 text-purple-800">{adminRemarks}</p>
              </div>
            )}

            {/* Confirmation Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Back / Change Options
              </button>

              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleApproveAction(pendingActionType)}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                  pendingActionType === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                }`}
              >
                {submittingAction ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                <span>
                  {submittingAction
                    ? 'Committing Decision...'
                    : pendingActionType === 'REJECT'
                    ? 'Confirm & Disallow Stock'
                    : 'Dispatch Stock'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Return Claim Policy Review & Decision Modal */}
      {selectedReturnForReview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-600">
                    SUPERADMIN RETURN & POLICY AUDIT
                  </span>
                  <h3 className="font-oswald text-2xl font-black text-zinc-900">
                    Review Claim: {selectedReturnForReview.return_code}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedReturnForReview(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Claim Overview Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Requisition Ref</span>
                <span className="font-mono font-bold text-blue-600 mt-0.5 block">{selectedReturnForReview.requisition_code}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier</span>
                <span className="font-bold text-zinc-900 mt-0.5 block truncate">{selectedReturnForReview.supplier_name || 'Regional Supplier'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Resolution Mode</span>
                <span className="font-bold text-emerald-700 mt-0.5 block">
                  {selectedReturnForReview.return_type === 'REFUND_CASH' ? 'Cash Refund' : 'Product Replacement'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Refund / Credit</span>
                <span className="font-mono font-black text-emerald-600 mt-0.5 block">
                  ৳{Number(selectedReturnForReview.refund_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Supplier's Reason Section */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 uppercase text-[10px] tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Supplier's Stated Reason ({selectedReturnForReview.reason_category.replace(/_/g, ' ')})</span>
              </div>
              <div className="text-zinc-800 bg-white p-3 rounded-xl border border-amber-200/60 leading-relaxed font-sans">
                "{selectedReturnForReview.reason_details}"
              </div>
            </div>

            {/* If Replacement Requested */}
            {selectedReturnForReview.return_type === 'EXCHANGE_PRODUCT' && (
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-600 block">Replacement Product Requested</span>
                  <span className="font-bold text-sm text-purple-900">
                    {selectedReturnForReview.replacement_product_name || 'Replacement SKU'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-purple-600 block">Replacement Quantity</span>
                  <span className="font-black text-base text-purple-900 font-mono">
                    {selectedReturnForReview.replacement_quantity || selectedReturnForReview.returned_quantity} cases
                  </span>
                </div>
              </div>
            )}

            {/* Items Breakdown Table */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1.5">
                Returned Stock Verification Breakdown
              </label>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Product SKU</th>
                      <th className="py-2 px-3 text-center">Received</th>
                      <th className="py-2 px-3 text-center">Kept</th>
                      <th className="py-2 px-3 text-center text-amber-700">Returned</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedReturnForReview.items || []).map((it: any) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-medium text-zinc-900">
                          {it.brand} {it.flavor_variant} ({it.size_volume})
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">{it.received_quantity}</td>
                        <td className="py-2 px-3 text-center text-emerald-600 font-bold">{it.kept_quantity}</td>
                        <td className="py-2 px-3 text-center text-amber-600 font-bold">{it.returned_quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">৳{it.unit_price}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">৳{it.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Admin Policy Decision Remarks */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Superadmin Policy Decision Remarks (Audit Justification):
              </label>
              <textarea
                rows={2}
                value={returnDecisionRemarks}
                onChange={(e) => setReturnDecisionRemarks(e.target.value)}
                placeholder="e.g. 'Approved under wholesale return policy clause 3.1 - physical packaging damage verified.' or state rejection cause..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-xs resize-none"
              />
            </div>

            {/* Policy Decision Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Approval transfers stock back to Central Warehouse and credits supplier.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReturnForReview(null)}
                  disabled={submittingReturnDecision}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                {selectedReturnForReview.status === 'PENDING_REVIEW' && (
                  <>
                    <button
                      type="button"
                      disabled={submittingReturnDecision}
                      onClick={() => handleProcessReturnDecision('REJECT')}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Claim</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingReturnDecision}
                      onClick={() => handleProcessReturnDecision('APPROVE')}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {submittingReturnDecision ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Approve Return & Settle</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official B2B Commercial Tax Invoice Modal & Downloader */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        invoice={invoiceTicket}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};

export default SuperadminRequisitionsHub;
