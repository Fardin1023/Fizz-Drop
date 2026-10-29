import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  Building2,
  CreditCard,
  FileText,
  Truck,
} from 'lucide-react';

export interface InvoiceItem {
  id?: number;
  product_id?: number;
  brand?: string;
  flavor_variant?: string;
  packaging?: string;
  size_volume?: string;
  sku?: string;
  base_price?: number;
  requested_quantity: number;
  approved_quantity: number;
}

export interface InvoiceData {
  id?: number;
  requisition_code: string;
  invoice_number?: string;
  supplier_name?: string;
  district_name?: string;
  division_name?: string;
  depot_address?: string;
  phone_number?: string;
  trade_license_number?: string;
  status: string;
  urgency: string;
  payment_method?: string;
  payment_status?: string;
  payment_reference?: string;
  created_at: string;
  updated_at?: string;
  items?: InvoiceItem[];
  total_requested_cases?: number;
  total_approved_cases?: number;
  total_amount?: number;
}

interface InvoiceModalProps {
  invoice: InvoiceData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const invoiceNumber = invoice.invoice_number || `INV-${invoice.requisition_code.replace('REQ-', '')}`;
  const requisitionCode = invoice.requisition_code;
  const issueDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const paymentMethodLabel = (() => {
    const m = (invoice.payment_method || 'CORPORATE_BANK_TRANSFER').toUpperCase();
    if (m.includes('BKASH')) return 'bKash Merchant B2B Direct';
    if (m.includes('NAGAD')) return 'Nagad Corporate Gateway';
    if (m.includes('NET_30') || m.includes('CREDIT')) return 'Net-30 Corporate Wholesale Credit';
    if (m.includes('CHEQUE') || m.includes('COD')) return 'Company Cheque on Depot Delivery';
    return 'Corporate Bank Wire / EFT (Dutch-Bangla Bank)';
  })();

  const paymentStatusLabel = (() => {
    const s = (invoice.payment_status || 'AUTHORIZED').toUpperCase();
    if (s.includes('PAID') || s.includes('SETTLED')) return 'PAID / SETTLED';
    if (s.includes('NET_30')) return 'NET-30 APPROVED';
    return 'AUTHORIZED (B2B ESCROW)';
  })();

  // Calculate pricing summary
  const items = invoice.items || [];
  const subtotal = items.reduce((sum, item) => {
    const qty = invoice.status === 'PENDING' ? item.requested_quantity : (item.approved_quantity > 0 ? item.approved_quantity : item.requested_quantity);
    const unitPrice = Number(item.base_price || 48.00);
    return sum + (unitPrice * qty);
  }, 0);

  const vat = subtotal * 0.05; // 5% wholesale distribution VAT
  const grandTotal = subtotal + vat;

