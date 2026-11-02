// High-resolution SVG vector illustrations for official merchandise products

export const JACKET_PRESET_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="jktGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="stripeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="jktShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Background glow -->
  <circle cx="200" cy="200" r="160" fill="#3b82f6" opacity="0.08"/>
  <g filter="url(#jktShadow)">
    <!-- Collar -->
    <path d="M140 100 Q200 130 260 100 L240 70 Q200 85 160 70 Z" fill="#334155"/>
    <!-- Left Sleeve -->
    <path d="M140 100 L70 210 Q60 225 75 235 L105 215 L145 155 Z" fill="#1e293b"/>
    <!-- Right Sleeve -->
    <path d="M260 100 L330 210 Q340 225 325 235 L295 215 L255 155 Z" fill="#1e293b"/>
    <!-- Sleeve Stripes -->
    <path d="M85 185 L125 150 L130 160 L92 195 Z" fill="url(#stripeGrad)"/>
    <path d="M315 185 L275 150 L270 160 L308 195 Z" fill="url(#stripeGrad)"/>
    <!-- Main Body -->
    <path d="M140 100 L260 100 L270 310 Q200 320 130 310 Z" fill="url(#jktGrad)"/>
    <!-- Waistband & Cuffs -->
    <rect x="130" y="300" width="140" height="18" rx="4" fill="#334155"/>
    <rect x="68" y="222" width="38" height="14" rx="3" transform="rotate(-30 75 225)" fill="#334155"/>
    <rect x="294" y="222" width="38" height="14" rx="3" transform="rotate(30 325 225)" fill="#334155"/>
    <!-- Front Zipper Line -->
    <line x1="200" y1="100" x2="200" y2="300" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4,2"/>
    <rect x="197" y="140" width="6" height="12" rx="2" fill="#e2e8f0"/>
    <!-- Chest Crest -->
    <circle cx="170" cy="155" r="14" fill="#2563eb" opacity="0.9"/>
    <polygon points="170,147 174,159 164,152 176,152 166,159" fill="#ffffff"/>
    <!-- Pockets -->
    <line x1="150" y1="240" x2="180" y2="255" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
    <line x1="250" y1="240" x2="220" y2="255" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>
`)}`;

export const HELMET_PRESET_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="hlmShell" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="40%" stop-color="#0369a1"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>
      <stop offset="30%" stop-color="#1e293b" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="stripeDecal" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ef4444"/>
    </linearGradient>
    <filter id="hlmShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-opacity="0.35"/>
    </filter>
  </defs>
  <circle cx="200" cy="200" r="160" fill="#0ea5e9" opacity="0.08"/>
  <g filter="url(#hlmShadow)">
    <!-- Outer Aerodynamic Helmet Shell -->
    <path d="M120 280 C80 230 80 130 160 85 C230 45 320 80 325 180 C328 230 300 295 240 310 C180 325 140 300 120 280 Z" fill="url(#hlmShell)"/>
    <!-- Racing Speed Decals -->
    <path d="M170 85 Q250 110 290 160 Q270 140 180 100 Z" fill="url(#stripeDecal)"/>
    <path d="M190 75 Q280 105 315 155 Q295 135 200 90 Z" fill="#ffffff" opacity="0.8"/>
    <!-- Visor Window -->
    <path d="M115 170 C140 150 210 145 270 160 C285 200 270 235 240 245 C180 250 130 230 115 170 Z" fill="url(#visorGrad)"/>
    <!-- Visor Highlight Sheen -->
    <path d="M140 175 C180 165 230 165 260 175 C240 180 180 180 140 175 Z" fill="#ffffff" opacity="0.4"/>
    <!-- Visor Pivot Screw -->
    <circle cx="265" cy="185" r="9" fill="#64748b"/>
    <circle cx="265" cy="185" r="6" fill="#1e293b"/>
    <circle cx="265" cy="185" r="2" fill="#ffffff"/>
    <!-- Chin Vent & Grille -->
    <path d="M115 235 L160 285 L140 290 L105 245 Z" fill="#0f172a"/>
    <line x1="125" y1="250" x2="140" y2="265" stroke="#64748b" stroke-width="2"/>
    <line x1="130" y1="260" x2="145" y2="275" stroke="#64748b" stroke-width="2"/>
    <!-- Base Rubber Seal -->
    <path d="M120 280 Q180 320 240 310 L242 316 Q180 326 118 286 Z" fill="#020617"/>
  </g>
</svg>
`)}`;

