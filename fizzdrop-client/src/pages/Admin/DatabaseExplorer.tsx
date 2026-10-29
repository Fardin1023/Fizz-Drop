import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Table as TableIcon,
  Layers,
  Key,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  Download,
  Copy,
  Check,
  AlertCircle,
  Hash,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ColumnDef {
  name: string;
  type: string;
  isPk?: boolean;
  isNullable?: boolean;
}

interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnDef[];
}

interface DatabaseExplorerProps {
  onOpenQueryWithTable?: (tableName: string) => void;
}

const TABLE_CATEGORIES: Record<string, string> = {
  Products: 'Catalog & Inventory',
  Shop_Inventory: 'Catalog & Inventory',
  Outlets: 'Franchise & Logistics',
  Branches: 'Franchise & Logistics',
  Users: 'Identity & Access',
  Roles: 'Identity & Access',
  Orders: 'Commerce & Sales',
  Order_Items: 'Commerce & Sales',
  Restock_Requests: 'Restock & Transfers',
  Restock_Items: 'Restock & Transfers',
};

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({ onOpenQueryWithTable }) => {
  const { token } = useAuth();
  const authToken = token || localStorage.getItem('fizzdrop_token');

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('Outlets');
  const [activeTab, setActiveTab] = useState<'data' | 'schema'>('data');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnDef[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch tables metadata with Superadmin auth token
  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('http://localhost:8080/api/db/tables', { headers });
      if (res.ok) {
        const data = await res.json();
        // Support both array of strings or { tables: [...] }
        let tablesList: TableInfo[] = [];
        if (Array.isArray(data)) {
          tablesList = data.map((t: string | any) =>
            typeof t === 'string'
              ? { name: t, rowCount: 0, columns: [] }
              : { name: t.name, rowCount: t.rowCount || 0, columns: t.columns || [] }
          );
        } else if (data.tables) {
          tablesList = data.tables;
        }

        setTables(tablesList);
        
        if (tablesList.length > 0) {
          const tableExists = tablesList.some((t) => t.name === selectedTable);
          if (!tableExists) {
            setSelectedTable(tablesList[0].name);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `HTTP ${res.status}: Failed to load database tables.`);
      }
    } catch (err: any) {
      console.error('Error fetching database tables:', err);
      setError(err.message || 'Error connecting to database backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [authToken]);

  // Fetch records and schema for selected table
  useEffect(() => {
    const fetchTableContent = async () => {
      if (!selectedTable) return;
      setDataLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const offset = (page - 1) * limit;
        const sql = `SELECT * FROM \`${selectedTable}\` LIMIT ${limit} OFFSET ${offset};`;

        const res = await fetch('http://localhost:8080/api/db/query', {
          method: 'POST',
          headers,
          body: JSON.stringify({ sql }),
        });

        if (res.ok) {
          const data = await res.json();
          const rows = data.results || [];
          setTableData(rows);

          if (rows.length > 0) {
            const cols: ColumnDef[] = Object.keys(rows[0]).map((k) => ({
              name: k,
              type: typeof rows[0][k] === 'number' ? 'INT / NUMERIC' : 'VARCHAR / TEXT',
              isPk: k.toLowerCase().endsWith('_id') || k.toLowerCase() === 'id',
              isNullable: true,
            }));
            setTableColumns(cols);
          }

          // Count query
          try {
            const countRes = await fetch('http://localhost:8080/api/db/query', {
              method: 'POST',
              headers,
              body: JSON.stringify({ sql: `SELECT COUNT(*) AS total FROM \`${selectedTable}\`;` }),
            });
            if (countRes.ok) {
              const countData = await countRes.json();
              if (countData.results && countData.results.length > 0) {
                const total =
                  countData.results[0].total ??
                  countData.results[0]['COUNT(*)'] ??
                  countData.results[0]['count(*)'] ??
                  0;
                setTotalRows(Number(total));
              } else {
                setTotalRows(rows.length);
              }
            } else {
              setTotalRows(rows.length);
            }
          } catch {
            setTotalRows(rows.length);
          }
        } else {
          setTableData([]);
          setTotalRows(0);
        }
      } catch (err: any) {
        console.error(`Error loading table ${selectedTable}:`, err);
        setTableData([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchTableContent();
  }, [selectedTable, page, limit, authToken]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return tableData;
    const q = searchQuery.toLowerCase();
    return tableData.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [tableData, searchQuery]);

  const filteredTables = useMemo(() => {
    if (!sidebarFilter.trim()) return tables;
    const q = sidebarFilter.toLowerCase();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (TABLE_CATEGORIES[t.name] || '').toLowerCase().includes(q)
    );
  }, [tables, sidebarFilter]);

  const totalPages = Math.max(1, Math.ceil(totalRows / limit));

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(tableData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    if (tableData.length === 0) return;
    const headers = Object.keys(tableData[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...tableData.map((row) =>
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return '""';
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedTable}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeTableInfo = tables.find((t) => t.name === selectedTable);

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Alert Banner if any error */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTables}
            className="px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Layout in Cool Security-Developer Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full min-w-0 items-start">
        
        {/* Left Column: Security-Developer Entity Selector (3.5 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 min-w-0 rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-sm space-y-3">
          
          {/* Header & Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 font-mono">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Entities ({tables.length})</span>
              </span>
              <button
                onClick={fetchTables}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                title="Refresh table list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Quick Entity Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={sidebarFilter}
                onChange={(e) => setSidebarFilter(e.target.value)}
                placeholder="Filter entities..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
              {sidebarFilter && (
                <button
                  onClick={() => setSidebarFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Tables List */}
          <div className="space-y-1 max-h-[520px] overflow-y-auto pr-0.5">
            {loading && tables.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <span className="font-mono text-[11px]">Streaming entities...</span>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No matching entities found
              </div>
            ) : (
              filteredTables.map((tbl) => {
                const isSelected = selectedTable === tbl.name;
                const category = TABLE_CATEGORIES[tbl.name] || 'General';

                return (
                  <button
                    key={tbl.name}
                    onClick={() => {
                      setSelectedTable(tbl.name);
                      setPage(1);
                    }}
                    className={`w-full group text-left px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-300 text-blue-900 font-bold shadow-2xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-500 group-hover:text-blue-600'
                        }`}
                      >
                        <Hash className="w-3 h-3" />
                      </div>
                      <div className="truncate">
                        <span className={`font-semibold text-xs truncate block ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {tbl.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate font-medium">
                          {category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isSelected
                          ? 'bg-blue-200/80 text-blue-800 border border-blue-300'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tbl.rowCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Clean Live Data & Schema Viewer (8.5 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 min-w-0 rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm flex flex-col">
          
          {/* Top Bar for Selected Entity */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100/70 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <TableIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-zinc-900">
                    {selectedTable}
                  </h3>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    {totalRows} {totalRows === 1 ? 'record' : 'records'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium">
                    {tableColumns.length || activeTableInfo?.columns.length || 0} cols
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Domain: <span className="text-blue-700 font-semibold">{TABLE_CATEGORIES[selectedTable] || 'Relational Schema'}</span>
                </p>
              </div>
            </div>

            {/* View Switcher & Action Tools */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Pills: Records vs Schema */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'data'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Data Rows</span>
                </button>
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'schema'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Schema</span>
                </button>
              </div>

              {/* Quick Query Button */}
              {onOpenQueryWithTable && (
                <button
                  onClick={() => onOpenQueryWithTable(selectedTable)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-xs font-bold text-blue-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Query this entity in SQL terminal"
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Query</span>
                </button>
              )}

              {/* Export Shortcuts */}
              {activeTab === 'data' && tableData.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyJson}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                    title="Copy rows as JSON"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                    title="Export as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subheader Toolbar: Search & Pagination */}
          {activeTab === 'data' && (
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search in ${selectedTable}...`}
                  className="w-full pl-8 pr-7 py-1 rounded-lg bg-white border border-slate-200 focus:border-cyan-500 text-xs text-slate-800 placeholder-slate-400 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {totalRows > 0 && (
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="font-mono text-[11px] font-semibold">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1 || dataLoading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      disabled={page >= totalPages || dataLoading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: LIVE ROWS (with clean developer horizontal scrolling) */}
          {activeTab === 'data' && (
            <div className="w-full min-w-0 overflow-x-auto min-h-[360px]">
              {dataLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
                  <div className="w-7 h-7 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  <span className="font-mono text-[11px]">Querying `{selectedTable}` rows...</span>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="py-16 px-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 mx-auto flex items-center justify-center text-blue-600 shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800">
                      Table `{selectedTable}` has 0 records
                    </h5>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Seed data was cleared for manual input. Add data through the Outlets tab, Supplier Portal, or run an INSERT in the SQL Console.
                    </p>
                  </div>
                  {onOpenQueryWithTable && (
                    <button
                      onClick={() => onOpenQueryWithTable(selectedTable)}
                      className="mt-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Write Query for `{selectedTable}`</span>
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center text-slate-400 font-mono text-[10px]">#</th>
                      {Object.keys(filteredData[0] || {}).map((col) => (
                        <th key={col} className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-blue-800">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition-colors even:bg-slate-50/40">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-sans text-xs">
                          {(page - 1) * limit + idx + 1}
                        </td>
                        {Object.keys(filteredData[0]).map((col) => {
                          const val = row[col];
                          const isNull = val === null || val === undefined;
                          const isStatus = col.toLowerCase().includes('status');

                          return (
                            <td key={col} className="py-2.5 px-3 max-w-[240px] truncate" title={String(val ?? '')}>
                              {isNull ? (
                                <span className="text-slate-300 italic">NULL</span>
                              ) : isStatus ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    String(val).toLowerCase() === 'active'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {String(val)}
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: SCHEMA COLUMNS */}
          {activeTab === 'schema' && (
            <div className="w-full min-w-0 p-4 overflow-x-auto min-h-[360px]">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Column definitions for entity <code className="text-blue-700 font-mono font-bold">{selectedTable}</code>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Engine: InnoDB • UTF8MB4
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Constraint</th>
                    <th className="py-2.5 px-3">Nullable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(tableColumns.length > 0 ? tableColumns : activeTableInfo?.columns || []).map((col) => (
                    <tr key={col.name} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                        {col.isPk ? (
                          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center">
                            <Key className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded bg-slate-100 text-slate-400 flex items-center justify-center">
                            <Hash className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <span>{col.name}</span>
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                          {col.type}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        {col.isPk ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3" />
                            PRIMARY KEY
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {col.isNullable ? (
                          <span className="text-emerald-600 font-semibold text-[11px]">YES</span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[11px]">NOT NULL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DatabaseExplorer;
