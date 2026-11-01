import React, { useState, useEffect } from 'react';
import {
  Building,
  MapPin,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface SupplierProfileData {
  id: number;
  user_id: number;
  user_email?: string;
  business_name: string;
  trade_license_number: string;
  primary_district_id: number;
  district_name?: string;
  division_name?: string;
  covered_district_ids?: string;
  covered_district_ids_list?: number[];
  assigned_districts?: Array<{ id: number; name: string; division: string }>;
  depot_address: string;
  phone_number: string;
  default_payment_method?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  mobile_banking_number?: string;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export const SupplierProfileView: React.FC = () => {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<SupplierProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/supplier/profile?userId=${user?.user_id || 4}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        throw new Error('Failed to load profile details.');
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setErrorMsg('Failed to fetch assigned profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.user_id]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-500 font-semibold">Loading assigned profile dossier...</span>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">Profile Information Unavailable</h3>
        <p className="text-xs text-slate-500">{errorMsg || 'Could not retrieve profile from database.'}</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const assignedCities = profile.assigned_districts || [];
  const paymentMethodDisplay = profile.default_payment_method
    ? profile.default_payment_method.replace(/_/g, ' ')
    : 'Corporate Bank Transfer';

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Superadmin Authority Notice Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-md border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-400" />
                Managed by Superadmin
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {profile.is_verified ? 'Verified Distributor' : 'Authorization Pending'}
              </span>
            </div>

            <h2 className="font-oswald text-xl font-bold tracking-tight text-white uppercase">
              {profile.business_name}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Regional Supply & Logistics Partner Profile
            </p>
          </div>

          <button
            onClick={fetchProfile}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            title="Refresh profile details"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Informational callout */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2 text-xs text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Territory allotment, covered cities, and financial credentials were provisioned by the Central Superadmin based on physical contract registration dossiers. 
          </span>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Geographic Territory Allotment */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-oswald text-slate-900 uppercase tracking-wider">
                Geographic Allotment & Coverage
              </h3>
              <span className="text-[10px] text-slate-500">Superadmin Allotted Franchise Territory</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Administrative Operating Division
              </span>
              <span className="text-sm font-bold text-slate-900">
                {profile.division_name || 'Dhaka'} Division
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Primary Regional Hub
              </span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 inline-block mt-0.5">
                {profile.district_name || 'Primary District'} ★
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Allotted Franchise Outlet Cities ({assignedCities.length || 1})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {assignedCities.length > 0 ? (
                  assignedCities.map((c) => (
                    <span
                      key={c.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        c.id === profile.primary_district_id
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {c.name} {c.id === profile.primary_district_id && '★'}
                    </span>
                  ))
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-xs bg-slate-50 text-slate-700 border border-slate-200">
                    {profile.district_name || 'Allotted District'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                • You are authorized to supply stock exclusively to franchise outlets situated within these allotted cities.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Business & Contact Dossier */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-oswald text-slate-900 uppercase tracking-wider">
                Physical Depot & Business Dossier
              </h3>
              <span className="text-[10px] text-slate-500">Contract Registration Record</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Trade License Number
              </span>
              <span className="text-xs font-mono font-semibold text-slate-800">
                {profile.trade_license_number || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Physical Depot Address
              </span>
              <span className="text-xs font-medium text-slate-800 block mt-0.5">
                {profile.depot_address || 'Regional Logistics Hub'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Contact Phone
              </span>
              <span className="text-xs font-mono font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                {profile.phone_number || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Portal Login Email
              </span>
              <span className="text-xs font-mono font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3 h-3 text-slate-400" />
                {profile.user_email || user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Financial Settlement & Payment Method */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-oswald text-slate-900 uppercase tracking-wider">
                Approved Payment & Settlement Method
              </h3>
              <span className="text-[10px] text-slate-500">Designated Settlement Channel on Invoices</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Designated Method
              </span>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-0.5 block">
                {paymentMethodDisplay}
              </span>
            </div>

            {profile.bank_name && (
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Bank Name & Account
                </span>
                <span className="text-xs font-medium text-slate-800 block mt-0.5">
                  {profile.bank_name}
                </span>
                {profile.bank_account_number && (
                  <span className="text-[11px] font-mono text-slate-500 block">
                    A/C: {profile.bank_account_number}
                  </span>
                )}
                {profile.bank_account_name && (
                  <span className="text-[11px] text-slate-500 block truncate">
                    Title: {profile.bank_account_name}
                  </span>
                )}
              </div>
            )}

            {profile.mobile_banking_number && (
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Corporate Mobile Banking
                </span>
                <span className="text-xs font-mono font-semibold text-slate-800 block mt-0.5">
                  {profile.mobile_banking_number}
                </span>
              </div>
            )}

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Invoice Settlement Policy
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                Automatically pre-filled on printable PDF stock requisition invoices approved by Superadmin.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
