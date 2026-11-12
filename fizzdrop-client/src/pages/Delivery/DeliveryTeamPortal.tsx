import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  Route,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  Search,
  FileText,
  Boxes,
  Store,
  ChevronRight,
  ShieldCheck,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { VehicleDispatch, DeliveryTeam } from '../Admin/SupplierDeliveryManagement';

export const DeliveryTeamPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRegNo = searchParams.get('regNo') || '';

  const [regNo, setRegNo] = useState<string>(initialRegNo);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [team, setTeam] = useState<DeliveryTeam | null>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [trips, setTrips] = useState<VehicleDispatch[]>([]);
  const [activeTrip, setActiveTrip] = useState<VehicleDispatch | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPortalData = async (targetRegNo?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = targetRegNo || regNo;
      const url = q
        ? `http://localhost:8080/api/v1/delivery/team-portal?regNo=${encodeURIComponent(q)}`
        : 'http://localhost:8080/api/v1/delivery/team-portal';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team || null);
        setAllTeams(Array.isArray(data.all_teams) ? data.all_teams : []);
        const trs = Array.isArray(data.trips) ? data.trips : [];
        setTrips(trs);
        // Set first active trip (or recent trip)
        const current = trs.find((t: any) => t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT') || trs[0] || null;
        setActiveTrip(current);
        if (data.team && !regNo) {
          setRegNo(data.team.vehicle_registration_no);
        }
      } else {
        setErrorMsg('Delivery team or vehicle registration not found.');
      }
    } catch {
      setErrorMsg('Failed to connect to delivery dispatch server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleSelectTeam = (newRegNo: string) => {
    setRegNo(newRegNo);
    setSearchParams({ regNo: newRegNo });
    fetchPortalData(newRegNo);
  };

  const handleUpdateTripStatus = async (tripId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches/${tripId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Status updated to ${newStatus}!`);
        fetchPortalData();
      } else {
        setErrorMsg(data.message || 'Failed to update delivery status.');
      }
    } catch {
      setErrorMsg('Network error updating status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      {/* Top Mobile-Friendly Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Truck className="w-5 h-5 text-white" />
            </div>

            <div>
              <h1 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
                Delivery Team Fleet Portal
              </h1>
              <p className="text-[10px] text-cyan-400 font-mono font-medium">
                Supplier Vehicle Manifest & Route Tracking
              </p>
            </div>
          </div>

          {/* Quick Team / Vehicle Registration Selector */}
          <div className="flex items-center gap-2">
            <select
              value={team?.vehicle_registration_no || regNo}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {allTeams.map((t) => (
                <option key={t.id} value={t.vehicle_registration_no}>
                  {t.vehicle_registration_no} ({t.team_name})
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchPortalData()}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 w-full flex-1 space-y-5">
        {/* Alerts */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white font-bold">×</button>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white font-bold">×</button>
          </div>
        )}

        {/* Vehicle & Team Profile Card */}
        {team && (
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900 border border-slate-700/80 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
                  ASSIGNED VEHICLE & LOGISTICS CREW
                </span>
                <h2 className="font-oswald text-xl font-black text-white tracking-wide flex items-center gap-2">
                  <span>{team.team_name}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                    team.status === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }`}>
                    {team.status}
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="font-mono text-sm font-black px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {team.vehicle_registration_no}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-700/60 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Driver</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  {team.driver_name} ({team.driver_phone})
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle Specification</span>
                <span className="font-bold text-slate-200 mt-0.5 block">
                  {team.vehicle_type} (Capacity: {team.max_capacity_cases} Cases)
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Crew Members</span>
                <span className="text-slate-300 text-[11px] mt-0.5 block truncate" title={team.team_members}>
                  {team.team_members || 'Driver & Loader crew'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Current Active Trip Card */}
        {activeTrip ? (
          <div className="p-5 rounded-3xl bg-slate-800/80 border border-slate-700 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                    CURRENT DELIVERY RUN
                  </span>
                  <span className="font-mono text-xs text-slate-300 font-bold">
                    {activeTrip.dispatch_code}
                  </span>
                </div>
                <h3 className="font-oswald text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <Route className="w-5 h-5 text-cyan-400" />
                  <span>Sub-Route: {activeTrip.sub_route}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Total Payload: <strong className="text-cyan-300 font-mono">{activeTrip.total_cases} Cases</strong> to <strong className="text-white">{activeTrip.total_outlets} Outlets</strong>
                </p>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {activeTrip.status === 'DISPATCHED' && (
                  <button
                    onClick={() => handleUpdateTripStatus(activeTrip.id, 'IN_TRANSIT')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    Start Delivery Route 🚚
                  </button>
                )}
                {activeTrip.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => handleUpdateTripStatus(activeTrip.id, 'DELIVERED')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    Complete All Deliveries ✓
                  </button>
                )}
                {(activeTrip.status === 'DELIVERED' || activeTrip.status === 'COMPLETED') && (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                    Trip Delivered Successfully 🎉
                  </span>
                )}
              </div>
            </div>

            {/* Outlets Delivery Checklist */}
            <div className="space-y-3">
              <h4 className="font-oswald text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-cyan-400" />
                <span>Stores to Restock on this Route ({activeTrip.items?.length || 0} product drops)</span>
              </h4>

              {(!activeTrip.items || activeTrip.items.length === 0) ? (
                <p className="text-xs text-slate-400">No stores assigned on this trip manifest.</p>
              ) : (
                <div className="space-y-2.5">
                  {activeTrip.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-600 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-white">
                            {item.outlet_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{item.location_address || 'Subroute Store Location'}</span>
                        </p>
                        {item.contact_phone && (
                          <a
                            href={`tel:${item.contact_phone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            Call Store: {item.contact_phone}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Deliver Product</span>
                          <span className="font-bold text-sm text-indigo-300">
                            {item.product_name}
                          </span>
                          <span className="font-mono text-xs font-black text-cyan-300 block">
                            {item.assigned_cases} Cases
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-800/50 rounded-3xl border border-dashed border-slate-700 text-slate-400 text-xs space-y-2">
            <Truck className="w-12 h-12 mx-auto text-slate-600 mb-1" />
            <p className="font-bold text-slate-300 text-sm">No Active Trips Assigned</p>
            <p className="text-slate-500 max-w-sm mx-auto">
              Your vehicle currently has no active delivery dispatch scheduled. As soon as the Supplier dispatches a trip for this vehicle, the route manifest will appear here live.
            </p>
          </div>
        )}

        {/* Trips History */}
        {trips.length > 1 && (
          <div className="p-5 rounded-3xl bg-slate-800/60 border border-slate-700 space-y-3">
            <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Trip Manifests History ({trips.length})</span>
            </h4>

            <div className="space-y-2">
              {trips.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTrip(t)}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                    activeTrip?.id === t.id
                      ? 'bg-blue-900/30 border-blue-500/50'
                      : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-white">{t.dispatch_code}</span>
                    <span className="text-slate-400 ml-2">• Route: {t.sub_route}</span>
                    <p className="text-[11px] text-slate-500">
                      {new Date(t.dispatched_at).toLocaleDateString()} • {t.total_cases} Cases to {t.total_outlets} Stores
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                    t.status === 'DELIVERED' || t.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default DeliveryTeamPortal;
