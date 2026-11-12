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
  Boxes,
  Store,
  ArrowLeft,
  Navigation,
  PackageCheck,
  Check,
  AlertTriangle,
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

  // Boarding verification confirmation state
  const [isBoardingVerified, setIsBoardingVerified] = useState<boolean>(false);

  // Delivery quantity input per outlet
  const [deliveredQuantities, setDeliveredQuantities] = useState<Record<number, number>>({});
  const [deliveryNotes, setDeliveryNotes] = useState<Record<number, string>>({});

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
        // Find active in-progress trip or first
        const current = trs.find((t: any) =>
          t.status === 'DISPATCHED' || t.status === 'BOARDED' || t.status === 'IN_TRANSIT' || t.status === 'DELIVERING'
        ) || trs[0] || null;
        setActiveTrip(current);

        // Pre-populate default delivered quantities
        if (current && Array.isArray(current.items)) {
          const initQty: Record<number, number> = {};
          current.items.forEach((it: any) => {
            if (it.outlet_id) {
              const assigned = it.assigned_cases || it.demanded_cases || 0;
              initQty[it.outlet_id] = (initQty[it.outlet_id] || 0) + assigned;
            }
          });
          setDeliveredQuantities(initQty);
        }

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
    // Auto-poll trip status updates every 6 seconds
    const interval = setInterval(() => {
      fetchPortalData(regNo);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTeam = (newRegNo: string) => {
    setRegNo(newRegNo);
    setSearchParams({ regNo: newRegNo });
    fetchPortalData(newRegNo);
  };

  // Step 1: Confirm Stocks Boarded on Truck
  const handleConfirmStocksBoarded = async (tripId: number) => {
    if (!isBoardingVerified) {
      alert('Please check the verification box confirming stocks have been physically loaded onto the truck.');
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches/${tripId}/board`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Stocks boarded on truck verified! Ready to start ride.');
        fetchPortalData();
      } else {
        setErrorMsg(data.message || 'Failed to verify stocks boarding.');
      }
    } catch {
      setErrorMsg('Network error confirming stocks boarding.');
    } finally {
      setActionLoading(false);
    }
  };

  // Step 2: Rider Starts the Ride
  const handleStartRide = async (tripId: number) => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches/${tripId}/start-ride`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Ride started! Vehicle is now in transit to subroute outlets.');
        fetchPortalData();
      } else {
        setErrorMsg(data.message || 'Failed to start delivery ride.');
      }
    } catch {
      setErrorMsg('Network error starting ride.');
    } finally {
      setActionLoading(false);
    }
  };

  // Step 3: Driver Confirms Delivery & Ticks Outlet
  const handleConfirmOutletDelivery = async (tripId: number, outletId: number) => {
    const qty = deliveredQuantities[outletId];
    if (qty === undefined || qty <= 0) {
      alert('Please specify the quantity of cases supplied to this outlet.');
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches/${tripId}/confirm-outlet-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          quantity_delivered: qty,
          notes: deliveryNotes[outletId] || '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Outlet delivery confirmed! Supplier has been notified in real time.');
        fetchPortalData();
      } else {
        setErrorMsg(data.message || 'Failed to confirm outlet delivery.');
      }
    } catch {
      setErrorMsg('Network error confirming outlet delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4: Complete Entire Trip
  const handleCompleteTrip = async (tripId: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches/${tripId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('All deliveries completed! Vehicle freed back to available.');
        fetchPortalData();
      } else {
        setErrorMsg(data.message || 'Failed to complete delivery.');
      }
    } catch {
      setErrorMsg('Network error completing trip.');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate cargo breakdown on truck
  const cargoBreakdown: Record<string, { brand: string; cases: number }> = {};
  if (activeTrip && Array.isArray(activeTrip.items)) {
    activeTrip.items.forEach((it) => {
      const name = it.product_name || 'Beverage Product';
      const cases = it.assigned_cases || it.demanded_cases || 0;
      if (!cargoBreakdown[name]) {
        cargoBreakdown[name] = { brand: name, cases: 0 };
      }
      cargoBreakdown[name].cases += cases;
    });
  }

  // Group items by outlet
  const outletGroups: Record<number, {
    outlet_id: number;
    outlet_name: string;
    branch_name?: string;
    location_address?: string;
    contact_phone?: string;
    total_assigned_cases: number;
    stop_status: string;
    driver_delivered_at?: string;
    driver_delivered_cases?: number;
    items: any[];
  }> = {};

  if (activeTrip && Array.isArray(activeTrip.items)) {
    activeTrip.items.forEach((it) => {
      const oid = it.outlet_id;
      if (!outletGroups[oid]) {
        outletGroups[oid] = {
          outlet_id: oid,
          outlet_name: it.outlet_name,
          branch_name: it.branch_name,
          location_address: it.location_address,
          contact_phone: it.contact_phone,
          total_assigned_cases: 0,
          stop_status: it.stop_status || 'PENDING',
          driver_delivered_at: it.driver_delivered_at,
          driver_delivered_cases: it.driver_delivered_cases,
          items: [],
        };
      }
      outletGroups[oid].total_assigned_cases += (it.assigned_cases || it.demanded_cases || 0);
      outletGroups[oid].items.push(it);
      if (it.stop_status) {
        outletGroups[oid].stop_status = it.stop_status;
      }
      if (it.driver_delivered_at) {
        outletGroups[oid].driver_delivered_at = it.driver_delivered_at;
      }
      if (it.driver_delivered_cases) {
        outletGroups[oid].driver_delivered_cases = it.driver_delivered_cases;
      }
    });
  }

  const outletsList = Object.values(outletGroups);
  const allOutletsDelivered = outletsList.length > 0 && outletsList.every(
    (o) => o.stop_status === 'DELIVERED_BY_DRIVER' || o.stop_status === 'CONFIRMED_BY_OUTLET'
  );

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
                Vehicle Cargo Manifest & Stop Deliveries
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
              title="Refresh Portal Data"
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
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
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
          <div className="p-5 rounded-3xl bg-slate-800/80 border border-slate-700 shadow-xl space-y-5">
            {/* Header: Code, Route, Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                    CURRENT DELIVERY RUN
                  </span>
                  <span className="font-mono text-xs text-slate-300 font-bold">
                    {activeTrip.dispatch_code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                    activeTrip.status === 'BOARDED'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : activeTrip.status === 'IN_TRANSIT'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : activeTrip.status === 'DELIVERED' || activeTrip.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {activeTrip.status}
                  </span>
                </div>
                <h3 className="font-oswald text-xl font-bold text-white mt-1 flex items-center gap-2">
                  <Route className="w-5 h-5 text-cyan-400" />
                  <span>Sub-Route: {activeTrip.sub_route}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Payload: <strong className="text-cyan-300 font-mono">{activeTrip.total_cases} Cases</strong> allocated to <strong className="text-white">{outletsList.length} Outlets</strong>
                </p>
              </div>

              {/* Complete Trip Action Button */}
              {allOutletsDelivered && activeTrip.status !== 'COMPLETED' && (
                <button
                  onClick={() => handleCompleteTrip(activeTrip.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Finish Route & Return Vehicle</span>
                </button>
              )}
            </div>

            {/* ======================================================== */}
            {/* CARGO MANIFEST: STOCKS BOARDED ON TRUCK                  */}
            {/* ======================================================== */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-oswald text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <span>Stocks Loaded / Assigned on Truck</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {activeTrip.total_cases} Total Cases
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(cargoBreakdown).map((cargo, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate pr-2">{cargo.brand}</span>
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 shrink-0">
                      {cargo.cases} cases
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ======================================================== */}
            {/* STEP 1: DRIVER CONFIRMS STOCKS BOARDED ON TRUCK         */}
            {/* ======================================================== */}
            {activeTrip.status === 'DISPATCHED' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-2 border-blue-500/50 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-oswald text-sm font-bold text-white uppercase tracking-wider">
                      Step 1: Confirm Stocks Boarded on Truck
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Verify physical inventory loaded onto vehicle {team?.vehicle_registration_no} matches the cargo manifest.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBoardingVerified}
                    onChange={(e) => setIsBoardingVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600 cursor-pointer"
                  />
                  <span>
                    I confirm that all <strong className="text-white">{activeTrip.total_cases} beverage cases</strong> have been inspected and boarded on the vehicle.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleConfirmStocksBoarded(activeTrip.id)}
                  disabled={actionLoading || !isBoardingVerified}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    isBoardingVerified
                      ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirm Stocks Boarded on Truck</span>
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: RIDER STARTS THE DELIVERY RIDE                   */}
            {/* ======================================================== */}
            {activeTrip.status === 'BOARDED' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-2 border-purple-500/50 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-oswald text-sm font-bold text-white uppercase tracking-wider">
                      Step 2: Start Delivery Route
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Stocks boarded! Click below to start the ride. Supplier will track your truck's progression in real time.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartRide(activeTrip.id)}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-600/30"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Start Ride / Begin Delivery Route 🚚</span>
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: OUTLET STOPS & QUANTITY CONFIRMATION CHECKLIST  */}
            {/* ======================================================== */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Store className="w-4 h-4 text-cyan-400" />
                  <span>Outlets to Restock ({outletsList.length} Stores on Route)</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {outletsList.filter((o) => o.stop_status === 'DELIVERED_BY_DRIVER' || o.stop_status === 'CONFIRMED_BY_OUTLET').length} / {outletsList.length} Completed
                </span>
              </div>

              {outletsList.length === 0 ? (
                <p className="text-xs text-slate-400">No stores assigned on this trip manifest.</p>
              ) : (
                <div className="space-y-3">
                  {outletsList.map((outlet, idx) => {
                    const isDeliveredByDriver = outlet.stop_status === 'DELIVERED_BY_DRIVER';
                    const isConfirmedByOutlet = outlet.stop_status === 'CONFIRMED_BY_OUTLET';
                    const isDone = isDeliveredByDriver || isConfirmedByOutlet;

                    return (
                      <div
                        key={outlet.outlet_id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isConfirmedByOutlet
                            ? 'bg-emerald-950/40 border-emerald-500/50'
                            : isDeliveredByDriver
                            ? 'bg-cyan-950/40 border-cyan-500/50'
                            : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        {/* Stop Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                                isDone ? 'bg-emerald-500 text-slate-950' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {isDone ? '✓' : idx + 1}
                              </span>
                              <h5 className="font-bold text-sm text-white">
                                {outlet.outlet_name} {outlet.branch_name && `(${outlet.branch_name})`}
                              </h5>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                                isConfirmedByOutlet
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : isDeliveredByDriver
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {isConfirmedByOutlet
                                  ? 'Outlet Confirmed & Accepted'
                                  : isDeliveredByDriver
                                  ? 'Delivered by Driver (Pending Outlet)'
                                  : 'En Route / Not Delivered Yet'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pl-8">
                              {outlet.location_address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                  {outlet.location_address}
                                </span>
                              )}
                              {outlet.contact_phone && (
                                <a
                                  href={`tel:${outlet.contact_phone}`}
                                  className="flex items-center gap-1 text-cyan-400 hover:underline"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {outlet.contact_phone}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="text-right sm:self-center pl-8 sm:pl-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Delivery</span>
                            <span className="font-mono text-sm font-black text-cyan-300">
                              {outlet.total_assigned_cases} Cases
                            </span>
                          </div>
                        </div>

                        {/* Product Items Breakdown */}
                        <div className="pl-8 pt-2 border-t border-slate-800/80 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Demanded Products:</span>
                          <div className="flex flex-wrap gap-2">
                            {outlet.items.map((it: any, itemIdx: number) => (
                              <span
                                key={itemIdx}
                                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 flex items-center gap-1.5"
                              >
                                <span className="text-white font-medium">{it.product_name}</span>
                                <strong className="text-cyan-400 font-mono">
                                  {it.assigned_cases || it.demanded_cases || 0} cases
                                </strong>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Driver Delivery Action / Confirmation Area */}
                        <div className="pl-8 pt-2">
                          {isConfirmedByOutlet ? (
                            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Outlet has confirmed receipt of stock! Profit updated on supplier portal.</span>
                            </div>
                          ) : isDeliveredByDriver ? (
                            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-cyan-400" />
                                <span>
                                  Delivered {outlet.driver_delivered_cases || outlet.total_assigned_cases} cases. Awaiting outlet confirmation in their portal.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleConfirmOutletDelivery(activeTrip.id, outlet.outlet_id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Re-verify Quantity
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-700/80">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-300 font-bold shrink-0">Cases Supplied:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={deliveredQuantities[outlet.outlet_id] ?? outlet.total_assigned_cases}
                                  onChange={(e) =>
                                    setDeliveredQuantities({
                                      ...deliveredQuantities,
                                      [outlet.outlet_id]: Math.max(1, parseInt(e.target.value) || 0),
                                    })
                                  }
                                  className="w-20 px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-white font-mono font-bold text-xs focus:ring-1 focus:ring-blue-500"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleConfirmOutletDelivery(activeTrip.id, outlet.outlet_id)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20 sm:ml-auto"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm Delivery to this Outlet</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-800/60 rounded-3xl border border-dashed border-slate-700">
            <Truck className="w-12 h-12 mx-auto text-slate-500 mb-2" />
            <h3 className="font-oswald text-lg font-bold text-slate-300">No Active Dispatches for this Vehicle</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Vehicle {regNo || 'selected'} has no active delivery routes currently. When the Supplier dispatches a route for this vehicle, it will appear here instantly.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DeliveryTeamPortal;
