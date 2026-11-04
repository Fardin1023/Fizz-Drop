import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Filter,
  Calendar,
  Building2,
  Users,
  Package,
  Search,
  Download,
  RefreshCw,
  DollarSign,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Clock,
  Layers,
  Receipt,
  Truck,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  X,
  FileSpreadsheet,
  MapPin,
  Store,
  Tag,
  Wallet,
  CreditCard,
  Phone,
  ShieldCheck,
  Warehouse,
  TrendingDown,
} from 'lucide-react';

interface CommercialSummary {
  total_retail_revenue: number;
  total_outlet_gross_profit: number;
  total_wholesale_revenue: number;
  total_supplier_gross_profit: number;
  total_shelf_stock_units: number;
  total_central_depot_stock: number;
  total_supplier_depot_stock: number;
  total_units_sold: number;
  active_suppliers_count: number;
  active_outlets_count: number;
}

interface OutletProductLedgerRow {
  outlet_id: number;
  outlet_name: string;
  city: string;
  location_address: string;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  brand: string;
  flavor_variant: string;
  sku: string;
  packaging: string;
  size_volume: string;
  category: string;
  image_url: string;
  supplier_buy_rate: number;
  outlet_wholesale_rate: number;
  retail_customer_mrp: number;
  supplier_unit_profit: number;
  outlet_unit_margin: number;
  outlet_margin_percent: number;
  current_shelf_stock: number;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  units_sold: number;
  revenue_generated: number;
  outlet_profit_earned: number;
}

interface SupplierTxnRow {
  transaction_id?: number;
  id?: number;
  supplier_id?: number;
  supplier_name?: string;
  transaction_type?: string;
  type?: string;
  reference_code?: string;
  amount?: number;
  quantity?: number;
  unit_price?: number;
  profit_amount?: number;
  supplier_profit_earned?: number;
  balance_after?: number;
  transaction_date?: string;
  created_at?: string;
  description?: string;
}

interface OutletSalesReceiptRow {
  sale_id?: number;
  id?: number;
  order_code?: string;
  sale_code?: string;
  outlet_id?: number;
  outlet_name?: string;
  product_id?: number;
  product_name?: string;
  brand?: string;
  flavor_variant?: string;
  customer_note?: string;
  customer_notes?: string;
  quantity?: number;
  unit_price?: number;
  total_amount?: number;
  estimated_outlet_profit?: number;
  outlet_margin_earned?: number;
  sale_date?: string;
  payment_method?: string;
}

interface RequisitionRow {
  requisition_id?: number;
  id?: number;
  requisition_code?: string;
  outlet_id?: number;
  outlet_name?: string;
  supplier_id?: number;
  supplier_name?: string;
  product_id?: number;
  product_name?: string;
  brand?: string;
  flavor_variant?: string;
  requested_quantity?: number;
  quantity?: number;
  urgency?: string;
  remarks?: string;
  outlet_remarks?: string;
  status?: string;
  created_at?: string;
  created_date?: string;
  dispatched_at?: string;
}

interface OutletItemUnderSupplier {
  outlet_id: number;
  outlet_name: string;
  city: string;
  location_address?: string;
  supplier_id?: number;
  supplier_name?: string;
}

interface SupplierOption {
  supplier_id: number;
  supplier_name?: string;
  business_name?: string;
  division_name?: string;
  phone_number?: string;
  wallet_balance?: number;
  depot_address?: string;
  trade_license_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  mobile_banking_number?: string;
  outlet_count?: number;
  outlets_count?: number;
  outlets?: OutletItemUnderSupplier[];
  financial_pnl?: {
    procurement_spent: number;
    wholesale_revenue: number;
    wholesale_cogs: number;
    wholesale_gross_profit: number;
    profit_margin_pct: number;
    depot_inventory_value: number;
    depot_inventory_units: number;
    net_cash_flow: number;
  };
  procurement_spent?: number;
  wholesale_revenue?: number;
  wholesale_cogs?: number;
  wholesale_gross_profit?: number;
  profit_margin_pct?: number;
  depot_inventory_value?: number;
  depot_inventory_units?: number;
  net_cash_flow?: number;
}

interface SupplierPurchasedProduct {
  supplier_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  brand: string;
  flavor_variant?: string;
  size_volume?: string;
  packaging?: string;
  unit_supplier_price: number;
  retail_price: number;
  total_cases_purchased: number;
  total_purchase_spent: number;
  orders_count: number;
  last_purchase_date: string;
  current_depot_stock: number;
}

interface OutletOption {
  outlet_id: number;
  outlet_name: string;
  city: string;
  branch_name?: string;
  location_address?: string;
  supplier_id?: number;
  supplier_name?: string;
}

