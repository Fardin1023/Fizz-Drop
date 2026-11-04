import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Store,
  MapPin,
  Lock,
  Mail,
  Building,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Phone,
  ShieldCheck,
  ChevronRight,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import logoImg from '../../assets/img/fizzdrop-logo.png';
import { CITY_AREAS_MAP } from '../../constants/cityAreas';
import { AnimatedFizzdropBackdrop } from '../../components/Background/AnimatedFizzdropBackdrop';

export const OutletAuth: React.FC = () => {
  const { loginAsOutlet, registerOutlet } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState<boolean>(true);

  // Login Form State
  const [selectedOutletId, setSelectedOutletId] = useState<string | number>('');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('Password123!');
  const [submittingLogin, setSubmittingLogin] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Form State
  const [franchiseBrand, setFranchiseBrand] = useState<string>('Shwapno');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [city, setCity] = useState<string>('Dhaka');
  const [area, setArea] = useState<string>('Gulshan');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('Password123!');
  const [submittingRegister, setSubmittingRegister] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Load existing outlets for quick-branch login
  const fetchOutlets = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/outlets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOutlets(data);
          if (data.length > 0 && !selectedOutletId) {
            setSelectedOutletId(data[0].outlet_id);
          }
        }
      }
    } catch (err) {
      // ignore
    } finally {
      setLoadingOutlets(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const handleQuickLogin = async (outletId: number) => {
    setSubmittingLogin(true);
    setLoginError(null);
    try {
      const result = await loginAsOutlet(outletId);
      if (result.success) {
        navigate('/outlet');
      } else {
        setLoginError(result.error || 'Failed to authenticate to outlet branch.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login error');
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLogin(true);
    setLoginError(null);
    try {
      const targetId = selectedOutletId ? Number(selectedOutletId) : undefined;
      const result = await loginAsOutlet(targetId, loginEmail.trim() || undefined, loginPassword);
      if (result.success) {
        navigate('/outlet');
      } else {
        setLoginError(result.error || 'Invalid outlet credentials.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login error');
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRegister(true);
    setRegisterError(null);

    const effectiveBrand = franchiseBrand === 'Custom' ? customBrand.trim() : franchiseBrand;
    if (!effectiveBrand) {
      setRegisterError('Please select or specify a franchise brand name.');
      setSubmittingRegister(false);
      return;
    }
    if (!branchName.trim()) {
      setRegisterError('Please enter a branch name or area identifier.');
      setSubmittingRegister(false);
      return;
    }

    try {
      const result = await registerOutlet({
        franchise_name: effectiveBrand,
        branch_name: branchName.trim(),
        city,
        area,
        location_address: address.trim() || `${branchName.trim()}, ${area}, ${city}`,
        contact_phone: phone.trim() || '01900-112233',
        email: email.trim() || undefined,
        password: password || 'Password123!',
      });

      if (result.success) {
        navigate('/outlet');
      } else {
        setRegisterError(result.error || 'Failed to register outlet branch.');
      }
    } catch (err: any) {
      setRegisterError(err.message || 'Registration error');
    } finally {
      setSubmittingRegister(false);
    }
  };

  // Popular franchise brands in Bangladesh
  const popularBrands = ['Shwapno', 'Unimart', 'Meena Bazar', 'Agora', 'Prince Bazar', 'Daily Shopping', 'Custom'];

  const availableAreas = CITY_AREAS_MAP[city] || ['Main Center', 'Commercial Zone', 'Sadar'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Animated Big Cyan-White FIZZDROP Ambient Background */}
      <AnimatedFizzdropBackdrop subtitle="OFFICIAL FRANCHISE OUTLET COMMERCE" />

      {/* Background Animated Floating Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />

        {/* Fizzy Sparkle particles */}
        <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-emerald-400/40 animate-ping" />
        <div className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-teal-300/30 animate-bounce" />
        <div className="absolute bottom-1/4 left-1/4 w-2 h-2 rounded-full bg-cyan-300/40 animate-ping" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md p-1.5 border border-white/20 flex items-center justify-center shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-all">
            <img src={logoImg} alt="FizzDrop" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              FIZZDROP <span className="text-emerald-400 font-light">OUTLET</span>
            </span>
            <span className="text-[10px] text-emerald-300/80 font-mono block -mt-1 tracking-widest uppercase">
              Franchise Store Operations
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/shop"
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-medium"
          >
            Customer Store
          </Link>
          <Link
            to="/admin"
            className="text-xs text-indigo-300 hover:text-indigo-200 px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 transition-all font-medium"
          >
            Supplier Portal
          </Link>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/20 rounded-3xl shadow-2xl shadow-emerald-950/50 overflow-hidden">
          {/* Top Brand Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 sm:p-7 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 to-transparent pointer-events-none" />
            <div className="inline-flex p-3 rounded-2xl bg-white/15 backdrop-blur-md mb-2 shadow-inner ring-1 ring-white/25">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              OUTLET BRANCH PORTAL
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-md mx-auto mt-1">
              Point of Sale, live inventory management, customer sales & supplier restock requisitions
            </p>

            {/* Tab Switcher Pills */}
            <div className="flex p-1.5 mt-5 rounded-2xl bg-black/25 backdrop-blur-md max-w-xs mx-auto border border-white/15">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-emerald-900 shadow-md scale-100'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Sign In to Branch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white text-emerald-900 shadow-md scale-100'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                + Register Branch
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* TAB 1: LOGIN */}
            {activeTab === 'login' && (
              <div className="space-y-6 animate-fade-in">
                {loginError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Quick One-Click Branch Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>One-Click Active Branch Access</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {outlets.length} active branches in database
                    </span>
                  </div>

                  {loadingOutlets ? (
                    <div className="py-8 flex justify-center">
                      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                  ) : outlets.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
                      No branches found. Click "+ Register Branch" above to add your first branch.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {outlets.map((o) => (
                        <button
                          key={o.outlet_id}
                          type="button"
                          onClick={() => handleQuickLogin(o.outlet_id)}
                          disabled={submittingLogin}
                          className="p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-left transition-all group flex items-center justify-between cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white group-hover:text-emerald-300 truncate">
                                {o.franchise_name || o.outlet_name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-mono">
                                #{o.outlet_id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {o.branch_name || o.area || o.city} • {o.city}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="flex-shrink mx-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    Or Sign In with Credentials
                  </span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                {/* Manual Credentials Form */}
                <form onSubmit={handleCredentialsLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Target Branch
                    </label>
                    <select
                      value={selectedOutletId}
                      onChange={(e) => setSelectedOutletId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                    >
                      {outlets.map((o) => (
                        <option key={o.outlet_id} value={o.outlet_id}>
                          {o.franchise_name || o.outlet_name} — {o.branch_name || o.area} ({o.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Email (Optional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="branch@outlet.fizzdrop.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Password</span>
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingLogin}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                  >
                    {submittingLogin ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Enter Selected Branch Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: REGISTER */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-5 animate-fade-in">
                {registerError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{registerError}</span>
                  </div>
                )}

                {/* Franchise Brand Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    <span>1. Franchise Brand</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {popularBrands.map((brand) => {
                      const isSelected = franchiseBrand === brand;
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => setFranchiseBrand(brand)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          {brand}
                        </button>
                      );
                    })}
                  </div>

                  {franchiseBrand === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom retail / franchise chain name..."
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  )}
                </div>

                {/* Branch Location Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    2. Physical Branch Location
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gulshan 2 Branch, Joydebpur Branch, Uttara Sector 7..."
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                {/* City & Area Cascading Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>City</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => {
                        const newCity = e.target.value;
                        setCity(newCity);
                        const areas = CITY_AREAS_MAP[newCity] || [];
                        if (areas.length > 0) setArea(areas[0]);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                    >
                      {Object.keys(CITY_AREAS_MAP).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Area / Neighborhood
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                    >
                      {availableAreas.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Street Address & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="Plot No., Road, Landmark..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Contact Phone</span>
                    </label>
                    <input
                      type="text"
                      placeholder="01992-001122"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>

                {/* Manager Email & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Manager Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="manager@branch.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Password123!"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingRegister}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  {submittingRegister ? (
                    <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Register Branch & Enter Dashboard</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
        <p>© 2026 FizzDrop Beverages Ltd. Outlet Operations & Franchise Management System.</p>
      </footer>
    </div>
  );
};
