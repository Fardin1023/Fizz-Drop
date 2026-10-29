import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Crown, Lock, Mail, ArrowRight, AlertCircle, Package, Home } from 'lucide-react';

interface AdminLoginProps {
  onSuccess?: () => void;
  requiredRole?: 'superadmin' | 'supplier' | 'any';
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, requiredRole = 'any' }) => {
  const { login, loginAsSupplier, loginAsSuperadmin } = useAuth();
  const [email, setEmail] = useState(
    requiredRole === 'superadmin' ? 'superadmin@fizzdrop.com' : 'central.supplier@fizzdrop.com'
  );
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleQuickSuperadmin = async () => {
    setError(null);
    setLoading(true);
    const res = await loginAsSuperadmin();
    setLoading(false);
    if (res.success && onSuccess) {
      onSuccess();
    } else if (!res.success) {
      setError(res.error || 'Failed to authenticate Superadmin');
    }
  };

  const handleQuickSupplier = async () => {
    setError(null);
    setLoading(true);
    const res = await loginAsSupplier();
    setLoading(false);
    if (res.success && onSuccess) {
      onSuccess();
    } else if (!res.success) {
      setError(res.error || 'Failed to authenticate Supplier');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-3 flex items-center justify-between px-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-indigo-600" />
            <span>← Back to Storefront</span>
          </Link>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            FizzDrop Control
          </span>
        </div>

        <div className="bg-white/85 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-indigo-500/5 transition-all">
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white mb-4 shadow-lg ring-8 ${
              requiredRole === 'superadmin'
                ? 'bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 shadow-teal-500/20 ring-teal-50 dark:ring-teal-950/40'
                : 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-600/20 ring-indigo-50 dark:ring-indigo-950/40'
            }`}>
              {requiredRole === 'superadmin' ? (
                <Crown className="w-8 h-8 text-white drop-shadow-sm" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold font-oswald uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
              {requiredRole === 'superadmin' ? (
                <>Superadmin <span className="text-teal-500">Control</span></>
              ) : (
                <>FizzDrop <span className="text-indigo-600">Portal</span></>
              )}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              {requiredRole === 'superadmin'
                ? 'Authorized access for outlets management and database console'
                : 'Role-gated central administrative system'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@fizzdrop.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins for Testing */}
          <div className="mt-6 pt-5 border-t border-zinc-200/60 dark:border-zinc-800 space-y-2">
            <span className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold text-center mb-2">
              Instant 1-Click Role Logins
            </span>

            {/* Superadmin Button */}
            <button
              type="button"
              onClick={handleQuickSuperadmin}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 hover:from-teal-500/20 hover:to-emerald-500/20 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-emerald-500" />
                <span>Superadmin (Outlets & Database)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300">
                Role 4
              </span>
            </button>

            {/* Supplier Button */}
            <button
              type="button"
              onClick={handleQuickSupplier}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-indigo-500" />
                <span>Supplier Admin (Products Only)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                Role 3
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
