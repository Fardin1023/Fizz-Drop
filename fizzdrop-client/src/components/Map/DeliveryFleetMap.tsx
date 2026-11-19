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
  ChevronDown,
  ChevronUp,
  Minus,
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
  reallocated_to_outlet_id?: number;
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

export interface DistrictOption {
  id: number;
  name: string;
  division: string;
  asmName?: string;
  asmCode?: string;
  asmPhone?: string;
}

export interface SupplierDepotInfo {
  districtId: number;
  districtName: string;
  division: string;
  supplierId?: number;
  supplierName: string;
  tradeLicense?: string;
  depotAddress: string;
  phone: string;
  coords: [number, number];
  isPrimaryHub: boolean;
  isRegisteredSupplier: boolean;
  coveredDistricts?: string[];
  asmName?: string;
  asmCode?: string;
  asmPhone?: string;
}

interface DeliveryFleetMapProps {
  dispatches: VehicleDispatch[];
  selectedDispatchId?: number | null;
  onSelectDispatch?: (dispatch: VehicleDispatch) => void;
  height?: string;
  allowedOutlets?: any[];
  selectedDistrictId?: number | null;
  onSelectDistrict?: (districtId: number | null) => void;
  availableDistricts?: DistrictOption[];
  suppliers?: any[];
  divisionName?: string;
}

// 64 Bangladesh Districts Geo-Centroids & Depot Terminals
export const BANGLADESH_DISTRICT_DEPOTS: Record<string, { lat: number; lng: number; defaultAddress: string }> = {
  // Dhaka Division
  'Dhaka': { lat: 23.7925, lng: 90.4125, defaultAddress: 'Road 11, Plot 42, Gulshan-1 Logistics Depot, Dhaka' },
  'Gazipur': { lat: 23.9999, lng: 90.4203, defaultAddress: 'Joydebpur Commercial Logistics Terminal, Gazipur' },
  'Narayanganj': { lat: 23.6238, lng: 90.5000, defaultAddress: 'Chashara Station Road, Narayanganj Central Logistics Depot' },
  'Tangail': { lat: 24.2513, lng: 89.9167, defaultAddress: 'Victoria Road Commercial Hub, Tangail Sadar Depot' },
  'Kishoreganj': { lat: 24.4449, lng: 90.7766, defaultAddress: 'Station Road Beverage Logistics Yard, Kishoreganj' },
  'Manikganj': { lat: 23.8644, lng: 90.0047, defaultAddress: 'Dhaka-Aricha Highway Distribution Hub, Manikganj' },
  'Munshiganj': { lat: 23.5422, lng: 90.5305, defaultAddress: 'Mirkadim Port Area Supply Hub, Munshiganj' },
  'Narsingdi': { lat: 23.9193, lng: 90.7202, defaultAddress: 'Velanagar Logistics Terminal, Narsingdi' },
  'Faridpur': { lat: 23.6071, lng: 89.8429, defaultAddress: 'Goalchamot Central Beverage Depot, Faridpur' },
  'Gopalganj': { lat: 23.0051, lng: 89.8266, defaultAddress: 'Post Office Road Distribution Center, Gopalganj' },
  'Madaripur': { lat: 23.1641, lng: 90.1897, defaultAddress: 'Main Road Sadar Logistics Yard, Madaripur' },
  'Rajbari': { lat: 23.7574, lng: 89.6445, defaultAddress: 'Panbazar Regional Beverage Depot, Rajbari' },
  'Shariatpur': { lat: 23.2423, lng: 90.4348, defaultAddress: 'Palong Model Town Supply Hub, Shariatpur' },
  'Mymensingh': { lat: 24.7471, lng: 90.4203, defaultAddress: 'Maskanda Bus Stand Logistics Hub, Mymensingh' },
  'Jamalpur': { lat: 24.9375, lng: 89.9378, defaultAddress: 'Station Road Regional Beverage Depot, Jamalpur' },
  'Netrokona': { lat: 24.8709, lng: 90.7279, defaultAddress: 'Choto Bazar Beverage Distribution Yard, Netrokona' },
  'Sherpur': { lat: 25.0205, lng: 90.0153, defaultAddress: 'Noyaanikbazar Logistics Hub, Sherpur' },

  // Chittagong Division
  'Chittagong': { lat: 22.3850, lng: 91.8750, defaultAddress: 'Plot B-12, Kalurghat Heavy Industrial Area, Mohara, Chandgaon, Chattogram' },
  "Cox's Bazar": { lat: 21.4272, lng: 92.0058, defaultAddress: 'Kolatoli Road Distribution Depot, Cox\'s Bazar' },
  'Comilla': { lat: 23.4607, lng: 91.1809, defaultAddress: 'Paduar Bazar Bishwa Road Supply Hub, Comilla' },
  'Feni': { lat: 23.0186, lng: 91.3966, defaultAddress: 'Trunk Road Central Logistics Depot, Feni' },
  'Brahmanbaria': { lat: 23.9571, lng: 91.1119, defaultAddress: 'Kowtoli Road Supply Terminal, Brahmanbaria' },
  'Rangamati': { lat: 22.6533, lng: 92.1753, defaultAddress: 'Reserve Bazar Logistics Hub, Rangamati' },
  'Khagrachhari': { lat: 23.1192, lng: 91.9847, defaultAddress: 'Chengi Square Regional Depot, Khagrachhari' },
  'Bandarban': { lat: 22.1953, lng: 92.2184, defaultAddress: 'Balaghata Logistics Yard, Bandarban' },
  'Noakhali': { lat: 22.8696, lng: 91.0993, defaultAddress: 'Maijdee Court Distribution Hub, Noakhali' },
  'Chandpur': { lat: 23.2333, lng: 90.6667, defaultAddress: 'Natun Bazar Riverport Logistics Hub, Chandpur' },
  'Lakshmipur': { lat: 22.9425, lng: 90.8412, defaultAddress: 'Uttar Bazar Supply Terminal, Lakshmipur' },

  // Rajshahi Division
  'Rajshahi': { lat: 24.3745, lng: 88.6042, defaultAddress: 'Shiroil Bus Terminal Road, Rajshahi Central Hub' },
  'Bogra': { lat: 24.8465, lng: 89.3777, defaultAddress: 'Charmatha Central Bus Terminal, Bogra Hub' },
  'Pabna': { lat: 24.0064, lng: 89.2372, defaultAddress: 'Abdul Hamid Road, Pabna Logistics Yard' },
  'Sirajganj': { lat: 24.4534, lng: 89.7008, defaultAddress: 'Mujib Sarak, Sirajganj Distribution Hub' },
  'Naogaon': { lat: 24.7936, lng: 88.9318, defaultAddress: 'Baludanga Bus Stand, Naogaon Depot' },
  'Natore': { lat: 24.4206, lng: 88.9324, defaultAddress: 'Kanaikhali, Natore Regional Hub' },
  'Joypurhat': { lat: 25.0968, lng: 89.0227, defaultAddress: 'Railgate Area, Joypurhat Logistics Depot' },
  'Chapainawabganj': { lat: 24.5965, lng: 88.2775, defaultAddress: 'Shibtala, Chapainawabganj Depot' },
  'Rangpur': { lat: 25.7439, lng: 89.2752, defaultAddress: 'Modern Mor, Rangpur Central Hub' },
  'Dinajpur': { lat: 25.6217, lng: 88.6355, defaultAddress: 'Ghashipara, Dinajpur Supply Hub' },
  'Gaibandha': { lat: 25.3288, lng: 89.5430, defaultAddress: 'Circular Road, Gaibandha Depot' },
  'Kurigram': { lat: 25.8054, lng: 89.6362, defaultAddress: 'Ghoshpara, Kurigram Regional Depot' },
  'Lalmonirhat': { lat: 25.9923, lng: 89.2847, defaultAddress: 'Mission Mor, Lalmonirhat Supply Center' },
  'Nilphamari': { lat: 25.9318, lng: 88.8560, defaultAddress: 'Babri Jhar, Nilphamari Depot' },
  'Panchagarh': { lat: 26.3411, lng: 88.5542, defaultAddress: 'Dhaka-Banglabandha Hwy, Panchagarh Terminal' },
  'Thakurgaon': { lat: 26.0337, lng: 88.4617, defaultAddress: 'Old Bus Stand, Thakurgaon Depot' },

  // Khulna Division
  'Khulna': { lat: 22.8456, lng: 89.5403, defaultAddress: 'Sonadanga Central Bus Terminal, Khulna Logistics Hub' },
  'Jessore': { lat: 23.1664, lng: 89.2081, defaultAddress: 'Monihar Cinema Mor, Jessore Central Depot' },
  'Satkhira': { lat: 22.7185, lng: 89.0705, defaultAddress: 'Kalaroa Road, Satkhira Distribution Depot' },
  'Bagerhat': { lat: 22.6516, lng: 89.7859, defaultAddress: 'Shat Gombuj Road, Bagerhat Supply Hub' },
  'Kushtia': { lat: 23.9013, lng: 89.1205, defaultAddress: 'Mazampur Gate, Kushtia Regional Depot' },
  'Jhenaidah': { lat: 23.5450, lng: 89.1726, defaultAddress: 'Payra Chattar, Jhenaidah Logistics Hub' },
  'Chuadanga': { lat: 23.6402, lng: 88.8418, defaultAddress: 'Court Road, Chuadanga Supply Center' },
  'Meherpur': { lat: 23.7622, lng: 88.6318, defaultAddress: 'Hospital Road, Meherpur Depot' },
  'Magura': { lat: 23.4873, lng: 89.4199, defaultAddress: 'Vaina Mor, Magura Distribution Depot' },
  'Narail': { lat: 23.1725, lng: 89.5127, defaultAddress: 'Rupganj Bazar, Narail Logistics Yard' },

  // Barishal Division
  'Barisal': { lat: 22.7010, lng: 90.3535, defaultAddress: 'Nathullabad Bus Terminal, Barisal Central Depot' },
  'Bhola': { lat: 22.6859, lng: 90.6481, defaultAddress: 'Ukhas Road, Bhola Island Supply Hub' },
  'Jhalokathi': { lat: 22.6406, lng: 90.1987, defaultAddress: 'Palbari, Jhalokathi Logistics Yard' },
  'Pirojpur': { lat: 22.5841, lng: 89.9720, defaultAddress: 'Baleshwar Riverport Road, Pirojpur Hub' },
  'Barguna': { lat: 22.0953, lng: 90.1121, defaultAddress: 'Sadar Hospital Road, Barguna Depot' },
  'Patuakhali': { lat: 22.3596, lng: 90.3298, defaultAddress: 'Chowrasta, Patuakhali Regional Depot' },

  // Sylhet Division
  'Sylhet': { lat: 24.8949, lng: 91.8687, defaultAddress: 'Kadamtali Bus Terminal Road, Sylhet Logistics Hub' },
  'Moulvibazar': { lat: 24.4829, lng: 91.7774, defaultAddress: 'Kusumbagh, Moulvibazar Distribution Center' },
  'Habiganj': { lat: 24.3749, lng: 91.4155, defaultAddress: 'Shayestanagar, Habiganj Regional Depot' },
  'Sunamganj': { lat: 25.0658, lng: 91.3950, defaultAddress: 'Traffic Point, Sunamganj Beverage Logistics Depot' },
};

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