interface ProductOption {
  product_id: number;
  brand: string;
  flavor_variant: string;
  sku: string;
  retail_price: number;
  outlet_price: number;
  supplier_price: number;
}

// Robust currency and number formatting helper that never throws on undefined/null
export const formatMoney = (val: any): string => {
  if (val === null || val === undefined) return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

export const SuperadminCommercialLogs: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Raw API Response Data
  const [summary, setSummary] = useState<CommercialSummary | null>(null);
  const [ledger, setLedger] = useState<OutletProductLedgerRow[]>([]);
  const [salesLogs, setSalesLogs] = useState<OutletSalesReceiptRow[]>([]);
  const [supplierTxns, setSupplierTxns] = useState<SupplierTxnRow[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [supplierPurchasedProducts, setSupplierPurchasedProducts] = useState<SupplierPurchasedProduct[]>([]);

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'supplier_txns' | 'outlet_sales' | 'requisitions'>('matrix');

  // Filter States
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [selectedOutletId, setSelectedOutletId] = useState<string>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');

  // Selected row for audit details modal
  const [inspectedItem, setInspectedItem] = useState<{ type: string; data: any } | null>(null);

  // Helpers to get supplier name and outlet count
  const getSupplierDisplayName = (s: SupplierOption | undefined | null): string => {
    if (!s) return 'All Regional Suppliers';
    const name = (s.supplier_name && s.supplier_name.trim()) || (s.business_name && s.business_name.trim());
    if (name) return name;
    if (s.supplier_id) return `Supplier Hub #${s.supplier_id}`;
    return 'Regional Supplier Hub';
  };

  const getSupplierOutletCount = (s: SupplierOption | undefined | null): number => {
    if (!s) return 0;
    if (Array.isArray(s.outlets)) return s.outlets.length;
    if (s.outlets_count !== undefined && s.outlets_count !== null) return Number(s.outlets_count);
    if (s.outlet_count !== undefined && s.outlet_count !== null) return Number(s.outlet_count);
    return 0;
  };

  // Fetch Commercial Logs Telemetry from Backend API
  const fetchCommercialLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedSupplierId !== 'ALL') params.append('supplierId', selectedSupplierId);
      if (selectedOutletId !== 'ALL') params.append('outletId', selectedOutletId);
      if (selectedProductId !== 'ALL') params.append('productId', selectedProductId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`http://localhost:8080/api/admin/commercial-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load commercial logs: HTTP ${res.status}`);
      }

      const data = await res.json();
      setSummary(data.summary || null);
      setLedger(data.outlet_product_ledger || []);
      setSalesLogs(data.outlet_sales_logs || []);
      setSupplierTxns(data.supplier_transactions || []);
      setRequisitions(data.outlet_requisitions || []);
      setSuppliers(data.suppliers || []);
      setOutlets(data.outlets || []);
      setProducts(data.products || []);
      setSupplierPurchasedProducts(data.supplier_purchased_products || []);
    } catch (err: any) {
      console.error('Error loading commercial logs:', err);
      setError(err.message || 'Unable to fetch commercial telemetry logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommercialLogs();
  }, [selectedSupplierId, selectedOutletId, selectedProductId, startDate, endDate]);

  // Handle Date Preset Changes
  const handleDatePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const today = formatDate(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'WEEK') {
      const pastWeek = new Date();
      pastWeek.setDate(now.getDate() - 7);
      setStartDate(formatDate(pastWeek));
      setEndDate(formatDate(now));
    } else if (preset === 'MONTH') {
      const pastMonth = new Date();
      pastMonth.setDate(now.getDate() - 30);
      setStartDate(formatDate(pastMonth));
      setEndDate(formatDate(now));
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedSupplierId('ALL');
    setSelectedOutletId('ALL');
    setSelectedProductId('ALL');
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
    setSearchQuery('');
  };

  // Currently active selected Supplier and Outlet objects
  const activeSupplier = useMemo(() => {
    if (selectedSupplierId === 'ALL') return null;
    return suppliers.find((s) => String(s.supplier_id) === String(selectedSupplierId)) || null;
  }, [suppliers, selectedSupplierId]);

  const activeOutlet = useMemo(() => {
    if (selectedOutletId === 'ALL') return null;
    return outlets.find((o) => String(o.outlet_id) === String(selectedOutletId)) || null;
  }, [outlets, selectedOutletId]);

  // Cascading Outlets: If a supplier is selected, only show outlets belonging to that supplier
  const availableOutlets = useMemo(() => {
    if (selectedSupplierId === 'ALL') {
      return outlets;
    }
    const supIdNum = Number(selectedSupplierId);
    if (activeSupplier?.outlets && activeSupplier.outlets.length > 0) {
      return activeSupplier.outlets;
    }
    return outlets.filter((o) => Number(o.supplier_id) === supIdNum);
  }, [selectedSupplierId, activeSupplier, outlets]);

  // When selected supplier changes, check if currently selected outlet is still valid
  const handleSupplierChange = (newSupId: string) => {
    setSelectedSupplierId(newSupId);
    if (newSupId !== 'ALL') {
      const supIdNum = Number(newSupId);
      const targetSup = suppliers.find((s) => String(s.supplier_id) === newSupId);
      const underOutletIds = new Set(
        targetSup?.outlets?.map((o) => String(o.outlet_id)) ||
        outlets.filter((o) => Number(o.supplier_id) === supIdNum).map((o) => String(o.outlet_id))
      );
      if (!underOutletIds.has(selectedOutletId)) {
        setSelectedOutletId('ALL');
      }
    }
  };

  // Filtered Ledger (Sub-tab 1)
  const filteredLedger = useMemo(() => {
    return ledger.filter((item) => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      return (
        item.outlet_name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.flavor_variant.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.supplier_name.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query)
      );
    });
  }, [ledger, searchQuery]);

  // Filtered Supplier Transactions (Sub-tab 2)
  const filteredSupplierTxns = useMemo(() => {
    return supplierTxns.filter((txn) => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const name = (txn.supplier_name || '').toLowerCase();
      const ref = (txn.reference_code || '').toLowerCase();
      const desc = (txn.description || '').toLowerCase();
      const type = (txn.transaction_type || txn.type || '').toLowerCase();
      return (
        name.includes(query) ||
        ref.includes(query) ||
        desc.includes(query) ||
        type.includes(query)
      );
    });
  }, [supplierTxns, searchQuery]);

  // Filtered Outlet Sales Receipts (Sub-tab 3)
  const filteredSalesLogs = useMemo(() => {
    return salesLogs.filter((sale) => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const code = (sale.sale_code || sale.order_code || '').toLowerCase();
      const outlet = (sale.outlet_name || '').toLowerCase();
      const prod = (sale.product_name || sale.brand || '').toLowerCase();
      const note = (sale.customer_notes || sale.customer_note || '').toLowerCase();
      return (
        code.includes(query) ||
        outlet.includes(query) ||
        prod.includes(query) ||
        note.includes(query)
      );
    });
  }, [salesLogs, searchQuery]);

  // Filtered Requisitions (Sub-tab 4)
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const code = (req.requisition_code || '').toLowerCase();
      const outlet = (req.outlet_name || '').toLowerCase();
      const sup = (req.supplier_name || '').toLowerCase();
      const brand = (req.brand || req.product_name || '').toLowerCase();
      const status = (req.status || '').toLowerCase();
      return (
        code.includes(query) ||
        outlet.includes(query) ||
        sup.includes(query) ||
        brand.includes(query) ||
        status.includes(query)
      );
    });
  }, [requisitions, searchQuery]);

  // Export current table view as CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (activeSubTab === 'matrix') {
      const headers = [
        'Outlet ID',
        'Outlet Name',
        'City',
        'Supplier Name',
        'Product Brand',
        'Variant',
        'SKU',
        'Packaging',
        'Supplier Buy Rate (BDT)',
        'Outlet Wholesale Rate (BDT)',
        'Retail MRP (BDT)',
        'Supplier Unit Profit (BDT)',
        'Outlet Unit Margin (BDT)',
        'Outlet Margin %',
        'Shelf Stock Units',
        'Units Sold',
        'Retail Revenue (BDT)',
        'Total Outlet Profit (BDT)',
      ];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
      filteredLedger.forEach((r) => {
        const row = [
          r.outlet_id,
          r.outlet_name,
          r.city,
          r.supplier_name,
          r.brand,
          r.flavor_variant,
          r.sku,
          `${r.packaging} ${r.size_volume}`,
          formatMoney(r.supplier_buy_rate),
          formatMoney(r.outlet_wholesale_rate),
          formatMoney(r.retail_customer_mrp),
          formatMoney(r.supplier_unit_profit),
          formatMoney(r.outlet_unit_margin),
          `${formatMoney(r.outlet_margin_percent)}%`,
          r.current_shelf_stock,
          r.units_sold,
          formatMoney(r.revenue_generated),
          formatMoney(r.outlet_profit_earned),
        ];
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });
      downloadFile(csvContent, `fizzdrop-commercial-matrix-${timestamp}.csv`);
    } else if (activeSubTab === 'supplier_txns') {
      const headers = ['Txn ID', 'Supplier Name', 'Type', 'Reference Code', 'Amount (BDT)', 'Quantity', 'Profit (BDT)', 'Balance After (BDT)', 'Date', 'Description'];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
      filteredSupplierTxns.forEach((t) => {
        const row = [
          t.transaction_id ?? t.id ?? '',
          t.supplier_name ?? '',
          t.transaction_type ?? t.type ?? '',
          t.reference_code ?? '',
          formatMoney(t.amount),
          t.quantity ?? '',
          formatMoney(t.profit_amount ?? t.supplier_profit_earned),
          formatMoney(t.balance_after),
          t.transaction_date ?? t.created_at ?? '',
          t.description ?? '',
        ];
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });
      downloadFile(csvContent, `fizzdrop-supplier-transactions-${timestamp}.csv`);
    } else if (activeSubTab === 'outlet_sales') {
      const headers = ['Sale ID', 'Order Code', 'Outlet Name', 'Brand / Product', 'Variant', 'Qty', 'Unit Price', 'Total Amount', 'Outlet Profit', 'Sale Date', 'Customer Note'];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
      filteredSalesLogs.forEach((s) => {
        const row = [
          s.sale_id ?? s.id ?? '',
          s.sale_code ?? s.order_code ?? '',
          s.outlet_name ?? '',
          s.product_name ?? `${s.brand || ''} ${s.flavor_variant || ''}`.trim(),
          s.flavor_variant ?? '',
          s.quantity ?? 1,
          formatMoney(s.unit_price),
          formatMoney(s.total_amount),
          formatMoney(s.estimated_outlet_profit ?? s.outlet_margin_earned),
          s.sale_date ?? '',
          s.customer_notes ?? s.customer_note ?? '',
        ];
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });
      downloadFile(csvContent, `fizzdrop-outlet-sales-${timestamp}.csv`);
    } else {
      const headers = ['Req Code', 'Outlet Name', 'Supplier Name', 'Brand', 'Variant', 'Qty', 'Urgency', 'Status', 'Requested At', 'Dispatched At'];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
      filteredRequisitions.forEach((req) => {
        const row = [
          req.requisition_code ?? '',
          req.outlet_name ?? '',
          req.supplier_name ?? '',
          req.brand ?? req.product_name ?? '',
          req.flavor_variant ?? '',
          req.requested_quantity ?? req.quantity ?? '',
          req.urgency ?? '',
          req.status ?? '',
          req.created_at ?? req.created_date ?? '',
          req.dispatched_at ?? '',
        ];
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });
      downloadFile(csvContent, `fizzdrop-requisitions-${timestamp}.csv`);
    }
  };

  const downloadFile = (content: string, fileName: string) => {
    const encodedUri = encodeURI(content);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Supplier & Outlet Commercial Audit Logs
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                Telemetry & Margins
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Centralized multi-tier commercial records: monitor real-time profit margins, physical shelf stocks, wholesale supply dispatches, and financial ledgers across franchise outlets and regional suppliers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
              title="Export Current Table Records to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchCommercialLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Summary Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Retail Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Retail Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ৳{summary ? summary.total_retail_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span>{summary?.total_units_sold ?? 0} beverage units sold across network</span>
          </div>
        </div>

        {/* Outlet Gross Margin Earned */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outlet Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ৳{summary ? summary.total_outlet_gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Building2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>Across {summary?.active_outlets_count ?? 0} active franchise stores</span>
          </div>
        </div>

        {/* Supplier Wholesale & Profit */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplier Wholesale Profit</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ৳{summary ? summary.total_supplier_gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Across {summary?.active_suppliers_count ?? 0} allotted suppliers</span>
          </div>
        </div>

        {/* Shelf Stock vs Central Depot */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outlet Shelf Stock</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {summary ? summary.total_shelf_stock_units.toLocaleString() : '0'} <span className="text-xs font-semibold text-slate-500">units</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Depot reserve: {summary?.total_central_depot_stock.toLocaleString() ?? 0} units</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar (Supplier -> Cascading Outlets Under Supplier -> Product -> Date Range) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filter Hierarchy & Parameters
            </span>
          </div>

          {/* Quick Date Range Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Date:
            </span>
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleDatePreset(preset)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  datePreset === preset
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {preset === 'ALL'
                  ? 'All Time'
                  : preset === 'TODAY'
                  ? 'Today'
                  : preset === 'WEEK'
                  ? 'Past 7 Days'
                  : 'Past 30 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Supplier Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>1. Supplier Filter</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">🏢 All Regional Suppliers ({suppliers.length})</option>
              {suppliers.map((s) => {
                const sName = getSupplierDisplayName(s);
                const count = getSupplierOutletCount(s);
                return (
                  <option key={s.supplier_id} value={String(s.supplier_id)}>
                    {sName} ({count} {count === 1 ? 'outlet' : 'outlets'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Cascading Outlet Selector (Showing outlets under selected supplier) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-500" />
              <span>2. Outlet (Under Supplier)</span>
            </label>
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
            >
              <option value="ALL">
                {selectedSupplierId === 'ALL'
                  ? `🏪 All Franchise Outlets (${outlets.length})`
                  : `🏪 All Outlets Under ${getSupplierDisplayName(activeSupplier)} (${availableOutlets.length})`}
              </option>
              {selectedSupplierId === 'ALL' ? (
                suppliers.map((s) => {
                  const sName = getSupplierDisplayName(s);
                  const sOutlets = (s.outlets && s.outlets.length > 0)
                    ? s.outlets
                    : outlets.filter((o) => Number(o.supplier_id) === Number(s.supplier_id));
                  if (sOutlets.length === 0) return null;
                  return (
                    <optgroup key={s.supplier_id} label={`Supplier: ${sName} (${sOutlets.length})`}>
                      {sOutlets.map((o) => (
                        <option key={o.outlet_id} value={String(o.outlet_id)}>
                          {o.outlet_name} — {o.city}
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                availableOutlets.map((o) => (
                  <option key={o.outlet_id} value={String(o.outlet_id)}>
                    {o.outlet_name} — {o.city}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Product Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>3. Product Filter</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Products in Catalog ({products.length})</option>
              {products.map((p) => (
                <option key={p.product_id} value={String(p.product_id)}>
                  {p.brand} {p.flavor_variant} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Custom Date Range Pickers */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>4. Custom Date Range</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Start"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="End"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Scope & Overview Banner */}
        {(selectedSupplierId !== 'ALL' || selectedOutletId !== 'ALL' || selectedProductId !== 'ALL' || searchQuery.trim() !== '') && (
          <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-teal-50/70 to-emerald-50/90 rounded-xl border border-indigo-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>Active Filter Scope:</span>
              </div>
              {activeSupplier && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-semibold text-[11px] border border-indigo-200 shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Supplier: <strong>{getSupplierDisplayName(activeSupplier)}</strong></span>
                </span>
              )}
              {activeOutlet && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 font-semibold text-[11px] border border-teal-200 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Outlet: <strong>{activeOutlet.outlet_name}</strong> ({activeOutlet.city})</span>
                </span>
              )}
              {selectedProductId !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-semibold text-[11px] border border-blue-200 shadow-2xs">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Product: <strong>{products.find(p => String(p.product_id) === selectedProductId)?.brand}</strong></span>
                </span>
              )}
              {searchQuery.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 font-mono text-[11px]">
                  Keyword: "{searchQuery}"
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-600 font-medium">
                Tracking <strong>{filteredLedger.length}</strong> product stock/price matrix records
              </span>
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-100/60 transition-colors cursor-pointer border border-rose-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Secondary Filter Row: Search & Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by outlet, product, brand, SKU, supplier, or txn code..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] text-slate-400">
              Active Scope: <strong className="text-slate-700">{selectedSupplierId === 'ALL' ? 'All Suppliers' : getSupplierDisplayName(activeSupplier)}</strong> ·{' '}
              <strong className="text-slate-700">{selectedOutletId === 'ALL' ? 'All Outlets' : (activeOutlet?.outlet_name || 'Specific Outlet')}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* SUPPLIER COMMERCIAL PROFILE, WALLET & PURCHASED PRODUCTS OVERVIEW (When Supplier Filter is Active) */}
      {activeSupplier && (
        <div className="bg-white rounded-2xl border border-indigo-200/90 shadow-sm p-5 space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-oswald text-lg font-bold text-slate-900 tracking-wide">
                    {getSupplierDisplayName(activeSupplier)}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {activeSupplier.division_name || 'Regional Hub'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Regional Supplier
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Depot Address: <strong className="text-slate-700">{activeSupplier.depot_address || 'Regional Central Warehouse'}</strong></span>
                  {activeSupplier.phone_number && (
                    <>
                      <span>•</span>
                      <span>Phone: <strong className="text-slate-700">{activeSupplier.phone_number}</strong></span>
                    </>
                  )}
                  {activeSupplier.trade_license_number && (
                    <>
                      <span>•</span>
                      <span>Trade License: <strong className="text-slate-700">{activeSupplier.trade_license_number}</strong></span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => setSelectedSupplierId('ALL')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                View All Suppliers
              </button>
            </div>
          </div>

          {/* Commercial Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Live Wallet Balance */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Commercial Wallet Balance</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-oswald text-2xl font-black text-emerald-700">
                ৳ {Number(activeSupplier.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-800/80 font-medium block mt-0.5">
                Available credit for central stock purchases
              </span>
            </div>

            {/* 2. Outlets Under this Supplier */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Outlets Under Supplier</span>
                <Store className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="font-oswald text-2xl font-black text-slate-900">
                {availableOutlets.length} <span className="text-xs font-sans font-bold text-slate-500">branches</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate">
                {availableOutlets.map(o => o.outlet_name).join(', ') || 'No outlets assigned'}
              </span>
            </div>

            {/* 3. Central Stock Purchases Total */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Depot Purchases</span>
                <Truck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="font-oswald text-2xl font-black text-slate-900">
                ৳ {supplierPurchasedProducts
                  .filter(p => Number(p.supplier_id) === Number(activeSupplier.supplier_id))
                  .reduce((sum, p) => sum + Number(p.total_purchase_spent || 0), 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Direct Superadmin purchase orders
              </span>
            </div>

            {/* 4. Registered Settlement Accounts */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Bank & Settlement</span>
                <CreditCard className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-xs font-bold text-slate-800 truncate">
                {activeSupplier.bank_name || 'Corporate Wire Transfer'}
              </div>
              <span className="text-[10px] font-mono text-slate-500 block truncate mt-0.5">
                Acc: {activeSupplier.bank_account_number || 'On File'} • MFS: {activeSupplier.mobile_banking_number || 'N/A'}
              </span>
            </div>
          </div>

          {/* Supplier Profit & Loss (P&L) Statement Section */}
          {(() => {
            const pnl = activeSupplier.financial_pnl || {
              procurement_spent: activeSupplier.procurement_spent || 0,
              wholesale_revenue: activeSupplier.wholesale_revenue || 0,
              wholesale_cogs: activeSupplier.wholesale_cogs || 0,
              wholesale_gross_profit: activeSupplier.wholesale_gross_profit || 0,
              profit_margin_pct: activeSupplier.profit_margin_pct || 0,
              depot_inventory_value: activeSupplier.depot_inventory_value || 0,
              depot_inventory_units: activeSupplier.depot_inventory_units || 0,
              net_cash_flow: activeSupplier.net_cash_flow || 0,
            };
            const grossProfit = Number(pnl.wholesale_gross_profit ?? 0);
            const isProfit = grossProfit >= 0;
            const marginPct = Number(pnl.profit_margin_pct ?? 0);
            const revenue = Number(pnl.wholesale_revenue ?? 0);
            const cogs = Number(pnl.wholesale_cogs ?? 0);
            const procurementSpent = Number(pnl.procurement_spent ?? 0);
            const inventoryVal = Number(pnl.depot_inventory_value ?? 0);
            const inventoryUnits = Number(pnl.depot_inventory_units ?? 0);

            return (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                      {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                    </div>
                    <div>
                      <h4 className="font-oswald text-base font-bold tracking-wide text-white flex items-center gap-2">
                        <span>SUPPLIER COMMERCIAL PROFIT & LOSS (P&L) STATEMENT</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isProfit ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {isProfit ? `+${marginPct.toFixed(2)}% Margin` : `${marginPct.toFixed(2)}% Margin`}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Wholesale margins realized from outlet dispatches vs central procurement investments.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Wholesale Gross Profit / (Loss) Incurred
                    </span>
                    <span className={`font-oswald text-2xl font-black ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isProfit ? '+' : '-'}৳{Math.abs(grossProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Wholesale Revenue</span>
                    <div className="font-oswald text-lg font-bold text-white">
                      ৳{revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400 block">Earned from outlets</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Wholesale COGS</span>
                    <div className="font-oswald text-lg font-bold text-slate-200">
                      ৳{cogs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400 block">Cost of dispatched goods</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Depot Inventory Asset</span>
                    <div className="font-oswald text-lg font-bold text-teal-300">
                      ৳{inventoryVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400 block">{inventoryUnits} cases held in stock</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Procurement Spend</span>
                    <div className="font-oswald text-lg font-bold text-indigo-300">
                      ৳{procurementSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400 block">Paid to Superadmin</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Products Purchased from Superadmin Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Products Purchased by {getSupplierDisplayName(activeSupplier)} from Superadmin
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {supplierPurchasedProducts.filter(p => Number(p.supplier_id) === Number(activeSupplier.supplier_id)).length} SKUs purchased
              </span>
            </div>

            {supplierPurchasedProducts.filter(p => Number(p.supplier_id) === Number(activeSupplier.supplier_id)).length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                No direct central inventory purchase orders found for this supplier yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <th className="py-2.5 px-3">Product Name & Variant</th>
                      <th className="py-2.5 px-3">SKU & Pack</th>
                      <th className="py-2.5 px-3 text-right">Supplier Buy Rate</th>
                      <th className="py-2.5 px-3 text-right">Retail Price</th>
                      <th className="py-2.5 px-3 text-right">Total Cases Purchased</th>
                      <th className="py-2.5 px-3 text-right">Total Spent (৳)</th>
                      <th className="py-2.5 px-3 text-center">Orders</th>
                      <th className="py-2.5 px-3 text-center">Depot Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {supplierPurchasedProducts
                      .filter(p => Number(p.supplier_id) === Number(activeSupplier.supplier_id))
                      .map((prod) => (
                        <tr key={prod.product_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {prod.product_name}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                            {prod.sku} • {prod.size_volume || ''} {prod.packaging || ''}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                            ৳ {formatMoney(prod.unit_supplier_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            ৳ {formatMoney(prod.retail_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-oswald text-sm font-bold text-slate-800">
                            {prod.total_cases_purchased} <span className="text-[10px] font-sans font-normal text-slate-400">cases</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                            ৳ {formatMoney(prod.total_purchase_spent)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                            {prod.orders_count}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {prod.current_depot_stock} cases
                            </span>
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

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-0 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'matrix'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Outlet Product Matrix (Profit, Stocks, Price)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-bold">
            {filteredLedger.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('supplier_txns')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'supplier_txns'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span>Supplier Transaction & Profit Logs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {filteredSupplierTxns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('outlet_sales')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'outlet_sales'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-600" />
          <span>Outlet Customer Sales Receipts</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {filteredSalesLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('requisitions')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'requisitions'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-600" />
          <span>Regional Dispatches & Requisitions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {filteredRequisitions.length}
          </span>
        </button>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-500">Querying commercial audit telemetry...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Telemetry Query Error</h3>
            <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchCommercialLogs}
              className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Retry Connection
            </button>
          </div>
        ) : activeSubTab === 'matrix' ? (
          /* Sub-tab 1: Outlet Product Performance Matrix (Profit, Stocks, Price) */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Franchise Outlet</th>
                  <th className="py-3 px-4">Beverage Product</th>
                  <th className="py-3 px-3 text-right">Supplier Buy Rate</th>
                  <th className="py-3 px-3 text-right">Wholesale Rate</th>
                  <th className="py-3 px-3 text-right">Retail MRP</th>
                  <th className="py-3 px-3 text-right">Supplier Unit Profit</th>
                  <th className="py-3 px-3 text-right">Outlet Margin</th>
                  <th className="py-3 px-3 text-center">Shelf Stock</th>
                  <th className="py-3 px-3 text-right">Sold Qty</th>
                  <th className="py-3 px-3 text-right">Retail Revenue</th>
                  <th className="py-3 px-4 text-right">Total Outlet Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No commercial records match the selected supplier, outlet, or date filters.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((row) => (
                    <tr
                      key={`${row.outlet_id}-${row.product_id}`}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectedItem({ type: 'matrix', data: row })}
                    >
                      {/* Outlet & Responsible Supplier */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{row.outlet_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{row.city}</span>
                          <span>•</span>
                          <span className="text-indigo-600 truncate max-w-[140px]" title={row.supplier_name}>
                            {row.supplier_name}
                          </span>
                        </div>
                      </td>

                      {/* Product details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt={row.brand}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {row.brand.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate">
                              {row.brand} {row.flavor_variant}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              {row.sku} · {row.packaging} ({row.size_volume})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tier 1: Supplier Buy Rate */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-600">
                        ৳{formatMoney(row.supplier_buy_rate)}
                      </td>

                      {/* Tier 2: Outlet Wholesale Rate */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                        ৳{formatMoney(row.outlet_wholesale_rate)}
                      </td>

                      {/* Tier 3: Retail Customer MRP */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{formatMoney(row.retail_customer_mrp)}
                      </td>

                      {/* Supplier Unit Profit */}
                      <td className="py-3 px-3 text-right font-mono text-indigo-600 font-semibold">
                        +৳{formatMoney(row.supplier_unit_profit)}
                      </td>

                      {/* Outlet Unit Margin */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold text-emerald-600">
                          +৳{formatMoney(row.outlet_unit_margin)}
                        </div>
                        <div className="text-[9px] text-emerald-700 font-semibold">
                          ({formatMoney(row.outlet_margin_percent)}%)
                        </div>
                      </td>

                      {/* Shelf Stock */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.current_shelf_stock === 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : row.current_shelf_stock <= 15
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {row.current_shelf_stock} units
                        </span>
                      </td>

                      {/* Units Sold */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                        {row.units_sold}
                      </td>

                      {/* Revenue Generated */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        ৳{formatMoney(row.revenue_generated)}
                      </td>

                      {/* Total Outlet Profit Earned */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-100">
                          ৳{formatMoney(row.outlet_profit_earned)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeSubTab === 'supplier_txns' ? (
          /* Sub-tab 2: Supplier Transaction & Profit Logs */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Txn ID / Date</th>
                  <th className="py-3 px-4">Supplier Hub</th>
                  <th className="py-3 px-3">Transaction Type</th>
                  <th className="py-3 px-3">Reference Code</th>
                  <th className="py-3 px-3 text-right">Units Qty</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-right">Supplier Profit</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSupplierTxns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No supplier transactions recorded for the selected filter parameters.
                    </td>
                  </tr>
                ) : (
                  filteredSupplierTxns.map((t, idx) => (
                    <tr
                      key={t.transaction_id || t.id || idx}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectedItem({ type: 'supplier_txn', data: t })}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          #{t.transaction_id || t.id || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{t.transaction_date || t.created_at ? new Date(t.transaction_date || t.created_at!).toLocaleString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {t.supplier_name || 'Regional Supplier'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            (t.transaction_type || t.type || '').includes('DISPATCH') || (t.transaction_type || t.type || '').includes('DELIVERY')
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : (t.transaction_type || t.type || '').includes('PURCHASE')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.transaction_type || t.type || 'COMMERCIAL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-600">
                        {t.reference_code || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                        {t.quantity ? `${t.quantity} units` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{formatMoney(t.amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600">
                        +৳{formatMoney(t.profit_amount ?? t.supplier_profit_earned)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                        ৳{formatMoney(t.balance_after)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeSubTab === 'outlet_sales' ? (
          /* Sub-tab 3: Outlet Customer Sales Receipts */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt / Order</th>
                  <th className="py-3 px-4">Franchise Outlet</th>
                  <th className="py-3 px-4">Product Purchased</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Unit MRP</th>
                  <th className="py-3 px-3 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Outlet Margin Earned</th>
                  <th className="py-3 px-4">Sale Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalesLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No customer sales receipts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredSalesLogs.map((sale, idx) => (
                    <tr
                      key={sale.sale_id || sale.id || idx}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectedItem({ type: 'sale', data: sale })}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-700">
                          {sale.sale_code || sale.order_code || `SL-${sale.id || sale.sale_id || 'TXN'}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Sale #{sale.id || sale.sale_id || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{sale.outlet_name || 'Outlet Branch'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">
                          {sale.product_name || `${sale.brand || ''} ${sale.flavor_variant || ''}`.trim() || 'Beverage Product'}
                        </span>
                        {(sale.customer_notes || sale.customer_note) && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[200px]">
                            Note: {sale.customer_notes || sale.customer_note}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {sale.quantity ?? 1}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ৳{formatMoney(sale.unit_price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{formatMoney(sale.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          +৳{formatMoney(sale.estimated_outlet_profit ?? sale.outlet_margin_earned)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {sale.sale_date ? new Date(sale.sale_date).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Sub-tab 4: Regional Dispatches & Requisitions */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Requisition Code</th>
                  <th className="py-3 px-4">Destination Outlet</th>
                  <th className="py-3 px-4">Assigned Supplier</th>
                  <th className="py-3 px-4">Beverage Product</th>
                  <th className="py-3 px-3 text-center">Requested Qty</th>
                  <th className="py-3 px-3 text-center">Urgency</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Request Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock requisitions or wholesale dispatches match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((req, idx) => (
                    <tr
                      key={req.requisition_id || req.id || idx}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectedItem({ type: 'requisition', data: req })}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {req.requisition_code || `REQ-${req.id || idx}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {req.outlet_name || 'Outlet Branch'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {req.supplier_name || 'Pending Hub Allotment'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {req.brand || req.product_name || 'Beverage Product'} {req.flavor_variant || ''}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                        {req.requested_quantity ?? req.quantity ?? 0} cases
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            req.urgency === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : req.urgency === 'URGENT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {req.urgency || 'STANDARD'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            req.status === 'FULFILLED' || req.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'DISPATCHED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {req.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {req.created_at || req.created_date ? new Date(req.created_at || req.created_date!).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row Inspection Audit Modal */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                  Audit Telemetry Record Details
                </h3>
              </div>
              <button
                onClick={() => setInspectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[70vh] overflow-y-auto space-y-3 text-xs">
              {Object.entries(inspectedItem.data).map(([key, val]) => (
                <div key={key} className="flex items-start justify-between py-1.5 border-b border-slate-100">
                  <span className="font-mono text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[260px] truncate">
                    {typeof val === 'number'
                      ? key.includes('rate') || key.includes('price') || key.includes('amount') || key.includes('revenue') || key.includes('profit') || key.includes('margin') || key.includes('cost')
                        ? `৳${formatMoney(val)}`
                        : val.toString()
                      : String(val ?? 'N/A')}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setInspectedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