  // Print invoice
  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoiceNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .badge-paid { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .box-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
            td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary { margin-left: auto; width: 300px; margin-top: 10px; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
            .summary-total { display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #1e293b; font-size: 15px; font-weight: 800; color: #1e3a8a; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
            .stamp { border: 2px solid #059669; color: #059669; padding: 6px 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: inline-block; transform: rotate(-3deg); }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download raw HTML invoice
  const handleDownloadFile = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FizzDrop Commercial Tax Invoice - ${invoiceNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 30px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }
    .title { font-size: 26px; font-weight: 900; color: #1e3a8a; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .box-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .summary { margin-left: auto; width: 320px; margin-top: 12px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .summary-total { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 900; color: #1e3a8a; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    .stamp { border: 2px solid #059669; color: #059669; padding: 8px 16px; border-radius: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FizzDrop-Invoice-${invoiceNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Actions Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="font-oswald text-sm font-bold uppercase tracking-wider">
              B2B Commercial Tax Invoice Preview
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-cyan-200">
              {invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Download standalone HTML invoice file"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span>Download File</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
          <div ref={printRef} className="max-w-3xl mx-auto space-y-6 text-slate-800">
            {/* Invoice Header */}
            <div className="header border-b-2 border-indigo-600 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                    FD
                  </div>
                  <span className="font-oswald text-2xl font-black uppercase tracking-tight text-indigo-950">
                    FIZZ<span className="text-indigo-600">DROP</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  FizzDrop Bottling & Regional Supply Logistics Corp.
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  BIN: 002918291-0101 | Mushak-6.3 Tax Reg
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                  COMMERCIAL TAX INVOICE
                </span>
                <span className="font-mono text-xl font-black text-zinc-900 block">
                  {invoiceNumber}
                </span>
                <div className="flex items-center gap-2 mt-1 sm:justify-end">
                  <span className="text-xs font-medium text-slate-500">Date: {issueDate}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    {paymentStatusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Consignor vs Consignee Grid */}
            <div className="grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shipped From */}
              <div className="box bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-1">
                <div className="box-title flex items-center gap-1.5 font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Shipped From (Central Hub)</span>
                </div>
                <p className="font-bold text-zinc-900">FizzDrop Central Logistics Depot</p>
                <p className="text-slate-600">Plot 12, Tejgaon Industrial Commercial Zone</p>
                <p className="text-slate-600">Dhaka-1208, Bangladesh</p>
                <p className="text-slate-500 font-mono text-[11px]">Phone: +880 2 9882233 / dispatch@fizzdrop.com</p>
              </div>

              {/* Billed & Consigned To */}
              <div className="box bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-1">
                <div className="box-title flex items-center gap-1.5 font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Billed To (Consignee Supplier)</span>
                </div>
                <p className="font-bold text-zinc-900">{invoice.supplier_name || 'Regional Supplier Depot'}</p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Trade License: {invoice.trade_license_number || 'TRD-DHK-2026-9812'}
                </p>
                <p className="text-slate-600">
                  Operational Depot: {invoice.depot_address || `${invoice.district_name || 'Dhaka'} Logistics Hub`}
                </p>
                <p className="text-slate-500 font-mono text-[11px]">
                  Region: {invoice.district_name || 'Dhaka'} ({invoice.division_name || 'Dhaka Division'})
                </p>
              </div>
            </div>

            {/* Commercial Terms & Requisition Reference */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-900 block">Payment Method</span>
                  <span className="font-semibold text-indigo-950">{paymentMethodLabel}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-900 block">Payment Reference</span>
                <span className="font-mono text-indigo-950 font-bold">{invoice.payment_reference || `TXN-${requisitionCode.replace('REQ-', '')}`}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-900 block">Requisition Ticket</span>
                <span className="font-mono text-indigo-950 font-bold">{requisitionCode}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-900 block">Operational Priority</span>
                <span className="font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded text-[10px] uppercase">
                  {invoice.urgency || 'NORMAL'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 font-mono text-[10px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item / SKU</th>
                    <th className="py-2.5 px-3">Beverage Specifications</th>
                    <th className="py-2.5 px-3 text-center">Req Cases</th>
                    <th className="py-2.5 px-3 text-center">Approved Cases</th>
                    <th className="py-2.5 px-3 text-right">Case Price (৳)</th>
                    <th className="py-2.5 px-3 text-right">Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const qty = invoice.status === 'PENDING' ? item.requested_quantity : (item.approved_quantity > 0 ? item.approved_quantity : item.requested_quantity);
                    const unitPrice = Number(item.base_price || 48.00);
                    const lineTotal = unitPrice * qty;

                    return (
                      <tr key={item.id || idx}>
                        <td className="py-3 px-3 font-mono font-bold text-zinc-900">
                          {item.sku || `SKU-BEV-${item.product_id || idx + 1}`}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-zinc-900 block">
                            {item.brand || 'Flagship Beverage'} {item.flavor_variant || ''}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.packaging || 'Bottle'} ({item.size_volume || '500ml'})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-700">
                          {item.requested_quantity}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                          {invoice.status === 'PENDING' ? 'Pending' : `${item.approved_quantity} ✓`}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          ৳ {unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                          ৳ {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Stamp */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
              <div className="space-y-3">
                <div className="stamp border-2 border-emerald-600 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>CENTRAL DISPATCH VERIFIED & ALLOCATED</span>
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  This document serves as an official commercial tax invoice and stock delivery consignment under the national wholesale trade framework.
                </p>
              </div>

              <div className="summary w-full sm:w-80 space-y-2 text-xs">
                <div className="summary-row flex justify-between text-slate-600">
                  <span>Gross Merchandise Subtotal:</span>
                  <span className="font-mono font-bold">৳ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="summary-row flex justify-between text-slate-600">
                  <span>Wholesale Trade VAT (5% Mushak):</span>
                  <span className="font-mono font-bold">৳ {vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="summary-total flex justify-between items-center text-sm font-black border-t-2 border-zinc-900 pt-2 text-zinc-900">
                  <span>Total Payable:</span>
                  <span className="text-base text-indigo-600 font-mono font-black">
                    ৳ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Sign-off Footer */}
            <div className="footer border-t border-dashed border-slate-200 pt-6 mt-6 flex justify-between items-end text-[11px] text-slate-400">
              <div>
                <p className="font-semibold text-slate-600">Issued by: FizzDrop Central Logistics Automated Clearing Hub</p>
                <p>Tejgaon Industrial Area, Dhaka, Bangladesh</p>
              </div>
              <div className="text-right">
                <div className="w-36 border-b border-slate-300 mb-1" />
                <p className="text-[10px] uppercase font-bold text-slate-500">Authorized Logistics Controller</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
