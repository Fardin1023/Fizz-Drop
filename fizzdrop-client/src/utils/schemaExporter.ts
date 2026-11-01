/**
 * Schema Exporter for FizzDrop Database Explorer
 * Generates downloadable CSV and PDF files directly in the browser for database schema tables.
 */

export interface ExportColumnDef {
  name: string;
  type: string;
  isPk?: boolean;
  isNullable?: boolean;
  extra?: string;
  defaultValue?: string;
}

export interface TableSchemaExportData {
  name: string;
  rowCount?: number;
  domain?: string;
  columns: ExportColumnDef[];
}

/**
 * Downloads single table schema as CSV
 */
export function downloadTableSchemaCsv(
  tableName: string,
  columns: ExportColumnDef[],
  rowCount: number = 0,
  domain: string = 'Relational Schema'
) {
  const header = ['Table Name', 'Column Name', 'Data Type', 'Key / Constraint', 'Nullable', 'Extra', 'Domain', 'Total Rows'];
  const rows = columns.map((col) => [
    `"${tableName}"`,
    `"${col.name}"`,
    `"${col.type}"`,
    `"${col.isPk ? 'PRIMARY KEY' : ''}"`,
    `"${col.isNullable ? 'YES' : 'NO'}"`,
    `"${col.extra || ''}"`,
    `"${domain}"`,
    `"${rowCount}"`,
  ]);

  const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  triggerDownload(csvContent, `${tableName}_schema.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Downloads all database tables schema as a single combined CSV
 */
export function downloadAllTablesSchemaCsv(tables: TableSchemaExportData[]) {
  const header = ['Table Name', 'Domain', 'Column Name', 'Data Type', 'Constraint', 'Nullable', 'Extra', 'Table Rows'];
  const rows: string[] = [];

  for (const table of tables) {
    for (const col of table.columns) {
      rows.push(
        [
          `"${table.name}"`,
          `"${table.domain || 'Relational Schema'}"`,
          `"${col.name}"`,
          `"${col.type}"`,
          `"${col.isPk ? 'PRIMARY KEY' : ''}"`,
          `"${col.isNullable ? 'YES' : 'NO'}"`,
          `"${col.extra || ''}"`,
          `"${table.rowCount || 0}"`,
        ].join(',')
      );
    }
  }

  const csvContent = [header.join(','), ...rows].join('\r\n');
  triggerDownload(csvContent, `fizzdrop_database_all_tables_schema.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Generates and downloads a clean, vector PDF document for a single table schema
 */
export function downloadTableSchemaPdf(
  tableName: string,
  columns: ExportColumnDef[],
  rowCount: number = 0,
  domain: string = 'Relational Schema'
) {
  const tableData: TableSchemaExportData = {
    name: tableName,
    rowCount,
    domain,
    columns,
  };

  const pdfBinary = buildPdfDocument([tableData], `Table Schema Specification: ${tableName}`);
  const blob = new Blob([pdfBinary], { type: 'application/pdf' });
  triggerBlobDownload(blob, `${tableName}_schema.pdf`);
}

/**
 * Generates and downloads a comprehensive multi-page PDF document for all tables
 */
export function downloadAllTablesSchemaPdf(tables: TableSchemaExportData[]) {
  const pdfBinary = buildPdfDocument(tables, 'FizzDrop Database Complete Schema Specification');
  const blob = new Blob([pdfBinary], { type: 'application/pdf' });
  triggerBlobDownload(blob, 'fizzdrop_complete_database_schema.pdf');
}

/**
 * Opens a beautiful printable view for browser print / save to PDF
 */
export function openPrintableSchemaReport(tables: TableSchemaExportData[], mainTitle: string = 'Database Schema Dossier') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${mainTitle}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            padding: 40px;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .meta {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
          }
          .table-section {
            margin-bottom: 35px;
            page-break-inside: avoid;
          }
          .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 15px;
            border-radius: 8px 8px 0 0;
          }
          .table-title {
            font-size: 15px;
            font-weight: 700;
            color: #0369a1;
            font-family: monospace;
          }
          .table-badge {
            font-size: 11px;
            background: #e0f2fe;
            color: #0369a1;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            border: 1px solid #e2e8f0;
            border-top: none;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 8px 12px;
            font-weight: 700;
            border-bottom: 1px solid #cbd5e1;
            font-size: 11px;
            text-transform: uppercase;
          }
          td {
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
          }
          tr:nth-child(even) {
            background: #fafafa;
          }
          .pk {
            font-weight: 700;
            color: #047857;
            background: #d1fae5;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
          }
          .code {
            font-family: monospace;
            font-weight: 600;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 class="title">${mainTitle}</h1>
            <button class="no-print" onclick="window.print()" style="padding: 6px 16px; background: #0284c7; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Print / Save as PDF</button>
          </div>
          <div class="meta">
            Environment: <strong>Aiven Cloud MySQL 8.4.11</strong> • Generated on: ${new Date().toLocaleString()} • FizzDrop Central Data Architecture
          </div>
        </div>

        ${tables
          .map(
            (t) => `
          <div class="table-section">
            <div class="table-header">
              <span class="table-title">${t.name}</span>
              <div>
                <span class="table-badge">${t.domain || 'Relational Schema'}</span>
                <span class="table-badge" style="background: #f1f5f9; color: #475569; margin-left: 6px;">${t.rowCount || 0} rows</span>
                <span class="table-badge" style="background: #f1f5f9; color: #475569; margin-left: 6px;">${t.columns.length} columns</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%;">Column Name</th>
                  <th style="width: 25%;">Data Type</th>
                  <th style="width: 20%;">Constraint</th>
                  <th style="width: 15%;">Nullable</th>
                  <th style="width: 10%;">Extra</th>
                </tr>
              </thead>
              <tbody>
                ${t.columns
                  .map(
                    (col) => `
                  <tr>
                    <td class="code" style="color: #0f172a;">${col.name}</td>
                    <td class="code" style="color: #475569;">${col.type}</td>
                    <td>${col.isPk ? '<span class="pk">PRIMARY KEY</span>' : '—'}</td>
                    <td style="color: ${col.isNullable ? '#059669' : '#64748b'}; font-weight: 600;">${col.isNullable ? 'YES' : 'NO'}</td>
                    <td style="color: #64748b; font-size: 11px;">${col.extra || '—'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
          )
          .join('')}

        <div class="footer">
          FizzDrop Enterprise Beverage Distribution Platform • Relational Database Introspection Audit
        </div>

        <script>
          // Automatically trigger print dialog
          setTimeout(() => {
            window.print();
          }, 400);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Pure TypeScript PDF 1.4 binary document generator
 * Generates standard compliant PDF documents with header, tables, colors and pagination
 */
function buildPdfDocument(tables: TableSchemaExportData[], docTitle: string): Uint8Array {
  const pagesStreams: string[] = [];
  const maxRowsPerPage = 26;

  // Split tables into pages
  for (const table of tables) {
    const totalCols = table.columns;
    const numPagesForTable = Math.max(1, Math.ceil(totalCols.length / maxRowsPerPage));

    for (let p = 0; p < numPagesForTable; p++) {
      const pageCols = totalCols.slice(p * maxRowsPerPage, (p + 1) * maxRowsPerPage);
      let stream = '';

      // Top brand header bar
      stream += '0.04 0.28 0.58 rg 35 805 525 3 re f\n';

      // Title & Subtitle
      stream += 'BT /F2 14 Tf 0.08 0.12 0.25 rg 40 782 Td (' + sanitizePdfText(docTitle) + ') Tj ET\n';
      stream +=
        'BT /F1 8.5 Tf 0.45 0.5 0.55 rg 40 768 Td (Database: Aiven Cloud MySQL 8.4.11 | Generated: ' +
        sanitizePdfText(new Date().toISOString().replace('T', ' ').slice(0, 19)) +
        ') Tj ET\n';

      // Table Name & Domain Bar
      stream += '0.94 0.96 0.99 rg 35 732 525 24 re f\n';
      stream += '0.82 0.86 0.92 RG 0.7 w 35 732 525 24 re s\n';
      stream +=
        'BT /F2 11 Tf 0.04 0.28 0.58 rg 45 740 Td (Entity Table: ' +
        sanitizePdfText(table.name) +
        (numPagesForTable > 1 ? ` (Part ${p + 1} of ${numPagesForTable})` : '') +
        ') Tj ET\n';

      const metaInfo = `Domain: ${table.domain || 'Relational'} | Records: ${table.rowCount || 0} | Columns: ${table.columns.length}`;
      stream += 'BT /F1 8 Tf 0.4 0.45 0.5 rg 360 740 Td (' + sanitizePdfText(metaInfo) + ') Tj ET\n';

      // Table Header
      const headerY = 705;
      stream += '0.12 0.2 0.38 rg 35 ' + headerY + ' 525 20 re f\n';
      stream += '1 1 1 rg BT /F2 8.5 Tf 45 ' + (headerY + 6) + ' Td (COLUMN NAME) Tj ET\n';
      stream += '1 1 1 rg BT /F2 8.5 Tf 210 ' + (headerY + 6) + ' Td (DATA TYPE) Tj ET\n';
      stream += '1 1 1 rg BT /F2 8.5 Tf 350 ' + (headerY + 6) + ' Td (CONSTRAINT) Tj ET\n';
      stream += '1 1 1 rg BT /F2 8.5 Tf 455 ' + (headerY + 6) + ' Td (NULLABLE) Tj ET\n';

      // Rows
      let rowY = headerY - 18;
      pageCols.forEach((col, idx) => {
        if (idx % 2 === 1) {
          stream += '0.97 0.98 0.99 rg 35 ' + rowY + ' 525 18 re f\n';
        }
        stream += '0.88 0.9 0.93 RG 0.5 w 35 ' + rowY + ' m 560 ' + rowY + ' l S\n';

        // Column Name
        stream += '0.1 0.12 0.2 rg BT /F2 8.5 Tf 45 ' + (rowY + 5) + ' Td (' + sanitizePdfText(col.name) + ') Tj ET\n';

        // Data Type
        stream += '0.25 0.35 0.5 rg BT /F1 8 Tf 210 ' + (rowY + 5) + ' Td (' + sanitizePdfText(col.type) + ') Tj ET\n';

        // Constraint / PK
        if (col.isPk) {
          stream += '0.05 0.55 0.35 rg BT /F2 8 Tf 350 ' + (rowY + 5) + ' Td (PRIMARY KEY) Tj ET\n';
        } else {
          stream += '0.5 0.55 0.6 rg BT /F1 8 Tf 350 ' + (rowY + 5) + ' Td (-) Tj ET\n';
        }

        // Nullable
        if (col.isNullable) {
          stream += '0.1 0.6 0.3 rg BT /F1 8 Tf 455 ' + (rowY + 5) + ' Td (YES) Tj ET\n';
        } else {
          stream += '0.5 0.55 0.6 rg BT /F1 8 Tf 455 ' + (rowY + 5) + ' Td (NOT NULL) Tj ET\n';
        }

        rowY -= 18;
      });

      // Bottom border line
      stream += '0.8 0.85 0.9 RG 0.7 w 35 ' + rowY + ' m 560 ' + rowY + ' l S\n';

      // Footer
      stream += 'BT /F1 7.5 Tf 0.5 0.55 0.6 rg 40 30 Td (FizzDrop Platform - Central Database Schema Audit Document) Tj ET\n';
      stream += 'BT /F1 7.5 Tf 0.5 0.55 0.6 rg 500 30 Td (Page ' + (pagesStreams.length + 1) + ') Tj ET\n';

      pagesStreams.push(stream);
    }
  }

  // Build PDF 1.4 Object Structure
  const totalPages = pagesStreams.length;
  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  // Obj 2: Pages (Kids array)
  const kidsRefs: string[] = [];
  // Each page will have: Page Obj, Content Obj
  // Fonts are shared in Obj 3 and Obj 4
  const fontRegularObjNum = 3;
  const fontBoldObjNum = 4;
  const firstPageObjNum = 5;

  for (let i = 0; i < totalPages; i++) {
    const pageObjNum = firstPageObjNum + i * 2;
    kidsRefs.push(`${pageObjNum} 0 R`);
  }
  objects.push(`<< /Type /Pages /Kids [${kidsRefs.join(' ')}] /Count ${totalPages} >>`);

  // Obj 3: Font Regular (Helvetica)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  // Obj 4: Font Bold (Helvetica-Bold)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  // Page and Content objects
  for (let i = 0; i < totalPages; i++) {
    const contentObjNum = firstPageObjNum + i * 2 + 1;
    // Page Obj
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontRegularObjNum} 0 R /F2 ${fontBoldObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    );

    // Content Obj
    const s = pagesStreams[i];
    const len = new TextEncoder().encode(s).length;
    objects.push(`<< /Length ${len} >>\nstream\n${s}\nendstream`);
  }

  // Assemble full PDF
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];

  for (let idx = 0; idx < objects.length; idx++) {
    const currentOffset = new TextEncoder().encode(pdf).length;
    offsets.push(currentOffset);
    pdf += `${idx + 1} 0 obj\n${objects[idx]}\nendobj\n`;
  }

  const startxref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \r\n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, '0')} 00000 n \r\n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function sanitizePdfText(str: string): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
