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
  Clock,
  Layers,
  Receipt,
  Truck,
  AlertTriangle,
  SlidersHorizontal,
  Info,
  X,
  FileSpreadsheet,
  Store,
  Wallet,
  CreditCard,
  ShieldCheck,
  TrendingDown,
  UserCheck,
  Briefcase,
  MapPin,
  Compass,
  Crosshair,
  Award,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Hash,
  ArrowRight,
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
  total_psr_cases_sold?: number;
  total_psr_revenue?: number;
  total_sales_officers_count?: number;
  total_psrs_count?: number;
  total_psr_orders_count?: number;
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
  sub_route?: string;
  assigned_psr_id?: number;
}

interface PsrProductSale {
  product_id: number;
  product_name: string;
  total_cases_sold: number;
  total_amount: number;
  orders_count: number;
}

interface PsrSummary {
  id: number;
  psr_code: string;
  name: string;
  phone: string;
  email: string;
  sales_officer_id: number;
  sales_officer_name?: string;
  sales_officer_code?: string;
  supplier_id?: number;
  supplier_name?: string;
  sub_route: string;
  assigned_area: string;
  status: string;
  target_cases: number;
  target_sku_ounces?: string;
  target_product_id?: number;
  target_notes?: string;
  assigned_outlets_count: number;
  assigned_outlets?: Array<{
    outlet_id: number;
    outlet_name: string;
    branch_name: string;
    franchise_name: string;
    city: string;
    sub_route: string;
  }>;
  total_cases_sold: number;
  total_revenue: number;
  total_orders_count: number;
  achieved_cases: number;
  target_progress_pct: number;
  product_sales: PsrProductSale[];
}

interface SalesOfficerSummary {
  id: number;
  officer_code: string;
  name: string;
  phone: string;
  email: string;
  supplier_id: number;
  supplier_name?: string;
  district_id?: number;
  city: string;
  assigned_area: string;
  status: string;
  monthly_target: number;
  psr_count: number;
  psrs?: PsrSummary[];
  outlets_count?: number;
  total_cases_sold: number;
  total_revenue: number;
  total_orders_count: number;
}

interface PsrOrderRow {
  id: number;
  order_code: string;
  psr_id: number;
  psr_name: string;
  sales_officer_id: number;
  sales_officer_name?: string;
  sales_officer_code?: string;
  supplier_id?: number;
  supplier_name?: string;
  outlet_id: number;
  outlet_name: string;
  sub_route: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  urgency: string;
  status: string;
  outlet_remarks?: string;
  psr_notes?: string;
  created_at: string;
  updated_at?: string;
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
  sales_officers_count?: number;
  sales_officers?: SalesOfficerSummary[];
  psrs_count?: number;
  psrs?: PsrSummary[];
  total_psr_cases_sold?: number;
  total_psr_revenue?: number;
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
  total_available_stock?: number;
  available_stocks?: SupplierStockItem[];
}