// Generate smooth curved road segment between two points
function buildSegmentPath(p1: [number, number], p2: [number, number], steps = 14): [number, number][] {
  const segment: [number, number][] = [];
  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const midT = Math.sin(t * Math.PI);
    const normalLat = -dLng * 0.12 * midT;
    const normalLng = dLat * 0.12 * midT;
    segment.push([p1[0] + dLat * t + normalLat, p1[1] + dLng * t + normalLng]);
  }
  return segment;
}

// Render prominent Supplier Depot marker for a district
function renderSupplierDepotMarker(
  depot: SupplierDepotInfo,
  isSelected: boolean,
  markersGroup: L.LayerGroup,
  onSelect: (id: number) => void
) {
  const depotIcon = L.divIcon({
    className: 'custom-district-depot-icon',
    html: `
      <div class="relative flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-40">
        <!-- Depot Vessel Pin -->
        <div class="relative flex items-center justify-center w-11 h-11 rounded-2xl ${
          isSelected
            ? 'bg-amber-500 border-2 border-white ring-4 ring-amber-400 shadow-2xl scale-110'
            : depot.isPrimaryHub
            ? 'bg-indigo-950 border-2 border-indigo-400 shadow-xl'
            : 'bg-slate-900 border-2 border-cyan-400 shadow-lg'
        } text-white transition-all group-hover:scale-120" style="background-color: ${
          isSelected ? '#f59e0b' : depot.isPrimaryHub ? '#1e1b4b' : '#0f172a'
        } !important; color: #ffffff !important;">
          <span class="text-lg">🏭</span>
          ${isSelected ? '<span class="absolute -inset-1.5 rounded-2xl border-2 border-amber-300 animate-ping"></span>' : ''}
        </div>

        <!-- Depot District Label Pill -->
        <div class="mt-1 flex flex-col items-center pointer-events-none">
          <div class="px-2.5 py-0.5 rounded-lg ${
            isSelected
              ? 'bg-amber-950/95 border-2 border-amber-400 text-amber-200'
              : 'bg-slate-900/95 border border-slate-700/80 text-white'
          } shadow-lg whitespace-nowrap flex items-center gap-1.5" style="background-color: ${
            isSelected ? 'rgba(69, 26, 3, 0.95)' : 'rgba(15, 23, 42, 0.95)'
          } !important; color: ${isSelected ? '#fde68a' : '#ffffff'} !important;">
            <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}"></span>
            <span class="text-[9px] font-mono font-bold tracking-tight" style="color: ${isSelected ? '#fde68a' : '#ffffff'} !important;">
              ${depot.districtName} Depot Hub
            </span>
          </div>
          <span class="text-[8px] font-sans px-1.5 py-0.2 rounded mt-0.5 border border-slate-700 shadow-2xs max-w-[170px] truncate" style="color: #f1f5f9 !important; background-color: rgba(15, 23, 42, 0.92) !important;">
            ${depot.supplierName}
          </span>
        </div>
      </div>
    `,
    iconSize: [180, 60],
    iconAnchor: [90, 22],
  });

  const marker = L.marker(depot.coords, { icon: depotIcon }).addTo(markersGroup);

  marker.on('click', () => {
    onSelect(depot.districtId);
  });

  marker.bindPopup(`
    <div class="p-3 text-xs font-sans min-w-[240px] max-w-xs" style="color: #0f172a !important;">
      <div class="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
        <span class="p-2 rounded-xl bg-indigo-100 text-indigo-700 text-lg">🏭</span>
        <div>
          <h4 class="font-bold text-slate-900 text-sm" style="color: #0f172a !important;">${depot.districtName} Supplier Depot</h4>
          <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            ${depot.isPrimaryHub ? '★ PRIMARY LOGISTICS DEPOT' : 'REGIONAL DISTRIBUTION DEPOT'}
          </span>
        </div>
      </div>
      <div class="space-y-1.5 text-slate-600 text-[11px]" style="color: #334155 !important;">
        <p><strong style="color: #0f172a !important;">Supplier:</strong> <span class="text-slate-900 font-semibold" style="color: #0f172a !important;">${depot.supplierName}</span></p>
        <p><strong style="color: #0f172a !important;">Depot Address:</strong> <span class="text-slate-700" style="color: #334155 !important;">${depot.depotAddress}</span></p>
        <p><strong style="color: #0f172a !important;">Contact Phone:</strong> <span class="font-mono text-blue-600 font-bold" style="color: #0284c7 !important;">${depot.phone}</span></p>
        ${depot.asmName ? `<p><strong style="color: #0f172a !important;">District ASM:</strong> <span class="text-emerald-700 font-bold" style="color: #047857 !important;">${depot.asmName} (${depot.asmCode || ''})</span></p>` : ''}
        <p><strong style="color: #0f172a !important;">Covered Districts:</strong> <span class="text-slate-500" style="color: #64748b !important;">${depot.coveredDistricts ? depot.coveredDistricts.join(', ') : depot.districtName}</span></p>
        <p><strong style="color: #0f172a !important;">GPS Location:</strong> <span class="font-mono text-slate-500" style="color: #64748b !important;">${depot.coords[0].toFixed(4)}° N, ${depot.coords[1].toFixed(4)}° E</span></p>
      </div>
    </div>
  `);

  if (isSelected) {
    setTimeout(() => {
      try {
        marker.openPopup();
      } catch (e) {}
    }, 350);
  }

  return marker;
}

