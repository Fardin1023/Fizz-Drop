import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import type { RequisitionRecord } from '../../pages/Admin/SupplierRequisitionHistory';
import { useAuth } from '../../context/AuthContext';

interface ReturnStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: RequisitionRecord | null;
  onSuccess?: () => void;
}

interface ProductOption {
  id?: number;
  product_id?: number;
  brand: string;
  flavorVariant?: string;
  flavor_variant?: string;
  packaging?: string;
  sizeVolume?: string;
  size_volume?: string;
  basePrice?: number;
  base_price?: number;
}

const REASON_CATEGORIES = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit / Broken Bottles or Packaging' },
  { value: 'DEFECTIVE_SEAL', label: 'Defective Seal / Depressurized Carbonation' },
  { value: 'WRONG_VARIANT', label: 'Wrong Variant / Mismatched SKU Delivered' },
  { value: 'NEAR_EXPIRY', label: 'Near Expiry Date / Batch Condition Issue' },
  { value: 'EXCESS_STOCK', label: 'Excess Stock / Reduced Regional Depot Demand' },
  { value: 'OTHER', label: 'Other Valid Commercial Reason (Detailed in Explanation)' },
];

export const ReturnStockModal: React.FC<ReturnStockModalProps> = ({
  isOpen,
  onClose,
  requisition,
  onSuccess,
}) => {
  const { token, user } = useAuth();

  const [returnType, setReturnType] = useState<'REFUND_CASH' | 'EXCHANGE_PRODUCT'>('REFUND_CASH');
  const [reasonCategory, setReasonCategory] = useState<string>('DAMAGED_IN_TRANSIT');
  const [reasonDetails, setReasonDetails] = useState<string>('');

  // Item quantities: mapping productId -> { kept: number, returned: number }
  const [itemQuantities, setItemQuantities] = useState<Record<number, { kept: number; returned: number }>>({});

  // Product exchange states
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [replacementProductId, setReplacementProductId] = useState<number | undefined>(undefined);
  const [replacementQuantity, setReplacementQuantity] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize item quantities when requisition opens
  useEffect(() => {
    if (requisition && requisition.items) {
      const initial: Record<number, { kept: number; returned: number }> = {};
      requisition.items.forEach((item) => {
        const approved = item.approved_quantity !== undefined && item.approved_quantity !== null
          ? item.approved_quantity
          : item.requested_quantity || 0;
        // Default: keep all approved, return 0
        initial[item.product_id] = {
          kept: approved,
          returned: 0,
        };
      });
      setItemQuantities(initial);
      setErrorMsg(null);
      setReasonDetails('');
      setReturnType('REFUND_CASH');
    }
  }, [requisition]);

  // Fetch products for replacement options
  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:8080/api/products')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableProducts(data);
            if (data.length > 0 && !replacementProductId) {
              setReplacementProductId(data[0].id);
            }
          }
        })
        .catch((err) => console.error('Error fetching products for replacement:', err));
    }
  }, [isOpen]);

  if (!isOpen || !requisition) return null;

  const items = requisition.items || [];

  // Update item quantities safely
  const handleReturnedChange = (productId: number, maxQty: number, val: number) => {
    const returned = Math.max(0, Math.min(maxQty, Math.floor(val || 0)));
    const kept = maxQty - returned;
    setItemQuantities((prev) => ({
      ...prev,
      [productId]: { kept, returned },
    }));
  };

  const handleKeptChange = (productId: number, maxQty: number, val: number) => {
    const kept = Math.max(0, Math.min(maxQty, Math.floor(val || 0)));
    const returned = maxQty - kept;
    setItemQuantities((prev) => ({
      ...prev,
      [productId]: { kept, returned },
    }));
  };

  // Calculations
  let totalDeliveredCases = 0;
  let totalKeptCases = 0;
  let totalReturnedCases = 0;
  let subtotalRefund = 0;

  items.forEach((item) => {
    const approved = item.approved_quantity !== undefined && item.approved_quantity !== null
      ? item.approved_quantity
      : item.requested_quantity || 0;
    const price = item.base_price || 48.0;
    const q = itemQuantities[item.product_id] || { kept: approved, returned: 0 };

    totalDeliveredCases += approved;
    totalKeptCases += q.kept;
    totalReturnedCases += q.returned;
    subtotalRefund += q.returned * price;
  });

  const totalRefundWithVat = Math.round(subtotalRefund * 1.05 * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (totalReturnedCases <= 0) {
      setErrorMsg('Please specify at least 1 case to return.');
      return;
    }

    if (!reasonDetails.trim()) {
      setErrorMsg('Detailed reason for return is mandatory under wholesale return policy.');
      return;
    }

    if (returnType === 'EXCHANGE_PRODUCT' && !replacementProductId) {
      setErrorMsg('Please select a replacement product.');
      return;
    }

    setSubmitting(true);

    const payload = {
      requisition_id: requisition.id,
      return_type: returnType,
      reason_category: reasonCategory,
      reason_details: reasonDetails.trim(),
      replacement_product_id: returnType === 'EXCHANGE_PRODUCT' ? replacementProductId : null,
      replacement_quantity: returnType === 'EXCHANGE_PRODUCT' ? (replacementQuantity || totalReturnedCases) : null,
      items: items.map((item) => {
        const q = itemQuantities[item.product_id] || { kept: item.approved_quantity, returned: 0 };
        return {
          product_id: item.product_id,
          kept_quantity: q.kept,
          returned_quantity: q.returned,
        };
      }),
    };

    try {
      const res = await fetch(
        `http://localhost:8080/api/v1/supplier/returns?userId=${user?.user_id || 4}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit return request.');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while submitting your return.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-600">
                WHOLESALE STOCK RETURN & REFUND POLICY
              </span>
              <h3 className="font-oswald text-2xl font-black text-zinc-900">
                Return Stock for {requisition.requisition_code}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Policy Info Card */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Standard Return Policy:</strong> You may keep any portion of your dispatched inventory and return the rest. Specify the exact cause of return. Once Superadmin approves your return claim, stock is transferred back to central inventory and your refund or product exchange will be finalized.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Return Mode Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide block mb-2">
              Choose Resolution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReturnType('REFUND_CASH')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  returnType === 'REFUND_CASH'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${returnType === 'REFUND_CASH' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Direct Monetary Refund</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Superadmin refunds the purchase amount (incl. VAT) back to your account.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReturnType('EXCHANGE_PRODUCT')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  returnType === 'EXCHANGE_PRODUCT'
                    ? 'border-blue-500 bg-blue-50/60 text-blue-950 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${returnType === 'EXCHANGE_PRODUCT' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Product Replacement / Exchange</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Keep partial stock and request other products of equal or modified quantity.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Items Table: Kept vs Returned */}
          <div>
            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide block mb-2">
              Delivered Stock Split (Specify Kept vs Returned Units)
            </label>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5 px-3">Product Item</th>
                    <th className="py-2.5 px-3 text-center">Approved (Delivered)</th>
                    <th className="py-2.5 px-3 text-center w-28">Keep Cases</th>
                    <th className="py-2.5 px-3 text-center w-28">Return Cases</th>
                    <th className="py-2.5 px-3 text-right">Refund Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const approved = item.approved_quantity !== undefined && item.approved_quantity !== null
                      ? item.approved_quantity
                      : item.requested_quantity || 0;
                    const q = itemQuantities[item.product_id] || { kept: approved, returned: 0 };
                    const price = item.base_price || 48.0;
                    const lineRefund = q.returned * price * 1.05;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-zinc-900">{item.brand}</div>
                          <div className="text-[11px] text-slate-500">{item.flavor_variant} • {item.size_volume}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {approved} cases
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={approved}
                            value={q.kept}
                            onChange={(e) => handleKeptChange(item.product_id, approved, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={approved}
                            value={q.returned}
                            onChange={(e) => handleReturnedChange(item.product_id, approved, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center font-bold text-amber-600 rounded-lg border border-amber-300 bg-amber-50/40 focus:ring-2 focus:ring-amber-500 text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          ৳{lineRefund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Replacement Product Selection (If Exchange) */}
          {returnType === 'EXCHANGE_PRODUCT' && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wide">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Replacement Product Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Select Replacement Product:
                  </label>
                  <select
                    value={replacementProductId || ''}
                    onChange={(e) => setReplacementProductId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-medium text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableProducts.map((p) => {
                      const pid = p.product_id || p.id || 0;
                      const flavor = p.flavor_variant || p.flavorVariant || '';
                      const size = p.size_volume || p.sizeVolume || '';
                      const price = p.base_price || p.basePrice || 48;
                      return (
                        <option key={pid} value={pid}>
                          {p.brand} - {flavor} ({size}) - ৳{price}/case
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Replacement Quantity (Cases):
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={`e.g. ${totalReturnedCases || 10}`}
                    value={replacementQuantity || totalReturnedCases || ''}
                    onChange={(e) => setReplacementQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Mandatory Reason & Policy Compliance */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Mandatory Return Reason & Cause Description</span>
            </label>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Reason Category:
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500"
              >
                {REASON_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Detailed Explanation & Inspection Remarks (Superadmin will review this):
              </label>
              <textarea
                rows={3}
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder="Detail why these cases are being returned (e.g., '10 cases received with cracked bottles during transport, seal ruptured; requesting credit refund' or 'exchanging 20 excess cases for Mountain Dew')..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs resize-none"
              />
            </div>
          </div>

          {/* 5. Financial Summary Strip */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">
                Claim Overview
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Delivered: <strong className="text-white">{totalDeliveredCases}</strong> cases • Kept: <strong className="text-emerald-400">{totalKeptCases}</strong> • Returning: <strong className="text-amber-400">{totalReturnedCases}</strong>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {returnType === 'REFUND_CASH' ? 'Calculated Refund (incl. 5% VAT)' : 'Exchange Value (incl. 5% VAT)'}
              </div>
              <div className="font-oswald text-2xl font-black text-emerald-400">
                ৳{totalRefundWithVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || totalReturnedCases <= 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Return Claim</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
