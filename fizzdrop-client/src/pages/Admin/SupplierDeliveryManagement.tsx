import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  MapPin,
  Route,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Phone,
  ShieldCheck,
  Send,
  Boxes,
  Store,
  Calendar,
} from 'lucide-react';

export interface DeliveryTeam {
  id: number;
  supplier_id: number;
  team_name: string;
  vehicle_registration_no: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone: string;
  team_members: string;
  max_capacity_cases: number;
  status: 'AVAILABLE' | 'ON_DELIVERY' | 'MAINTENANCE';
  created_at: string;
  supplier_name?: string;
}

export interface OutletDemandItem {
  requisition_id?: number;
  requisition_code?: string;
  product_id: number;
  product_name?: string;
  brand?: string;
  flavor_variant?: string;
  category?: string;
  sku?: string;
  quantity?: number;
  unit_price?: number;
  total_amount?: number;
  status?: string;
}

export interface SubrouteOutlet {
  outlet_id: number;
  outlet_name: string;
  branch_name: string;
  franchise_name?: string;
  location_address: string;
  contact_phone: string;
  area: string;
  sub_route: string;
  total_demanded_cases: number;
  demands: OutletDemandItem[];
}

export interface SubrouteData {
  sub_route: string;
  outlet_count: number;
  total_pending_demanded_cases: number;
  outlets: SubrouteOutlet[];
}

export interface DispatchItem {
  outlet_id: number;
  outlet_name: string;
  branch_name?: string;
  location_address?: string;
  contact_phone?: string;
  product_id: number;
  product_name: string;
  demanded_cases: number;
  assigned_cases: number;
  unit_price?: number;
  total_amount?: number;
  requisition_code?: string;
  delivery_status?: string;
  stop_status?: 'PENDING' | 'DELIVERED_BY_DRIVER' | 'CONFIRMED_BY_OUTLET' | string;
  driver_delivered_at?: string;
  driver_delivered_cases?: number;
  outlet_confirmed_at?: string;
  profit_earned?: number;
}

export interface VehicleDispatch {
  id: number;
  dispatch_code: string;
  supplier_id: number;
  delivery_team_id: number;
  team_name?: string;
  vehicle_registration_no?: string;
  vehicle_type?: string;
  driver_name?: string;
  driver_phone?: string;
  team_members?: string;
  sub_route: string;
  total_cases: number;
  total_outlets: number;
  status: 'DISPATCHED' | 'BOARDED' | 'IN_TRANSIT' | 'DELIVERED' | 'COMPLETED' | string;
  notes?: string;
  dispatched_at: string;
  boarded_at?: string;
  ride_started_at?: string;
  delivered_at?: string;
  delivered_outlets_count?: number;
  confirmed_outlets_count?: number;
  total_profit_earned?: number;
  items: DispatchItem[];
}

interface SupplierDeliveryManagementProps {
  userId?: number;
}

