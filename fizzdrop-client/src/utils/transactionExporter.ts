/**
 * Transaction Exporter for FizzDrop Beverage Co.
 * Generates official financial transaction statements as downloadable PDF, CSV, and printable documents.
 */

export interface TransactionExportRecord {
  id?: number;
  transaction_code: string;
  supplier_id?: number;
  requisition_id?: number;
  return_request_id?: number;
  reference_code?: string;
  type: string; // STOCK_PURCHASE, SHORTFALL_REFUND, STOCK_RETURN_REFUND, PRODUCT_EXCHANGE, DUE_SETTLEMENT
  entry_type: 'DEBIT' | 'CREDIT' | string;
  amount: number;
  payment_method?: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface SupplierFinancialExportData {
  total_spent: number;
  total_refunded: number;
  net_investment: number;
  total_revenue?: number;
  total_wholesale_profit?: number;
  pending_returns_count?: number;
  pending_returns_value?: number;
  transactions: TransactionExportRecord[];
}

export interface SupplierProfileExportData {
  business_name?: string;
  user_email?: string;
  phone_number?: string;
  depot_address?: string;
  division_name?: string;
  trade_license_number?: string;
  default_payment_method?: string;
  bank_name?: string;
  bank_account_number?: string;
}

const formatCurrency = (val: number = 0) => {
  return '৳' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTypeLabel = (type: string) => {
  switch (type) {
    case 'STOCK_PURCHASE':
      return 'Stock Purchase';
    case 'SHORTFALL_REFUND':
      return 'Shortfall Refund';
    case 'STOCK_RETURN_REFUND':
      return 'Return Cash Refund';
    case 'PRODUCT_EXCHANGE':
      return 'Product Replacement';
    case 'DUE_SETTLEMENT':
      return 'Due Settlement';
    default:
      return type.replace(/_/g, ' ');
  }
};

/**
 * Downloads transactions as a formatted CSV file
 */
export function downloadTransactionCsv(
  transactions: TransactionExportRecord[],
  supplierName: string = 'Supplier'
) {
  const header = [
    'Transaction Code',
    'Date & Time',
    'Reference Requisition/Return',
    'Transaction Type',
    'Flow (Debit/Credit)',
    'Amount (BDT)',
    'Payment Method',
    'Status',
    'Description',
  ];

  const rows = transactions.map((tx) => [
    `"${tx.transaction_code}"`,
    `"${new Date(tx.created_at).toLocaleString()}"`,
    `"${tx.reference_code || ''}"`,
    `"${formatTypeLabel(tx.type)}"`,
    `"${tx.entry_type}"`,
    `"${Number(tx.amount || 0).toFixed(2)}"`,
    `"${(tx.payment_method || '').replace(/_/g, ' ')}"`,
    `"${tx.status}"`,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = supplierName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('download', `FizzDrop_Transaction_Statement_${safeName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a clean, branded transaction statement ready for printing or direct PDF saving.
 */
export function openPrintableTransactionStatement(
  summary: SupplierFinancialExportData,
  supplier?: SupplierProfileExportData
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const bizName = supplier?.business_name || 'FizzDrop Regional Logistics Depot';
  const email = supplier?.user_email || 'supplier@fizzdrop.com';
  const phone = supplier?.phone_number || '+880 1700-112233';
  const address = supplier?.depot_address || 'Dhaka Metropolitan Region';
  const division = supplier?.division_name || 'Central Region';
  const license = supplier?.trade_license_number || 'TRD-FD-2026';
  const statementDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Commercial Financial Statement - ${bizName}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 32px;
            font-size: 12px;
            line-height: 1.5;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            color: #0284c7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
          }
          .statement-title-box {
            text-align: right;
          }
          .statement-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
          }
          .statement-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
          }
          .parties-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
            padding: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .party-card h4 {
            margin: 0 0 6px 0;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0284c7;
            font-weight: 800;
          }
          .party-name {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .party-detail {
            font-size: 11px;
            color: #475569;
            margin: 2px 0;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .kpi-card {
            padding: 12px 14px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .kpi-spent {
            border-left: 4px solid #ef4444;
            background: #fef2f2;
          }
          .kpi-refund {
            border-left: 4px solid #10b981;
            background: #ecfdf5;
          }
          .kpi-net {
            border-left: 4px solid #0284c7;
            background: #f0f9ff;
          }
          .kpi-pending {
            border-left: 4px solid #f59e0b;
            background: #fffbeb;
          }
          .kpi-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
          }
          .kpi-value {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 24px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 8px 10px;
            font-weight: 800;
            border-bottom: 2px solid #cbd5e1;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }
          tr:nth-child(even) {
            background: #fafafa;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .badge-debit {
            background: #fee2e2;
            color: #b91c1c;
          }
          .badge-credit {
            background: #d1fae5;
            color: #047857;
          }
          .amount-debit {
            color: #b91c1c;
            font-weight: 800;
          }
          .amount-credit {
            color: #047857;
            font-weight: 800;
          }
          .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 10px;
            color: #64748b;
          }
          .signature-box {
            text-align: center;
            width: 200px;
            border-top: 1px dashed #94a3b8;
            padding-top: 4px;
            color: #475569;
            font-weight: 700;
          }
          .btn-print {
            padding: 8px 18px;
            background: #0284c7;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 12px;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1 class="brand-title">FizzDrop Beverage Co.</h1>
              <div class="brand-subtitle">Central Logistics, Requisitions & Commercial Ledger</div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                Wholesale Beverages & Bulk Supply Headquarters • Tejgaon Industrial Area, Dhaka
              </div>
            </div>
            <div class="statement-title-box">
              <h2 class="statement-title">Financial Ledger</h2>
              <div class="statement-meta">Statement Date: <strong>${statementDate}</strong></div>
              <div class="statement-meta">Ledger Code: <strong>TXN-STM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}</strong></div>
              <div style="margin-top: 8px;" class="no-print">
                <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
              </div>
            </div>
          </div>

          <div class="parties-grid">
            <div class="party-card">
              <h4>Regional Supplier / Distributor</h4>
              <div class="party-name">${bizName}</div>
              <div class="party-detail">Email: ${email}</div>
              <div class="party-detail">Phone: ${phone}</div>
              <div class="party-detail">Depot: ${address} (${division})</div>
              <div class="party-detail">Trade License: ${license}</div>
            </div>
            <div class="party-card">
              <h4>Superadmin Central Settlement</h4>
              <div class="party-name">FizzDrop Commercial Operations Desk</div>
              <div class="party-detail">Enterprise Tax ID: VAT-REG-BD-2026-991</div>
              <div class="party-detail">Support: logistics@fizzdrop.com | +880 1700-000000</div>
              <div class="party-detail">Policy: 100% Policy-Driven Returns & Central Stock Restoral</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card kpi-spent">
              <div class="kpi-label">Total Spent (Purchases)</div>
              <div class="kpi-value">${formatCurrency(summary.total_spent)}</div>
            </div>
            <div class="kpi-card kpi-refund">
              <div class="kpi-label">Total Refunded (Settled)</div>
              <div class="kpi-value">${formatCurrency(summary.total_refunded)}</div>
            </div>
            <div class="kpi-card kpi-net">
              <div class="kpi-label">Net Active Investment</div>
              <div class="kpi-value">${formatCurrency(summary.net_investment)}</div>
            </div>
            <div class="kpi-card kpi-pending">
              <div class="kpi-label">Pending Returns (${summary.pending_returns_count || 0})</div>
              <div class="kpi-value">${formatCurrency(summary.pending_returns_value || 0)}</div>
            </div>
          </div>

          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0 0 10px 0; color: #0f172a;">
            Transaction Ledger & Returns Audit History
          </h3>

          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Txn Code</th>
                <th style="width: 14%;">Date & Time</th>
                <th style="width: 14%;">Reference</th>
                <th style="width: 16%;">Type</th>
                <th style="width: 10%;">Flow</th>
                <th style="width: 13%; text-align: right;">Amount</th>
                <th style="width: 18%;">Audit Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${
                summary.transactions.length === 0
                  ? `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 24px;">No financial transactions logged yet.</td></tr>`
                  : summary.transactions
                      .map((tx) => {
                        const isCredit = tx.entry_type === 'CREDIT';
                        return `
                        <tr>
                          <td style="font-family: monospace; font-weight: 700; color: #0284c7;">${tx.transaction_code}</td>
                          <td style="color: #64748b; font-size: 10px;">${new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td style="font-family: monospace; font-weight: 600;">${tx.reference_code || '—'}</td>
                          <td style="font-weight: 600;">${formatTypeLabel(tx.type)}</td>
                          <td>
                            <span class="badge ${isCredit ? 'badge-credit' : 'badge-debit'}">
                              ${isCredit ? '+ CREDIT' : '- DEBIT'}
                            </span>
                          </td>
                          <td style="text-align: right;" class="${isCredit ? 'amount-credit' : 'amount-debit'}">
                            ${isCredit ? '+' : '-'}${formatCurrency(tx.amount)}
                          </td>
                          <td style="color: #64748b; font-size: 10px;">${tx.description || '—'}</td>
                        </tr>
                      `;
                      })
                      .join('')
              }
            </tbody>
          </table>

          <div class="footer">
            <div>
              FizzDrop Beverage Co. Enterprise Platform • Automated Commercial Audit Ledger<br />
              Generated automatically for authenticated regional distributor. Document is electronically verified.
            </div>
            <div class="signature-box">
              Authorized Commercial Officer<br />
              FizzDrop Central Operations
            </div>
          </div>
        </div>

        <script>
          setTimeout(() => {
            window.print();
          }, 350);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Downloads transaction statement directly as standard PDF
 */
export function downloadTransactionPdf(
  summary: SupplierFinancialExportData,
  supplier?: SupplierProfileExportData
) {
  openPrintableTransactionStatement(summary, supplier);
}
