import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Building,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ShieldCheck,
  Truck,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface DistrictItem {
  id: number;
  name: string;
  division: string;
}

export interface SupplierProfileData {
  id: number;
  user_id: number;
  business_name: string;
  trade_license_number: string;
  primary_district_id: number;
  district_name?: string;
  division_name?: string;
  depot_address: string;
  phone_number: string;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SupplierProfileSettingsProps {
  onProfileUpdated?: (profile: SupplierProfileData) => void;
}

export const SupplierProfileSettings: React.FC<SupplierProfileSettingsProps> = ({ onProfileUpdated }) => {
  const { token, user } = useAuth();
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [profile, setProfile] = useState<SupplierProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [primaryDistrictId, setPrimaryDistrictId] = useState<number>(1);
  const [depotAddress, setDepotAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('CORPORATE_BANK_TRANSFER');
  const [bankName, setBankName] = useState('Dutch-Bangla Bank PLC');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [mobileBankingNumber, setMobileBankingNumber] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [distRes, profRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/districts'),
        fetch(`http://localhost:8080/api/v1/supplier/profile?userId=${user?.user_id || 4}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      if (distRes.ok) {
        const distData = await distRes.json();
        setDistricts(Array.isArray(distData) ? distData : []);
      }

      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
        setBusinessName(profData.business_name || '');
        setTradeLicense(profData.trade_license_number || '');
        setPrimaryDistrictId(profData.primary_district_id || 1);
        setDepotAddress(profData.depot_address || '');
        setPhoneNumber(profData.phone_number || '');
        setDefaultPaymentMethod(profData.default_payment_method || 'CORPORATE_BANK_TRANSFER');
        setBankName(profData.bank_name || 'Dutch-Bangla Bank PLC');
        setBankAccountNumber(profData.bank_account_number || '');
        setBankAccountName(profData.bank_account_name || '');
        setMobileBankingNumber(profData.mobile_banking_number || '');
      }
    } catch (err: any) {
      console.error('Error loading supplier profile:', err);
      setErrorMsg('Failed to load profile data. Please ensure the backend is connected.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group 64 districts by division
  const groupedDistricts = districts.reduce<Record<string, DistrictItem[]>>((acc, d) => {
    const div = d.division || 'Other';
    if (!acc[div]) acc[div] = [];
    acc[div].push(d);
    return acc;
  }, {});

  const currentDistrict = districts.find((d) => d.id === Number(primaryDistrictId));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`http://localhost:8080/api/v1/supplier/profile/region?userId=${user?.user_id || 4}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          business_name: businessName,
          trade_license_number: tradeLicense,
          primary_district_id: Number(primaryDistrictId),
          depot_address: depotAddress,
          phone_number: phoneNumber,
          default_payment_method: defaultPaymentMethod,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_name: bankAccountName,
          mobile_banking_number: mobileBankingNumber,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update regional profile.');
      }

      const updated = await res.json();
      setProfile(updated);
      setSuccessMsg('Operational territory and depot profile updated successfully!');
      if (onProfileUpdated) onProfileUpdated(updated);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-500 font-semibold">Loading regional settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Visual Confirmation & Binding Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-6 text-white shadow-xl shadow-blue-500/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-white/20 tracking-wider text-cyan-100 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-200" />
                Territory Bound
              </span>
              <span className="text-xs text-blue-100 font-medium">Primary Hub Operational Anchor</span>
            </div>

            <h2 className="text-2xl font-black font-oswald uppercase tracking-tight text-white flex items-center gap-2">
              <span>Bound Region:</span>
              <span className="text-cyan-200 underline decoration-cyan-300 underline-offset-4">
                {currentDistrict?.name || 'Dhaka'} District
              </span>
              <span className="text-sm font-normal text-blue-100 font-sans">
                ({currentDistrict?.division || 'Dhaka'} Division)
              </span>
            </h2>

            <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
              Your supplier account is locked to <strong>{currentDistrict?.name || 'Dhaka'}</strong>. All inventory requisitions, product dispatches, and warehouse stock reconciliation automatically route through this regional jurisdiction.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="inline-flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <Truck className="w-6 h-6 text-cyan-200 mb-1" />
              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">64 Districts</span>
              <span className="text-xs font-mono font-bold text-white">Active Grid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Profile & Territory Configuration Form */}
      <form onSubmit={handleSave} className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h3 className="font-oswald text-lg font-bold uppercase text-zinc-900 tracking-tight flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Supplier Depot & Operational Region Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your primary district among Bangladesh's 64 districts and configure physical logistics credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"
            title="Reload settings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Primary Operational District Selector (64 Districts Grouped by Division) */}
          <div className="md:col-span-2 space-y-1.5 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Primary Operational District (64 Districts by Division) *
            </label>
            <p className="text-[11px] text-blue-700/80 mb-2">
              All product lines and emergency stock-out tickets will be tagged with this chosen home district.
            </p>
            <select
              value={primaryDistrictId}
              onChange={(e) => setPrimaryDistrictId(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer shadow-2xs"
            >
              {Object.entries(groupedDistricts).map(([division, list]) => (
                <optgroup key={division} label={`── ${division} Division (${list.length} Districts) ──`}>
                  {list.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({division} Division)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Business / Depot Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
              Business / Depot Trade Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Central Beverage Logistics Hub"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Trade License Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
              Trade License Number / Govt Ref
            </label>
            <input
              type="text"
              value={tradeLicense}
              onChange={(e) => setTradeLicense(e.target.value)}
              placeholder="e.g. TRD-DHK-2026-9812"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              Depot Contact Phone *
            </label>
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +8801700112233"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Verification Status */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
              Platform Verification
            </label>
            <div className="h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className={`w-2 h-2 rounded-full ${profile?.is_verified ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{profile?.is_verified ? 'Verified Logistics Partner' : 'Standard Registered Supplier'}</span>
            </div>
          </div>

          {/* Depot Warehouse Address */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Depot Warehouse Physical Address & Emergency Logistics Instructions
            </label>
            <textarea
              rows={3}
              value={depotAddress}
              onChange={(e) => setDepotAddress(e.target.value)}
              placeholder="Provide exact physical address, gate number, and emergency offload contact details..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          {/* Dedicated Section: Commercial Payment Method & Banking Credentials */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-indigo-100 pb-2.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="font-oswald text-sm font-bold uppercase tracking-tight text-indigo-950">
                  Commercial Settlement & Payment Method
                </h3>
                <p className="text-[11px] text-indigo-800/80">
                  Configure your default settlement method and corporate credentials for official tax invoices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default Payment Method Selector */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Default Requisition Payment Method *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    { id: 'CORPORATE_BANK_TRANSFER', label: 'Bank Wire / EFT', desc: 'Direct corporate settlement' },
                    { id: 'BKASH_MERCHANT', label: 'bKash Merchant B2B', desc: 'Fast mobile corporate clearing' },
                    { id: 'NET_30_CREDIT', label: 'Net-30 Terms', desc: 'Wholesale credit account' },
                    { id: 'COMPANY_CHEQUE', label: 'Cheque on Delivery', desc: 'Depot arrival cheque / COD' },
                  ].map((pm) => (
                    <label
                      key={pm.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        defaultPaymentMethod === pm.id
                          ? 'bg-white ring-2 ring-indigo-500 border-indigo-400 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900">{pm.label}</span>
                        <input
                          type="radio"
                          name="defaultPaymentMethod"
                          value={pm.id}
                          checked={defaultPaymentMethod === pm.id}
                          onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">{pm.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Bank Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Corporate Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Dutch-Bangla Bank PLC"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Bank Account Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Bank Account Title / Beneficiary
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="e.g. Central Beverage Logistics Depot Ltd"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Bank Account Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Bank Account Number / IBAN
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 115.120.984123-DHK"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Mobile Financial Services (MFS) Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  bKash / Nagad Corporate Merchant No.
                </label>
                <input
                  type="text"
                  value={mobileBankingNumber}
                  onChange={(e) => setMobileBankingNumber(e.target.value)}
                  placeholder="e.g. +8801700112233"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Last Updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : 'Just now'}
          </span>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Region Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Territory & Profile Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierProfileSettings;
