import React, { useState, useEffect, useRef } from 'react';
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
  XCircle,
  Zap,
  Send,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { VehicleDispatch, DeliveryTeam } from '../Admin/SupplierDeliveryManagement';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPopup } from '../../components/Notifications/NotificationPopup';

export const DeliveryTeamPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRegNo = searchParams.get('regNo') || '';

  const [regNo, setRegNo] = useState<string>(initialRegNo);
  const currentRegNoRef = useRef<string>(initialRegNo);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [team, setTeam] = useState<DeliveryTeam | null>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [trips, setTrips] = useState<VehicleDispatch[]>([]);
  const [activeTrip, setActiveTrip] = useState<VehicleDispatch | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reallocate / Offer Onboarded Stock state
  const [availableOutlets, setAvailableOutlets] = useState<any[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState<boolean>(false);
  const [offerSourceStop, setOfferSourceStop] = useState<any | null>(null);
  const [selectedRecipientOutletId, setSelectedRecipientOutletId] = useState<number | ''>('');
  const [offerCases, setOfferCases] = useState<number>(10);
  const [offerNotes, setOfferNotes] = useState<string>('');
  const [offeringLoading, setOfferingLoading] = useState<boolean>(false);

  // Real-time Delivery Team Notifications (for stop cancellations and alerts)
  const {
    notifications,
    unreadCount,
    popupNotification,
    dismissPopup,
  } = useNotifications('DELIVERY_TEAM', team?.id);

  // Boarding verification confirmation state
  const [isBoardingVerified, setIsBoardingVerified] = useState<boolean>(false);

  // Delivery quantity input per outlet
  const [deliveredQuantities, setDeliveredQuantities] = useState<Record<number, number>>({});
  const [deliveryNotes, setDeliveryNotes] = useState<Record<number, string>>({});

  const fetchPortalData = async (targetRegNo?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = targetRegNo !== undefined ? targetRegNo : currentRegNoRef.current;
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

        if (data.team?.vehicle_registration_no) {
          const loadedReg = data.team.vehicle_registration_no;
          setRegNo(loadedReg);
          currentRegNoRef.current = loadedReg;
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

  // Sync state if URL search param changes
  useEffect(() => {
    const urlReg = searchParams.get('regNo') || '';
    if (urlReg && urlReg !== currentRegNoRef.current) {
      setRegNo(urlReg);
      currentRegNoRef.current = urlReg;
      fetchPortalData(urlReg);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPortalData(currentRegNoRef.current);
    // Auto-poll trip status updates every 6 seconds using active ref
    const interval = setInterval(() => {
      fetchPortalData(currentRegNoRef.current);
    }, 6000);

    // Real-time broadcast channel for instant cancellation alerts
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('fizzdrop_realtime_events');
      channel.onmessage = (event) => {
        if (event.data?.type === 'DELIVERY_ORDER_CANCELLED' || event.data?.type === 'DELIVERY_STOCK_OFFERED' || event.data?.type === 'STOCK_OFFER_RESPONDED') {
          fetchPortalData(currentRegNoRef.current);
        }
      };
    } catch {}

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, []);

  // Fetch available outlets for stock re-offering
  useEffect(() => {
    fetch('http://localhost:8080/api/outlets')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAvailableOutlets(data);
      })
      .catch(() => {});
  }, []);

  const handleOpenOfferModal = (stop: any) => {
    setOfferSourceStop(stop);
    const defaultQty = stop?.total_assigned_cases || stop?.items?.[0]?.assigned_cases || 10;
    setOfferCases(defaultQty);
    // Find candidate outlet that is not the cancelled outlet
    const candidate = availableOutlets.find((o) => o.outlet_id !== stop?.outlet_id);
    if (candidate) {
      setSelectedRecipientOutletId(candidate.outlet_id);
    }
    setOfferNotes(`⚡ Driver ${team?.driver_name || ''} offering onboarded stock directly to your store`);
    setIsOfferModalOpen(true);
  };

  const handleSubmitOfferStock = async () => {
    if (!activeTrip || !selectedRecipientOutletId) {
      alert('Please select a recipient outlet.');
      return;
    }
    if (offerCases <= 0) {
      alert('Please specify a positive quantity of cases to offer.');
      return;
    }

    setOfferingLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches/${activeTrip.id}/offer-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_outlet_id: Number(selectedRecipientOutletId),
          cases: offerCases,
          driver_notes: offerNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Successfully offered ${offerCases} cases to outlet! Route updated.`);
        setIsOfferModalOpen(false);
        try {
          const channel = new BroadcastChannel('fizzdrop_realtime_events');
          channel.postMessage({
            type: 'DELIVERY_STOCK_OFFERED',
            dispatchId: activeTrip.id,
            targetOutletId: selectedRecipientOutletId,
          });
          channel.close();
        } catch {}
        fetchPortalData();
      } else {
        alert(data.message || 'Failed to offer stock.');
      }
    } catch {
      alert('Network error offering stock to outlet.');
    } finally {
      setOfferingLoading(false);
    }
  };

  const handleSelectTeam = (newRegNo: string) => {
    setRegNo(newRegNo);
    currentRegNoRef.current = newRegNo;
    setSearchParams({ regNo: newRegNo });
    setIsBoardingVerified(false);
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
    (o) => o.stop_status === 'DELIVERED_BY_DRIVER' || o.stop_status === 'CONFIRMED_BY_OUTLET' || o.stop_status === 'CANCELLED'
  );

  return (
    <div className="min-h-screen bg-[#d8edf1] text-[#0F172A] font-sans flex flex-col delivery-theme">
      {/* Top Mobile-Friendly Navigation */}
      <header className="sticky top-0 z-40 bg-[#8DBCC7] border-b border-[#73a7b3] px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="p-2 rounded-xl bg-[#A4CCD9] hover:bg-[#C4E1E6] text-[#0F172A] border border-[#73a7b3] transition-colors cursor-pointer"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-9 h-9 rounded-2xl bg-[#0F172A] flex items-center justify-center shadow-xs text-[#EBFFD8]">
              <Truck className="w-5 h-5" />
            </div>

            <div>
              <h1 className="font-oswald text-base font-bold uppercase tracking-wider text-[#0F172A]">
                Delivery Team Fleet Portal
              </h1>
              <p className="text-[10px] text-[#164E63] font-mono font-bold">
                Vehicle Cargo Manifest & Stop Deliveries
              </p>
            </div>
          </div>

          {/* Quick Team / Vehicle Registration Selector */}
          <div className="flex items-center gap-2">
            <select
              value={regNo || team?.vehicle_registration_no || ''}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#73a7b3] text-xs text-[#0F172A] font-mono font-bold focus:ring-2 focus:ring-[#0F172A] cursor-pointer"
            >
              {allTeams.map((t) => (
                <option key={t.id} value={t.vehicle_registration_no}>
                  {t.vehicle_registration_no} ({t.team_name}){t.supplier_name ? ` • ${t.supplier_name}` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchPortalData(currentRegNoRef.current)}
              disabled={loading}
              className="p-2 rounded-xl bg-[#A4CCD9] hover:bg-[#C4E1E6] text-[#0F172A] border border-[#73a7b3] transition-all cursor-pointer"
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
          <div className="p-3.5 rounded-2xl bg-[#EBFFD8] border border-[#8DBCC7] text-[#14532D] text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-[#14532D] hover:text-[#0F172A] font-bold cursor-pointer">×</button>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-800 hover:text-rose-950 font-bold cursor-pointer">×</button>
          </div>
        )}

        {/* Vehicle & Team Profile Card */}
        {team && (
          <div className="p-5 rounded-3xl bg-white border border-[#A4CCD9] shadow-xs space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#164E63] block mb-0.5">
                  ASSIGNED VEHICLE & LOGISTICS CREW
                </span>
                <h2 className="font-oswald text-xl font-black text-[#0F172A] tracking-wide flex items-center gap-2">
                  <span>{team.team_name}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                    team.status === 'AVAILABLE'
                      ? 'bg-[#EBFFD8] text-[#14532D] border border-[#8DBCC7]'
                      : 'bg-[#C4E1E6] text-[#0F172A] border border-[#8DBCC7] animate-pulse'
                  }`}>
                    {team.status}
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="font-mono text-sm font-black px-3 py-1 rounded-xl bg-[#EBFFD8] text-[#0F172A] border border-[#8DBCC7]">
                  {team.vehicle_registration_no}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#C4E1E6] text-xs">
              <div className="p-2.5 rounded-2xl bg-[#d8edf1]/50 border border-[#A4CCD9]">
                <span className="text-[10px] uppercase font-bold text-[#164E63] block">Lead Driver</span>
                <span className="font-bold text-[#0F172A] flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#164E63]" />
                  {team.driver_name} ({team.driver_phone})
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#d8edf1]/50 border border-[#A4CCD9]">
                <span className="text-[10px] uppercase font-bold text-[#164E63] block">Vehicle Specification</span>
                <span className="font-bold text-[#0F172A] mt-0.5 block">
                  {team.vehicle_type} (Capacity: {team.max_capacity_cases} Cases)
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#d8edf1]/50 border border-[#A4CCD9]">
                <span className="text-[10px] uppercase font-bold text-[#164E63] block">Crew Members</span>
                <span className="text-[#334155] font-semibold text-[11px] mt-0.5 block truncate" title={team.team_members}>
                  {team.team_members || 'Driver & Loader crew'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Current Active Trip Card */}
        {activeTrip ? (
          <div className="p-5 rounded-3xl bg-white border border-[#A4CCD9] shadow-xs space-y-5 text-[#0F172A]">
            {/* Header: Code, Route, Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#C4E1E6]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#C4E1E6] text-[#0F172A] border border-[#8DBCC7] uppercase tracking-wider">
                    CURRENT DELIVERY RUN
                  </span>
                  <span className="font-mono text-xs text-[#164E63] font-bold">
                    {activeTrip.dispatch_code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                    activeTrip.status === 'BOARDED'
                      ? 'bg-[#A4CCD9] text-[#0F172A] border border-[#8DBCC7]'
                      : activeTrip.status === 'IN_TRANSIT'
                      ? 'bg-[#C4E1E6] text-[#0F172A] border border-[#8DBCC7]'
                      : activeTrip.status === 'DELIVERED' || activeTrip.status === 'COMPLETED'
                      ? 'bg-[#EBFFD8] text-[#14532D] border border-[#8DBCC7]'
                      : 'bg-[#C4E1E6] text-[#0F172A] border border-[#8DBCC7]'
                  }`}>
                    {activeTrip.status}
                  </span>
                </div>
                <h3 className="font-oswald text-xl font-bold text-[#0F172A] mt-1 flex items-center gap-2">
                  <Route className="w-5 h-5 text-[#164E63]" />
                  <span>Sub-Route: {activeTrip.sub_route}</span>
                </h3>
                <p className="text-xs text-[#334155] mt-0.5 font-medium">
                  Total Payload: <strong className="text-[#0F172A] font-mono">{activeTrip.total_cases} Cases</strong> allocated to <strong className="text-[#0F172A]">{outletsList.length} Outlets</strong>
                </p>
              </div>

              {/* Complete Trip Action Button */}
              {allOutletsDelivered && activeTrip.status !== 'COMPLETED' && (
                <button
                  onClick={() => handleCompleteTrip(activeTrip.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-2xl bg-[#EBFFD8] hover:bg-[#dbf8be] text-[#0F172A] border border-[#8DBCC7] font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <PackageCheck className="w-4 h-4 text-[#164E63]" />
                  <span>Finish Route & Return Vehicle</span>
                </button>
              )}
            </div>

            {/* ======================================================== */}
            {/* CARGO MANIFEST: STOCKS BOARDED ON TRUCK                  */}
            {/* ======================================================== */}
            <div className="p-4 rounded-2xl bg-[#d8edf1]/40 border border-[#A4CCD9] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-oswald text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-[#164E63]" />
                  <span>Stocks Loaded / Assigned on Truck</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#164E63] bg-[#EBFFD8] px-2.5 py-1 rounded-lg border border-[#8DBCC7]">
                  {activeTrip.total_cases} Total Cases
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(cargoBreakdown).map((cargo, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#A4CCD9] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A] truncate pr-2">{cargo.brand}</span>
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-[#C4E1E6] text-[#0F172A] border border-[#8DBCC7] shrink-0">
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
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#C4E1E6] via-[#d8edf1] to-[#EBFFD8] border-2 border-[#8DBCC7] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-[#EBFFD8] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-oswald text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                      Step 1: Confirm Order & Verify Stocks Boarded
                    </h4>
                    <p className="text-[11px] text-[#334155] font-medium">
                      Verify physical inventory loaded onto vehicle {team?.vehicle_registration_no} matches the cargo manifest for destination outlets.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[#A4CCD9] text-xs text-[#0F172A] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBoardingVerified}
                    onChange={(e) => setIsBoardingVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-[#164E63] focus:ring-[#8DBCC7] bg-white border-[#8DBCC7] cursor-pointer"
                  />
                  <span>
                    I confirm this delivery order and that all <strong className="text-[#0F172A] font-bold">{activeTrip.total_cases} beverage cases</strong> have been inspected and boarded on vehicle.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleConfirmStocksBoarded(activeTrip.id)}
                  disabled={actionLoading || !isBoardingVerified}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    isBoardingVerified
                      ? 'bg-[#0F172A] hover:bg-[#164E63] text-white cursor-pointer shadow-xs border border-[#8DBCC7]'
                      : 'bg-[#C4E1E6] text-[#64748B] cursor-not-allowed border border-[#A4CCD9]'
                  }`}
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirm Order & Stocks Boarded on Vehicle</span>
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: RIDER STARTS THE DELIVERY RIDE                   */}
            {/* ======================================================== */}
            {activeTrip.status === 'BOARDED' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#C4E1E6] via-[#d8edf1] to-[#EBFFD8] border-2 border-[#8DBCC7] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-[#EBFFD8] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-oswald text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                      Step 2: Go for Delivery (Start Ride)
                    </h4>
                    <p className="text-[11px] text-[#334155] font-medium">
                      Order confirmed and stocks boarded! Click below to begin delivery to assigned outlets. Real-time GPS and status tracking active.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartRide(activeTrip.id)}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#164E63] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border border-[#8DBCC7]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Go for Delivery / Start Ride 🚚</span>
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: OUTLET STOPS & QUANTITY CONFIRMATION CHECKLIST  */}
            {/* ======================================================== */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#164E63]" />
                  <span>Outlets to Restock ({outletsList.length} Stores on Route)</span>
                </h4>
                <span className="text-xs text-[#164E63] font-mono font-bold bg-[#EBFFD8] px-2.5 py-1 rounded-lg border border-[#8DBCC7]">
                  {outletsList.filter((o) => o.stop_status === 'DELIVERED_BY_DRIVER' || o.stop_status === 'CONFIRMED_BY_OUTLET').length} / {outletsList.length} Completed
                </span>
              </div>

              {outletsList.length === 0 ? (
                <p className="text-xs text-[#475569]">No stores assigned on this trip manifest.</p>
              ) : (
                <div className="space-y-3">
                  {outletsList.some((o) => o.stop_status === 'CANCELLED') && (
                    <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-pulse">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div className="text-xs">
                          <span className="font-bold text-rose-950 uppercase tracking-wider block">🚨 Alert: Order Cancelled — Onboarded Stock Available</span>
                          <span className="text-rose-800 font-medium">A store on this manifest cancelled their order. You have onboarded stock on your truck that can be reallocated to nearby stores!</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenOfferModal(outletsList.find((o) => o.stop_status === 'CANCELLED') || outletsList[0])}
                        className="px-4 py-2 rounded-xl bg-[#EBFFD8] hover:bg-[#dbf8be] text-[#0F172A] font-black text-xs border border-[#8DBCC7] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                      >
                        <Zap className="w-4 h-4 fill-[#0F172A] text-[#0F172A]" />
                        <span>Offer Stock to Nearby Outlets ⚡</span>
                      </button>
                    </div>
                  )}

                  {outletsList.some((o) => o.items.some((it: any) => it.offer_status === 'ACCEPTED') && o.stop_status !== 'DELIVERED_BY_DRIVER' && o.stop_status !== 'CONFIRMED_BY_OUTLET') && (
                    <div className="p-4 rounded-2xl bg-[#EBFFD8] border-2 border-[#8DBCC7] text-[#14532D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#8DBCC7] text-[#0F172A] flex items-center justify-center font-black shrink-0">
                          <Navigation className="w-5 h-5 animate-pulse text-[#0F172A]" />
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-[#14532D] uppercase tracking-wider block">
                            ⚡ Stock Offer Accepted — Head to Destination
                          </span>
                          <span className="font-medium text-[#164E63]">
                            {outletsList.find((o) => o.items.some((it: any) => it.offer_status === 'ACCEPTED'))?.outlet_name} accepted your stock offer! Go directly to this store to deliver the cargo.
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-white text-[#14532D] border border-[#8DBCC7] text-xs font-mono font-bold shrink-0 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>En Route to Store</span>
                      </span>
                    </div>
                  )}

                  {outletsList.map((outlet, idx) => {
                    const isCancelled = outlet.stop_status === 'CANCELLED';
                    const isOfferDenied = outlet.stop_status === 'OFFER_DENIED' || outlet.items.some((it: any) => it.offer_status === 'DENIED');
                    const isOfferPending = outlet.stop_status === 'OFFER_PENDING' || outlet.items.some((it: any) => it.offer_status === 'PENDING');
                    const isOfferAccepted = outlet.items.some((it: any) => it.offer_status === 'ACCEPTED');
                    const isDeliveredByDriver = outlet.stop_status === 'DELIVERED_BY_DRIVER';
                    const isConfirmedByOutlet = outlet.stop_status === 'CONFIRMED_BY_OUTLET';
                    const isDone = isDeliveredByDriver || isConfirmedByOutlet || isCancelled || isOfferDenied;
                    const isOfferedStock = outlet.items.some((it: any) => it.is_offered_stock || it.offered_from_vehicle || it.urgency === 'DIRECT_SUPPLY');

                    return (
                      <div
                        key={outlet.outlet_id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isCancelled
                            ? 'bg-rose-50/70 border-rose-300'
                            : isOfferDenied
                            ? 'bg-rose-50/70 border-rose-300'
                            : isConfirmedByOutlet
                            ? 'bg-[#EBFFD8]/60 border-[#8DBCC7]'
                            : isDeliveredByDriver
                            ? 'bg-[#C4E1E6]/50 border-[#8DBCC7]'
                            : isOfferPending
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : isOfferedStock
                            ? 'bg-[#C4E1E6]/40 border-[#8DBCC7] shadow-xs'
                            : 'bg-white border-[#A4CCD9] hover:border-[#8DBCC7]'
                        }`}
                      >
                        {/* Stop Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                                isCancelled || isOfferDenied
                                  ? 'bg-rose-500 text-white'
                                  : isDone
                                  ? 'bg-[#EBFFD8] text-[#14532D] border border-[#8DBCC7]'
                                  : 'bg-[#C4E1E6] text-[#0F172A] border border-[#8DBCC7]'
                              }`}>
                                {isCancelled || isOfferDenied ? '✕' : isDone ? '✓' : idx + 1}
                              </span>
                              <h5 className="font-bold text-sm text-[#0F172A]">
                                {outlet.outlet_name} {outlet.branch_name && `(${outlet.branch_name})`}
                              </h5>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                                isCancelled
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : isOfferDenied
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : isOfferPending
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                  : isOfferAccepted
                                  ? 'bg-[#EBFFD8] text-[#14532D] border border-[#8DBCC7]'
                                  : isConfirmedByOutlet
                                  ? 'bg-[#EBFFD8] text-[#14532D] border border-[#8DBCC7]'
                                  : isDeliveredByDriver
                                  ? 'bg-[#C4E1E6] text-[#0F172A] border border-[#8DBCC7]'
                                  : 'bg-white text-[#334155] border border-[#A4CCD9]'
                              }`}>
                                {isCancelled
                                  ? '⛔ Order Cancelled & Refunded'
                                  : isOfferDenied
                                  ? '⛔ Offer Denied by Outlet'
                                  : isOfferPending
                                  ? '⏳ Offer Sent (Awaiting Outlet)'
                                  : isOfferAccepted
                                  ? '✓ Offer Accepted by Outlet'
                                  : isConfirmedByOutlet
                                  ? 'Outlet Confirmed & Accepted'
                                  : isDeliveredByDriver
                                  ? 'Delivered by Driver (Pending Outlet)'
                                  : 'En Route / Not Delivered Yet'}
                              </span>

                              {isOfferedStock && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-[#A4CCD9] text-[#0F172A] border border-[#8DBCC7] flex items-center gap-1">
                                  <Zap className="w-3 h-3 fill-[#0F172A]" />
                                  <span>In-Transit Direct Offer</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#334155] flex-wrap pl-8 font-medium">
                              {outlet.location_address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-[#164E63]" />
                                  {outlet.location_address}
                                </span>
                              )}
                              {outlet.contact_phone && (
                                <a
                                  href={`tel:${outlet.contact_phone}`}
                                  className="flex items-center gap-1 text-[#164E63] font-bold hover:underline"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {outlet.contact_phone}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="text-right sm:self-center pl-8 sm:pl-0">
                            <span className="text-[10px] uppercase font-bold text-[#164E63] block">Assigned Delivery</span>
                            <span className={`font-mono text-sm font-black ${isCancelled ? 'text-rose-600 line-through' : 'text-[#0F172A]'}`}>
                              {outlet.total_assigned_cases} Cases
                            </span>
                          </div>
                        </div>

                        {/* Product Items Breakdown */}
                        <div className="pl-8 pt-2 border-t border-[#C4E1E6] space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-[#164E63] block">Demanded Products:</span>
                          <div className="flex flex-wrap gap-2">
                            {outlet.items.map((it: any, itemIdx: number) => (
                              <span
                                key={itemIdx}
                                className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                  isCancelled ? 'bg-rose-100/50 border-rose-300 text-rose-800' : 'bg-white border-[#A4CCD9] text-[#334155]'
                                }`}
                              >
                                <span className="text-[#0F172A] font-medium">{it.product_name}</span>
                                <strong className={`font-mono ${isCancelled ? 'text-rose-600 line-through' : 'text-[#164E63] font-bold'}`}>
                                  {it.assigned_cases || it.demanded_cases || 0} cases
                                </strong>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Driver Delivery Action / Confirmation Area */}
                        <div className="pl-8 pt-2">
                          {isCancelled || isOfferDenied ? (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <div>
                                  <p className="font-bold text-rose-950">
                                    {isOfferDenied ? 'Stock Offer Declined by Outlet' : 'Stop Cancelled & Refunded by Store'}
                                  </p>
                                  <p className="text-[11px] text-rose-800 font-medium">
                                    {isOfferDenied 
                                      ? 'Outlet declined this stock offer. The cargo remains onboard your vehicle and can be reallocated to another store!'
                                      : 'Order was cancelled and refunded while in transit. Do NOT unload cargo here. Reallocate this stock to nearby stores below.'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2.5 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-[10px] uppercase border border-rose-300">
                                  {isOfferDenied ? 'Offer Declined' : 'Skip Stop'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenOfferModal(outlet)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#EBFFD8] hover:bg-[#dbf8be] text-[#0F172A] font-black text-xs border border-[#8DBCC7] shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-[#0F172A]" />
                                  <span>Offer Stock to Other Outlet ⚡</span>
                                </button>
                              </div>
                            </div>
                          ) : isOfferPending ? (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                                <div>
                                  <p className="font-bold text-amber-950">In-Transit Offer Sent — Awaiting Store Decision</p>
                                  <p className="text-[11px] text-amber-800">A notification has been delivered to {outlet.outlet_name}. They have the option to accept or deny this stock offer.</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-white text-amber-900 font-mono text-[11px] font-bold border border-amber-300 shrink-0">
                                Pending Acceptance
                              </span>
                            </div>
                          ) : isConfirmedByOutlet ? (
                            <div className="p-2.5 rounded-xl bg-[#EBFFD8] border border-[#8DBCC7] text-[#14532D] text-xs flex items-center gap-2 font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <span>Outlet has confirmed receipt of stock! Profit updated on supplier portal.</span>
                            </div>
                          ) : isDeliveredByDriver ? (
                            <div className="p-2.5 rounded-xl bg-[#C4E1E6]/60 border border-[#8DBCC7] text-[#0F172A] text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2 font-medium">
                                <Check className="w-4 h-4 text-[#164E63]" />
                                <span>
                                  Delivered {outlet.driver_delivered_cases || outlet.total_assigned_cases} cases. Awaiting outlet confirmation in their portal.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleConfirmOutletDelivery(activeTrip.id, outlet.outlet_id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EBFFD8] text-[#0F172A] border border-[#8DBCC7] text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Re-verify Quantity
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-[#d8edf1]/50 p-3 rounded-xl border border-[#A4CCD9]">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#0F172A] font-bold shrink-0">Cases Supplied:</span>
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
                                  className="w-20 px-2 py-1 rounded-lg bg-white border border-[#A4CCD9] text-[#0F172A] font-mono font-bold text-xs focus:ring-1 focus:ring-[#8DBCC7]"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleConfirmOutletDelivery(activeTrip.id, outlet.outlet_id)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#164E63] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs border border-[#8DBCC7] sm:ml-auto"
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
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#8DBCC7] shadow-xs">
            <Truck className="w-12 h-12 mx-auto text-[#8DBCC7] mb-2" />
            <h3 className="font-oswald text-lg font-bold text-[#0F172A]">No Active Dispatches for this Vehicle</h3>
            <p className="text-xs text-[#334155] mt-1 max-w-md mx-auto">
              Vehicle {regNo || 'selected'} has no active delivery routes currently. When the Supplier dispatches a route for this vehicle, it will appear here instantly.
            </p>
          </div>
        )}
      </main>

      {/* MODAL: Offer Onboarded Stock to Nearby Outlets */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#8DBCC7] p-6 shadow-2xl space-y-4 text-left text-[#0F172A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#C4E1E6]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EBFFD8] border border-[#8DBCC7] text-[#0F172A] flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5 fill-[#0F172A]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Offer Onboarded Stock to Outlets</h3>
                  <p className="text-xs text-[#334155]">Reassign loaded vehicle cargo to nearby stores</p>
                </div>
              </div>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="text-[#334155] hover:text-[#0F172A] p-1 rounded-lg text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#EBFFD8] border border-[#8DBCC7] text-[#14532D] text-xs space-y-1">
              <p className="font-bold text-[#0F172A] flex items-center gap-1.5 flex-wrap">
                <span>📦 Physical Cargo on Vehicle:</span>
                <span className="font-mono text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#8DBCC7] font-bold">{team?.vehicle_registration_no}</span>
                <span className="text-[#14532D] font-bold">({offerCases} Cases Available)</span>
              </p>
              <p className="text-[#334155] font-medium">
                This stock was already inspected and boarded on your delivery vehicle. Instead of dead freight returning to depot, offer it directly to other stores nearby or along your route.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1.5">
                  Select Recipient Outlet (Nearby / Route Stores):
                </label>
                <select
                  value={selectedRecipientOutletId}
                  onChange={(e) => setSelectedRecipientOutletId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#A4CCD9] text-[#0F172A] font-medium focus:ring-2 focus:ring-[#8DBCC7] cursor-pointer"
                >
                  <option value="">-- Choose Recipient Store --</option>
                  {availableOutlets
                    .filter((o) => o.outlet_id !== offerSourceStop?.outlet_id)
                    .map((o) => (
                      <option key={o.outlet_id} value={o.outlet_id}>
                        {o.outlet_name} ({o.branch_name || o.area || 'Branch'}) • {o.sub_route || o.location_address || 'Nearby'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Cases to Offer:</label>
                  <input
                    type="number"
                    min={1}
                    value={offerCases}
                    onChange={(e) => setOfferCases(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#A4CCD9] text-[#0F172A] font-mono font-bold focus:ring-2 focus:ring-[#8DBCC7]"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Assigned Vehicle:</label>
                  <input
                    type="text"
                    disabled
                    value={`${team?.vehicle_registration_no || 'FLEET'} (${team?.driver_name || 'Driver'})`}
                    className="w-full px-3 py-2 rounded-xl bg-[#d8edf1]/40 border border-[#A4CCD9] text-[#334155] font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Delivery Notes / Offer Memo:</label>
                <input
                  type="text"
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                  placeholder="e.g. In-transit direct stock offer from Driver"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#A4CCD9] text-[#0F172A] focus:ring-2 focus:ring-[#8DBCC7]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#C4E1E6]">
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#d8edf1] hover:bg-[#C4E1E6] text-[#0F172A] border border-[#A4CCD9] font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitOfferStock}
                disabled={offeringLoading || !selectedRecipientOutletId}
                className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#164E63] text-white font-black text-xs border border-[#8DBCC7] shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>{offeringLoading ? 'Dispatching Offer...' : '🚀 Confirm & Dispatch Stock Offer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Order Cancellation & Route Alerts Pop-up */}
      <NotificationPopup notification={popupNotification} onClose={dismissPopup} />
    </div>
  );
};

export default DeliveryTeamPortal;