export const SupplierDeliveryManagement: React.FC<SupplierDeliveryManagementProps> = ({ userId = 4 }) => {
  const [activeSubTab, setActiveSubTab] = useState<'dispatches' | 'new-dispatch' | 'teams'>('dispatches');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data lists
  const [teams, setTeams] = useState<DeliveryTeam[]>([]);
  const [dispatches, setDispatches] = useState<VehicleDispatch[]>([]);
  const [subroutes, setSubroutes] = useState<SubrouteData[]>([]);

  // Expanded dispatch cards in history
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);

  const totalFleetProfitEarned = dispatches.reduce((acc, trip) => {
    return acc + Number(trip.total_profit_earned || 0);
  }, 0);

  // New Dispatch Form State
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [selectedSubroute, setSelectedSubroute] = useState<string>('');
  const [tripNotes, setTripNotes] = useState<string>('');
  // Map of selected outlet IDs to boolean
  const [selectedOutlets, setSelectedOutlets] = useState<Record<number, boolean>>({});
  // Map of `outletId_productId` to assigned cases number
  const [assignedCasesMap, setAssignedCasesMap] = useState<Record<string, number>>({});

  // New Team Modal State
  const [isNewTeamModalOpen, setIsNewTeamModalOpen] = useState<boolean>(false);
  const [teamForm, setTeamForm] = useState({
    team_name: '',
    vehicle_registration_no: '',
    vehicle_type: 'Covered Van',
    driver_name: '',
    driver_phone: '',
    team_members: '',
    max_capacity_cases: 250,
  });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Delivery Teams
      const resTeams = await fetch(`http://localhost:8080/api/v1/delivery/teams?userId=${userId}`);
      if (resTeams.ok) {
        const data = await resTeams.json();
        setTeams(Array.isArray(data) ? data : []);
      }

      // 2. Fetch Vehicle Dispatches
      const resDisp = await fetch(`http://localhost:8080/api/v1/delivery/dispatches?userId=${userId}`);
      if (resDisp.ok) {
        const data = await resDisp.json();
        setDispatches(Array.isArray(data) ? data : []);
      }

      // 3. Fetch Subroutes & Outlets with Demands
      const resRoutes = await fetch(`http://localhost:8080/api/v1/delivery/subroutes?userId=${userId}`);
      if (resRoutes.ok) {
        const data = await resRoutes.json();
        setSubroutes(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      setErrorMsg('Failed to connect to delivery logistics server. Please check backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  // When subroute changes in new dispatch form, auto-select outlets with pending demands
  const handleSubrouteSelect = (route: string) => {
    setSelectedSubroute(route);
    const found = subroutes.find((s) => s.sub_route === route);
    if (found) {
      const initialSelected: Record<number, boolean> = {};
      const initialCases: Record<string, number> = {};

      found.outlets.forEach((o) => {
        // Select by default if outlet has open demanded cases
        if (o.total_demanded_cases > 0 || o.demands.length > 0) {
          initialSelected[o.outlet_id] = true;
          o.demands.forEach((d) => {
            const key = `${o.outlet_id}_${d.product_id}`;
            initialCases[key] = d.quantity || 0;
          });
        }
      });
      setSelectedOutlets(initialSelected);
      setAssignedCasesMap(initialCases);
    } else {
      setSelectedOutlets({});
      setAssignedCasesMap({});
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.team_name || !teamForm.vehicle_registration_no || !teamForm.driver_name || !teamForm.driver_phone) {
      alert('Please fill in Team Name, Vehicle Registration No, Driver Name, and Driver Phone.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/delivery/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...teamForm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Delivery team created successfully!');
        setIsNewTeamModalOpen(false);
        setTeamForm({
          team_name: '',
          vehicle_registration_no: '',
          vehicle_type: 'Covered Van',
          driver_name: '',
          driver_phone: '',
          team_members: '',
          max_capacity_cases: 250,
        });
        fetchData();
      } else {
        setErrorMsg(data.message || 'Failed to create delivery team.');
      }
    } catch {
      setErrorMsg('Failed to submit delivery team.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchVehicle = async () => {
    if (!selectedTeamId) {
      alert('Please select a delivery team / vehicle.');
      return;
    }
    if (!selectedSubroute) {
      alert('Please select a sub-route.');
      return;
    }

    const currentRoute = subroutes.find((s) => s.sub_route === selectedSubroute);
    if (!currentRoute) return;

    // Collect all assigned outlet products
    const itemsToDispatch: DispatchItem[] = [];

    currentRoute.outlets.forEach((o) => {
      if (selectedOutlets[o.outlet_id]) {
        if (o.demands && o.demands.length > 0) {
          o.demands.forEach((d) => {
            const key = `${o.outlet_id}_${d.product_id}`;
            const cases = assignedCasesMap[key] !== undefined ? assignedCasesMap[key] : (d.quantity || 0);
            if (cases > 0) {
              itemsToDispatch.push({
                outlet_id: o.outlet_id,
                outlet_name: o.branch_name ? `${o.outlet_name} (${o.branch_name})` : o.outlet_name,
                branch_name: o.branch_name,
                location_address: o.location_address,
                contact_phone: o.contact_phone,
                product_id: d.product_id,
                product_name: `${d.brand || ''} ${d.flavor_variant || d.product_name || 'Beverage'}`.trim(),
                demanded_cases: d.quantity || 0,
                assigned_cases: cases,
                unit_price: d.unit_price,
                total_amount: (d.unit_price || 0) * cases,
                requisition_code: d.requisition_code,
                delivery_status: 'DISPATCHED',
              });
            }
          });
        }
      }
    });

    if (itemsToDispatch.length === 0) {
      alert('Please assign at least 1 case of beverage product to an outlet in this subroute.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/delivery/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          delivery_team_id: selectedTeamId,
          sub_route: selectedSubroute,
          notes: tripNotes,
          items: itemsToDispatch,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Vehicle dispatched successfully!');
        setActiveSubTab('dispatches');
        setSelectedSubroute('');
        setSelectedTeamId('');
        setTripNotes('');
        setSelectedOutlets({});
        setAssignedCasesMap({});
        fetchData();
      } else {
        setErrorMsg(data.message || 'Failed to dispatch vehicle.');
      }
    } catch {
      setErrorMsg('Failed to connect and dispatch vehicle.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (tripId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/delivery/dispatches/${tripId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `Trip status updated to ${newStatus}.`);
        fetchData();
      } else {
        setErrorMsg(data.message || 'Failed to update status.');
      }
    } catch {
      setErrorMsg('Network error updating status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Summary Metrics
  const activeTripsCount = dispatches.filter((d) => d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT').length;
  const completedTripsCount = dispatches.filter((d) => d.status === 'DELIVERED' || d.status === 'COMPLETED').length;
  const availableTeamsCount = teams.filter((t) => t.status === 'AVAILABLE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
              FLEET & OUTLET LOGISTICS
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">Sub-Route Fulfillments</span>
          </div>
          <h2 className="font-oswald text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Vehicle Delivery Teams & Outlet Dispatches</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create supplier delivery teams, assign product cases demanded by specific outlets, and dispatch vehicles along targeted subroutes with live registration tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="Refresh Deliveries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setActiveSubTab('new-dispatch')}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Vehicle to Outlets</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      {/* Quick Metrics KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Delivery Fleets</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-slate-900">{teams.length}</span>
            <span className="text-[11px] text-emerald-600 font-bold">{availableTeamsCount} Available</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Supplier logistics vehicles</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Active In-Transit Trips</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-blue-600">{activeTripsCount}</span>
            <span className="text-[11px] text-blue-600 font-bold">En Route</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Vehicles currently delivering</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Completed Dispatches</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-emerald-600">{completedTripsCount}</span>
            <span className="text-[11px] text-emerald-600 font-bold">Delivered</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Stores restocked successfully</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Available Subroutes</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-indigo-700">{subroutes.length}</span>
            <span className="text-[11px] text-indigo-600 font-bold">Routes</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Territory corridors</span>
        </div>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">Outlet Deliveries Profit</span>
          <div className="flex items-baseline gap-1">
            <span className="font-oswald text-2xl font-black text-emerald-700">
              +৳{totalFleetProfitEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Auto-credited upon receipt</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('dispatches')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'dispatches'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Vehicle Trips & Tracking ({dispatches.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('new-dispatch')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'new-dispatch'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch New Vehicle</span>
        </button>

        <button
          onClick={() => setActiveSubTab('teams')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'teams'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Manage Delivery Teams ({teams.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: DISPATCHED VEHICLE TRIPS & ROUTE MANIFESTS   */}
      {/* ======================================================== */}
      {activeSubTab === 'dispatches' && (
        <div className="space-y-4">
          {dispatches.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <Truck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <h3 className="font-oswald text-lg font-bold text-slate-700">No Vehicle Dispatches Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No delivery vehicles have been dispatched to outlets yet. Click "Dispatch New Vehicle" to select a subroute and assign demanded product cases.
              </p>
              <button
                onClick={() => setActiveSubTab('new-dispatch')}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
              >
                Dispatch First Vehicle
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dispatches.map((trip) => {
                const isExpanded = expandedTripId === trip.id;
                const isDelivered = trip.status === 'DELIVERED' || trip.status === 'COMPLETED';
                const isEnRoute = trip.status === 'IN_TRANSIT' || trip.status === 'DISPATCHED';

                return (
                  <div
                    key={trip.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                  >
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Trip ID, Vehicle Reg & Route */}
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isDelivered
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {trip.dispatch_code}
                            </span>
                            <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                              Reg: {trip.vehicle_registration_no || 'Reg # Pending'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isDelivered
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : trip.status === 'IN_TRANSIT'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {trip.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="font-bold text-slate-900 flex items-center gap-1">
                              <Route className="w-3.5 h-3.5 text-indigo-600" />
                              Sub-Route: {trip.sub_route}
                            </span>
                            <span>•</span>
                            <span>Team: <strong>{trip.team_name}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {trip.driver_name} ({trip.driver_phone})
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400">
                            Dispatched: {new Date(trip.dispatched_at).toLocaleString()}
                            {trip.delivered_at && ` • Completed: ${new Date(trip.delivered_at).toLocaleString()}`}
                          </p>
                        </div>
                      </div>

                      {/* Right: Metrics & Actions */}
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Load</span>
                          <span className="font-mono text-base font-black text-slate-900">
                            {trip.total_cases} Cases
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            across {trip.total_outlets} Outlets
                          </span>
                        </div>

                        {/* Status Actions */}
                        {isEnRoute && (
                          <div className="flex items-center gap-1.5">
                            {trip.status === 'DISPATCHED' && (
                              <button
                                onClick={() => handleUpdateStatus(trip.id, 'IN_TRANSIT')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-all cursor-pointer"
                              >
                                Mark In-Transit
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateStatus(trip.id, 'DELIVERED')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                            >
                              Confirm Delivered
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                          title="Toggle Manifest Details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Live Truck Progression Stepper & Real-time Status */}
                    <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Stage 1: Stocks Boarding */}
                        <div className="flex items-center gap-1.5">
                          {trip.boarded_at || trip.status === 'BOARDED' || trip.status === 'IN_TRANSIT' || trip.status === 'DELIVERED' || trip.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Stocks Boarded {trip.boarded_at && `(${new Date(trip.boarded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold font-mono text-[11px] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Awaiting Driver Boarding Verification</span>
                            </span>
                          )}
                        </div>

                        <span className="text-slate-300">→</span>

                        {/* Stage 2: Ride Status */}
                        <div className="flex items-center gap-1.5">
                          {trip.ride_started_at || trip.status === 'IN_TRANSIT' || trip.status === 'DELIVERED' || trip.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold font-mono text-[11px] flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ride In Transit {trip.ride_started_at && `(${new Date(trip.ride_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-bold font-mono text-[11px]">
                              <span>At Depot</span>
                            </span>
                          )}
                        </div>

                        <span className="text-slate-300">→</span>

                        {/* Stage 3: Outlets Delivered Progress */}
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold font-mono text-[11px]">
                            {trip.delivered_outlets_count || 0} / {trip.total_outlets} Outlets Dropped ({Math.round(((trip.delivered_outlets_count || 0) / (trip.total_outlets || 1)) * 100)}%)
                          </span>
                        </div>
                      </div>

                      {/* Earned Wholesale Profit from Outlets */}
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Wholesale Profit:</span>
                        <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                          +৳{Number(trip.total_profit_earned || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Manifest: Outlets & Assigned Products */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 border-t border-slate-200/80 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span>Trip Manifest: Assigned Outlets & Beverage Cases</span>
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500">
                            Delivery Team: {trip.team_members || trip.driver_name}
                          </span>
                        </div>

                        {(!trip.items || trip.items.length === 0) ? (
                          <p className="text-xs text-slate-400 italic">No detailed item manifest logged for this trip.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3">Destination Outlet</th>
                                  <th className="py-2.5 px-3">Location & Phone</th>
                                  <th className="py-2.5 px-3">Assigned Product</th>
                                  <th className="py-2.5 px-3 text-center">Demanded</th>
                                  <th className="py-2.5 px-3 text-center font-bold text-blue-700">Assigned</th>
                                  <th className="py-2.5 px-3 text-right">Value</th>
                                  <th className="py-2.5 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {trip.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                                      {item.outlet_name}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px] max-w-[200px] truncate">
                                      <p>{item.location_address || 'Subroute Store'}</p>
                                      {item.contact_phone && <p className="text-slate-400">📞 {item.contact_phone}</p>}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans font-semibold text-indigo-700">
                                      {item.product_name}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-slate-500">
                                      {item.demanded_cases} cases
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-black text-blue-600 bg-blue-50/50">
                                      {item.assigned_cases} cases
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-700">
                                      ৳{Number(item.total_amount || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans text-center">
                                      {item.stop_status === 'CONFIRMED_BY_OUTLET' ? (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 block">
                                          ✓ Outlet Confirmed (+৳{Number(item.profit_earned || 0).toFixed(2)})
                                        </span>
                                      ) : item.stop_status === 'DELIVERED_BY_DRIVER' ? (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-cyan-100 text-cyan-800 border border-cyan-300 block">
                                          🚚 Delivered by Driver (Pending Outlet)
                                        </span>
                                      ) : (
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                          isDelivered
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                          {isDelivered ? 'DELIVERED' : 'ASSIGNED'}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {trip.notes && (
                          <p className="text-xs text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-200">
                            Trip Notes: "{trip.notes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: DISPATCH NEW VEHICLE TRIP                     */}
      {/* ======================================================== */}
      {activeSubTab === 'new-dispatch' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-oswald text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              <span>Dispatch Delivery Vehicle to Outlets</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the supplier's delivery team, choose the subroute, and assign the product cases demanded by available outlets.
            </p>
          </div>

          {/* Step 1 & 2: Select Delivery Team & Subroute */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Select Team & Vehicle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                1. Select Delivery Team & Vehicle <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Choose Supplier Delivery Team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.team_name} — {t.vehicle_registration_no} ({t.driver_name}, {t.vehicle_type}, Cap: {t.max_capacity_cases} cases) [{t.status}]
                  </option>
                ))}
              </select>

              {selectedTeamId && (
                (() => {
                  const t = teams.find((tm) => tm.id === selectedTeamId);
                  if (!t) return null;
                  return (
                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{t.team_name}</span>
                        <span className="font-mono text-[11px] font-extrabold bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-300">
                          {t.vehicle_registration_no}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Lead Driver: <strong>{t.driver_name}</strong> (📞 {t.driver_phone}) • {t.vehicle_type} (Max Capacity: {t.max_capacity_cases} cases)
                      </p>
                      {t.team_members && (
                        <p className="text-[10px] text-blue-700 italic">
                          Team: {t.team_members}
                        </p>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Step 2: Select Subroute */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                2. Select Sub-Route Corridor <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSubroute}
                onChange={(e) => handleSubrouteSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Choose Sub-Route --</option>
                {subroutes.map((s) => (
                  <option key={s.sub_route} value={s.sub_route}>
                    {s.sub_route} ({s.outlet_count} Outlets, {s.total_pending_demanded_cases} cases pending)
                  </option>
                ))}
              </select>

              {selectedSubroute && (
                (() => {
                  const sr = subroutes.find((s) => s.sub_route === selectedSubroute);
                  if (!sr) return null;
                  return (
                    <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                      <div>
                        <span className="font-bold">{sr.sub_route}</span>
                        <p className="text-[11px] text-indigo-700 mt-0.5">
                          {sr.outlet_count} stores available along this subroute
                        </p>
                      </div>
                      <span className="font-mono font-black text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-xl border border-indigo-300">
                        {sr.total_pending_demanded_cases} cases demanded
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Step 3: Outlets & Demanded Products Assignment */}
          {selectedSubroute && (
            (() => {
              const currentRoute = subroutes.find((s) => s.sub_route === selectedSubroute);
              if (!currentRoute || currentRoute.outlets.length === 0) {
                return (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                    No outlets registered in this subroute yet.
                  </div>
                );
              }

              return (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-oswald text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-600" />
                        <span>3. Outlets Available in {selectedSubroute} — Assign Cases</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Select which outlets to deliver to, and adjust the cases assigned to this vehicle dispatch.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const all: Record<number, boolean> = {};
                          currentRoute.outlets.forEach((o) => { all[o.outlet_id] = true; });
                          setSelectedOutlets(all);
                        }}
                        className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedOutlets({})}
                        className="text-xs text-slate-500 font-bold hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentRoute.outlets.map((outlet) => {
                      const isSelected = Boolean(selectedOutlets[outlet.outlet_id]);

                      return (
                        <div
                          key={outlet.outlet_id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                              : 'bg-white border-slate-200 opacity-75'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedOutlets((prev) => ({
                                    ...prev,
                                    [outlet.outlet_id]: e.target.checked,
                                  }));
                                }}
                                className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                              <div>
                                <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                  <span>{outlet.outlet_name}</span>
                                  {outlet.branch_name && (
                                    <span className="text-xs font-normal text-slate-500">
                                      ({outlet.branch_name})
                                    </span>
                                  )}
                                  {outlet.franchise_name && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-100 text-slate-700">
                                      {outlet.franchise_name}
                                    </span>
                                  )}
                                </h5>
                                <p className="text-xs text-slate-500">
                                  📍 {outlet.location_address} • 📞 {outlet.contact_phone}
                                </p>
                              </div>
                            </div>

                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                              Demanded: {outlet.total_demanded_cases} cases
                            </span>
                          </div>

                          {/* Demanded products list */}
                          {isSelected && outlet.demands && outlet.demands.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                Products Demanded by this Store:
                              </span>
                              <div className="space-y-1.5">
                                {outlet.demands.map((dm) => {
                                  const key = `${outlet.outlet_id}_${dm.product_id}`;
                                  const currentVal = assignedCasesMap[key] !== undefined ? assignedCasesMap[key] : (dm.quantity || 0);

                                  return (
                                    <div
                                      key={dm.product_id}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200"
                                    >
                                      <div>
                                        <span className="font-bold text-xs text-slate-800">
                                          {dm.brand} {dm.flavor_variant || dm.product_name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono ml-2">
                                          (Req: {dm.requisition_code || 'Direct'})
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                          Demanded: <strong className="text-slate-800">{dm.quantity} cases</strong> @ ৳{Number(dm.unit_price || 0).toFixed(2)}/case
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-slate-600">Assign Cases:</label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={dm.quantity ? dm.quantity * 2 : 200}
                                          value={currentVal}
                                          onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            setAssignedCasesMap((prev) => ({
                                              ...prev,
                                              [key]: val,
                                            }));
                                          }}
                                          className="w-20 px-2.5 py-1 text-center font-mono font-bold rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <span className="text-xs text-slate-400">cases</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}

          {/* Trip Notes & Dispatch Button */}
          {selectedSubroute && selectedTeamId && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Trip Instructions / Driver Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Morning express route, deliver to Shwapno first before 11 AM..."
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('dispatches')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDispatchVehicle}
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{actionLoading ? 'Dispatching Vehicle...' : 'Confirm & Dispatch Vehicle'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: MANAGE DELIVERY TEAMS & FLEET VEHICLES        */}
      {/* ======================================================== */}
      {activeSubTab === 'teams' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h3 className="font-oswald text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Supplier Delivery Teams & Fleet Vehicles</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Register supplier fleet vehicles with tracking registration numbers, lead drivers, and operational crew members.
              </p>
            </div>

            <button
              onClick={() => setIsNewTeamModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register Delivery Team</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                      {t.vehicle_registration_no}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : t.status === 'ON_DELIVERY'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">
                    {t.team_name}
                  </h4>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      Vehicle: <strong>{t.vehicle_type}</strong> (Cap: {t.max_capacity_cases} cases)
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Lead Driver: <strong>{t.driver_name}</strong> ({t.driver_phone})
                    </p>
                  </div>

                  {t.team_members && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Crew Members:</span>
                      {t.team_members}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Registered: {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <a
                    href={`/delivery-team?regNo=${encodeURIComponent(t.vehicle_registration_no)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Open Team Portal →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Register New Delivery Team */}
      {isNewTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-oswald text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Register Supplier Delivery Team & Vehicle</span>
              </h3>
              <button
                onClick={() => setIsNewTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gulshan Express Fleet #1"
                  value={teamForm.team_name}
                  onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Vehicle Registration No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., DHA-METRO-TA-14-8890"
                    value={teamForm.vehicle_registration_no}
                    onChange={(e) => setTeamForm({ ...teamForm, vehicle_registration_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Type</label>
                  <select
                    value={teamForm.vehicle_type}
                    onChange={(e) => setTeamForm({ ...teamForm, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
                  >
                    <option value="Covered Van">Covered Van</option>
                    <option value="Medium Truck">Medium Truck</option>
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Mini Van">Mini Van</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Lead Driver Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Rafiqul Islam"
                    value={teamForm.driver_name}
                    onChange={(e) => setTeamForm({ ...teamForm, driver_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Driver Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 01712-345678"
                    value={teamForm.driver_phone}
                    onChange={(e) => setTeamForm({ ...teamForm, driver_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Team Members / Crew List
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Lead Driver: Rafiqul Islam, Assistant: Kamal Hossain, Helper: Sajid"
                  value={teamForm.team_members}
                  onChange={(e) => setTeamForm({ ...teamForm, team_members: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Capacity (Cases)</label>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  value={teamForm.max_capacity_cases}
                  onChange={(e) => setTeamForm({ ...teamForm, max_capacity_cases: parseInt(e.target.value) || 250 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Register Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