export const BIKE_PRESET_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="bikeTank" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="60%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
    <linearGradient id="wheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <filter id="bikeShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="6" flood-opacity="0.3"/>
    </filter>
  </defs>
  <circle cx="200" cy="200" r="160" fill="#ef4444" opacity="0.08"/>
  <g filter="url(#bikeShadow)">
    <!-- Back Wheel -->
    <circle cx="110" cy="270" r="48" fill="url(#wheelGrad)"/>
    <circle cx="110" cy="270" r="32" fill="#0f172a"/>
    <circle cx="110" cy="270" r="18" fill="#e2e8f0"/>
    <circle cx="110" cy="270" r="6" fill="#475569"/>
    <!-- Front Wheel -->
    <circle cx="290" cy="270" r="48" fill="url(#wheelGrad)"/>
    <circle cx="290" cy="270" r="32" fill="#0f172a"/>
    <circle cx="290" cy="270" r="18" fill="#e2e8f0"/>
    <circle cx="290" cy="270" r="6" fill="#475569"/>
    <!-- Rear Swingarm & Chain -->
    <line x1="110" y1="270" x2="190" y2="260" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
    <line x1="110" y1="270" x2="180" y2="210" stroke="#475569" stroke-width="5"/>
    <!-- Exhaust Pipe -->
    <path d="M165 260 L200 268 L220 248" fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
    <path d="M120 275 L165 260" fill="none" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round"/>
    <!-- Engine Block -->
    <rect x="170" y="225" width="45" height="40" rx="6" fill="#1e293b"/>
    <line x1="175" y1="235" x2="205" y2="235" stroke="#475569" stroke-width="3"/>
    <line x1="175" y1="245" x2="205" y2="245" stroke="#475569" stroke-width="3"/>
    <line x1="175" y1="255" x2="205" y2="255" stroke="#475569" stroke-width="3"/>
    <!-- Frame Chassis -->
    <polygon points="150,200 230,195 210,250 170,245" fill="#0f172a"/>
    <!-- Fuel Tank & Fairing -->
    <path d="M180 185 Q220 160 255 180 L265 210 L200 215 Z" fill="url(#bikeTank)"/>
    <!-- Seat -->
    <path d="M140 195 Q170 190 195 210 L155 215 Z" fill="#020617"/>
    <!-- Tail Section -->
    <path d="M115 190 Q145 185 160 205 L140 215 Z" fill="url(#bikeTank)"/>
    <!-- Front Fork & Handlebars -->
    <line x1="290" y1="270" x2="255" y2="160" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
    <line x1="255" y1="160" x2="245" y2="150" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/>
    <!-- Headlight Cowl -->
    <polygon points="260,165 285,175 270,195 255,185" fill="url(#bikeTank)"/>
    <polygon points="280,172 288,176 282,185" fill="#fef08a"/>
  </g>
</svg>
`)}`;

export const TSHIRT_PRESET_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="tshirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="logoPrint" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="tshirtShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity="0.25"/>
    </filter>
  </defs>
  <circle cx="200" cy="200" r="160" fill="#6366f1" opacity="0.08"/>
  <g filter="url(#tshirtShadow)">
    <!-- Crewneck Collar Hole & Trim -->
    <path d="M140 100 Q200 135 260 100 L245 80 Q200 105 155 80 Z" fill="#4338ca"/>
    <!-- Left Sleeve -->
    <path d="M145 85 L80 145 Q70 160 85 170 L115 150 L140 120 Z" fill="#1e1b4b"/>
    <!-- Right Sleeve -->
    <path d="M255 85 L320 145 Q330 160 315 170 L285 150 L260 120 Z" fill="#1e1b4b"/>
    <!-- Main Shirt Body -->
    <path d="M145 95 L255 95 L275 320 Q200 325 125 320 Z" fill="url(#tshirtGrad)"/>
    <!-- Inner Collar Arc -->
    <path d="M165 95 Q200 120 235 95 Q200 105 165 95 Z" fill="#0f172a"/>
    <!-- Chest Graphic Print (Official FizzDrop / Brand Star) -->
    <circle cx="200" cy="185" r="28" fill="url(#logoPrint)" opacity="0.95"/>
    <polygon points="200,165 207,180 223,180 210,190 215,205 200,195 185,205 190,190 177,180 193,180" fill="#ffffff"/>
    <text x="200" y="235" font-family="Arial, sans-serif" font-weight="900" font-size="12" fill="#e0e7ff" text-anchor="middle" letter-spacing="2">FIZZDROP</text>
    <text x="200" y="250" font-family="Arial, sans-serif" font-weight="700" font-size="8" fill="#93c5fd" text-anchor="middle" letter-spacing="3">RACING CREW</text>
    <!-- Hem Stitches -->
    <line x1="128" y1="312" x2="272" y2="312" stroke="#4338ca" stroke-width="2" stroke-dasharray="3,2"/>
  </g>
</svg>
`)}`;

export const MERCHANDISE_PRESETS = [
  { name: 'Jackets', src: JACKET_PRESET_SVG, label: 'Official Biker / Bomber Jacket' },
  { name: 'Helmets', src: HELMET_PRESET_SVG, label: 'Aerodynamic Sport Helmet' },
  { name: 'Bike', src: BIKE_PRESET_SVG, label: 'Racing Edition Sport Bike' },
  { name: 'T-Shirt', src: TSHIRT_PRESET_SVG, label: 'Graphic Crewneck T-Shirt' },
];