interface SupplierStockItem {
  supplier_id?: number;
  supplier_name?: string;
  product_id: number;
  brand: string;
  flavor_variant?: string;
  size_volume?: string;
  packaging?: string;
  sku?: string;
  current_stock: number;
  reserved_stock?: number;
  unit_price: number;
  total_value: number;
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
  sub_route?: string;
  assigned_psr_id?: number;
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
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficerSummary[]>([]);
  const [psrs, setPsrs] = useState<PsrSummary[]>([]);
  const [psrOrders, setPsrOrders] = useState<PsrOrderRow[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [supplierPurchasedProducts, setSupplierPurchasedProducts] = useState<SupplierPurchasedProduct[]>([]);
  const [allSupplierInventory, setAllSupplierInventory] = useState<SupplierStockItem[]>([]);

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<
    'master_hierarchy' | 'psr_orders' | 'matrix' | 'supplier_stocks' | 'supplier_txns' | 'outlet_sales' | 'requisitions'
  >('master_hierarchy');

  // Multi-Tier Filter States
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [selectedSalesOfficerId, setSelectedSalesOfficerId] = useState<string>('ALL');
  const [selectedPsrId, setSelectedPsrId] = useState<string>('ALL');
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

  const getSupplierStockCount = (s: SupplierOption | undefined | null): number => {
    if (!s) return 0;
    if (s.total_available_stock !== undefined && s.total_available_stock !== null) return Number(s.total_available_stock);
    if (s.depot_inventory_units !== undefined && s.depot_inventory_units !== null) return Number(s.depot_inventory_units);
    if (Array.isArray(s.available_stocks)) {
      return s.available_stocks.reduce((sum, item) => sum + Number(item.current_stock || 0), 0);
    }
    return 0;
  };

  // Fetch Commercial Logs Telemetry from Backend API
  const fetchCommercialLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedSupplierId !== 'ALL') params.append('supplierId', selectedSupplierId);
      if (selectedSalesOfficerId !== 'ALL') params.append('salesOfficerId', selectedSalesOfficerId);
      if (selectedPsrId !== 'ALL') params.append('psrId', selectedPsrId);
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
      setSalesOfficers(data.sales_officers || []);
      setPsrs(data.psrs || []);
      setPsrOrders(data.psr_orders || []);
      setOutlets(data.outlets || []);
      setProducts(data.products || []);
      setSupplierPurchasedProducts(data.supplier_purchased_products || []);
      setAllSupplierInventory(data.all_supplier_inventory || []);
    } catch (err: any) {
      console.error('Error loading commercial logs:', err);
      setError(err.message || 'Unable to fetch commercial telemetry logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommercialLogs();
  }, [selectedSupplierId, selectedSalesOfficerId, selectedPsrId, selectedOutletId, selectedProductId, startDate, endDate]);

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
    setSelectedSalesOfficerId('ALL');
    setSelectedPsrId('ALL');
    setSelectedOutletId('ALL');
    setSelectedProductId('ALL');
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
    setSearchQuery('');
  };

  // Currently active selected objects
  const activeSupplier = useMemo(() => {
    if (selectedSupplierId === 'ALL') return null;
    return suppliers.find((s) => String(s.supplier_id) === String(selectedSupplierId)) || null;
  }, [suppliers, selectedSupplierId]);

  const activeSalesOfficer = useMemo(() => {
    if (selectedSalesOfficerId === 'ALL') return null;
    return salesOfficers.find((so) => String(so.id) === String(selectedSalesOfficerId)) || null;
  }, [salesOfficers, selectedSalesOfficerId]);

  const activePsr = useMemo(() => {
    if (selectedPsrId === 'ALL') return null;
    return psrs.find((p) => String(p.id) === String(selectedPsrId)) || null;
  }, [psrs, selectedPsrId]);

  const activeOutlet = useMemo(() => {
    if (selectedOutletId === 'ALL') return null;
    return outlets.find((o) => String(o.outlet_id) === String(selectedOutletId)) || null;
  }, [outlets, selectedOutletId]);

  // Hierarchical cascading for Sales Officers
  const availableSalesOfficers = useMemo(() => {
    if (selectedSupplierId === 'ALL') return salesOfficers;
    return salesOfficers.filter((so) => String(so.supplier_id) === String(selectedSupplierId));
  }, [salesOfficers, selectedSupplierId]);

  // Hierarchical cascading for PSRs
  const availablePsrs = useMemo(() => {
    if (selectedSalesOfficerId !== 'ALL') {
      return psrs.filter((p) => String(p.sales_officer_id) === String(selectedSalesOfficerId));
    }
    if (selectedSupplierId !== 'ALL') {
      return psrs.filter((p) => String(p.supplier_id) === String(selectedSupplierId));
    }
    return psrs;
  }, [psrs, selectedSalesOfficerId, selectedSupplierId]);

  // Hierarchical cascading for Outlets
  const availableOutlets = useMemo(() => {
    if (selectedPsrId !== 'ALL') {
      const targetPsr = psrs.find((p) => String(p.id) === String(selectedPsrId));
      if (targetPsr?.assigned_outlets && targetPsr.assigned_outlets.length > 0) {
        const assignedIds = new Set(targetPsr.assigned_outlets.map((o) => o.outlet_id));
        return outlets.filter((o) => assignedIds.has(o.outlet_id));
      }
      return outlets.filter((o) => String(o.assigned_psr_id) === String(selectedPsrId));
    }
    if (selectedSalesOfficerId !== 'ALL') {
      const soPsrIds = new Set(
        psrs.filter((p) => String(p.sales_officer_id) === String(selectedSalesOfficerId)).map((p) => p.id)
      );
      const so = salesOfficers.find((s) => String(s.id) === String(selectedSalesOfficerId));
      return outlets.filter(
        (o) =>
          (o.assigned_psr_id && soPsrIds.has(o.assigned_psr_id)) ||
          (so?.assigned_area && (o as any).area && (o as any).area.toLowerCase() === so.assigned_area.toLowerCase())
      );
    }
    if (selectedSupplierId !== 'ALL') {
      const supIdNum = Number(selectedSupplierId);
      if (activeSupplier?.outlets && activeSupplier.outlets.length > 0) {
        return activeSupplier.outlets;
      }
      return outlets.filter((o) => Number(o.supplier_id) === supIdNum);
    }
    return outlets;
  }, [selectedPsrId, selectedSalesOfficerId, selectedSupplierId, psrs, salesOfficers, activeSupplier, outlets]);

  // Cascading change handlers
  const handleSupplierChange = (newSupId: string) => {
    setSelectedSupplierId(newSupId);
    setSelectedSalesOfficerId('ALL');
    setSelectedPsrId('ALL');
    setSelectedOutletId('ALL');
  };

  const handleSalesOfficerChange = (newSoId: string) => {
    setSelectedSalesOfficerId(newSoId);
    setSelectedPsrId('ALL');
    setSelectedOutletId('ALL');
  };

  const handlePsrChange = (newPsrId: string) => {
    setSelectedPsrId(newPsrId);
    setSelectedOutletId('ALL');
  };

  // Filtered Collections
  const filteredPsrOrders = useMemo(() => {
    return psrOrders.filter((ord) => {
      if (selectedSupplierId !== 'ALL' && String(ord.supplier_id) !== String(selectedSupplierId)) {
        return false;
      }
      if (selectedSalesOfficerId !== 'ALL' && String(ord.sales_officer_id) !== String(selectedSalesOfficerId)) {
        return false;
      }
      if (selectedPsrId !== 'ALL' && String(ord.psr_id) !== String(selectedPsrId)) {
        return false;
      }
      if (selectedOutletId !== 'ALL' && String(ord.outlet_id) !== String(selectedOutletId)) {
        return false;
      }
      if (selectedProductId !== 'ALL' && String(ord.product_id) !== String(selectedProductId)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (ord.order_code || '').toLowerCase().includes(q) ||
        (ord.psr_name || '').toLowerCase().includes(q) ||
        (ord.outlet_name || '').toLowerCase().includes(q) ||
        (ord.product_name || '').toLowerCase().includes(q) ||
        (ord.sub_route || '').toLowerCase().includes(q) ||
        (ord.status || '').toLowerCase().includes(q)
      );
    });
  }, [psrOrders, selectedSupplierId, selectedSalesOfficerId, selectedPsrId, selectedOutletId, selectedProductId, searchQuery]);

  const filteredHierarchySuppliers = useMemo(() => {
    let list = suppliers;
    if (selectedSupplierId !== 'ALL') {
      list = list.filter((s) => String(s.supplier_id) === String(selectedSupplierId));
    }
    return list;
  }, [suppliers, selectedSupplierId]);

  // Filtered Ledger (Sub-tab: matrix)
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

  // Filtered Supplier Transactions
  const filteredSupplierTxns = useMemo(() => {
    return supplierTxns.filter((txn) => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const name = (txn.supplier_name || '').toLowerCase();
      const ref = (txn.reference_code || '').toLowerCase();
      const desc = (txn.description || '').toLowerCase();
      const type = (txn.transaction_type || txn.type || '').toLowerCase();
      return name.includes(query) || ref.includes(query) || desc.includes(query) || type.includes(query);
    });
  }, [supplierTxns, searchQuery]);

  // Filtered Outlet Sales Receipts
  const filteredSalesLogs = useMemo(() => {
    return salesLogs.filter((sale) => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const code = (sale.sale_code || sale.order_code || '').toLowerCase();
      const outlet = (sale.outlet_name || '').toLowerCase();
      const prod = (sale.product_name || sale.brand || '').toLowerCase();
      const note = (sale.customer_notes || sale.customer_note || '').toLowerCase();
      return code.includes(query) || outlet.includes(query) || prod.includes(query) || note.includes(query);
    });
  }, [salesLogs, searchQuery]);

  // Filtered Requisitions
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const code = (req.requisition_code || '').toLowerCase();
      const outlet = (req.outlet_name || '').toLowerCase();
      const sup = (req.supplier_name || '').toLowerCase();
      const brand = (req.brand || req.product_name || '').toLowerCase();
      const status = (req.status || '').toLowerCase();
      return code.includes(query) || outlet.includes(query) || sup.includes(query) || brand.includes(query) || status.includes(query);
    });
  }, [requisitions, searchQuery]);

  // Filtered Supplier Available Stocks
  const filteredSupplierStocks = useMemo(() => {
    return allSupplierInventory.filter((item) => {
      if (selectedSupplierId !== 'ALL' && String(item.supplier_id) !== String(selectedSupplierId)) {
        return false;
      }
      if (selectedProductId !== 'ALL' && String(item.product_id) !== String(selectedProductId)) {
        return false;
      }
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const flavor = (item.flavor_variant || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      const supplier = (item.supplier_name || '').toLowerCase();
      return brand.includes(query) || flavor.includes(query) || sku.includes(query) || supplier.includes(query);
    });
  }, [allSupplierInventory, selectedSupplierId, selectedProductId, searchQuery]);

  // Export current table view as CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (activeSubTab === 'psr_orders') {
      const headers = ['Order Code', 'Date', 'Supplier Hub', 'Sales Officer', 'PSR Agent', 'Outlet Store', 'Sub-Route', 'Product Item', 'Quantity (Cases)', 'Unit Price (BDT)', 'Total (BDT)', 'Status', 'Urgency'];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
      filteredPsrOrders.forEach((o) => {
        const row = [
          o.order_code,
          o.created_at || '',
          o.supplier_name || '',
          o.sales_officer_name || '',
          o.psr_name || '',
          o.outlet_name || '',
          o.sub_route || '',
          o.product_name || '',
          o.quantity,
          formatMoney(o.unit_price),
          formatMoney(o.total_amount),
          o.status,
          o.urgency,
        ];
        csvContent += row.map((c) => `"${c}"`).join(',') + '\n';
      });
      downloadFile(csvContent, `fizzdrop-psr-field-orders-${timestamp}.csv`);
    } else if (activeSubTab === 'master_hierarchy') {
      const headers = ['Supplier Name', 'Sales Officer', 'Officer Code', 'PSR Agent', 'PSR Code', 'Sub-Route', 'Target Cases', 'Achieved Cases', 'Total Sold Cases', 'Total PSR Revenue (BDT)', 'Assigned Outlets Count'];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
      psrs.forEach((p) => {
        const row = [
          p.supplier_name || '',
          p.sales_officer_name || '',
          p.sales_officer_code || '',
          p.name,
          p.psr_code,
          p.sub_route,
          p.target_cases,
          p.achieved_cases,
          p.total_cases_sold,
          formatMoney(p.total_revenue),
          p.assigned_outlets_count,
        ];
        csvContent += row.map((c) => `"${c}"`).join(',') + '\n';
      });
      downloadFile(csvContent, `fizzdrop-master-supply-chain-team-${timestamp}.csv`);
    } else if (activeSubTab === 'matrix') {
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
    } else if (activeSubTab === 'supplier_stocks') {
      const headers = ['Supplier ID', 'Supplier Name', 'Product Brand', 'Variant', 'Packaging & Volume', 'SKU', 'Available Stock (Cases)', 'Unit Supplier Rate (BDT)', 'Stock Valuation (BDT)'];
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
      filteredSupplierStocks.forEach((s) => {
        const row = [
          s.supplier_id ?? '',
          s.supplier_name ?? '',
          s.brand,
          s.flavor_variant ?? '',
          `${s.packaging ?? ''} ${s.size_volume ?? ''}`.trim(),
          s.sku ?? '',
          s.current_stock,
          formatMoney(s.unit_price),
          formatMoney(s.total_value),
        ];
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });
      downloadFile(csvContent, `fizzdrop-supplier-available-stocks-${timestamp}.csv`);
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

  const hasActiveFilters =
    selectedSupplierId !== 'ALL' ||
    selectedSalesOfficerId !== 'ALL' ||
    selectedPsrId !== 'ALL' ||
    selectedOutletId !== 'ALL' ||
    selectedProductId !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    searchQuery.trim() !== '';

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
                Master Commercial & Supply Chain Telemetry Logs
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                Superadmin Master Data
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              End-to-end commercial audit trail: Master supply chain hierarchy (Supplier → Sales Officer → PSR Field Agent → Outlets), real-time product sales tracking, wholesale margins, and physical inventory.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Retail Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Retail Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-oswald">
            ৳{summary ? summary.total_retail_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
            <ArrowUpRight className="w-3 h-3 shrink-0" />
            <span>{summary?.total_units_sold ?? 0} counter units sold</span>
          </div>
        </div>

        {/* Outlet Gross Margin Earned */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outlet Gross Profit</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-oswald">
            ৳{summary ? summary.total_outlet_gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
            <Building2 className="w-3 h-3 text-teal-500 shrink-0" />
            <span>Across {summary?.active_outlets_count ?? 0} franchise stores</span>
          </div>
        </div>

        {/* Supplier Wholesale & Profit */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supplier Profit</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-oswald">
            ৳{summary ? summary.total_supplier_gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
            <Users className="w-3 h-3 text-indigo-500 shrink-0" />
            <span>Across {summary?.active_suppliers_count ?? suppliers.length} suppliers</span>
          </div>
        </div>

        {/* PSR Field Sales & Total Cases Sold */}
        <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-400 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">PSR Products Sold</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-900 tracking-tight font-oswald flex items-baseline gap-1">
            <span>{summary?.total_psr_cases_sold ?? 0}</span>
            <span className="text-xs font-sans font-bold text-blue-700">cases</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-blue-700 font-semibold">
            <span>৳{formatMoney(summary?.total_psr_revenue ?? 0)} order val</span>
            <span>{summary?.total_psrs_count ?? psrs.length} PSRs</span>
          </div>
        </div>

        {/* Shelf Stock vs Central Depot */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shelf Stock Units</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight font-oswald">
            {summary ? summary.total_shelf_stock_units.toLocaleString() : '0'}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">units</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 truncate">
            <Layers className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Depot reserve: {summary?.total_central_depot_stock.toLocaleString() ?? 0} cases</span>
          </div>
        </div>
      </div>

      {/* POLISHED UNCONGESTED FILTER DASHBOARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Supply Chain Master Filter Hierarchy
            </h3>
          </div>

          {/* Quick Date Range Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Quick Period:
            </span>
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleDatePreset(preset)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
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

        {/* 5 Clean Cascading Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* 1. Supplier Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-500" />
              <span>1. Supplier Hub</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">🏢 All Suppliers ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={String(s.supplier_id)}>
                  {getSupplierDisplayName(s)}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Sales Officer Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-blue-500" />
              <span>2. Sales Officer</span>
            </label>
            <select
              value={selectedSalesOfficerId}
              onChange={(e) => handleSalesOfficerChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">👔 All Sales Officers ({availableSalesOfficers.length})</option>
              {availableSalesOfficers.map((so) => (
                <option key={so.id} value={String(so.id)}>
                  {so.name} ({so.assigned_area || so.city})
                </option>
              ))}
            </select>
          </div>

          {/* 3. PSR Field Agent Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-teal-500" />
              <span>3. PSR Field Agent</span>
            </label>
            <select
              value={selectedPsrId}
              onChange={(e) => handlePsrChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
            >
              <option value="ALL">🛵 All PSRs ({availablePsrs.length})</option>
              {availablePsrs.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} ({p.sub_route || p.assigned_area})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Retail Outlet Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Store className="w-3 h-3 text-amber-500" />
              <span>4. Retail Outlet</span>
            </label>
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
            >
              <option value="ALL">🏪 All Outlets ({availableOutlets.length})</option>
              {availableOutlets.map((o) => (
                <option key={o.outlet_id} value={String(o.outlet_id)}>
                  {o.outlet_name} ({o.city})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Product SKU Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Package className="w-3 h-3 text-purple-500" />
              <span>5. Product SKU</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
            >
              <option value="ALL">📦 All Products ({products.length})</option>
              {products.map((p) => (
                <option key={p.product_id} value={String(p.product_id)}>
                  {p.brand} {p.flavor_variant} ({p.sku})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clean Controls Strip: Search & Custom Dates */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 pt-1">
          <div className="relative w-full md:max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, supplier, SO, PSR, outlet, or beverage SKU..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Dates:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-300 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Minimalist Active Scope Filter Chips (Only rendered when active) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3 text-indigo-600" /> Active:
              </span>

              {activeSupplier && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 text-[11px] font-semibold border border-indigo-200">
                  <span>Supplier: {getSupplierDisplayName(activeSupplier)}</span>
                  <button onClick={() => handleSupplierChange('ALL')} className="hover:text-indigo-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeSalesOfficer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200">
                  <span>SO: {activeSalesOfficer.name}</span>
                  <button onClick={() => handleSalesOfficerChange('ALL')} className="hover:text-blue-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activePsr && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-semibold border border-teal-200">
                  <span>PSR: {activePsr.name}</span>
                  <button onClick={() => handlePsrChange('ALL')} className="hover:text-teal-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeOutlet && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                  <span>Outlet: {activeOutlet.outlet_name}</span>
                  <button onClick={() => setSelectedOutletId('ALL')} className="hover:text-amber-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedProductId !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 text-[11px] font-semibold border border-purple-200">
                  <span>Product: {products.find((p) => String(p.product_id) === selectedProductId)?.brand}</span>
                  <button onClick={() => setSelectedProductId('ALL')} className="hover:text-purple-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-mono">
                  <span>"{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-slate-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-0 overflow-x-auto scrollbar-none">
        {/* Tab 1: Master Hierarchy & PSR Sales */}
        <button
          onClick={() => setActiveSubTab('master_hierarchy')}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'master_hierarchy'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Master Supply Chain & PSR Sales Tree</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-bold">
            {psrs.length} PSRs
          </span>
        </button>

        {/* Tab 2: PSR Field Orders Audit Log */}
        <button
          onClick={() => setActiveSubTab('psr_orders')}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'psr_orders'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Package className="w-4 h-4 text-blue-600" />
          <span>PSR Field Orders Audit Log</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">
            {filteredPsrOrders.length}
          </span>
        </button>

        {/* Tab 3: Outlet Product Matrix */}
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'matrix'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Outlet Product Matrix (Profit & Shelf Stocks)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold">
            {filteredLedger.length}
          </span>
        </button>

        {/* Tab 4: Supplier Available Stocks */}
        <button
          onClick={() => setActiveSubTab('supplier_stocks')}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'supplier_stocks'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Boxes className="w-4 h-4 text-amber-600" />
          <span>Supplier Depot Inventory</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-50 text-amber-700 font-bold">
            {filteredSupplierStocks.length}
          </span>
        </button>

        {/* Tab 5: Supplier Transaction & Profit Logs */}
        <button
          onClick={() => setActiveSubTab('supplier_txns')}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'supplier_txns'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span>Supplier Profit Ledger</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {filteredSupplierTxns.length}
          </span>
        </button>

        {/* Tab 6: Outlet Customer Sales Receipts */}
        <button
          onClick={() => setActiveSubTab('outlet_sales')}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'outlet_sales'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-600" />
          <span>Outlet Customer Sales</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {filteredSalesLogs.length}
          </span>
        </button>

        {/* Tab 7: Requisitions & Dispatches */}
        <button
          onClick={() => setActiveSubTab('requisitions')}
          className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
            activeSubTab === 'requisitions'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-600" />
          <span>Requisitions & Buffer Stocks</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {filteredRequisitions.length}
          </span>
        </button>
      </div>

      {/* Main Tab Content Display */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-500">Querying master supply chain telemetry...</span>
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
        ) : activeSubTab === 'master_hierarchy' ? (
          /* =========================================================================
             SUB-TAB 1: MASTER SUPPLY CHAIN & PSR SALES HIERARCHY TREE
             Supplier -> Sales Officers -> PSRs -> Outlets & Products Sold
             ========================================================================= */
          <div className="p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                  <span>Supply Chain Master Tree & Field Product Sales</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    Master Data Access
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Full multi-tier hierarchy: Regional Suppliers, Sales Officers under each supplier, Pre-Sales Officers (PSRs), allocated outlets, and individual product sales counts.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {filteredHierarchySuppliers.length} Suppliers
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  {salesOfficers.length} Sales Officers
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                  {psrs.length} Field PSRs
                </span>
              </div>
            </div>

            {filteredHierarchySuppliers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No suppliers found matching the active filters.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredHierarchySuppliers.map((sup) => {
                  const supOfficers = salesOfficers.filter((so) => Number(so.supplier_id) === Number(sup.supplier_id));
                  const supPsrs = psrs.filter((p) => Number(p.supplier_id) === Number(sup.supplier_id));
                  const supOutlets = outlets.filter((o) => Number(o.supplier_id) === Number(sup.supplier_id));
                  const totalCasesSold = supPsrs.reduce((sum, p) => sum + (p.total_cases_sold || 0), 0);
                  const totalRev = supPsrs.reduce((sum, p) => sum + (p.total_revenue || 0), 0);

                  return (
                    <div
                      key={sup.supplier_id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 space-y-4 shadow-2xs hover:border-indigo-300 transition-all"
                    >
                      {/* Supplier Tier 1 Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 bg-white p-4 rounded-xl border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-oswald text-base font-bold text-slate-900 tracking-wide">
                                {getSupplierDisplayName(sup)}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {sup.division_name || 'Regional Hub'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                ID #{sup.supplier_id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Depot: <strong>{sup.depot_address || 'Regional Central Depot'}</strong></span>
                              <span>•</span>
                              <span>Phone: <strong>{sup.phone_number || 'N/A'}</strong></span>
                            </p>
                          </div>
                        </div>

                        {/* Supplier Quick Metrics */}
                        <div className="flex items-center gap-2 flex-wrap text-xs self-start lg:self-center">
                          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-right">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Depot Stock</span>
                            <span className="font-oswald font-black text-slate-800">
                              {getSupplierStockCount(sup)} cases
                            </span>
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                            <span className="text-[10px] text-emerald-600 block font-bold uppercase">Commercial Wallet</span>
                            <span className="font-oswald font-black text-emerald-800">
                              ৳{formatMoney(sup.wallet_balance || 0)}
                            </span>
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-right">
                            <span className="text-[10px] text-blue-600 block font-bold uppercase">PSR Cases Sold</span>
                            <span className="font-oswald font-black text-blue-800">
                              {totalCasesSold} cases (৳{formatMoney(totalRev)})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tier 2: Sales Officers Under this Supplier */}
                      <div className="space-y-3 pl-0 sm:pl-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                          <span>Sales Officers Under Supplier ({supOfficers.length})</span>
                        </div>

                        {supOfficers.length === 0 ? (
                          <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-400">
                            No Sales Officers registered under this regional supplier hub.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {supOfficers.map((so) => {
                              const soPsrs = psrs.filter((p) => Number(p.sales_officer_id) === Number(so.id));
                              const soCases = soPsrs.reduce((sum, p) => sum + (p.total_cases_sold || 0), 0);
                              const soRev = soPsrs.reduce((sum, p) => sum + (p.total_revenue || 0), 0);

                              return (
                                <div
                                  key={so.id}
                                  className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs"
                                >
                                  {/* SO Header Strip */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        <Briefcase className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h5 className="font-bold text-slate-900 text-xs">
                                            {so.name}
                                          </h5>
                                          <span className="px-2 py-0.2 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                            {so.officer_code}
                                          </span>
                                          <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                            {so.city} — {so.assigned_area}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                          <span>Phone: {so.phone}</span>
                                          <span>•</span>
                                          <span>Email: {so.email}</span>
                                          <span>•</span>
                                          <span>Monthly Target: ৳{formatMoney(so.monthly_target)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-100 text-[11px]">
                                        {soCases} Cases Sold by PSRs (৳{formatMoney(soRev)})
                                      </span>
                                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[11px]">
                                        {soPsrs.length} Field PSRs
                                      </span>
                                    </div>
                                  </div>

                                  {/* Tier 3: PSRs Under this Sales Officer */}
                                  <div className="space-y-2.5 pt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                      <UserCheck className="w-3 h-3 text-teal-600" />
                                      <span>Pre-Sales Officers (PSRs) Under {so.name} ({soPsrs.length})</span>
                                    </span>

                                    {soPsrs.length === 0 ? (
                                      <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                        No PSR field officers assigned under this Sales Officer.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 gap-3">
                                        {soPsrs.map((psr) => {
                                          return (
                                            <div
                                              key={psr.id}
                                              className="p-3.5 rounded-xl border border-teal-200/80 bg-teal-50/20 space-y-3 hover:border-teal-400 transition-all"
                                            >
                                              {/* PSR Information Header */}
                                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                  </div>
                                                  <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <span className="font-bold text-slate-900 text-xs">
                                                        {psr.name}
                                                      </span>
                                                      <span className="px-2 py-0.2 rounded-md text-[10px] font-mono font-bold bg-teal-100 text-teal-900 border border-teal-200">
                                                        {psr.psr_code}
                                                      </span>
                                                      <span className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                                        {psr.status}
                                                      </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                                      <span>Phone: {psr.phone}</span>
                                                      <span>•</span>
                                                      <span>Route: <strong className="text-slate-700">{psr.sub_route || 'Not assigned'}</strong></span>
                                                      <span>•</span>
                                                      <span>Area: {psr.assigned_area}</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* PSR Sales Metrics Total */}
                                                <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                                                  <div className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-right">
                                                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Total Cases Sold</span>
                                                    <span className="font-oswald font-black text-teal-800 text-sm">
                                                      {psr.total_cases_sold} cases
                                                    </span>
                                                  </div>
                                                  <div className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-right">
                                                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Total PSR Revenue</span>
                                                    <span className="font-oswald font-black text-emerald-700 text-sm">
                                                      ৳{formatMoney(psr.total_revenue)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* PSR Target Progress Bar */}
                                              {psr.target_cases > 0 && (
                                                <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1.5">
                                                  <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-medium text-slate-600 flex items-center gap-1">
                                                      <TargetIcon className="w-3 h-3 text-indigo-600" />
                                                      <span>Assigned Target: <strong>{psr.target_cases} cases</strong> ({psr.target_sku_ounces || 'All SKUs'})</span>
                                                    </span>
                                                    <span className="font-mono font-bold text-indigo-700 text-xs">
                                                      {psr.achieved_cases} of {psr.target_cases} cases ({psr.target_progress_pct}%)
                                                    </span>
                                                  </div>
                                                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-indigo-600 transition-all duration-500"
                                                      style={{ width: `${Math.min(100, Math.max(2, psr.target_progress_pct))}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              )}

                                              {/* Products Sold Breakdown by this PSR */}
                                              <div className="space-y-1.5 pt-0.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                                  <Package className="w-3 h-3 text-blue-500" />
                                                  <span>Products Sold by {psr.name} ({psr.product_sales?.length || 0} Beverage SKUs)</span>
                                                </span>

                                                {(!psr.product_sales || psr.product_sales.length === 0) ? (
                                                  <div className="p-2 rounded-lg bg-white border border-dashed border-slate-200 text-[11px] text-slate-400 text-center">
                                                    No outlet orders booked by this PSR yet.
                                                  </div>
                                                ) : (
                                                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                                    <table className="w-full text-left text-xs">
                                                      <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                                                        <tr>
                                                          <th className="py-1.5 px-3">Beverage Product SKU</th>
                                                          <th className="py-1.5 px-3 text-right">Cases Sold</th>
                                                          <th className="py-1.5 px-3 text-right">Order Value (৳)</th>
                                                          <th className="py-1.5 px-3 text-center">Orders Count</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-100">
                                                        {psr.product_sales.map((ps) => (
                                                          <tr key={ps.product_id} className="hover:bg-slate-50">
                                                            <td className="py-1.5 px-3 font-semibold text-slate-900">
                                                              {ps.product_name}
                                                            </td>
                                                            <td className="py-1.5 px-3 text-right font-oswald font-black text-indigo-700">
                                                              {ps.total_cases_sold} <span className="text-[10px] font-sans font-normal text-slate-400">cases</span>
                                                            </td>
                                                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                                                              ৳{formatMoney(ps.total_amount)}
                                                            </td>
                                                            <td className="py-1.5 px-3 text-center font-semibold text-slate-600">
                                                              {ps.orders_count}
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Allocated Outlets to this PSR */}
                                              <div className="space-y-1 pt-0.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                                                  <Store className="w-3 h-3 text-amber-600" />
                                                  <span>Allocated Retail Outlets ({psr.assigned_outlets_count || 0} Shops)</span>
                                                </span>

                                                {(!psr.assigned_outlets || psr.assigned_outlets.length === 0) ? (
                                                  <span className="text-[11px] text-slate-400 italic block">
                                                    No retail outlets allocated to this PSR yet.
                                                  </span>
                                                ) : (
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    {psr.assigned_outlets.map((shop) => (
                                                      <span
                                                        key={shop.outlet_id}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-800 shadow-2xs"
                                                      >
                                                        <Store className="w-3 h-3 text-amber-500" />
                                                        <span>{shop.outlet_name} ({shop.branch_name || shop.city})</span>
                                                        {shop.sub_route && (
                                                          <span className="text-[9px] text-slate-400 font-mono">[{shop.sub_route}]</span>
                                                        )}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeSubTab === 'psr_orders' ? (
          /* =========================================================================
             SUB-TAB 2: PSR FIELD ORDERS AUDIT LOG
             Line-item audit of every single field visit order taken by PSRs
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Order Code</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Supplier Hub</th>
                  <th className="py-3 px-4">Sales Officer</th>
                  <th className="py-3 px-4">PSR Agent</th>
                  <th className="py-3 px-4">Outlet Store</th>
                  <th className="py-3 px-4">Beverage Product</th>
                  <th className="py-3 px-3 text-right">Cases</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total (৳)</th>
                  <th className="py-3 px-3 text-center">Urgency</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPsrOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      No PSR field orders match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredPsrOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectedItem({ type: 'psr_order', data: ord })}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-orange-600">
                          {ord.order_code}
                        </span>
                        <div className="text-[10px] text-slate-400">#{ord.id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                        {ord.created_at ? new Date(ord.created_at).toLocaleString() : 'Just now'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {ord.supplier_name || 'Dhaka Metropolitan Hub'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {ord.sales_officer_name || 'Sales Officer'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{ord.psr_name || 'PSR Agent'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{ord.outlet_name}</span>
                        {ord.sub_route && (
                          <span className="text-[10px] text-slate-400 font-mono block">{ord.sub_route}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {ord.product_name}
                      </td>
                      <td className="py-3 px-3 text-right font-oswald text-sm font-black text-indigo-700">
                        {ord.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ৳{formatMoney(ord.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        ৳{formatMoney(ord.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ord.urgency === 'HIGH' || ord.urgency === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ord.urgency || 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ord.status === 'DELIVERED' || ord.status === 'DISPATCHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.status === 'APPROVED_BY_SO'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeSubTab === 'matrix' ? (
          /* =========================================================================
             SUB-TAB 3: OUTLET PRODUCT PERFORMANCE MATRIX (Profit, Stocks, Price)
             ========================================================================= */
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
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{row.brand} {row.flavor_variant}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {row.sku} • {row.size_volume} {row.packaging}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ৳{formatMoney(row.supplier_buy_rate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        ৳{formatMoney(row.outlet_wholesale_rate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{formatMoney(row.retail_customer_mrp)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700">
                        +৳{formatMoney(row.supplier_unit_profit)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-teal-700">
                        +৳{formatMoney(row.outlet_unit_margin)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">({formatMoney(row.outlet_margin_percent)}%)</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            row.stock_status === 'OUT_OF_STOCK'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : row.stock_status === 'LOW_STOCK'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {row.current_shelf_stock} units
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-oswald text-sm font-black text-slate-800">
                        {row.units_sold}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{formatMoney(row.revenue_generated)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-teal-700 text-sm">
                        ৳{formatMoney(row.outlet_profit_earned)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeSubTab === 'supplier_stocks' ? (
          /* =========================================================================
             SUB-TAB 4: SUPPLIER AVAILABLE STOCKS
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Regional Supplier Hub</th>
                  <th className="py-3 px-4">Beverage Product SKU</th>
                  <th className="py-3 px-3 text-center">Health</th>
                  <th className="py-3 px-3 text-right">Available Depot Cases</th>
                  <th className="py-3 px-3 text-right">Supplier Unit Buy Rate</th>
                  <th className="py-3 px-4 text-right">Stock Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSupplierStocks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No supplier stocks found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredSupplierStocks.map((item, idx) => (
                    <tr
                      key={`${item.supplier_id}-${item.product_id}-${idx}`}
                      className="hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.supplier_name || 'Regional Supplier Depot'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.brand} {item.flavor_variant}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.sku} • {item.size_volume} {item.packaging}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.current_stock === 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.current_stock <= 20
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.current_stock === 0 ? 'Out of Stock' : item.current_stock <= 20 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-oswald text-sm font-black text-slate-900">
                        {item.current_stock} cases
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ৳{formatMoney(item.unit_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        ৳{formatMoney(item.total_value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeSubTab === 'supplier_txns' ? (
          /* =========================================================================
             SUB-TAB 5: SUPPLIER TRANSACTIONS & PROFIT LOGS
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Txn Code</th>
                  <th className="py-3 px-4">Supplier Hub</th>
                  <th className="py-3 px-4">Type & Nature</th>
                  <th className="py-3 px-4">Details / Description</th>
                  <th className="py-3 px-3 text-right">Amount (৳)</th>
                  <th className="py-3 px-3 text-right">Profit Earned</th>
                  <th className="py-3 px-4 text-right">Wallet Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSupplierTxns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No supplier transactions match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredSupplierTxns.map((t, idx) => (
                    <tr
                      key={t.transaction_id || t.id || idx}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectedItem({ type: 'supplier_txn', data: t })}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {t.reference_code || `TXN-${t.transaction_id || t.id}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {t.supplier_name || 'Regional Supplier Depot'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {t.transaction_type || t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[240px]" title={t.description}>
                        {t.description || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{formatMoney(t.amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
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
          /* =========================================================================
             SUB-TAB 6: OUTLET CUSTOMER SALES RECEIPTS
             ========================================================================= */
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
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{sale.outlet_name || 'Outlet Branch'}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {sale.product_name || `${sale.brand || ''} ${sale.flavor_variant || ''}`.trim() || 'Beverage Product'}
                      </td>
                      <td className="py-3 px-3 text-center font-oswald text-sm font-black text-slate-800">
                        {sale.quantity ?? 1}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ৳{formatMoney(sale.unit_price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{formatMoney(sale.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-teal-700 text-sm">
                        +৳{formatMoney(sale.estimated_outlet_profit ?? sale.outlet_margin_earned)}
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
          /* =========================================================================
             SUB-TAB 7: REQUISITIONS & BUFFER STOCKS
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Req Code</th>
                  <th className="py-3 px-4">Franchise Outlet</th>
                  <th className="py-3 px-4">Responsible Supplier</th>
                  <th className="py-3 px-4">Beverage Product</th>
                  <th className="py-3 px-3 text-center">Requested Quantity</th>
                  <th className="py-3 px-3 text-center">Urgency</th>
                  <th className="py-3 px-3 text-center">Dispatch Status</th>
                  <th className="py-3 px-4">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock requisitions found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((req, idx) => (
                    <tr
                      key={req.requisition_id || req.id || idx}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectedItem({ type: 'requisition', data: req })}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {req.requisition_code || `REQ-${req.id || req.requisition_id}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
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
                  Audit Telemetry Record Details ({inspectedItem.type.toUpperCase()})
                </h3>
              </div>
              <button
                onClick={() => setInspectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[70vh] overflow-y-auto space-y-2 text-xs">
              {Object.entries(inspectedItem.data).map(([key, val]) => (
                <div key={key} className="flex items-start justify-between py-1.5 border-b border-slate-100">
                  <span className="font-mono text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[260px] truncate">
                    {typeof val === 'number'
                      ? key.includes('rate') || key.includes('price') || key.includes('amount') || key.includes('revenue') || key.includes('profit') || key.includes('margin') || key.includes('cost')
                        ? `৳${formatMoney(val)}`
                        : val.toString()
                      : typeof val === 'object' && val !== null
                      ? JSON.stringify(val)
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

// Target Icon Helper Component
const TargetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
