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
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Eye,
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

function resolveDepotCoordinates(subRoute: string, vehicleIndex = 0): [number, number] {
  const norm = (subRoute || '').toLowerCase();
  let base: [number, number] = [23.7925, 90.4078];

  if (norm.includes('banani')) {
    base = [23.7937, 90.4043];
  } else if (norm.includes('gulshan')) {
    base = [23.7925, 90.4125];
  } else if (norm.includes('uttara')) {
    base = [23.8759, 90.3995];
  } else if (norm.includes('dhanmondi')) {
    base = [23.7461, 90.3742];
  } else if (norm.includes('mirpur')) {
    base = [23.8067, 90.3644];
  } else if (norm.includes('mohakhali')) {
    base = [23.7780, 90.4030];
  } else if (norm.includes('tejgaon')) {
    base = [23.7635, 90.3965];
  } else if (norm.includes('badda')) {
    base = [23.7845, 90.4260];
  } else if (norm.includes('chittagong')) {
    base = [22.3350, 91.8325];
  }

  // Slight depot bay separation so multiple vehicles at same hub don't overlap completely
  const offsetAngle = (vehicleIndex * 70) * (Math.PI / 180);
  const offsetDist = 0.0018 * vehicleIndex;
  return [base[0] + Math.cos(offsetAngle) * offsetDist, base[1] + Math.sin(offsetAngle) * offsetDist];
}

// Distinct color palettes for multiple vehicles on merged map
const VEHICLE_THEMES = [
  {
    name: 'Emerald Green',
    line: '#10b981',
    bg: 'bg-emerald-600',
    border: 'border-emerald-500',
    lightBg: 'bg-emerald-50',
    text: 'text-emerald-700',
    pill: 'from-blue-700 via-indigo-700 to-blue-800',
    ring: 'ring-blue-400',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    name: 'Forest Green',
    line: '#059669',
    bg: 'bg-emerald-600',
    border: 'border-emerald-500',
    lightBg: 'bg-emerald-50',
    text: 'text-emerald-700',
    pill: 'from-emerald-700 via-teal-700 to-emerald-800',
    ring: 'ring-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    name: 'Violet',
    line: '#7c3aed',
    bg: 'bg-purple-600',
    border: 'border-purple-500',
    lightBg: 'bg-purple-50',
    text: 'text-purple-700',
    pill: 'from-purple-700 via-violet-700 to-indigo-800',
    ring: 'ring-purple-400',
    badge: 'bg-purple-100 text-purple-800',
  },
  {
    name: 'Amber',
    line: '#d97706',
    bg: 'bg-amber-600',
    border: 'border-amber-500',
    lightBg: 'bg-amber-50',
    text: 'text-amber-700',
    pill: 'from-amber-600 via-orange-600 to-amber-700',
    ring: 'ring-amber-400',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    name: 'Rose',
    line: '#e11d48',
    bg: 'bg-rose-600',
    border: 'border-rose-500',
    lightBg: 'bg-rose-50',
    text: 'text-rose-700',
    pill: 'from-rose-600 via-red-600 to-rose-700',
    ring: 'ring-rose-400',
    badge: 'bg-rose-100 text-rose-800',
  },
  {
    name: 'Cyan',
    line: '#0891b2',
    bg: 'bg-cyan-600',
    border: 'border-cyan-500',
    lightBg: 'bg-cyan-50',
    text: 'text-cyan-700',
    pill: 'from-cyan-600 via-sky-600 to-cyan-700',
    ring: 'ring-cyan-400',
    badge: 'bg-cyan-100 text-cyan-800',
  },
];

// Deterministic geo-hash for stable outlet coordinates
function getOutletCoordinates(outletId: number, index: number, subRoute: string, vehicleIndex = 0): [number, number] {
  const base = resolveDepotCoordinates(subRoute, 0);
  const angle = ((outletId * 137.5 + index * 53 + vehicleIndex * 40) % 360) * (Math.PI / 180);
  const distance = 0.0065 + ((outletId % 5) * 0.0035);
  const lat = base[0] + Math.cos(angle) * distance;
  const lng = base[1] + Math.sin(angle) * distance;
  return [lat, lng];
}

