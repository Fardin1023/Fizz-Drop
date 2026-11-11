import type { AppNotification } from '../types/notification';

export interface NotificationDestination {
  path: string;
  tab: string;
  label: string;
  fullUrl: string;
}

/**
 * Resolves the target portal route and active tab for any AppNotification
 * based on recipient role, notification type, title, and payload hints.
 */
export const getNotificationDestination = (
  notification: AppNotification,
  currentRole?: string
): NotificationDestination => {
  const role = (notification.recipient_role || currentRole || '').toUpperCase();
  const type = (notification.type || '').toUpperCase();
  const title = (notification.title || '').toUpperCase();
  const msg = (notification.message || '').toUpperCase();

  // 1. REGIONAL SUPPLIER PORTAL (/admin)
  if (role === 'SUPPLIER') {
    if (
      type.includes('SO_STOCK_REQUEST') ||
      type.includes('NEW_REQUISITION') ||
      type.includes('SALES_OFFICER_REQUISITION') ||
      type.includes('OUTLET_REQ') ||
      title.includes('STOCK NEEDED') ||
      title.includes('REQUISITION') ||
      msg.includes('STOCK NEEDED') ||
      msg.includes('STOCK IS NEEDED')
    ) {
      return { path: '/admin', tab: 'outlet-requests', label: 'Outlet Requisitions', fullUrl: '/admin?tab=outlet-requests' };
    }
    if (
      type.includes('DISPATCH') ||
      type.includes('DELIVERY') ||
      type.includes('SO_ORDER_DISPATCHED') ||
      title.includes('DISPATCH') ||
      msg.includes('DISPATCHED')
    ) {
      return { path: '/admin', tab: 'stock-sales-dispatch', label: 'Depot Dispatches', fullUrl: '/admin?tab=stock-sales-dispatch' };
    }
    if (
      type.includes('TRANSACTION') ||
      type.includes('WALLET') ||
      type.includes('PAYMENT') ||
      type.includes('TOPUP') ||
      type.includes('CREDIT') ||
      title.includes('WALLET') ||
      title.includes('PAYMENT') ||
      title.includes('TRANSACTION')
    ) {
      return { path: '/admin', tab: 'transactions', label: 'Commercial Ledger', fullUrl: '/admin?tab=transactions' };
    }
    if (
      type.includes('OUTLET') ||
      type.includes('SALES_OFFICER') ||
      title.includes('SALES OFFICER') ||
      title.includes('OUTLET')
    ) {
      return { path: '/admin', tab: 'outlets', label: 'Allocated Outlets', fullUrl: '/admin?tab=outlets' };
    }
    if (
      type.includes('APPROVED') ||
      type.includes('REJECTED') ||
      type.includes('PARTIAL') ||
      type.includes('REQUISITION_ACTION') ||
      type.includes('RESTOCK')
    ) {
      return { path: '/admin', tab: 'history', label: 'Requisition History', fullUrl: '/admin?tab=history' };
    }
    return { path: '/admin', tab: 'outlet-requests', label: 'Outlet Requisitions', fullUrl: '/admin?tab=outlet-requests' };
  }

  // 2. SALES OFFICER PORTAL (/sales-officer)
  if (role === 'SALES_OFFICER') {
    if (
      type.includes('PSR_ORDER') ||
      type.includes('NEW_PSR') ||
      type.includes('REFUND') ||
      type.includes('PSR_REFUND') ||
      title.includes('ORDER') ||
      title.includes('REFUND') ||
      msg.includes('ORDER') ||
      msg.includes('REFUND')
    ) {
      return { path: '/sales-officer', tab: 'psr-team', label: 'PSR Orders & Team', fullUrl: '/sales-officer?tab=psr-team' };
    }
    if (
      type.includes('SUPPLIER_DISPATCHED') ||
      type.includes('DISPATCH') ||
      type.includes('PROFIT') ||
      type.includes('DISTRIBUTION') ||
      title.includes('DISPATCH') ||
      title.includes('PROFIT') ||
      msg.includes('PROFIT') ||
      msg.includes('DISPATCHED')
    ) {
      return { path: '/sales-officer', tab: 'profit-ledger', label: 'Wholesale Profit Ledger', fullUrl: '/sales-officer?tab=profit-ledger' };
    }
    if (
      type.includes('SALES_OFFICER_PURCHASE') ||
      type.includes('BUFFER') ||
      title.includes('BUFFER') ||
      title.includes('PURCHASE CONFIRMED')
    ) {
      return { path: '/sales-officer', tab: 'overview', label: 'Wholesale Buffer Inventory', fullUrl: '/sales-officer?tab=overview' };
    }
    if (
      type.includes('SUPPLIER') ||
      type.includes('REQUISITION_ACTION') ||
      title.includes('SUPPLIER')
    ) {
      return { path: '/sales-officer', tab: 'supplier-link', label: 'Supplier Hub Link', fullUrl: '/sales-officer?tab=supplier-link' };
    }
    if (
      type.includes('OUTLET_ALLOTMENT') ||
      title.includes('OUTLET') ||
      title.includes('SHOP')
    ) {
      return { path: '/sales-officer', tab: 'outlets', label: 'Territory Outlets', fullUrl: '/sales-officer?tab=outlets' };
    }
    if (
      type.includes('SO_STOCK_REQUEST') ||
      type.includes('DEMAND') ||
      title.includes('DEMAND')
    ) {
      return { path: '/sales-officer', tab: 'demands', label: 'Branch Demands', fullUrl: '/sales-officer?tab=demands' };
    }
    return { path: '/sales-officer', tab: 'psr-team', label: 'PSR Orders & Team', fullUrl: '/sales-officer?tab=psr-team' };
  }

  // 3. PRE-SALES REPRESENTATIVE (PSR) PORTAL (/psr)
  if (role === 'PSR') {
    if (
      type.includes('REFUND') ||
      title.includes('REFUND') ||
      msg.includes('REFUND')
    ) {
      return { path: '/psr', tab: 'refunds', label: 'Returns & Refunds', fullUrl: '/psr?tab=refunds' };
    }
    if (
      type.includes('VISIT') ||
      title.includes('VISIT') ||
      msg.includes('VISIT')
    ) {
      return { path: '/psr', tab: 'visits', label: 'Shop Visits', fullUrl: '/psr?tab=visits' };
    }
    if (
      type.includes('TARGET') ||
      type.includes('ROUTE') ||
      type.includes('ALLOT') ||
      type.includes('SHOP') ||
      title.includes('TARGET') ||
      title.includes('ROUTE') ||
      title.includes('ALLOT') ||
      msg.includes('TARGET') ||
      msg.includes('ROUTE')
    ) {
      return { path: '/psr', tab: 'outlets', label: 'Assigned Stores & Route', fullUrl: '/psr?tab=outlets' };
    }
    if (
      type.includes('ORDER') ||
      type.includes('DISPATCH') ||
      type.includes('DELIVERY') ||
      type.includes('STOCK') ||
      title.includes('ORDER') ||
      title.includes('DELIVER') ||
      title.includes('DISPATCH') ||
      msg.includes('ORDER') ||
      msg.includes('DISPATCH')
    ) {
      return { path: '/psr', tab: 'orders', label: 'Order Bookings', fullUrl: '/psr?tab=orders' };
    }
    return { path: '/psr', tab: 'orders', label: 'Order Bookings', fullUrl: '/psr?tab=orders' };
  }

  // 4. RETAIL OUTLET PORTAL (/outlet)
  if (role === 'OUTLET') {
    if (
      type.includes('DISPATCH') ||
      type.includes('DELIVERY') ||
      type.includes('INBOUND') ||
      type.includes('SHIPMENT') ||
      type.includes('DIRECT_DISPATCH') ||
      type.includes('DIRECT_SUPPLY') ||
      title.includes('DISPATCH') ||
      title.includes('DELIVERY') ||
      title.includes('DELIVERED') ||
      msg.includes('DISPATCH') ||
      msg.includes('DELIVER')
    ) {
      return { path: '/outlet', tab: 'deliveries', label: 'Inbound Deliveries', fullUrl: '/outlet?tab=deliveries' };
    }
    if (
      type.includes('STOCK') ||
      type.includes('INVENTORY') ||
      title.includes('INVENTORY') ||
      title.includes('STOCK')
    ) {
      return { path: '/outlet', tab: 'inventory', label: 'Shelf Stock', fullUrl: '/outlet?tab=inventory' };
    }
    if (
      type.includes('SALE') ||
      type.includes('POS') ||
      title.includes('SALE') ||
      title.includes('PURCHASE')
    ) {
      return { path: '/outlet', tab: 'pos', label: 'Point of Sale', fullUrl: '/outlet?tab=pos' };
    }
    if (
      type.includes('LEDGER') ||
      type.includes('PAYMENT') ||
      type.includes('INVOICE') ||
      type.includes('RECEIPT') ||
      title.includes('LEDGER') ||
      title.includes('PAYMENT')
    ) {
      return { path: '/outlet', tab: 'ledger', label: 'Financial Ledger', fullUrl: '/outlet?tab=ledger' };
    }
    if (
      type.includes('REQUISITION') ||
      type.includes('REQUEST') ||
      title.includes('REQUISITION')
    ) {
      return { path: '/outlet', tab: 'request', label: 'Stock Requests', fullUrl: '/outlet?tab=request' };
    }
    return { path: '/outlet', tab: 'deliveries', label: 'Inbound Deliveries', fullUrl: '/outlet?tab=deliveries' };
  }

  // 5. SUPERADMIN PORTAL (/superadmin)
  if (role === 'SUPERADMIN') {
    if (
      type.includes('REQUISITION') ||
      type.includes('STOCK_REQ') ||
      title.includes('REQUISITION') ||
      title.includes('RESTOCK') ||
      msg.includes('REQUISITION')
    ) {
      return { path: '/superadmin', tab: 'requisitions', label: 'Requisitions Hub', fullUrl: '/superadmin?tab=requisitions' };
    }
    if (
      type.includes('SUPPLIER') ||
      title.includes('SUPPLIER') ||
      msg.includes('SUPPLIER')
    ) {
      return { path: '/superadmin', tab: 'suppliers', label: 'Regional Suppliers', fullUrl: '/superadmin?tab=suppliers' };
    }
    if (
      type.includes('SALES_OFFICER') ||
      title.includes('SALES OFFICER') ||
      msg.includes('SALES OFFICER')
    ) {
      return { path: '/superadmin', tab: 'sales-officers', label: 'Sales Officers', fullUrl: '/superadmin?tab=sales-officers' };
    }
    if (
      type.includes('PSR') ||
      title.includes('PSR') ||
      title.includes('PRE-SALES') ||
      msg.includes('PSR')
    ) {
      return { path: '/superadmin', tab: 'psr-officers', label: 'PSR Field Team', fullUrl: '/superadmin?tab=psr-officers' };
    }
    if (
      type.includes('LOG') ||
      type.includes('AUDIT') ||
      type.includes('COMMERCIAL') ||
      type.includes('SALE') ||
      title.includes('LOG') ||
      title.includes('COMMERCIAL') ||
      msg.includes('COMMERCIAL')
    ) {
      return { path: '/superadmin', tab: 'logs', label: 'Commercial Logs', fullUrl: '/superadmin?tab=logs' };
    }
    if (
      type.includes('INVENTORY') ||
      type.includes('DISTRIBUTION') ||
      title.includes('INVENTORY') ||
      title.includes('DISTRIBUTION')
    ) {
      return { path: '/superadmin', tab: 'inventory', label: 'Stock Distribution', fullUrl: '/superadmin?tab=inventory' };
    }
    if (
      type.includes('OUTLET') ||
      title.includes('OUTLET') ||
      title.includes('STORE') ||
      title.includes('SHOP')
    ) {
      return { path: '/superadmin', tab: 'outlets', label: 'Retail Stores', fullUrl: '/superadmin?tab=outlets' };
    }
    if (
      type.includes('PRODUCT') ||
      title.includes('PRODUCT') ||
      title.includes('SKU')
    ) {
      return { path: '/superadmin', tab: 'products', label: 'Product Catalog', fullUrl: '/superadmin?tab=products' };
    }
    return { path: '/superadmin', tab: 'requisitions', label: 'Requisitions Hub', fullUrl: '/superadmin?tab=requisitions' };
  }

  // Fallback default
  return { path: '/admin', tab: 'history', label: 'Dashboard', fullUrl: '/admin?tab=history' };
};
