import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  Route,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Boxes,
  Building,
} from 'lucide-react';
import type { VehicleDispatch, DeliveryTeam } from '../Admin/SupplierDeliveryManagement';

export const SuperadminDeliveryManagement: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [dispatches, setDispatches] = useState<VehicleDispatch[]>([]);
  const [teams, setTeams] = useState<DeliveryTeam[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [subrouteFilter, setSubrouteFilter] = useState<string>('ALL');
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all dispatches across suppliers
      const resDisp = await fetch('http://localhost:8080/api/v1/delivery/dispatches?all=true');
      if (resDisp.ok) {
        const data = await resDisp.json();
        setDispatches(Array.isArray(data) ? data : []);
      }

      // 2. Fetch all delivery teams
      const resTeams = await fetch('http://localhost:8080/api/v1/delivery/teams?all=true');
      if (resTeams.ok) {
        const data = await resTeams.json();
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load superadmin delivery data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Dispatches
  const filteredDispatches = dispatches.filter((d) => {
    const matchesSearch =
      search.trim() === '' ||
      d.dispatch_code.toLowerCase().includes(search.toLowerCase()) ||
      (d.vehicle_registration_no && d.vehicle_registration_no.toLowerCase().includes(search.toLowerCase())) ||
      (d.driver_name && d.driver_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.team_name && d.team_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.sub_route && d.sub_route.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchesSubroute = subrouteFilter === 'ALL' || d.sub_route === subrouteFilter;

    return matchesSearch && matchesStatus && matchesSubroute;
  });

  const uniqueSubroutes = Array.from(new Set(dispatches.map((d) => d.sub_route).filter(Boolean)));

  // KPI Summary
  const totalDispatches = dispatches.length;
  const inTransitCount = dispatches.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'DISPATCHED').length;
  const deliveredCount = dispatches.filter((d) => d.status === 'DELIVERED' || d.status === 'COMPLETED').length;
  const totalDeliveredCases = dispatches.reduce((acc, d) => acc + (d.total_cases || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
              SUPERADMIN AUDIT
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">National Delivery Fleets & Routes</span>
          </div>
          <h2 className="font-oswald text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-600" />
            <span>Supplier Vehicle Fleets & Outlet Delivery Monitoring</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time oversight of all regional suppliers' delivery teams, active vehicle trips, tracking registration numbers, and store restock fulfillments.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer self-start md:self-auto"
          title="Refresh Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Supplier Fleets</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-slate-900">{teams.length}</span>
            <span className="text-[11px] text-purple-600 font-bold">Teams</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Active vehicles registered</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">In-Transit Deliveries</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-blue-600">{inTransitCount}</span>
            <span className="text-[11px] text-blue-600 font-bold">Live Vehicles</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Dispatched to outlet subroutes</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Completed Dispatches</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-emerald-600">{deliveredCount}</span>
            <span className="text-[11px] text-emerald-600 font-bold">Delivered</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Fulfillments finalized</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Cases Dispatched</span>
          <div className="flex items-baseline gap-2">
            <span className="font-oswald text-2xl font-black text-indigo-700">{totalDeliveredCases}</span>
            <span className="text-[11px] text-indigo-600 font-bold">Cases</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Delivered to retail shelves</span>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Registration No, Trip Code, Driver, Team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-700 bg-white cursor-pointer"
          >
            <option value="ALL">All Delivery Statuses</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_TRANSIT">In-Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={subrouteFilter}
            onChange={(e) => setSubrouteFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-700 bg-white cursor-pointer"
          >
            <option value="ALL">All Sub-Routes</option>
            {uniqueSubroutes.map((sr) => (
              <option key={sr} value={sr}>{sr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Trips List */}
      <div className="space-y-3">
        {filteredDispatches.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs">
            No vehicle dispatches matching criteria.
          </div>
        ) : (
          filteredDispatches.map((trip) => {
            const isExpanded = expandedTripId === trip.id;
            const isDelivered = trip.status === 'DELIVERED' || trip.status === 'COMPLETED';

            return (
              <div
                key={trip.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isDelivered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {trip.dispatch_code}
                        </span>
                        <span className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                          Vehicle Reg: {trip.vehicle_registration_no}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : trip.status === 'IN_TRANSIT'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {trip.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Route className="w-3.5 h-3.5 text-indigo-600" />
                          Route: {trip.sub_route}
                        </span>
                        <span>•</span>
                        <span>Team: <strong>{trip.team_name}</strong></span>
                        <span>•</span>
                        <span>Driver: <strong>{trip.driver_name}</strong> (📞 {trip.driver_phone})</span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Dispatched: {new Date(trip.dispatched_at).toLocaleString()}
                        {trip.delivered_at && ` • Delivered: ${new Date(trip.delivered_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Load</span>
                      <span className="font-mono text-base font-black text-slate-900">
                        {trip.total_cases} Cases
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        to {trip.total_outlets} Outlets
                      </span>
                    </div>

                    <button
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Manifest */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-200/80 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-oswald text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>Stores Manifest & Assigned Product Demands</span>
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500">
                        Crew: {trip.team_members || trip.driver_name}
                      </span>
                    </div>

                    {(!trip.items || trip.items.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No detailed items recorded.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Outlet Store</th>
                              <th className="py-2.5 px-3">Address & Phone</th>
                              <th className="py-2.5 px-3">Product Name</th>
                              <th className="py-2.5 px-3 text-center">Demanded</th>
                              <th className="py-2.5 px-3 text-center font-bold text-purple-700">Assigned</th>
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
                                <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px]">
                                  <p>{item.location_address}</p>
                                  {item.contact_phone && <p className="text-slate-400">📞 {item.contact_phone}</p>}
                                </td>
                                <td className="py-2.5 px-3 font-sans font-semibold text-indigo-700">
                                  {item.product_name}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-500">
                                  {item.demanded_cases} cases
                                </td>
                                <td className="py-2.5 px-3 text-center font-black text-purple-700 bg-purple-50/50">
                                  {item.assigned_cases} cases
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-700">
                                  ৳{Number(item.total_amount || 0).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 font-sans text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    isDelivered
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {isDelivered ? 'DELIVERED' : 'ASSIGNED'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