// Generate smooth road-like waypoints between stops for fluid truck motion
function buildFlightPath(waypoints: [number, number][], stepsPerSegment = 10): [number, number][] {
  if (waypoints.length <= 1) return waypoints;
  const fullPath: [number, number][] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const dLat = p2[0] - p1[0];
    const dLng = p2[1] - p1[1];

    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      // Slight city-block curvature simulation
      const midT = Math.sin(t * Math.PI);
      const normalLat = -dLng * 0.12 * midT;
      const normalLng = dLat * 0.12 * midT;
      fullPath.push([
        p1[0] + dLat * t + normalLat,
        p1[1] + dLng * t + normalLng,
      ]);
    }
  }

  // Include final destination point
  fullPath.push(waypoints[waypoints.length - 1]);

  // Append reverse return path to loop continuously for testing
  for (let i = fullPath.length - 2; i > 0; i--) {
    fullPath.push(fullPath[i]);
  }

  return fullPath;
}

export const DeliveryFleetMap: React.FC<DeliveryFleetMapProps> = ({
  dispatches,
  selectedDispatchId,
  onSelectDispatch,
  height = '560px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Map of truck marker instances keyed by vehicle registration
  const truckMarkersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Animation motion state per vehicle registration: { stepIndex, speed }
  const motionStateRef = useRef<Map<string, { stepIndex: number; speed: number; flightPath: [number, number][] }>>(new Map());

  // Toggle for testing motion simulation
  const [isTestingMotion, setIsTestingMotion] = useState<boolean>(true);

  // Active focused vehicle reg (null means "All Vehicles (Merged Fleet)")
  const [focusedVehicleReg, setFocusedVehicleReg] = useState<string | null>(null);

  // Live metrics of focused vehicle for HUD
  const [focusedTelemetry, setFocusedTelemetry] = useState<{
    speed: number;
    nextStopName: string;
    subRoute: string;
    driver: string;
    phone: string;
    cases: number;
    status: string;
    regNo: string;
    coords: [number, number] | null;
  } | null>(null);

  // 1. Group dispatches so all distinct active vehicles appear on the single map
  const activeVehicles = useMemo(() => {
    const map = new Map<string, VehicleDispatch>();

    // Priority ranking: IN_TRANSIT > BOARDED > DISPATCHED > DELIVERED > COMPLETED
    const statusRank: Record<string, number> = {
      'IN_TRANSIT': 5,
      'BOARDED': 4,
      'DELIVERING': 4,
      'DISPATCHED': 3,
      'DELIVERED': 2,
      'COMPLETED': 1,
    };

    const sorted = [...dispatches].sort((a, b) => {
      const rankA = statusRank[a.status] ?? 0;
      const rankB = statusRank[b.status] ?? 0;
      if (rankA !== rankB) return rankB - rankA;
      return b.id - a.id;
    });

    sorted.forEach((disp) => {
      const key = disp.vehicle_registration_no || `TRIP-${disp.id}`;
      if (!map.has(key)) {
        map.set(key, disp);
      }
    });

    return Array.from(map.values());
  }, [dispatches]);

  // Build merged routes data for each active vehicle
  const mergedVehiclesData = useMemo(() => {
    let globalStopIndex = 1;

    return activeVehicles.map((disp, vIdx) => {
      const color = VEHICLE_THEMES[vIdx % VEHICLE_THEMES.length];
      const depotCoords = resolveDepotCoordinates(disp.sub_route, vIdx);

      // Group unique outlets
      const uniqueOutlets: { outlet_id: number; outlet_name: string; items: DispatchItem[]; status: string }[] = [];
      const seen = new Set<number>();

      (disp.items || []).forEach((item) => {
        if (!seen.has(item.outlet_id)) {
          seen.add(item.outlet_id);
          const outletItems = (disp.items || []).filter((i) => i.outlet_id === item.outlet_id);
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
          name: `Depot Hub (${disp.team_name || 'Fleet'})`,
          coords: depotCoords,
          status: 'DEPOT',
        },
      ];

      uniqueOutlets.forEach((out, idx) => {
        const stopNum = globalStopIndex++;
        const cleanName = (out.outlet_name || '')
          .replace(/[ÔÇöâ€”?]/g, ' - ')
          .replace(/\s+-\s+/g, ' — ')
          .trim();
        waypoints.push({
          type: 'OUTLET',
          name: cleanName,
          coords: getOutletCoordinates(out.outlet_id, idx, disp.sub_route, vIdx),
          status: out.status,
          stopNumber: stopNum,
          outletId: out.outlet_id,
          items: out.items,
        });
      });

      const rawCoords = waypoints.map((w) => w.coords);
      const flightPath = buildFlightPath(rawCoords, 12);

      return {
        dispatch: disp,
        regNo: disp.vehicle_registration_no || `FLEET-${disp.id}`,
        teamName: disp.team_name || 'Delivery Logistics',
        driver: disp.driver_name || 'Driver',
        phone: disp.driver_phone || 'N/A',
        subRoute: disp.sub_route || 'Territory Sub-Route',
        status: disp.status,
        totalCases: disp.total_cases || 0,
        color,
        depotCoords,
        waypoints,
        rawCoords,
        flightPath,
      };
    });
  }, [activeVehicles]);

  // Synchronize focused vehicle with selectedDispatchId prop
  useEffect(() => {
    if (selectedDispatchId) {
      const match = activeVehicles.find((d) => d.id === selectedDispatchId);
      if (match?.vehicle_registration_no) {
        setFocusedVehicleReg(match.vehicle_registration_no);
      }
    }
  }, [selectedDispatchId, activeVehicles]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.7925, 90.4078],
        zoom: 14,
        zoomControl: true,
      });

      // OpenStreetMap Standard Tiles
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

  // 2. Render All Routes, Checkpoints & Trucks on the Single Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup || mergedVehiclesData.length === 0) return;

    markersGroup.clearLayers();
    truckMarkersMapRef.current.forEach((marker) => {
      try {
        map.removeLayer(marker);
      } catch (e) {}
    });
    truckMarkersMapRef.current.clear();

    const allRouteCoordinates: [number, number][] = [];

    mergedVehiclesData.forEach((v) => {
      const isFocused = focusedVehicleReg === v.regNo;
      const isFaded = focusedVehicleReg !== null && !isFocused;

      v.rawCoords.forEach((c) => allRouteCoordinates.push(c));

      // Draw Vehicle Route Polyline (Green)
      L.polyline(v.flightPath, {
        color: v.color.line,
        weight: isFocused ? 6 : 5,
        opacity: isFaded ? 0.6 : 0.9,
        dashArray: (v.status === 'IN_TRANSIT' || isTestingMotion) ? '6, 8' : undefined,
      }).addTo(markersGroup);

      // Depot Hub Marker
      const depot = v.waypoints[0];
      const depotIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-indigo-950 border-2 ${v.color.border} shadow-xl text-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115">
            <svg class="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span class="absolute -bottom-5 font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-700 whitespace-nowrap shadow-xs">
              ${v.regNo} Hub
            </span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const depotMarker = L.marker(depot.coords, { icon: depotIcon }).addTo(markersGroup);
      depotMarker.bindPopup(`
        <div class="p-2.5 text-xs font-sans">
          <h4 class="font-bold text-indigo-900 text-sm">🏭 Depot Hub (${v.teamName})</h4>
          <p class="text-slate-600 mt-1">Departure depot for subroute: <strong>${v.subRoute}</strong></p>
          <p class="text-slate-500 font-mono text-[11px] mt-0.5">Assigned Vehicle: <strong>${v.regNo}</strong> (${v.driver})</p>
        </div>
      `);

      // Outlet Checkpoints
      v.waypoints.slice(1).forEach((stop) => {
        const isConfirmed = stop.status === 'CONFIRMED';
        const isDelivered = stop.status === 'DELIVERED';

        const stopIcon = L.divIcon({
          className: 'custom-outlet-icon',
          html: `
            <div class="relative flex flex-col items-center transform -translate-x-1/2 -translate-y-[14px] cursor-pointer group">
              <!-- Stop Circle Pin -->
              <div class="relative z-10 flex items-center justify-center w-7 h-7 rounded-full ${v.color.bg} border-2 border-white shadow-lg font-black text-xs text-white transition-transform group-hover:scale-115">
                ${isConfirmed ? '✓' : stop.stopNumber}
              </div>

              <!-- Outlet Name & Stop Pill -->
              <div class="mt-1 flex flex-col items-center z-20 pointer-events-none">
                <div class="px-2 py-0.5 rounded-lg bg-slate-900/95 text-white shadow-md border border-slate-700/80 whitespace-nowrap flex items-center gap-1 max-w-[190px]">
                  <span class="text-[10px]">🏪</span>
                  <span class="text-[9px] font-bold tracking-tight text-white truncate max-w-[150px]" title="${stop.name}">
                    ${stop.name}
                  </span>
                </div>
                <span class="text-[8px] font-mono font-semibold text-slate-300 bg-slate-800/90 px-1.5 py-0.2 rounded mt-0.5 border border-slate-700 shadow-2xs">
                  Stop #${stop.stopNumber} (${v.regNo})
                </span>
              </div>
            </div>
          `,
          iconSize: [190, 56],
          iconAnchor: [95, 14],
        });

        const totalCases = (stop.items || []).reduce((acc, it) => acc + (it.assigned_cases || it.demanded_cases || 0), 0);
        const marker = L.marker(stop.coords, { icon: stopIcon }).addTo(markersGroup);
        marker.bindPopup(`
          <div class="p-2.5 text-xs font-sans max-w-xs">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
              <span class="font-bold text-slate-800 text-sm">🏪 ${stop.name}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isConfirmed ? 'bg-emerald-100 text-emerald-800' : isDelivered ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }">${isConfirmed ? 'CONFIRMED' : isDelivered ? 'DELIVERED' : 'EN ROUTE'}</span>
            </div>
            <p class="text-slate-600 mb-1">Serving Truck: <strong class="font-mono text-blue-700">${v.regNo}</strong> (${v.driver})</p>
            <p class="text-slate-600 mb-1">Total Cargo: <strong>${totalCases} Cases</strong></p>
            <div class="space-y-1 text-[11px] text-slate-500 max-h-28 overflow-y-auto">
              ${(stop.items || []).map((it) => `
                <div class="flex justify-between py-0.5 border-b border-slate-50">
                  <span>${it.brand || ''} ${it.flavor_variant || ''}</span>
                  <span class="font-bold text-blue-700">${it.assigned_cases || it.demanded_cases || 0} cases</span>
                </div>
              `).join('')}
            </div>
            <p class="text-[10px] text-slate-400 mt-2">Stop #${stop.stopNumber} along ${v.subRoute}</p>
          </div>
        `);
      });

      // Initial truck marker position
      const initialCoord = v.flightPath[0] || v.depotCoords;
      const isMoving = v.status === 'IN_TRANSIT' || isTestingMotion;

      const truckIcon = L.divIcon({
        className: 'custom-truck-icon',
        html: `
          <div class="relative flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-50 group">
            <!-- Vehicle Pill Vessel -->
            <div class="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r ${v.color.pill} text-white shadow-xl border-2 border-white ring-2 ${v.color.ring} transition-transform group-hover:scale-105">
              <span class="text-sm">🚚</span>
              <div class="text-left font-sans leading-none">
                <div class="flex items-center gap-1">
                  <span class="font-black font-mono text-[10px] tracking-tight uppercase">${v.regNo}</span>
                  ${isMoving ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>' : ''}
                </div>
                <span class="block text-[8px] text-white/80 font-bold mt-0.5">${v.driver}</span>
              </div>
            </div>

            <!-- Direction Pin Needle -->
            <div class="w-2.5 h-2.5 ${v.color.bg} border-r border-b border-white transform rotate-45 -mt-1 shadow-xs"></div>
          </div>
        `,
        iconSize: [120, 48],
        iconAnchor: [60, 42],
      });

      const truckMarker = L.marker(initialCoord, { icon: truckIcon }).addTo(markersGroup);

      truckMarker.on('click', () => {
        setFocusedVehicleReg(v.regNo);
        if (onSelectDispatch) onSelectDispatch(v.dispatch);
      });

      truckMarker.bindPopup(`
        <div class="p-3 text-xs font-sans min-w-[220px]">
          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <span class="p-1.5 rounded-xl bg-blue-50 text-blue-700 text-lg">🚚</span>
            <div>
              <h4 class="font-bold text-slate-900 text-sm font-mono">${v.regNo}</h4>
              <p class="text-[10px] text-slate-500 font-semibold">${v.teamName}</p>
            </div>
          </div>
          <div class="space-y-1.5 text-slate-600 text-[11px]">
            <p class="flex justify-between">
              <span class="text-slate-400">Status:</span>
              <strong class="font-bold ${isMoving ? 'text-blue-600' : 'text-amber-600'}">${v.status}</strong>
            </p>
            <p class="flex justify-between">
              <span class="text-slate-400">Driver:</span>
              <strong class="text-slate-800">${v.driver}</strong>
            </p>
            <p class="flex justify-between">
              <span class="text-slate-400">Phone:</span>
              <span class="font-mono text-slate-700">${v.phone}</span>
            </p>
            <p class="flex justify-between">
              <span class="text-slate-400">Sub-Route:</span>
              <strong class="text-slate-800">${v.subRoute}</strong>
            </p>
            <p class="flex justify-between">
              <span class="text-slate-400">Cargo:</span>
              <strong class="text-indigo-700 font-mono">${v.totalCases} Cases</strong>
            </p>
          </div>
        </div>
      `);

      truckMarkersMapRef.current.set(v.regNo, truckMarker);

      // Initialize motion tracking state
      if (!motionStateRef.current.has(v.regNo)) {
        motionStateRef.current.set(v.regNo, {
          stepIndex: 0,
          speed: 34 + Math.floor(Math.random() * 8),
          flightPath: v.flightPath,
        });
      } else {
        const existing = motionStateRef.current.get(v.regNo)!;
        existing.flightPath = v.flightPath;
      }
    });

    // Auto-fit all routes onto single unified map view
    if (allRouteCoordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(allRouteCoordinates);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch (e) {}
    }
  }, [mergedVehiclesData, focusedVehicleReg, isTestingMotion]);

  // 3. Live Fluid Movement Engine Along Real Street Waypoints
  useEffect(() => {
    const interval = setInterval(() => {
      mergedVehiclesData.forEach((v) => {
        const isMoving = v.status === 'IN_TRANSIT' || isTestingMotion;
        if (!isMoving) return;

        const motion = motionStateRef.current.get(v.regNo);
        const marker = truckMarkersMapRef.current.get(v.regNo);
        if (!motion || !marker || motion.flightPath.length === 0) return;

        // Advance step along continuous flightPath
        motion.stepIndex = (motion.stepIndex + 1) % motion.flightPath.length;
        const currentCoord = motion.flightPath[motion.stepIndex];
        const nextCoord = motion.flightPath[(motion.stepIndex + 1) % motion.flightPath.length];

        // Smoothly update marker location on map
        marker.setLatLng(currentCoord);

        // Calculate dynamic cruising speed
        motion.speed = Math.floor(32 + Math.sin(motion.stepIndex * 0.4) * 8);

        // If this vehicle is currently focused, update telemetry HUD in real time
        if (focusedVehicleReg === v.regNo || (focusedVehicleReg === null && mergedVehiclesData[0]?.regNo === v.regNo)) {
          const nextStop = v.waypoints.find((w, i) => i > 0 && w.status !== 'CONFIRMED')?.name || v.waypoints[1]?.name || 'Depot Hub';
          setFocusedTelemetry({
            speed: motion.speed,
            nextStopName: nextStop,
            subRoute: v.subRoute,
            driver: v.driver,
            phone: v.phone,
            cases: v.totalCases,
            status: v.status,
            regNo: v.regNo,
            coords: currentCoord,
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mergedVehiclesData, focusedVehicleReg, isTestingMotion]);

  // Recenter on focused truck or fit all
  const handleRecenterFocused = () => {
    if (!mapInstanceRef.current) return;
    if (focusedVehicleReg) {
      const marker = truckMarkersMapRef.current.get(focusedVehicleReg);
      if (marker) {
        mapInstanceRef.current.flyTo(marker.getLatLng(), 15, { animate: true, duration: 1.2 });
        return;
      }
    }
    handleFitAllFleet();
  };

  const handleFitAllFleet = () => {
    if (!mapInstanceRef.current || mergedVehiclesData.length === 0) return;
    const allCoords: [number, number][] = [];
    mergedVehiclesData.forEach((v) => v.rawCoords.forEach((c) => allCoords.push(c)));
    if (allCoords.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], animate: true });
    }
  };

  const activeFocusedData = mergedVehiclesData.find((v) => v.regNo === focusedVehicleReg) || null;

  return (
    <div className="space-y-4">
      {/* 1. UNIFIED MAP HEADER & MULTI-VEHICLE TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-oswald text-lg font-bold uppercase tracking-wide text-slate-900">
                Live OpenStreetMap Fleet Telemetry
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                LIVE GPS SYNC
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time route telemetry and checkpoint progression along sub-routes powered by OpenStreetMap API.
            </p>
          </div>
        </div>

        {/* Multi-Vehicle Merged Fleet Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {/* Master All-Vehicles View Tab */}
          <button
            type="button"
            onClick={() => {
              setFocusedVehicleReg(null);
              handleFitAllFleet();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              focusedVehicleReg === null
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>All Vehicles ({mergedVehiclesData.length})</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>

          {/* Individual Vehicle Tabs */}
          {mergedVehiclesData.map((v) => {
            const isSelected = focusedVehicleReg === v.regNo;
            const isMoving = v.status === 'IN_TRANSIT' || isTestingMotion;
            return (
              <button
                key={v.regNo}
                type="button"
                onClick={() => {
                  setFocusedVehicleReg(v.regNo);
                  if (onSelectDispatch) onSelectDispatch(v.dispatch);
                  const marker = truckMarkersMapRef.current.get(v.regNo);
                  if (marker && mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(marker.getLatLng(), 15, { animate: true, duration: 1.0 });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? `${v.color.bg} text-white shadow-md shadow-blue-600/20`
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{v.regNo}</span>
                <span className={`w-2 h-2 rounded-full ${
                  isMoving ? 'bg-amber-400 animate-ping' : 'bg-slate-400'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SINGLE UNIFIED MAP CONTAINER WRAPPER WITH HUD OVERLAYS */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100" style={{ height }}>
        {/* Leaflet Map DOM Root */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* HUD Top Left: Active Vehicle or Merged Fleet Telemetry Card */}
        <div className="absolute top-4 left-4 z-10 max-w-xs sm:max-w-sm p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl space-y-2 pointer-events-auto">
          {activeFocusedData ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-blue-100 text-blue-700 font-black text-sm">🚚</span>
                  <div>
                    <h4 className="font-black font-mono text-sm text-slate-900 tracking-tight leading-none">
                      {activeFocusedData.regNo}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-semibold">{activeFocusedData.subRoute}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                  activeFocusedData.status === 'IN_TRANSIT' || isTestingMotion
                    ? 'bg-blue-600 text-white animate-pulse'
                    : 'bg-amber-500 text-white'
                }`}>
                  {activeFocusedData.status === 'IN_TRANSIT' || isTestingMotion ? 'IN_TRANSIT' : activeFocusedData.status}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cruising Speed</span>
                  <span className="font-mono font-black text-blue-700 text-sm">
                    {focusedTelemetry?.speed || 36} km/h
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Destination</span>
                  <span className="font-bold text-slate-800 text-xs truncate block" title={focusedTelemetry?.nextStopName || 'Outlet Stop'}>
                    {focusedTelemetry?.nextStopName || 'Outlet Stop'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  {activeFocusedData.driver} ({activeFocusedData.phone})
                </span>
                <span className="font-mono font-bold text-indigo-700">
                  {activeFocusedData.totalCases} Cases
                </span>
              </div>
            </>
          ) : (
            /* Merged Fleet Overview Header Card */
            <>
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-slate-900 text-white font-black text-sm">🌐</span>
                  <div>
                    <h4 className="font-black font-mono text-sm text-slate-900 tracking-tight leading-none">
                      Merged Fleet Tracking
                    </h4>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {mergedVehiclesData.length} Vehicles Tracked Simultaneously
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono bg-emerald-600 text-white">
                  ALL ONLINE
                </span>
              </div>

              <div className="space-y-1 text-xs">
                {mergedVehiclesData.map((v) => (
                  <div
                    key={v.regNo}
                    onClick={() => {
                      setFocusedVehicleReg(v.regNo);
                      const marker = truckMarkersMapRef.current.get(v.regNo);
                      if (marker && mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo(marker.getLatLng(), 15, { animate: true, duration: 1.0 });
                      }
                    }}
                    className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${v.color.bg}`} />
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{v.regNo}</span>
                      <span className="text-[10px] text-slate-400">({v.driver})</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-blue-600">{v.totalCases} Cases</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* HUD Top Right: Action Buttons & Testing Motion Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
          {/* Test Motion Simulation Toggle (Requested by user) */}
          <button
            type="button"
            onClick={() => setIsTestingMotion((prev) => !prev)}
            className={`p-2.5 rounded-2xl backdrop-blur-md border shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              isTestingMotion
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/30'
                : 'bg-white/95 text-slate-700 hover:text-blue-600 hover:bg-white border-slate-200/90'
            }`}
            title="Toggle Live Vehicle Motion Simulation along routes"
          >
            {isTestingMotion ? (
              <>
                <Pause className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Motion: Active</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Start Ride Test</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRecenterFocused}
            className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200/90 shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Recenter on Focused Delivery Truck"
          >
            <Compass className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Center Truck</span>
          </button>

          <button
            type="button"
            onClick={handleFitAllFleet}
            className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200/90 shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Fit Entire Fleet on Screen"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>
        </div>

        {/* HUD Bottom Left: OpenStreetMap Map Legend with Multi-Vehicle Color Keys */}
        <div className="absolute bottom-4 left-4 z-10 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-lg text-[10px] font-sans flex flex-wrap items-center gap-3 text-slate-700 pointer-events-auto max-w-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-900 border border-white inline-block" />
            <span className="font-bold">Depot Hub</span>
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

          {/* Color Key for Each Vehicle */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {mergedVehiclesData.map((v) => (
              <div
                key={v.regNo}
                onClick={() => setFocusedVehicleReg(v.regNo)}
                className="flex items-center gap-1 cursor-pointer font-mono font-bold"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${v.color.bg}`} />
                <span>{v.regNo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* HUD Bottom Right: OpenStreetMap Attribution Badge */}
        <div className="absolute bottom-4 right-4 z-10 px-2 py-1 rounded-xl bg-white/80 backdrop-blur-xs text-[9px] font-mono text-slate-500 border border-slate-200/80 shadow-xs">
          OpenStreetMap API • © OSM Contributors
        </div>
      </div>

      {/* 3. TRIP PROGRESSION TIMELINE & CHECKPOINTS MANIFEST FOR FOCUSED VEHICLE */}
      {activeFocusedData && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Sub-Route Consignment</span>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>{activeFocusedData.subRoute}</span>
                <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {activeFocusedData.dispatch.dispatch_code}
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500">
                Outlets: <strong className="text-slate-800">{activeFocusedData.dispatch.delivered_outlets_count || 0} / {activeFocusedData.dispatch.total_outlets} Dropped</strong>
              </span>
              <span className="text-slate-500">
                Verified: <strong className="text-emerald-700">{activeFocusedData.dispatch.confirmed_outlets_count || 0} / {activeFocusedData.dispatch.total_outlets} Confirmed</strong>
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            {/* Step 1: Boarding */}
            <div className={`p-3 rounded-2xl border transition-all ${
              activeFocusedData.dispatch.boarded_at || activeFocusedData.status !== 'DISPATCHED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 1: Cargo Boarded</span>
                <span className="text-sm">{activeFocusedData.dispatch.boarded_at || activeFocusedData.status !== 'DISPATCHED' ? '✓' : '1'}</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeFocusedData.dispatch.boarded_at ? new Date(activeFocusedData.dispatch.boarded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Boarding'}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Verified on truck</span>
            </div>

            {/* Step 2: Transit */}
            <div className={`p-3 rounded-2xl border transition-all ${
              activeFocusedData.dispatch.ride_started_at || activeFocusedData.status === 'IN_TRANSIT' || isTestingMotion
                ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 2: Ride Started</span>
                <span className="text-sm">🚚</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeFocusedData.dispatch.ride_started_at ? new Date(activeFocusedData.dispatch.ride_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Transit'}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">En route on sub-route</span>
            </div>

            {/* Step 3: Outlets Dropped */}
            <div className={`p-3 rounded-2xl border transition-all ${
              (activeFocusedData.dispatch.delivered_outlets_count || 0) > 0
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 3: Outlets Dropped</span>
                <span className="text-sm">📦</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeFocusedData.dispatch.delivered_outlets_count || 0} / {activeFocusedData.dispatch.total_outlets} Stores
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Unloaded by driver</span>
            </div>

            {/* Step 4: Route Completed */}
            <div className={`p-3 rounded-2xl border transition-all ${
              activeFocusedData.status === 'COMPLETED' || (activeFocusedData.dispatch.confirmed_outlets_count || 0) >= activeFocusedData.dispatch.total_outlets
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Step 4: All Confirmed</span>
                <span className="text-sm">🎉</span>
              </div>
              <p className="text-[11px] font-bold">
                {activeFocusedData.dispatch.confirmed_outlets_count || 0} / {activeFocusedData.dispatch.total_outlets} Confirmed
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
