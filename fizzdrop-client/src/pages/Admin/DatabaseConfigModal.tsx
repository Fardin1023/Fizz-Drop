import React, { useState, useEffect } from 'react';
import { X, Database, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('fizzdrop_db');
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        if (data.host) setHost(data.host);
        if (data.port) setPort(String(data.port));
        if (data.user) setUser(data.user);
        if (data.database) setDatabase(data.database);
      }
    } catch (e) {
      console.error('Error fetching DB status', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setFeedback(null);

    try {
      // Test direct SQL ping
      const res = await fetch('http://localhost:8080/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT 1 AS ping;' }),
      });

      const data = await res.json();
      if (res.ok && data.success !== false) {
        setFeedback({
          success: true,
          msg: `Database operational and connected on port ${port} (${database})!`,
        });
        if (onConfigSaved) onConfigSaved();
      } else {
        setFeedback({
          success: false,
          msg: data.error || 'Connection failed with provided parameters.',
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        msg: err.message || 'Error communicating with server',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-zinc-900">
                Database Engine Parameters
              </h3>
              <p className="text-xs text-slate-500">
                Spring Boot JPA / Hibernate Relational Connection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Badge */}
        <div className="px-6 pt-5">
          <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between font-mono ${
            dbStatus?.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-bold">
                {dbStatus?.connected ? 'DB STATUS: ONLINE' : 'ENGINE: STANDBY'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {dbStatus?.engine || 'Spring Data JPA'}
            </span>
          </div>

          {feedback && (
            <div className={`mt-3 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              feedback.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {feedback.success ? <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
              <span>{feedback.msg}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleTestAndSave} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                User
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                MySQL Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter MySQL password"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 font-mono outline-none placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Database Name
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white text-xs text-slate-900 font-mono outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={testing}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {testing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test Connection & Ping</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
