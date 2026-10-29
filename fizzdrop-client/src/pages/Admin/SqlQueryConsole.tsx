import React, { useState } from 'react';
import {
  Play,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  Sparkles,
  Layers,
  Database,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SqlQueryConsoleProps {
  initialQuery?: string;
}

const PRESET_QUERIES = [
  {
    name: 'Outlets & Branches',
    badge: 'OUTLETS',
    sql: 'SELECT outlet_id, outlet_name, location_address, contact_phone, status FROM Outlets ORDER BY outlet_id DESC;',
  },
  {
    name: 'Products & Variants',
    badge: 'CATALOG',
    sql: 'SELECT product_id, brand, flavor_variant, packaging, size_volume, sku, base_price, category FROM Products ORDER BY product_id DESC;',
  },
  {
    name: 'Inventory by Branch',
    badge: 'STOCK',
    sql: 'SELECT branch_id, product_id, stock_quantity FROM Shop_Inventory;',
  },
  {
    name: 'Users & Roles Map',
    badge: 'SECURITY',
    sql: 'SELECT user_id, email, role_id, branch_id FROM Users;',
  },
  {
    name: 'System Roles',
    badge: 'ROLES',
    sql: 'SELECT role_id, role_name FROM Roles;',
  },
];

export const SqlQueryConsole: React.FC<SqlQueryConsoleProps> = ({
  initialQuery = 'SELECT * FROM Outlets LIMIT 25;',
}) => {
  const { token } = useAuth();
  const authToken = token || localStorage.getItem('fizzdrop_token');

  const [query, setQuery] = useState(initialQuery);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [querySource, setQuerySource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunQuery = async () => {
    if (!query.trim()) return;

    setRunning(true);
    setError(null);
    setResults(null);
    setExecutionTime(null);
    setRowCount(null);

    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('http://localhost:8080/api/db/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sql: query.trim() }),
      });

      const data = await res.json();
      const duration = Date.now() - startTime;

      if (res.ok && (data.success !== false)) {
        const rows = data.results || [];
        setResults(rows);
        setRowCount(data.rowCount !== undefined ? data.rowCount : rows.length);
        setExecutionTime(data.executionTimeMs || duration);
        setQuerySource(data.source || 'Spring Boot JPA');
      } else {
        setError(data.error || 'SQL statement execution failed.');
        setExecutionTime(duration);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database endpoint.');
      setExecutionTime(Date.now() - startTime);
    } finally {
      setRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const handleCopyJson = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...results.map((row) =>
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
    link.setAttribute('download', `query_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Preset Query Chips Toolbar in Cool Light Theme */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Preset Security & DB Templates</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Click template to load into editor
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setQuery(preset.sql);
                setError(null);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-xs text-slate-700 hover:text-blue-900 transition-all flex items-center gap-1.5 group cursor-pointer shadow-2xs"
            >
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                {preset.badge}
              </span>
              <span className="font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Light Developer Terminal Editor Card */}
      <div className="w-full min-w-0 rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        {/* Terminal Header */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-100/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 border border-rose-500/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-500/20" />
            <span className="ml-2 font-mono text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              <span>fizzdrop_db // SQL Execution Terminal</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline font-medium">
              Ctrl + Enter to run
            </span>
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Clear editor"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Textarea */}
        <div className="p-3.5 bg-slate-50/60">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="SELECT * FROM Outlets WHERE status = 'Active';"
            className="w-full bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 placeholder-slate-400 resize-y focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 leading-relaxed selection:bg-blue-200/60 transition-all shadow-inner"
            spellCheck={false}
          />

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60">
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
              <Database className="w-3 h-3 text-blue-600" /> Target Database: <strong className="text-blue-700">`fizzdrop_db`</strong>
            </span>
            <button
              onClick={handleRunQuery}
              disabled={running || !query.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Executing...' : 'Execute SQL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Execution Results Section */}
      {(results !== null || error || running) && (
        <div className="w-full min-w-0 rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
          {/* Results Bar */}
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-100/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-oswald text-sm font-bold uppercase text-slate-800 tracking-wide">
                Terminal Output
              </span>

              {executionTime !== null && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {executionTime} ms
                </span>
              )}

              {rowCount !== null && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {rowCount} rows
                </span>
              )}

              {querySource && (
                <span className="text-[10px] font-mono text-slate-500 font-medium">
                  engine: {querySource}
                </span>
              )}
            </div>

            {results && results.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  <span>{copied ? 'Copied' : 'JSON'}</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Results Body: overflow-x-auto with min-w-0 */}
          <div className="w-full min-w-0 overflow-x-auto min-h-[140px] max-h-[460px]">
            {running ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2 font-mono">
                <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <span>Executing statement on database engine...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50/60 border-b border-rose-200 text-xs text-rose-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>Query Execution Error</span>
                </div>
                <pre className="font-mono bg-white p-3 rounded-xl border border-rose-200 overflow-x-auto text-[11px] text-rose-800 shadow-2xs">
                  {error}
                </pre>
              </div>
            ) : results && results.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                <Layers className="w-6 h-6 mx-auto text-slate-400" />
                <span className="font-mono">Query executed successfully with 0 rows returned.</span>
              </div>
            ) : results && results.length > 0 ? (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center text-slate-400 text-[10px]">#</th>
                    {Object.keys(results[0]).map((col) => (
                      <th key={col} className="py-2.5 px-3 whitespace-nowrap text-blue-800 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                  {results.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors even:bg-slate-50/40">
                      <td className="py-2 px-3 text-center text-slate-400 font-sans text-[10px]">
                        {idx + 1}
                      </td>
                      {Object.keys(results[0]).map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} className="py-2 px-3 max-w-[260px] truncate" title={String(val ?? '')}>
                            {val === null || val === undefined ? (
                              <span className="text-slate-300 italic">NULL</span>
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
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default SqlQueryConsole;
