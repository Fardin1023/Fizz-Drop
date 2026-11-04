import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  RotateCcw,
  Clock,
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  Printer,
  Package,
  TrendingDown,
  Layers,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  downloadTransactionPdf,
  downloadTransactionCsv,
} from '../../utils/transactionExporter';
import type { SupplierFinancialExportData } from '../../utils/transactionExporter';

interface ReturnRequestRecord {
  id: number;
  return_code: string;
  requisition_id: number;
  requisition_code: string;
  supplier_id: number;
  district_id: number;
  return_type: string; // REFUND_CASH, EXCHANGE_PRODUCT
  status: string; // PENDING_REVIEW, APPROVED, REJECTED
  reason_category: string;
  reason_details: string;
  admin_remarks?: string;
  returned_quantity: number;
  kept_quantity: number;
  refund_amount: number;
  replacement_product_name?: string;
  replacement_quantity?: number;
  created_at: string;
  updated_at: string;
}

export const SupplierTransactionsView: React.FC = () => {
  const { token, user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [financialSummary, setFinancialSummary] = useState<SupplierFinancialExportData>({
    total_spent: 0,
    total_refunded: 0,
    net_investment: 0,
    total_revenue: 0,
    total_wholesale_profit: 0,
    pending_returns_count: 0,
    pending_returns_value: 0,
    transactions: [],
  });

  const [returnRequests, setReturnRequests] = useState<ReturnRequestRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'returns'>('ledger');

  // Search & Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [flowFilter, setFlowFilter] = useState<string>('ALL');

  const [supplierProfile, setSupplierProfile] = useState<any>(null);
  const [pnlData, setPnlData] = useState<{
    procurement_spent: number;
    wholesale_revenue: number;
    wholesale_cogs: number;
    wholesale_gross_profit: number;
    profit_margin_pct: number;
    depot_inventory_value: number;
    depot_inventory_units: number;
    net_cash_flow: number;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = user?.user_id || 4;

      // 1. Fetch Transactions & Financial Summary
      const resTx = await fetch(`http://localhost:8080/api/v1/supplier/transactions?userId=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resTx.ok) {
        const dataTx = await resTx.json();
        setFinancialSummary({
          total_spent: Number(dataTx.total_spent || 0),
          total_refunded: Number(dataTx.total_refunded || 0),
          net_investment: Number(dataTx.net_investment || 0),
          total_revenue: Number(dataTx.total_revenue || 0),
          total_wholesale_profit: Number(dataTx.total_wholesale_profit || 0),
          pending_returns_count: Number(dataTx.pending_returns_count || 0),
          pending_returns_value: Number(dataTx.pending_returns_value || 0),
          transactions: Array.isArray(dataTx.transactions) ? dataTx.transactions : [],
        });
      }

      // 2. Fetch Supplier Return Claims
      const resReturns = await fetch(`http://localhost:8080/api/v1/supplier/returns?userId=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resReturns.ok) {
        const dataReturns = await resReturns.json();
        setReturnRequests(Array.isArray(dataReturns) ? dataReturns : []);
      }

      // 3. Fetch Profile for statement export
      const resProfile = await fetch(`http://localhost:8080/api/v1/supplier/profile?userId=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resProfile.ok) {
        const prof = await resProfile.json();
        setSupplierProfile(prof);
      }

      // 4. Fetch Profit & Loss Telemetry
      const resWallet = await fetch(`http://localhost:8080/api/v1/supplier/wallet?userId=${userId}`);
      if (resWallet.ok) {
        const text = await resWallet.text();
        try {
          const wData = JSON.parse(text);
          if (wData.financial_pnl) {
            setPnlData(wData.financial_pnl);
          }
        } catch {
          // ignore non-json
        }
      }
    } catch (err) {
      console.error('Error fetching transactions or financial summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered transactions
  const filteredTransactions = financialSummary.transactions.filter((tx) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      tx.transaction_code.toLowerCase().includes(s) ||
      (tx.reference_code && tx.reference_code.toLowerCase().includes(s)) ||
      (tx.description && tx.description.toLowerCase().includes(s));

    const matchType = typeFilter === 'ALL' || tx.type === typeFilter;
    const matchFlow = flowFilter === 'ALL' || tx.entry_type === flowFilter;

    return matchSearch && matchType && matchFlow;
  });

  const formatCurrency = (val: number = 0) => {
    return '৳' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'OUTLET_SALE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Wholesale Sale (Outlet)</span>;
      case 'STOCK_PURCHASE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Stock Purchase</span>;
      case 'SHORTFALL_REFUND':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Shortfall Refund</span>;
      case 'STOCK_RETURN_REFUND':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Return Cash Refund</span>;
      case 'PRODUCT_EXCHANGE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Product Exchange</span>;
      case 'DUE_SETTLEMENT':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Due Settlement</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved & Refunded
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Claim Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            Awaiting Superadmin Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Exporter Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-600">
            DISTRIBUTOR COMMERCIAL LEDGER
          </span>
          <h2 className="font-oswald text-2xl font-black text-zinc-900 tracking-tight">
            Financial Ledger & Return Transactions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time audit trail of purchases, shortfall refunds, policy returns, and replacement vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadTransactionPdf(financialSummary, supplierProfile)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Download Official Financial Statement as PDF"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>Download Statement (PDF)</span>
          </button>

          <button
            onClick={() => downloadTransactionCsv(financialSummary.transactions, supplierProfile?.business_name)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
            title="Export Ledger to CSV"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Supplier Live Profit & Loss (P&L) Statement Banner */}
      {pnlData && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                pnlData.wholesale_gross_profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {pnlData.wholesale_gross_profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-oswald text-lg font-bold text-slate-900 tracking-wide flex items-center gap-2">
                  <span>SUPPLIER PROFIT & LOSS (P&L) STATEMENT</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    pnlData.wholesale_gross_profit >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {pnlData.wholesale_gross_profit >= 0 ? `+${pnlData.profit_margin_pct.toFixed(2)}% Margin` : `${pnlData.profit_margin_pct.toFixed(2)}% Margin`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Realized commercial performance from regional depot stock dispatches to franchise outlets.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Wholesale Realized Gross Profit / (Loss)
              </span>
              <span className={`font-oswald text-2xl font-black ${
                pnlData.wholesale_gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {pnlData.wholesale_gross_profit >= 0 ? '+' : '-'}৳{Math.abs(pnlData.wholesale_gross_profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Wholesale Revenue</span>
              <span className="font-oswald text-base font-bold text-slate-800">
                ৳{pnlData.wholesale_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 block">Earned from outlets</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Wholesale COGS</span>
              <span className="font-oswald text-base font-bold text-slate-700">
                ৳{pnlData.wholesale_cogs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 block">Cost of dispatched goods</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Depot Inventory Asset</span>
              <span className="font-oswald text-base font-bold text-teal-700">
                ৳{pnlData.depot_inventory_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 block">{pnlData.depot_inventory_units} units in warehouse</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Net Commercial Cash Flow</span>
              <span className={`font-oswald text-base font-bold ${pnlData.net_cash_flow >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                {pnlData.net_cash_flow >= 0 ? '+' : ''}৳{pnlData.net_cash_flow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 block">Revenue minus procurement</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Spent */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Spent on Stocks
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="font-oswald text-2xl font-black text-zinc-900">
            {formatCurrency(financialSummary.total_spent)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-bold text-rose-600">Outflow</span> • Product requisitions & stock dues
          </div>
        </div>

        {/* Card 2: Total Refunded */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Amount Refunded
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="font-oswald text-2xl font-black text-emerald-600">
            {formatCurrency(financialSummary.total_refunded)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-bold text-emerald-600">Credited</span> • Shortfalls & approved returns
          </div>
        </div>

        {/* Card 3: Net Active Capital */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Net Capital Investment
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-oswald text-2xl font-black text-blue-700">
            {formatCurrency(financialSummary.net_investment)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Spent minus settled refunds</span>
          </div>
        </div>

        {/* Card 4: Pending Return Claims */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pending Returns Under Review
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-oswald text-2xl font-black text-amber-600">
            {financialSummary.pending_returns_count} Claims
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            Value: <strong>{formatCurrency(financialSummary.pending_returns_value)}</strong>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation: Ledger vs Returns History */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Transactions Ledger ({financialSummary.transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('returns')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'returns'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Submitted Return Claims ({returnRequests.length})</span>
          {(financialSummary.pending_returns_count || 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">
              {financialSummary.pending_returns_count}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: Transactions Ledger */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by transaction code, requisition ID, or note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="OUTLET_SALE">Wholesale Sales to Outlets (Tier 2)</option>
                <option value="STOCK_PURCHASE">Stock Purchases from Superadmin (Tier 1)</option>
                <option value="SHORTFALL_REFUND">Shortfall Refunds</option>
                <option value="STOCK_RETURN_REFUND">Return Cash Refunds</option>
                <option value="PRODUCT_EXCHANGE">Product Exchanges</option>
                <option value="DUE_SETTLEMENT">Due Settlements</option>
              </select>

              <select
                value={flowFilter}
                onChange={(e) => setFlowFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Flows</option>
                <option value="DEBIT">Debit (Spent)</option>
                <option value="CREDIT">Credit (Refunded)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-500">Loading transaction ledger...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <div className="text-sm font-bold text-slate-600">No transactions found</div>
                <div className="text-xs text-slate-400">
                  Transactions are logged automatically whenever requisitions are placed, unfulfilled stocks are refunded, or returns are processed.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-3 px-4">Txn Code</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-center">Flow</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Description / Audit Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => {
                      const isCredit = tx.entry_type === 'CREDIT';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {tx.transaction_code}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {tx.reference_code || '—'}
                          </td>
                          <td className="py-3 px-4">
                            {getTypeBadge(tx.type)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isCredit ? '+ CREDIT' : '- DEBIT'}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-black text-sm ${
                            isCredit ? 'text-emerald-600' : 'text-slate-900'
                          }`}>
                            {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[11px]">
                            {(tx.payment_method || 'BANK TRANSFER').replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={tx.description}>
                            {tx.description || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Submitted Return Claims */}
      {activeSubTab === 'returns' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            {returnRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RotateCcw className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <div className="text-sm font-bold text-slate-600">No stock return claims submitted yet</div>
                <div className="text-xs text-slate-400">
                  You can file a return claim on any fulfilled requisition under the "Requisitions History" tab.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-3 px-4">Claim Code</th>
                      <th className="py-3 px-4">Requisition</th>
                      <th className="py-3 px-4">Resolution Mode</th>
                      <th className="py-3 px-4">Returned Units</th>
                      <th className="py-3 px-4">Refund / Credit</th>
                      <th className="py-3 px-4">Reason Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Admin Remarks</th>
                      <th className="py-3 px-4 text-right">Filed On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnRequests.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">
                          {ret.return_code}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {ret.requisition_code}
                        </td>
                        <td className="py-3 px-4">
                          {ret.return_type === 'REFUND_CASH' ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" /> Cash Refund
                            </span>
                          ) : (
                            <span className="font-bold text-purple-700 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" /> Replacement ({ret.replacement_product_name || 'Product'})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-800">
                          {ret.returned_quantity} cases
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-600">
                          {formatCurrency(ret.refund_amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 block">
                            {ret.reason_category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-500 block max-w-xs truncate" title={ret.reason_details}>
                            {ret.reason_details}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getReturnStatusBadge(ret.status)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate" title={ret.admin_remarks}>
                          {ret.admin_remarks || '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {new Date(ret.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
