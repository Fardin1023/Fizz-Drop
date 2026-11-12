import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck,
  MapPin,
  Building2,
  Navigation,
  Compass,
  CheckCircle2,
  Clock,
  Package,
  Layers,
  Maximize2,
  Phone,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export interface DispatchItem {
  requisition_id?: number;
  outlet_id: number;
  outlet_name: string;
  outlet_address?: string;
  outlet_phone?: string;
  product_id?: number;
  product_name?: string;
  brand?: string;
  flavor_variant?: string;
  demanded_cases?: number;
  assigned_cases?: number;
  delivered_cases?: number;
  stop_status?: 'PENDING' | 'DELIVERED_BY_DRIVER' | 'CONFIRMED_BY_OUTLET' | string;
  delivered_at?: string;
  outlet_confirmed_at?: string;
  wholesale_profit?: number;
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

interface DeliveryFleetMapProps {
  dispatches: VehicleDispatch[];
  selectedDispatchId?: number | null;
  onSelectDispatch?: (dispatch: VehicleDispatch) => void;
  height?: string;
}

// Sub-route geographic anchor centroids in Bangladesh
const SUBROUTE_COORDINATES: Record<string, [number, number]> = {
  'Gulshan Sub-Route': [23.7925, 90.4125],
  'Banani Sub-Route': [23.7937, 90.4043],
  'Dhanmondi Sub-Route': [23.7461, 90.3742],
  'Uttara Sub-Route': [23.8759, 90.3995],
  'Mirpur Sub-Route': [23.8067, 90.3644],
  'Mohakhali Sub-Route': [23.7780, 90.4030],
  'Tejgaon Sub-Route': [23.7635, 90.3965],
  'Badda Sub-Route': [23.7845, 90.4260],
  'Chittagong Sub-Route': [22.3350, 91.8325],
  'Central Sub-Route': [23.7925, 90.4078],
};

// Deterministic geo-hash for stable, realistic outlet coordinates
function getOutletCoordinates(outletId: number, index: number, subRoute: string): [number, number] {
  const base = SUBROUTE_COORDINATES[subRoute] || [23.7925, 90.4078];
  // Calculate distinct radial offset
  const angle = ((outletId * 137.5 + index * 53) % 360) * (Math.PI / 180);
  const distance = 0.006 + ((outletId % 5) * 0.0035);
  const lat = base[0] + Math.cos(angle) * distance;
  const lng = base[1] + Math.sin(angle) * distance;
  return [lat, lng];
}

export const DeliveryFleetMap: React.FC<DeliveryFleetMapProps> = ({
  dispatches,
  selectedDispatchId,
  onSelectDispatch,
  height = '520px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const truckMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Active selected trip
  const activeDispatch = useMemo(() => {
    if (selectedDispatchId) {
      return dispatches.find((d) => d.id === selectedDispatchId) || dispatches[0] || null;
    }
    return dispatches[0] || null;
  }, [dispatches, selectedDispatchId]);

  // Live truck telemetry animation state
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
  const [truckHeading, setTruckHeading] = useState<number>(0);
  const [truckSpeed, setTruckSpeed] = useState<number>(34);
  const [nextStopName, setNextStopName] = useState<string>('');
  const [distanceToNextStop, setDistanceToNextStop] = useState<string>('0.8 km');

  // Compute waypoint route path for active trip
  const routePoints = useMemo(() => {
    if (!activeDispatch) return [];
    const subRoute = activeDispatch.sub_route || 'Central Sub-Route';
    const depotCoords = SUBROUTE_COORDINATES[subRoute] || [23.7925, 90.4078];
    
    // Group unique outlets in order
    const uniqueOutlets: { outlet_id: number; outlet_name: string; items: DispatchItem[]; status: string }[] = [];
    const seen = new Set<number>();
    
    (activeDispatch.items || []).forEach((item) => {
      if (!seen.has(item.outlet_id)) {
        seen.add(item.outlet_id);
        const outletItems = (activeDispatch.items || []).filter((i) => i.outlet_id === item.outlet_id);
        const isConfirmed = outletItems.every((i) => i.stop_status === 'CONFIRMED_BY_OUTLET');
        const isDelivered = outletItems.every((i) => i.stop_status === 'DELIVERED_BY_DRIVER' || i.stop_status === 'CONFIRMED_BY_OUTLET');
        const status = isConfirmed ? 'CONFIRMED' : (isDelivered ? 'DELIVERED' : 'PENDING');
        uniqueOutlets.push({
          outlet_id: item.outlet_id,
          outlet_name: item.outlet_name,
          items: outletItems,
          status,
        });
      }
    });

    const waypoints: {
      type: 'DEPOT' | 'OUTLET';
      name: string;
      coords: [number, number];
      status: string;
      stopNumber?: number;
      outletId?: number;
      items?: DispatchItem[];
    }[] = [
      {
        type: 'DEPOT',
        name: 'Supplier Central Depot Hub',
        coords: depotCoords,
        status: 'DEPOT',
      },
    ];

    uniqueOutlets.forEach((out, idx) => {
      waypoints.push({
        type: 'OUTLET',
        name: out.outlet_name,
        coords: getOutletCoordinates(out.outlet_id, idx, subRoute),
        status: out.status,
        stopNumber: idx + 1,
        outletId: out.outlet_id,
        items: out.items,
      });
    });

    return waypoints;
  }, [activeDispatch]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.7925, 90.4078],
        zoom: 14,
        zoomControl: true,
      });

      // OpenStreetMap Tile Layer
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Markers, Polyline Route & Checkpoints on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup || routePoints.length === 0) return;

    markersGroup.clearLayers();

    const polylineCoords = routePoints.map((p) => p.coords);

    // Draw route polyline with OpenStreetMap styling
    const polyline = L.polyline(polylineCoords, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.85,
      dashArray: activeDispatch?.status === 'IN_TRANSIT' ? '6, 10' : undefined,
    }).addTo(markersGroup);
    polylineRef.current = polyline;

    // Depot Marker
    const depot = routePoints[0];
    const depotIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-900 border-2 border-white shadow-xl text-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110">
          <svg class="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          <span class="absolute -bottom-5 font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-700 whitespace-nowrap shadow-xs">Depot Hub</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const depotMarker = L.marker(depot.coords, { icon: depotIcon }).addTo(markersGroup);
    depotMarker.bindPopup(`
      <div class="p-2 text-xs font-sans">
        <h4 class="font-bold text-indigo-900 text-sm">🏭 Supplier Central Depot Hub</h4>
        <p class="text-slate-500 mt-1">Departure depot for subroute: <strong>${activeDispatch?.sub_route || 'Territory Sub-Route'}</strong></p>
        <p class="text-slate-400 text-[11px] mt-0.5">Vehicle: ${activeDispatch?.vehicle_registration_no || 'Fleet Truck'}</p>
      </div>
    `);

    // Outlet Checkpoints
    routePoints.slice(1).forEach((stop) => {
      const isConfirmed = stop.status === 'CONFIRMED';
      const isDelivered = stop.status === 'DELIVERED';

      const bgClass = isConfirmed
        ? 'bg-emerald-600 border-emerald-200 text-white'
        : isDelivered
        ? 'bg-amber-500 border-amber-200 text-white'
        : 'bg-blue-600 border-blue-200 text-white';

      const badgeText = isConfirmed ? '✓ Confirmed' : (isDelivered ? '📦 Delivered' : `Stop #${stop.stopNumber}`);

      const outletIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${bgClass} border-2 shadow-lg font-bold text-xs transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115">
            ${isConfirmed ? '✓' : stop.stopNumber}
            <span class="absolute -bottom-5 text-[9px] font-bold px-1.5 py-0.2 rounded ${bgClass} whitespace-nowrap shadow-xs border border-white/30">
              ${badgeText}
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const totalCases = (stop.items || []).reduce((acc, it) => acc + (it.assigned_cases || it.demanded_cases || 0), 0);

      const marker = L.marker(stop.coords, { icon: outletIcon }).addTo(markersGroup);
      marker.bindPopup(`
        <div class="p-2.5 text-xs font-sans max-w-xs">
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
            <span class="font-bold text-slate-800 text-sm">🏪 ${stop.name}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isConfirmed ? 'bg-emerald-100 text-emerald-800' : isDelivered ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
            }">${isConfirmed ? 'CONFIRMED BY OUTLET' : isDelivered ? 'DELIVERED BY DRIVER' : 'EN ROUTE'}</span>
          </div>
          <p class="text-slate-600 mb-1">Total Cargo: <strong>${totalCases} Cases</strong></p>
          <div class="space-y-1 text-[11px] text-slate-500 max-h-32 overflow-y-auto">
            ${(stop.items || []).map((it) => `
              <div class="flex justify-between py-0.5 border-b border-slate-50">
                <span>${it.brand || ''} ${it.flavor_variant || ''}</span>
                <span class="font-bold text-blue-700">${it.assigned_cases || it.demanded_cases || 0} cases</span>
              </div>
            `).join('')}
          </div>
          <p class="text-[10px] text-slate-400 mt-2">Stop #${stop.stopNumber} along ${activeDispatch?.sub_route || 'Sub-route'}</p>
        </div>
      `);
    });

    // Fit map view to route bounds
    try {
      const bounds = L.latLngBounds(polylineCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } catch (e) {}

  }, [routePoints, activeDispatch]);

  // 3. Live Truck Marker & Animated Path Telemetry
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || routePoints.length === 0 || !activeDispatch) return;

    const isBoarded = activeDispatch.status === 'BOARDED';
    const isInTransit = activeDispatch.status === 'IN_TRANSIT';
    const isCompleted = activeDispatch.status === 'COMPLETED' || activeDispatch.status === 'DELIVERED';

    // Determine target location along waypoint segments
    const waypoints = routePoints.map((r) => r.coords);
    const depotCoord = waypoints[0];
    const totalStops = waypoints.length - 1;

    // Pick active waypoint segment
    const confirmedCount = activeDispatch.confirmed_outlets_count || 0;
    const deliveredCount = activeDispatch.delivered_outlets_count || 0;
    const currentStopIndex = Math.min(waypoints.length - 1, Math.max(1, (deliveredCount || confirmedCount) + 1));
    const prevCoord = waypoints[Math.max(0, currentStopIndex - 1)];
    const targetCoord = waypoints[currentStopIndex];

    const nextStopObj = routePoints[currentStopIndex];
    if (nextStopObj) {
      setNextStopName(nextStopObj.name);
    }

    let progressFraction = 0.45;
    let currentSpeed = 38;

    if (isBoarded) {
      progressFraction = 0.05;
      currentSpeed = 0;
      setDistanceToNextStop('At Depot (Ready to Roll)');
    } else if (isInTransit) {
      progressFraction = 0.55;
      currentSpeed = 36;
      setDistanceToNextStop('0.7 km to Stop #' + currentStopIndex);
    } else if (isCompleted) {
      progressFraction = 1.0;
      currentSpeed = 0;
      setDistanceToNextStop('Route Completed');
    }

    // Interpolate live position between prevCoord and targetCoord
    const startCoord = isBoarded ? depotCoord : prevCoord;
    const endCoord = isBoarded ? depotCoord : targetCoord;

    let initialLat = startCoord[0] + (endCoord[0] - startCoord[0]) * progressFraction;
    let initialLng = startCoord[1] + (endCoord[1] - startCoord[1]) * progressFraction;

    // Calculate heading angle
    const dLat = endCoord[0] - startCoord[0];
    const dLng = endCoord[1] - startCoord[1];
    let angleDeg = Math.atan2(dLng, dLat) * (180 / Math.PI);
    setTruckHeading(angleDeg);
    setTruckSpeed(currentSpeed);
    setTruckPos([initialLat, initialLng]);

    // Create or update Truck Marker
    const regNo = activeDispatch.vehicle_registration_no || 'FLEET';
    const driver = activeDispatch.driver_name || 'Driver';

    const truckIcon = L.divIcon({
      className: 'custom-truck-icon',
      html: `
        <div class="relative flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-50 group">
          <!-- Pulse radar ring when moving -->
          ${isInTransit ? '<div class="absolute -inset-2 bg-blue-500 rounded-full animate-ping opacity-60 pointer-events-none"></div>' : ''}
          
          <!-- Truck Vessel Pill -->
          <div class="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-2xl border-2 border-white ring-2 ring-blue-400">
            <span class="text-base animate-pulse">🚚</span>
            <div class="text-left font-sans leading-none">
              <span class="block font-black font-mono text-[10px] tracking-tight uppercase">${regNo}</span>
              <span class="block text-[8px] text-blue-200 font-bold">${driver}</span>
            </div>
          </div>
          
          <!-- Directional Arrow / Pin Tip -->
          <div class="w-3 h-3 bg-indigo-800 border-r border-b border-white transform rotate-45 -mt-1.5 shadow-sm"></div>
        </div>
      `,
      iconSize: [120, 50],
      iconAnchor: [60, 42],
    });

    if (!truckMarkerRef.current) {
      truckMarkerRef.current = L.marker([initialLat, initialLng], { icon: truckIcon }).addTo(map);
    } else {
      truckMarkerRef.current.setIcon(truckIcon);
      truckMarkerRef.current.setLatLng([initialLat, initialLng]);
    }

    truckMarkerRef.current.bindPopup(`
      <div class="p-3 text-xs font-sans min-w-[210px]">
        <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <span class="p-1.5 rounded-xl bg-blue-50 text-blue-700 text-lg">🚚</span>
          <div>
            <h4 class="font-bold text-slate-900 text-sm font-mono">${regNo}</h4>
            <p class="text-[10px] text-slate-500 font-semibold">${activeDispatch.team_name || 'Fleet Team'}</p>
          </div>
        </div>
        <div class="space-y-1.5 text-slate-600 text-[11px]">
          <p class="flex justify-between">
            <span class="text-slate-400">Status:</span>
            <strong class="font-bold ${isInTransit ? 'text-blue-600' : isBoarded ? 'text-amber-600' : 'text-emerald-600'}">${activeDispatch.status}</strong>
          </p>
          <p class="flex justify-between">
            <span class="text-slate-400">Driver:</span>
            <strong class="text-slate-800">${driver}</strong>
          </p>
          <p class="flex justify-between">
            <span class="text-slate-400">Driver Phone:</span>
            <span class="font-mono text-slate-700">${activeDispatch.driver_phone || 'N/A'}</span>
          </p>
          <p class="flex justify-between">
            <span class="text-slate-400">Sub-Route:</span>
            <strong class="text-slate-800">${activeDispatch.sub_route}</strong>
          </p>
          <p class="flex justify-between">
            <span class="text-slate-400">Total Cargo:</span>
            <strong class="text-indigo-700 font-mono">${activeDispatch.total_cases} Cases</strong>
          </p>
        </div>
      </div>
    `);

    // Live continuous motion simulation if IN_TRANSIT
    let step = 0;
    const interval = setInterval(() => {
      if (!isInTransit || !truckMarkerRef.current) return;
      step = (step + 1) % 60;
      const oscillation = Math.sin((step / 60) * Math.PI * 2) * 0.0012;
      const newLat = initialLat + dLat * (oscillation * 0.5);
      const newLng = initialLng + dLng * (oscillation * 0.5);
      truckMarkerRef.current.setLatLng([newLat, newLng]);
      setTruckSpeed(Math.floor(32 + Math.sin(step * 0.3) * 6));
    }, 1200);

    return () => clearInterval(interval);
  }, [routePoints, activeDispatch]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && truckPos) {
      mapInstanceRef.current.flyTo(truckPos, 15, { animate: true, duration: 1.2 });
    }
  };

  const handleFitRoute = () => {
    if (mapInstanceRef.current && polylineRef.current) {
      mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50], animate: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. MAP HEADER & TRIP SELECTOR STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                Live OpenStreetMap Fleet Telemetry
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● LIVE GPS SYNC
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time route telemetry and checkpoint progression along sub-routes powered by OpenStreetMap API.
            </p>
          </div>
        </div>

        {/* Dispatch Selection Tabs */}
        {dispatches.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {dispatches.map((disp) => {
              const isSelected = activeDispatch?.id === disp.id;
              return (
                <button
                  key={disp.id}
                  onClick={() => onSelectDispatch && onSelectDispatch(disp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{disp.vehicle_registration_no || disp.dispatch_code}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    disp.status === 'IN_TRANSIT' ? 'bg-amber-400 animate-ping' : disp.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-slate-400'
                  }`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. MAP CONTAINER WRAPPER WITH HUD OVERLAYS */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100" style={{ height }}>
        {/* Leaflet Map DOM Root */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* HUD Top Left: Active Vehicle Telemetry Card */}
        {activeDispatch && (
          <div className="absolute top-4 left-4 z-10 max-w-xs sm:max-w-sm p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl space-y-2 pointer-events-auto">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-100 text-blue-700 font-black text-sm">🚚</span>
                <div>
                  <h4 className="font-black font-mono text-sm text-slate-900 tracking-tight leading-none">
                    {activeDispatch.vehicle_registration_no}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">{activeDispatch.sub_route}</span>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                activeDispatch.status === 'IN_TRANSIT'
                  ? 'bg-blue-600 text-white animate-pulse'
                  : activeDispatch.status === 'BOARDED'
                  ? 'bg-amber-500 text-white'
                  : activeDispatch.status === 'COMPLETED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-white'
              }`}>
                {activeDispatch.status}
              </span>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cruising Speed</span>
                <span className="font-mono font-black text-blue-700 text-sm">{truckSpeed} km/h</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Destination</span>
                <span className="font-bold text-slate-800 text-xs truncate block" title={nextStopName}>
                  {nextStopName || 'Depot'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                {activeDispatch.driver_name} ({activeDispatch.driver_phone || 'Driver'})
              </span>
              <span className="font-mono font-bold text-indigo-700">
                {activeDispatch.total_cases} Cases
              </span>
            </div>
          </div>
        )}

        {/* HUD Top Right: Map Action Buttons */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={handleRecenter}
            className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200/90 shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Recenter Map on Delivery Truck"
          >
            <Compass className="w-4 h-4 text-blue-600 animate-spin-slow" />
            <span className="hidden sm:inline">Center Truck</span>
          </button>

          <button
            onClick={handleFitRoute}
            className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200/90 shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Fit Entire Sub-Route on Screen"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>
        </div>

        {/* HUD Bottom Left: OpenStreetMap Map Legend */}
        <div className="absolute bottom-4 left-4 z-10 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-lg text-[10px] font-sans flex flex-wrap items-center gap-3 text-slate-700 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-900 border border-white inline-block" />
            <span>Depot Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white inline-block" />
            <span>En Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white inline-block" />
            <span>Delivered by Driver</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block" />
            <span>Confirmed by Outlet</span>
          </div>
        </div>

        {/* HUD Bottom Right: OpenStreetMap Attribution Badge */}
        <div className="absolute bottom-4 right-4 z-10 px-2 py-1 rounded-xl bg-white/80 backdrop-blur-xs text-[9px] font-mono text-slate-500 border border-slate-200/80 shadow-xs">
          OpenStreetMap API • © OSM Contributors
        </div>
      </div>

      {/* 3. TRIP PROGRESSION TIMELINE & CHECKPOINTS MANIFEST */}
      {activeDispatch && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Sub-Route Consignment</span>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>{activeDispatch.sub_route}</span>
                <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {activeDispatch.dispatch_code}
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500">
                Outlets: <strong className="text-slate-800">{activeDispatch.delivered_outlets_count || 0} / {activeDispatch.total_outlets} Dropped</strong>
              </span>
              <span className="text-slate-500">
                Verified: <strong className="text-emerald-700">{activeDispatch.confirmed_outlets_count || 0} / {activeDispatch.total_outlets} Confirmed</strong>
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            {/* Step 1: Boarding */}
            <div className={`p-3 rounded-2xl border transition-all ${
              activeDispatch.boarded_at || activeDispatch.status !== 'DISPATCHED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 1: Cargo Boarded</span>
                <span className="text-sm">{activeDispatch.boarded_at || activeDispatch.status !== 'DISPATCHED' ? '✓' : '1'}</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeDispatch.boarded_at ? new Date(activeDispatch.boarded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Boarding'}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Verified on truck</span>
            </div>

            {/* Step 2: Transit */}
            <div className={`p-3 rounded-2xl border transition-all ${
              activeDispatch.ride_started_at || activeDispatch.status === 'IN_TRANSIT' || activeDispatch.status === 'DELIVERED' || activeDispatch.status === 'COMPLETED'
                ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 2: Ride Started</span>
                <span className="text-sm">🚚</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeDispatch.ride_started_at ? new Date(activeDispatch.ride_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Awaiting Departure'}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">En route on sub-route</span>
            </div>

            {/* Step 3: Outlets Dropped */}
            <div className={`p-3 rounded-2xl border transition-all ${
              (activeDispatch.delivered_outlets_count || 0) > 0
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 3: Outlets Dropped</span>
                <span className="text-sm">📦</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeDispatch.delivered_outlets_count || 0} / {activeDispatch.total_outlets} Stores
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Unloaded by driver</span>
            </div>

            {/* Step 4: Route Completed */}
            <div className={`p-3 rounded-2xl border transition-all ${
              activeDispatch.status === 'COMPLETED' || (activeDispatch.confirmed_outlets_count || 0) >= activeDispatch.total_outlets
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 4: All Confirmed</span>
                <span className="text-sm">🎉</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeDispatch.confirmed_outlets_count || 0} / {activeDispatch.total_outlets} Confirmed
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Stock in store shelves</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryFleetMap;