export const DeliveryFleetMap: React.FC<DeliveryFleetMapProps> = ({
  dispatches,
  selectedDispatchId,
  onSelectDispatch,
  height = '560px',
  allowedOutlets,
  selectedDistrictId,
  onSelectDistrict,
  availableDistricts,
  suppliers,
  divisionName,
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

  // District Switcher State (switch between districts to view supplier depot location)
  const [internalDistrictId, setInternalDistrictId] = useState<number | null>(selectedDistrictId ?? null);

  // Minimize states for in-map HUD overlay sections
  const [isTopLeftMinimized, setIsTopLeftMinimized] = useState<boolean>(false);
  const [isDepotCardMinimized, setIsDepotCardMinimized] = useState<boolean>(false);

  useEffect(() => {
    if (selectedDistrictId !== undefined) {
      setInternalDistrictId(selectedDistrictId);
    }
  }, [selectedDistrictId]);

  const handleDistrictChange = (distId: number | null) => {
    setInternalDistrictId(distId);
    if (distId !== null) {
      setIsDepotCardMinimized(false);
    }
    if (onSelectDistrict) {
      onSelectDistrict(distId);
    }
  };

  // 64-District Depot Hubs resolution matching suppliers and ASMs
  const districtDepots: SupplierDepotInfo[] = useMemo(() => {
    const list: SupplierDepotInfo[] = [];

    // If districts list is provided (e.g. from RSM's ASMs)
    if (availableDistricts && availableDistricts.length > 0) {
      availableDistricts.forEach((dist) => {
        // 1. Direct primary supplier for this district
        const primarySup = (suppliers || []).find(
          (s) => s.primary_district_id === dist.id || (s.district_name && s.district_name.toLowerCase() === dist.name.toLowerCase())
        );
        // 2. Covering supplier for this district
        const coveringSup = !primarySup
          ? (suppliers || []).find((s) => {
              const cList = s.covered_district_ids_list || [];
              return cList.includes(dist.id);
            })
          : null;

        const matchedSup = primarySup || coveringSup;
        const baseGeo = BANGLADESH_DISTRICT_DEPOTS[dist.name] || {
          lat: 23.7925,
          lng: 90.4078,
          defaultAddress: `${dist.name} District Beverage Logistics Yard, Bangladesh`,
        };

        let depotCoords: [number, number] = [baseGeo.lat, baseGeo.lng];
        let depotAddress = baseGeo.defaultAddress;

        if (matchedSup) {
          depotAddress = matchedSup.depot_address || baseGeo.defaultAddress;
          if (primarySup) {
            if (dist.name === 'Dhaka') {
              depotCoords = [23.7925, 90.4125];
            } else if (dist.name === 'Chittagong') {
              depotCoords = [22.3850, 91.8750];
            }
          }
        }

        list.push({
          districtId: dist.id,
          districtName: dist.name,
          division: dist.division,
          supplierId: matchedSup?.id,
          supplierName: matchedSup ? matchedSup.business_name : `${dist.name} Regional Beverage Logistics Hub`,
          tradeLicense: matchedSup?.trade_license_number || `REG-${dist.name.toUpperCase().slice(0, 3)}-2026`,
          depotAddress,
          phone: matchedSup?.phone_number || dist.asmPhone || '+8801700000000',
          coords: depotCoords,
          isPrimaryHub: !!primarySup,
          isRegisteredSupplier: !!matchedSup,
          coveredDistricts: matchedSup?.assigned_districts
            ? matchedSup.assigned_districts.map((d: any) => d.name || d)
            : [dist.name],
          asmName: dist.asmName,
          asmCode: dist.asmCode,
          asmPhone: dist.asmPhone,
        });
      });
      return list;
    }

    // Fallback if only suppliers are passed
    if (suppliers && suppliers.length > 0) {
      suppliers.forEach((s) => {
        const geo = BANGLADESH_DISTRICT_DEPOTS[s.district_name] || {
          lat: 23.7925,
          lng: 90.4125,
          defaultAddress: s.depot_address || 'Central Logistics Depot Hub',
        };
        list.push({
          districtId: s.primary_district_id || 1,
          districtName: s.district_name || 'Central District',
          division: s.division_name || 'Dhaka',
          supplierId: s.id,
          supplierName: s.business_name,
          tradeLicense: s.trade_license_number,
          depotAddress: s.depot_address || geo.defaultAddress,
          phone: s.phone_number || 'N/A',
          coords: [geo.lat, geo.lng],
          isPrimaryHub: true,
          isRegisteredSupplier: true,
          coveredDistricts: (s.assigned_districts || []).map((d: any) => d.name || d),
        });
      });
    }

    return list;
  }, [availableDistricts, suppliers]);

  const selectedDepot = useMemo(() => {
    if (!internalDistrictId) return null;
    return districtDepots.find((d) => d.districtId === internalDistrictId) || null;
  }, [internalDistrictId, districtDepots]);

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

  // Registered outlets fetched from server
  const [registeredOutlets, setRegisteredOutlets] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8080/api/outlets')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRegisteredOutlets(data);
        }
      })
      .catch(() => {});
  }, []);

  // Check if any dispatches are currently active on route (IN_TRANSIT, BOARDED, or DISPATCHED)
  const hasActiveOrders = useMemo(() => {
    return dispatches.some(
      (d) => d.status === 'IN_TRANSIT' || d.status === 'BOARDED' || d.status === 'DISPATCHED' || d.status === 'DELIVERING'
    );
  }, [dispatches]);

  // Outlets to display when orders are completed or in standby
  const outletsToDisplay = useMemo(() => {
    if (allowedOutlets && allowedOutlets.length > 0) {
      return allowedOutlets;
    }
    if (registeredOutlets.length > 0) {
      return registeredOutlets;
    }
    const list: any[] = [];
    const seen = new Set<number>();
    dispatches.forEach((d) => {
      (d.items || []).forEach((it) => {
        if (it.outlet_id && !seen.has(it.outlet_id)) {
          seen.add(it.outlet_id);
          list.push({
            id: it.outlet_id,
            outlet_name: it.outlet_name,
            branch_name: (it as any).branch_name,
            location_address: it.outlet_address || (it as any).location_address,
            sub_route: d.sub_route,
          });
        }
      });
    });
    return list;
  }, [registeredOutlets, dispatches]);

  // 1. Group dispatches so all distinct active vehicles appear on the single map
  const activeVehicles = useMemo(() => {
    if (!hasActiveOrders) {
      return [];
    }

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
      // Only include vehicles that are currently active on route
      if (disp.status === 'IN_TRANSIT' || disp.status === 'BOARDED' || disp.status === 'DISPATCHED' || disp.status === 'DELIVERING') {
        const key = disp.vehicle_registration_no || `TRIP-${disp.id}`;
        if (!map.has(key)) {
          map.set(key, disp);
        }
      }
    });

    return Array.from(map.values());
  }, [dispatches, hasActiveOrders]);

  // Build merged routes data for each active vehicle
  const mergedVehiclesData = useMemo(() => {
    let globalStopIndex = 1;

    return activeVehicles.map((disp, vIdx) => {
      const color = VEHICLE_THEMES[vIdx % VEHICLE_THEMES.length];
      const depotCoords = resolveDepotCoordinates(disp.sub_route, vIdx);

      // Group unique outlets
      const uniqueOutlets: {
        outlet_id: number;
        outlet_name: string;
        items: DispatchItem[];
        status: string;
        isCancelled: boolean;
        isRedirected: boolean;
        isOfferAccepted: boolean;
        isOfferPending: boolean;
        reallocatedToOutletId?: number;
      }[] = [];
      const seen = new Set<number>();

      (disp.items || []).forEach((item) => {
        if (!seen.has(item.outlet_id)) {
          seen.add(item.outlet_id);
          const outletItems = (disp.items || []).filter((i) => i.outlet_id === item.outlet_id);
          const isCancelled = outletItems.every((i) => i.stop_status === 'CANCELLED' || (i as any).is_cancelled);
          const isOfferDenied = outletItems.every((i) => i.stop_status === 'OFFER_DENIED' || (i as any).offer_status === 'DENIED');
          const isOfferPending = outletItems.some((i) => i.stop_status === 'OFFER_PENDING' || (i as any).offer_status === 'PENDING');
          const isOfferAccepted = outletItems.some((i) => (i as any).offer_status === 'ACCEPTED');
          const isConfirmed = outletItems.every((i) => i.stop_status === 'CONFIRMED_BY_OUTLET');
          const isDelivered = outletItems.every((i) => i.stop_status === 'DELIVERED_BY_DRIVER' || i.stop_status === 'CONFIRMED_BY_OUTLET');
          const isRedirected = outletItems.some((i) => (i as any).is_offered_stock || (i as any).urgency === 'DIRECT_SUPPLY' || (i as any).offer_status === 'ACCEPTED');
          const reallocatedToOutletId = outletItems.find((i) => (i as any).reallocated_to_outlet_id)?.reallocated_to_outlet_id;

          let status = 'PENDING';
          if (isCancelled) status = 'CANCELLED';
          else if (isOfferDenied) status = 'DENIED';
          else if (isConfirmed) status = 'CONFIRMED';
          else if (isDelivered) status = 'DELIVERED';
          else if (isOfferPending) status = 'OFFER_PENDING';
          else if (isOfferAccepted) status = 'OFFER_ACCEPTED';

          uniqueOutlets.push({
            outlet_id: item.outlet_id,
            outlet_name: item.outlet_name,
            items: outletItems,
            status,
            isCancelled,
            isRedirected,
            isOfferAccepted,
            isOfferPending,
            reallocatedToOutletId,
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
        isCancelled?: boolean;
        isRedirected?: boolean;
        isOfferAccepted?: boolean;
        isOfferPending?: boolean;
        reallocatedToOutletId?: number;
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
          isCancelled: out.isCancelled,
          isRedirected: out.isRedirected,
          isOfferAccepted: out.isOfferAccepted,
          isOfferPending: out.isOfferPending,
          reallocatedToOutletId: out.reallocatedToOutletId,
        });
      });

      const rawCoords = waypoints.map((w) => w.coords);
      
      // Animated vehicle movement path: navigate to active non-cancelled destinations
      const activeWaypointCoords = waypoints
        .filter((w) => w.type === 'DEPOT' || !w.isCancelled)
        .map((w) => w.coords);

      const flightPath = buildFlightPath(
        activeWaypointCoords.length > 1 ? activeWaypointCoords : rawCoords,
        12
      );

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
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    truckMarkersMapRef.current.forEach((marker) => {
      try {
        map.removeLayer(marker);
      } catch (e) {}
    });
    truckMarkersMapRef.current.clear();

    // =========================================================================
    // WHEN ORDERS ARE COMPLETED: Clear map routes, display ONLY Depot & Outlets
    // =========================================================================
    if (!hasActiveOrders) {
      const allCoords: [number, number][] = [];

      // 1. Draw District Supplier Depots (every district in the region has its depot hub)
      if (districtDepots.length > 0) {
        districtDepots.forEach((depot) => {
          allCoords.push(depot.coords);
          renderSupplierDepotMarker(
            depot,
            internalDistrictId === depot.districtId,
            markersGroup,
            handleDistrictChange
          );
        });
      } else {
        // Fallback default Central Depot Hub Marker
        const depotCoord = resolveDepotCoordinates('Central Sub-Route', 0);
        allCoords.push(depotCoord);
        const depotIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-950 border-2 border-indigo-400 shadow-xl text-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110" style="background-color: #1e1b4b !important; color: #ffffff !important;">
              <svg class="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <span class="absolute -bottom-5 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-700 whitespace-nowrap shadow-xs" style="background-color: #1e1b4b !important; color: #c7d2fe !important;">
                Central Depot Hub
              </span>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const depotMarker = L.marker(depotCoord, { icon: depotIcon }).addTo(markersGroup);
        depotMarker.bindPopup(`
          <div class="p-2.5 text-xs font-sans">
            <h4 class="font-bold text-indigo-900 text-sm">🏭 Central Logistics Depot Hub</h4>
            <p class="text-slate-600 mt-1">Fleet base and central beverage supply terminal.</p>
            <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              ✓ All Orders Completed • Fleet at Depot
            </span>
          </div>
        `);
      }

      // 2. Draw Registered Outlets
      outletsToDisplay.forEach((outlet, idx) => {
        const outletId = outlet.id || outlet.outlet_id || (idx + 1);
        const subRoute = outlet.sub_route || 'Gulshan Sub-Route';
        const coords = getOutletCoordinates(outletId, idx, subRoute, 0);
        allCoords.push(coords);

        const cleanName = (outlet.outlet_name || outlet.name || 'Retail Store')
          .replace(/[ÔÇöâ€”?]/g, ' - ')
          .replace(/\s+-\s+/g, ' — ')
          .trim();

        const outletIcon = L.divIcon({
          className: 'custom-outlet-icon',
          html: `
            <div class="relative flex flex-col items-center transform -translate-x-1/2 -translate-y-[14px] cursor-pointer group">
              <!-- Outlet Circle Pin -->
              <div class="relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-lg text-xs text-white transition-transform group-hover:scale-115" style="background-color: #0f172a !important; color: #ffffff !important;">
                🏪
              </div>

              <!-- Outlet Name Pill -->
              <div class="mt-1 flex flex-col items-center z-20 pointer-events-none">
                <div class="px-2 py-0.5 rounded-lg bg-slate-900/95 text-white shadow-md border border-slate-700/80 whitespace-nowrap flex items-center gap-1 max-w-[210px]" style="background-color: rgba(15, 23, 42, 0.95) !important; color: #ffffff !important;">
                  <span class="text-[9px] font-bold tracking-tight text-white truncate max-w-[170px]" style="color: #ffffff !important;" title="${cleanName}">
                    ${cleanName}
                  </span>
                </div>
                ${
                  outlet.branch_name
                    ? `<span class="text-[8px] font-mono font-medium px-1.5 py-0.2 rounded mt-0.5 border border-slate-700 shadow-2xs" style="color: #f1f5f9 !important; background-color: rgba(15, 23, 42, 0.90) !important;">
                        ${outlet.branch_name}
                      </span>`
                    : ''
                }
              </div>
            </div>
          `,
          iconSize: [210, 56],
          iconAnchor: [105, 14],
        });

        const marker = L.marker(coords, { icon: outletIcon }).addTo(markersGroup);
        marker.bindPopup(`
          <div class="p-2.5 text-xs font-sans max-w-xs">
            <h4 class="font-bold text-slate-900 text-sm">🏪 ${cleanName}</h4>
            <p class="text-slate-600 mt-1">${outlet.location_address || 'Registered Retail Outlet'}</p>
            <p class="text-slate-500 font-mono text-[11px] mt-0.5">Sub-Route: <strong>${subRoute}</strong></p>
            <span class="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Retail Store • Standing By
            </span>
          </div>
        `);
      });

      // Auto-fit map to show selected depot or all depots & outlets
      try {
        if (internalDistrictId) {
          const matchDepot = districtDepots.find((d) => d.districtId === internalDistrictId);
          if (matchDepot) {
            map.flyTo(matchDepot.coords, 14, { animate: true, duration: 1.0 });
            return;
          }
        }
        if (allCoords.length > 0) {
          map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 15 });
        }
      } catch (e) {}

      return;
    }

    if (mergedVehiclesData.length === 0) return;

    const allRouteCoordinates: [number, number][] = [];

    // Draw district supplier depots if available
    if (districtDepots.length > 0) {
      districtDepots.forEach((depot) => {
        allRouteCoordinates.push(depot.coords);
        renderSupplierDepotMarker(
          depot,
          internalDistrictId === depot.districtId,
          markersGroup,
          handleDistrictChange
        );
      });
    }

    mergedVehiclesData.forEach((v) => {
      const isFocused = focusedVehicleReg === v.regNo;
      const isFaded = focusedVehicleReg !== null && !isFocused;

      v.rawCoords.forEach((c) => allRouteCoordinates.push(c));

      // 1. Draw Routes (Red for cancelled outlets, Green with direction for redirected outlets, Green for active routes)
      const cancelledStops = v.waypoints.filter((w) => w.type === 'OUTLET' && w.isCancelled);
      const redirectedStops = v.waypoints.filter((w) => w.type === 'OUTLET' && (w.isRedirected || w.isOfferAccepted));
      const hasCancelledOrRedirected = cancelledStops.length > 0 || redirectedStops.length > 0;

      if (hasCancelledOrRedirected) {
        // A. Draw RED polyline to cancelled outlet:
        // "on the map when a outlet cancels an order then the route color of the vehicle to the outlet turns red"
        cancelledStops.forEach((cStop) => {
          const cancelledPath = buildSegmentPath(v.depotCoords, cStop.coords, 14);
          L.polyline(cancelledPath, {
            color: '#ef4444',
            weight: isFocused ? 6 : 5,
            opacity: isFaded ? 0.6 : 0.95,
            dashArray: '8, 8',
          }).addTo(markersGroup);

          // Midpoint cancellation pill
          const midC = Math.floor(cancelledPath.length / 2);
          const cancelIcon = L.divIcon({
            className: 'custom-cancel-pill',
            html: `
              <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <span class="px-2 py-0.5 rounded-full bg-rose-950/95 text-rose-300 font-mono text-[9px] font-bold border border-rose-500 shadow-md flex items-center gap-1 whitespace-nowrap">
                  <span>❌ Cancelled Route</span>
                </span>
              </div>
            `,
            iconSize: [120, 24],
            iconAnchor: [60, 12],
          });
          L.marker(cancelledPath[midC], { icon: cancelIcon }).addTo(markersGroup);
        });

        // B. Draw GREEN polyline with directional arrows to redirected outlet:
        // "and when that same stock is redirected to another outlet then the route direction to that outlet will be green"
        redirectedStops.forEach((rStop) => {
          const originCoord = cancelledStops.length > 0 ? cancelledStops[0].coords : v.depotCoords;
          const redirectedPath = buildSegmentPath(originCoord, rStop.coords, 16);
          L.polyline(redirectedPath, {
            color: '#10b981',
            weight: isFocused ? 7 : 6,
            opacity: 1.0,
            dashArray: (v.status === 'IN_TRANSIT' && isTestingMotion) ? '6, 8' : undefined,
          }).addTo(markersGroup);

          // Green direction arrows along the redirected path pointing towards the redirected outlet
          [Math.floor(redirectedPath.length * 0.35), Math.floor(redirectedPath.length * 0.65)].forEach((posIdx) => {
            const p1 = redirectedPath[Math.max(0, posIdx - 1)];
            const p2 = redirectedPath[Math.min(redirectedPath.length - 1, posIdx + 1)];
            const dLat = p2[0] - p1[0];
            const dLng = p2[1] - p1[1];
            const angleDeg = (Math.atan2(dLng, dLat) * (180 / Math.PI) + 360) % 360;

            const arrowIcon = L.divIcon({
              className: 'custom-direction-arrow',
              html: `
                <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div class="w-6 h-6 rounded-full bg-emerald-600/95 border-2 border-emerald-300 shadow-md flex items-center justify-center text-white">
                    <svg style="transform: rotate(${angleDeg}deg); width: 14px; height: 14px;" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                    </svg>
                  </div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });
            L.marker(redirectedPath[posIdx], { icon: arrowIcon }).addTo(markersGroup);
          });

          // Midpoint redirected stock badge
          const midR = Math.floor(redirectedPath.length / 2);
          const redirectBadgeIcon = L.divIcon({
            className: 'custom-redirect-pill',
            html: `
              <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-black border border-emerald-300 shadow-lg flex items-center gap-1 whitespace-nowrap animate-pulse">
                  <span>⚡ Redirected Stock Route ➔</span>
                </span>
              </div>
            `,
            iconSize: [160, 24],
            iconAnchor: [80, 12],
          });
          L.marker(redirectedPath[midR], { icon: redirectBadgeIcon }).addTo(markersGroup);
        });

        // C. Standard green polyline for other active normal stops
        const normalActiveStops = v.waypoints.filter((w) => w.type === 'OUTLET' && !w.isCancelled && !w.isRedirected && !w.isOfferAccepted);
        normalActiveStops.forEach((nStop) => {
          const normalPath = buildSegmentPath(v.depotCoords, nStop.coords, 12);
          L.polyline(normalPath, {
            color: '#10b981',
            weight: isFocused ? 6 : 5,
            opacity: isFaded ? 0.6 : 0.9,
            dashArray: (v.status === 'IN_TRANSIT' && isTestingMotion) ? '6, 8' : undefined,
          }).addTo(markersGroup);
        });
      } else {
        // Default route polyline (Green)
        L.polyline(v.flightPath, {
          color: v.color.line,
          weight: isFocused ? 6 : 5,
          opacity: isFaded ? 0.6 : 0.9,
          dashArray: (v.status === 'IN_TRANSIT' && isTestingMotion) ? '6, 8' : undefined,
        }).addTo(markersGroup);
      }

      // Depot Hub Marker
      const depot = v.waypoints[0];
      const depotIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-indigo-950 border-2 ${v.color.border} shadow-xl text-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-115" style="background-color: #1e1b4b !important; color: #ffffff !important;">
            <svg class="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span class="absolute -bottom-5 font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-700 whitespace-nowrap shadow-xs" style="background-color: #1e1b4b !important; color: #c7d2fe !important;">
              ${v.regNo} Hub
            </span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const depotMarker = L.marker(depot.coords, { icon: depotIcon }).addTo(markersGroup);
      depotMarker.bindPopup(`
        <div class="p-2.5 text-xs font-sans" style="color: #0f172a !important;">
          <h4 class="font-bold text-indigo-900 text-sm" style="color: #1e1b4b !important;">🏭 Depot Hub (${v.teamName})</h4>
          <p class="text-slate-600 mt-1" style="color: #334155 !important;">Departure depot for subroute: <strong>${v.subRoute}</strong></p>
          <p class="text-slate-500 font-mono text-[11px] mt-0.5" style="color: #64748b !important;">Assigned Vehicle: <strong style="color: #0f172a !important;">${v.regNo}</strong> (${v.driver})</p>
        </div>
      `);

      // Outlet Checkpoints
      v.waypoints.slice(1).forEach((stop) => {
        const isConfirmed = stop.status === 'CONFIRMED';
        const isDelivered = stop.status === 'DELIVERED';
        const isCancelled = stop.isCancelled;
        const isRedirected = stop.isRedirected || stop.isOfferAccepted;

        const pinBg = isCancelled
          ? 'bg-rose-600'
          : isRedirected
          ? 'bg-emerald-600 ring-2 ring-emerald-300'
          : isConfirmed
          ? 'bg-emerald-600'
          : isDelivered
          ? 'bg-cyan-600'
          : v.color.bg;

        const pinText = isCancelled ? '✕' : isConfirmed ? '✓' : isRedirected ? '⚡' : stop.stopNumber;

        const stopIcon = L.divIcon({
          className: 'custom-outlet-icon',
          html: `
            <div class="relative flex flex-col items-center transform -translate-x-1/2 -translate-y-[14px] cursor-pointer group">
              <!-- Stop Circle Pin -->
              <div class="relative z-10 flex items-center justify-center w-7 h-7 rounded-full ${pinBg} border-2 border-white shadow-lg font-black text-xs text-white transition-transform group-hover:scale-115" style="color: #ffffff !important;">
                ${pinText}
              </div>

              <!-- Outlet Name & Stop Pill -->
              <div class="mt-1 flex flex-col items-center z-20 pointer-events-none">
                <div class="px-2 py-0.5 rounded-lg ${
                  isCancelled
                    ? 'bg-rose-950/95 border-rose-600'
                    : isRedirected
                    ? 'bg-emerald-950/95 border-emerald-500'
                    : 'bg-slate-900/95 border-slate-700/80'
                } text-white shadow-md border whitespace-nowrap flex items-center gap-1 max-w-[210px]" style="background-color: ${
                  isCancelled ? 'rgba(76, 5, 25, 0.95)' : isRedirected ? 'rgba(6, 78, 59, 0.95)' : 'rgba(15, 23, 42, 0.95)'
                } !important; color: #ffffff !important;">
                  <span class="text-[10px]">${isCancelled ? '❌' : isRedirected ? '⚡' : '🏪'}</span>
                  <span class="text-[9px] font-bold tracking-tight text-white truncate max-w-[170px]" style="color: #ffffff !important;" title="${stop.name}">
                    ${stop.name}
                  </span>
                </div>
                <span class="text-[8px] font-mono font-semibold px-1.5 py-0.2 rounded mt-0.5 border shadow-2xs" style="color: ${
                  isCancelled ? '#fecdd3' : isRedirected ? '#a7f3d0' : '#f1f5f9'
                } !important; background-color: rgba(15, 23, 42, 0.92) !important;">
                  ${
                    isCancelled
                      ? `⛔ Cancelled • Stop #${stop.stopNumber} (Skipped)`
                      : isRedirected
                      ? `⚡ Redirected Stock Accepted • Stop #${stop.stopNumber}`
                      : `Stop #${stop.stopNumber} (${v.regNo})`
                  }
                </span>
              </div>
            </div>
          `,
          iconSize: [210, 56],
          iconAnchor: [105, 14],
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
      const isMoving = v.status === 'IN_TRANSIT' && isTestingMotion;

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

    // Auto-fit all routes onto single unified map view or fly to selected district depot
    if (internalDistrictId) {
      const matchDepot = districtDepots.find((d) => d.districtId === internalDistrictId);
      if (matchDepot) {
        map.flyTo(matchDepot.coords, 14, { animate: true, duration: 1.0 });
        return;
      }
    }
    if (allRouteCoordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(allRouteCoordinates);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch (e) {}
    }
  }, [mergedVehiclesData, focusedVehicleReg, isTestingMotion, internalDistrictId, districtDepots]);

  // 3. Live Fluid Movement Engine Along Real Street Waypoints
  useEffect(() => {
    if (!hasActiveOrders) return;
    const interval = setInterval(() => {
      mergedVehiclesData.forEach((v) => {
        const isMoving = v.status === 'IN_TRANSIT' && isTestingMotion;
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
          const redirected = v.waypoints.find((w, i) => i > 0 && (w.isRedirected || w.isOfferAccepted) && w.status !== 'CONFIRMED');
          const nextActive = redirected || v.waypoints.find((w, i) => i > 0 && w.status !== 'CONFIRMED' && !w.isCancelled);
          const nextStopName = nextActive ? (nextActive.isRedirected ? `${nextActive.name} (Redirected Stock)` : nextActive.name) : (v.waypoints[1]?.name || 'Depot Hub');
          setFocusedTelemetry({
            speed: motion.speed,
            nextStopName,
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
  }, [mergedVehiclesData, focusedVehicleReg, isTestingMotion, hasActiveOrders]);

  // Telemetry HUD reset when orders are completed
  useEffect(() => {
    if (!hasActiveOrders) {
      setFocusedTelemetry({
        speed: 0,
        nextStopName: 'All Orders Completed (Fleet at Depot)',
        subRoute: 'Central Depot Base',
        driver: 'Fleet Stationary',
        phone: 'N/A',
        cases: 0,
        status: 'COMPLETED',
        regNo: 'Central Fleet',
        coords: [23.7925, 90.4078],
      });
    }
  }, [hasActiveOrders]);

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
    if (!mapInstanceRef.current) return;
    if (!hasActiveOrders) {
      const depotCoord = resolveDepotCoordinates('Central Sub-Route', 0);
      const allCoords: [number, number][] = [depotCoord];
      outletsToDisplay.forEach((outlet, idx) => {
        const outletId = outlet.id || outlet.outlet_id || (idx + 1);
        allCoords.push(getOutletCoordinates(outletId, idx, outlet.sub_route || 'Gulshan Sub-Route', 0));
      });
      if (allCoords.length > 0) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], animate: true });
      }
      return;
    }
    if (mergedVehiclesData.length === 0) return;
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
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1 ${
                hasActiveOrders
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${hasActiveOrders ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                {hasActiveOrders ? 'LIVE GPS SYNC' : 'ORDERS COMPLETED • DEPOT & OUTLETS VIEW'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {hasActiveOrders
                ? 'Real-time route telemetry and checkpoint progression along sub-routes powered by OpenStreetMap API.'
                : 'All delivery orders are completed. Delivery routes cleared; displaying central depot hub and retail outlet locations.'}
            </p>
          </div>
        </div>

        {/* Multi-Vehicle Merged Fleet Selector Tabs & District Depot Switcher */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {/* District Depot Switcher Dropdown */}
          {availableDistricts && availableDistricts.length > 0 && (
            <div className="relative">
              <select
                value={internalDistrictId ?? ''}
                onChange={(e) => handleDistrictChange(e.target.value ? Number(e.target.value) : null)}
                className="bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs font-bold rounded-xl px-3 py-1.5 pr-7 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer appearance-none shadow-xs"
              >
                <option value="">🏢 Switch District Depot: All ({availableDistricts.length} Districts)</option>
                {availableDistricts.map((d) => {
                  const match = districtDepots.find((dp) => dp.districtId === d.id);
                  return (
                    <option key={d.id} value={d.id}>
                      📍 {d.name} — {match ? match.supplierName.slice(0, 24) : `${d.name} Depot`}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {!hasActiveOrders ? (
            <button
              type="button"
              onClick={handleFitAllFleet}
              className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 whitespace-nowrap bg-slate-900 text-white shadow-sm ring-2 ring-slate-700 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Depot Hubs & Outlets ({outletsToDisplay.length})</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>
          ) : (
            <>
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
                const isMoving = v.status === 'IN_TRANSIT' && isTestingMotion;
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
            </>
          )}
        </div>
      </div>

      {/* 2. SINGLE UNIFIED MAP CONTAINER WRAPPER WITH HUD OVERLAYS */}
      <div className="fizz-fleet-map-container relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100" style={{ height }}>
        {/* Leaflet Map DOM Root */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* HUD Top Left: Active Vehicle or Merged Fleet Telemetry Card */}
        {isTopLeftMinimized ? (
          <button
            type="button"
            onClick={() => setIsTopLeftMinimized(false)}
            className="map-telemetry-hud-minimized absolute top-4 left-4 z-10 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl flex items-center gap-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all cursor-pointer pointer-events-auto active:scale-95 group"
            title="Expand Section"
          >
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs">
              {!hasActiveOrders ? '🏭' : activeFocusedData ? '🚚' : '🌐'}
            </span>
            <span className="font-bold text-slate-900 text-[11px]">
              {!hasActiveOrders
                ? `Depot & Outlets Standby (${outletsToDisplay.length})`
                : activeFocusedData
                ? `${activeFocusedData.regNo} (${activeFocusedData.status === 'IN_TRANSIT' || isTestingMotion ? 'IN_TRANSIT' : activeFocusedData.status})`
                : `Merged Fleet (${mergedVehiclesData.length})`}
            </span>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 group-hover:bg-blue-100">
              <ChevronDown className="w-3 h-3" />
              <span>Expand</span>
            </span>
          </button>
        ) : (
          <div className="map-telemetry-hud-card absolute top-4 left-4 z-10 max-w-xs sm:max-w-sm p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl space-y-2 pointer-events-auto">
            {!hasActiveOrders ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-indigo-900 text-white font-black text-sm" style={{ backgroundColor: '#1e1b4b', color: '#ffffff' }}>🏭</span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 tracking-tight leading-none" style={{ color: '#0f172a' }}>
                        Depot & Outlets Standby
                      </h4>
                      <span className="text-[10px] font-semibold" style={{ color: '#64748b' }}>Central Logistics Depot</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border" style={{ backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }}>
                      Orders Completed
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTopLeftMinimized(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Minimize section"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-[11px]" style={{ color: '#475569' }}>
                    All beverage delivery orders are currently completed. Vehicles are resting at the central depot.
                  </p>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100">
                    <span className="font-medium" style={{ color: '#64748b' }}>Retail Outlets:</span>
                    <strong className="font-bold" style={{ color: '#0f172a' }}>{outletsToDisplay.length} Registered Outlets</strong>
                  </div>
                </div>
              </div>
            ) : activeFocusedData ? (
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
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                      activeFocusedData.status === 'IN_TRANSIT' || isTestingMotion
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {activeFocusedData.status === 'IN_TRANSIT' || isTestingMotion ? 'IN_TRANSIT' : activeFocusedData.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTopLeftMinimized(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Minimize section"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono bg-emerald-600 text-white">
                      ALL ONLINE
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTopLeftMinimized(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Minimize section"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
        )}

        {/* HUD Top Right Overlay: Selected District Supplier Depot Card */}
        {selectedDepot && (
          isDepotCardMinimized ? (
            <div className="map-district-depot-hud-minimized absolute top-4 right-16 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-md border border-amber-500/70 shadow-2xl pointer-events-auto" style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)', borderColor: 'rgba(245, 158, 11, 0.7)', color: '#ffffff' }}>
              <button
                type="button"
                onClick={() => setIsDepotCardMinimized(false)}
                className="flex items-center gap-2 px-2.5 py-1 text-xs font-bold hover:text-amber-300 transition cursor-pointer group"
                style={{ color: '#ffffff' }}
                title="Expand District Depot Details"
              >
                <span className="text-amber-400 text-sm" style={{ color: '#fbbf24' }}>🏭</span>
                <span className="font-mono text-xs font-bold" style={{ color: '#fcd34d' }}>
                  {selectedDepot.districtName} Depot
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 group-hover:bg-amber-500/30" style={{ color: '#fcd34d', backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                  <ChevronDown className="w-3 h-3" />
                  <span>Expand</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDistrictChange(null)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                style={{ backgroundColor: '#1e293b', color: '#cbd5e1' }}
                title="Reset to All Districts"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="map-district-depot-hud-card absolute top-4 right-16 z-20 max-w-xs sm:max-w-sm p-3.5 rounded-2xl backdrop-blur-md border border-amber-500/70 shadow-2xl space-y-2 pointer-events-auto" style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)', borderColor: 'rgba(245, 158, 11, 0.7)', color: '#ffffff' }}>
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm" style={{ backgroundColor: '#f59e0b', color: '#020617' }}>🏭</span>
                  <div>
                    <h4 className="font-black text-sm tracking-tight leading-none flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                      <span>{selectedDepot.districtName} District Depot</span>
                    </h4>
                    <span className="text-[10px] font-mono font-bold" style={{ color: '#fcd34d' }}>
                      {selectedDepot.isPrimaryHub ? '★ PRIMARY LOGISTICS HUB' : 'REGIONAL TRANSIT HUB'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsDepotCardMinimized(true)}
                    className="p-1 rounded-lg transition cursor-pointer"
                    style={{ color: '#94a3b8' }}
                    title="Minimize section"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistrictChange(null)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition cursor-pointer"
                    style={{ backgroundColor: '#1e293b', color: '#cbd5e1' }}
                    title="Reset to All Districts"
                  >
                    ✕ Reset
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] block uppercase font-bold" style={{ color: '#94a3b8' }}>Operating Supplier</span>
                  <strong className="text-xs font-bold" style={{ color: '#ffffff' }}>{selectedDepot.supplierName}</strong>
                </div>
                <div>
                  <span className="text-[10px] block uppercase font-bold" style={{ color: '#94a3b8' }}>Physical Depot Address</span>
                  <span className="text-[11px] leading-tight block" style={{ color: '#cbd5e1' }}>{selectedDepot.depotAddress}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase block font-bold" style={{ color: '#94a3b8' }}>Contact Phone</span>
                    <span className="font-mono font-bold" style={{ color: '#22d3ee' }}>{selectedDepot.phone}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase block font-bold" style={{ color: '#94a3b8' }}>District ASM</span>
                    <span className="truncate block font-bold" style={{ color: '#34d399' }} title={selectedDepot.asmName || 'N/A'}>
                      {selectedDepot.asmName || 'Assigned ASM'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-[9px] font-mono" style={{ color: '#94a3b8' }}>
                  GPS: {selectedDepot.coords[0].toFixed(3)}° N, {selectedDepot.coords[1].toFixed(3)}° E
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(selectedDepot.coords, 15, { animate: true, duration: 1.0 });
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl font-black text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs"
                  style={{ backgroundColor: '#f59e0b', color: '#020617' }}
                >
                  <Navigation className="w-3 h-3" />
                  <span>Focus Depot</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* HUD Top Right: Action Buttons & Testing Motion Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
          {/* Test Motion Simulation Toggle (Only active when dispatches are in transit) */}
          {hasActiveOrders && (
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
          )}

          {hasActiveOrders && (
            <button
              type="button"
              onClick={handleRecenterFocused}
              className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200/90 shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Recenter on Focused Delivery Truck"
            >
              <Compass className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Center Truck</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFitAllFleet}
            className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200/90 shadow-lg transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title={hasActiveOrders ? "Fit Entire Fleet on Screen" : "Fit Depot and Outlets"}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">{hasActiveOrders ? "Fit Route" : "Fit Outlets"}</span>
          </button>
        </div>

        {/* HUD Bottom Left: OpenStreetMap Map Legend with Multi-Vehicle Color Keys */}
        <div className="absolute bottom-4 left-4 z-10 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-lg text-[10px] font-sans flex flex-wrap items-center gap-3 text-slate-700 pointer-events-auto max-w-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-900 border border-white inline-block" />
            <span className="font-bold">Depot Hub</span>
          </div>
          {!hasActiveOrders ? (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-900 border border-cyan-400 inline-block text-[8px] flex items-center justify-center">🏪</span>
              <span className="font-bold">Retail Outlets</span>
            </div>
          ) : (
            <>
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
            </>
          )}
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
