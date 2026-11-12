import React, { useState, useMemo } from 'react';
import {
  Compass,
  Hospital,
  Heart,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Activity,
  Phone,
  MapPin,
  Flame,
  X,
  Crosshair,
  Radio,
  Sliders,
  Send,
  Sparkles
} from 'lucide-react';

export interface HospitalCenter {
  id: string;
  name: string;
  area: string;
  distance: number;
  lat: number;
  lng: number;
  phone: string;
  beds: number;
  hasBloodBank: boolean;
}

export interface DonorNode {
  id: string;
  name: string;
  phone: string;
  bloodGroup: string;
  age: number;
  weight: number;
  cityArea: string;
  lat: number;
  lng: number;
  lastDonationDate: string | null;
  isSnoozed: boolean;
  snoozeUntil: string | null;
  eligibilityPassed: boolean;
  readinessScore: number;
  totalDonations: number;
  donorCode: string;
  history: any[];
  nearestCenters: string[];
}

export interface RequestNode {
  id: string;
  patientName: string;
  mrNumber: string;
  hospitalName: string;
  cityArea: string;
  bloodGroup: string;
  quantity: number;
  urgency: string;
  isBulk: boolean;
  status: string;
  pledgedDonors: string[];
}

interface GeographicalClusterMapProps {
  donors: DonorNode[];
  hospitals: HospitalCenter[];
  requests: RequestNode[];
  getDonorStatus: (donor: any) => { status: string; label: string; color: string; daysLeft: number; progress: number };
}

// Map projection boundaries for Karachi Metropolitan Area
const BOUNDS = {
  minLat: 24.78,
  maxLat: 24.96,
  minLng: 67.00,
  maxLng: 67.22,
  svgWidth: 960,
  svgHeight: 640
};

// Convert Lat/Lng to SVG coordinate system
const projectCoordinates = (lat: number, lng: number) => {
  const paddingX = 70;
  const paddingY = 60;
  const innerW = BOUNDS.svgWidth - paddingX * 2;
  const innerH = BOUNDS.svgHeight - paddingY * 2;

  const x = paddingX + ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * innerW;
  const y = paddingY + ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * innerH;
  return { x, y };
};

// Defined Cluster Zones in Karachi
const CLUSTER_ZONES = [
  {
    id: 'zone-stadium',
    name: 'District East: Stadium & PECHS Medical Corridor',
    centerLat: 24.887,
    centerLng: 67.067,
    radiusKm: 4.5,
    tagline: 'High-Density Trauma & Critical Care Node'
  },
  {
    id: 'zone-gulshan',
    name: 'District East: Gulshan & University Sector',
    centerLat: 24.908,
    centerLng: 67.105,
    radiusKm: 5.0,
    tagline: 'Academic Campuses & O- Universal Reserves'
  },
  {
    id: 'zone-south',
    name: 'District South: Clifton & DHA Coastal Corridor',
    centerLat: 24.810,
    centerLng: 67.042,
    radiusKm: 5.5,
    tagline: 'Coastal Residential & Specialized Surgical Centers'
  },
  {
    id: 'zone-east-ind',
    name: 'District Korangi & Malir Health Network',
    centerLat: 24.875,
    centerLng: 67.155,
    radiusKm: 6.0,
    tagline: 'Indus Pediatric Ward & Malir Cantt Response Unit'
  },
  {
    id: 'zone-central',
    name: 'District Central & Civil Hospital Hub',
    centerLat: 24.898,
    centerLng: 67.025,
    radiusKm: 5.0,
    tagline: 'SIUT Transfusion Center & North Nazimabad'
  }
];

export function GeographicalClusterMap({
  donors,
  hospitals,
  requests,
  getDonorStatus
}: GeographicalClusterMapProps) {
  // Map visualization state
  const [viewMode, setViewMode] = useState<'cluster' | 'nodes'>('cluster');
  const [theme, setTheme] = useState<'light' | 'radar'>('radar');
  const [bloodFilter, setBloodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showHospitals, setShowHospitals] = useState(true);
  const [showDonors, setShowDonors] = useState(true);
  const [showDispatchLines, setShowDispatchLines] = useState(true);

  // Pan & Zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Selected item drawer
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'donor' | 'hospital' | 'cluster';
    data: any;
  } | null>(null);

  // Filtered Donors
  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      if (bloodFilter !== 'ALL' && d.bloodGroup !== bloodFilter) return false;
      const st = getDonorStatus(d);
      if (statusFilter === 'AVAILABLE' && st.status !== 'Available') return false;
      if (statusFilter === 'COOLDOWN' && st.status !== 'Cooldown') return false;
      if (statusFilter === 'SNOOZED' && st.status !== 'Snoozed') return false;
      return true;
    });
  }, [donors, bloodFilter, statusFilter, getDonorStatus]);

  // Aggregate Geographical Clusters
  const clusters = useMemo(() => {
    return CLUSTER_ZONES.map((zone) => {
      // Find donors closest to this zone
      const zoneDonors = filteredDonors.filter((d) => {
        const dist = Math.sqrt(
          Math.pow(d.lat - zone.centerLat, 2) + Math.pow(d.lng - zone.centerLng, 2)
        );
        return dist < 0.055; // Proximity threshold (~6km)
      });

      // Find hospitals in this zone
      const zoneHospitals = hospitals.filter((h) => {
        const dist = Math.sqrt(
          Math.pow(h.lat - zone.centerLat, 2) + Math.pow(h.lng - zone.centerLng, 2)
        );
        return dist < 0.055;
      });

      const availableCount = zoneDonors.filter((d) => getDonorStatus(d).status === 'Available').length;
      const cooldownCount = zoneDonors.filter((d) => getDonorStatus(d).status === 'Cooldown').length;
      const snoozedCount = zoneDonors.filter((d) => getDonorStatus(d).status === 'Snoozed').length;

      // Group breakdown
      const bloodGroups: Record<string, number> = {};
      zoneDonors.forEach((d) => {
        bloodGroups[d.bloodGroup] = (bloodGroups[d.bloodGroup] || 0) + 1;
      });

      const { x, y } = projectCoordinates(zone.centerLat, zone.centerLng);

      return {
        ...zone,
        x,
        y,
        donors: zoneDonors,
        hospitals: zoneHospitals,
        totalNodes: zoneDonors.length + zoneHospitals.length,
        availableCount,
        cooldownCount,
        snoozedCount,
        bloodGroups
      };
    });
  }, [filteredDonors, hospitals, getDonorStatus]);

  // Active Dispatch Connections
  const activeDispatchRoutes = useMemo(() => {
    const routes: Array<{
      id: string;
      reqId: string;
      hospital: HospitalCenter;
      donor: DonorNode;
      patient: string;
      bloodGroup: string;
      urgency: string;
    }> = [];

    requests.forEach((r) => {
      if (r.status === 'Closed / Fulfilled') return;
      const matchedHospital = hospitals.find((h) => h.name.includes(r.hospitalName.split(' ')[0]));
      if (!matchedHospital) return;

      r.pledgedDonors?.forEach((donorId) => {
        const matchedDonor = donors.find((d) => d.id === donorId);
        if (matchedDonor) {
          routes.push({
            id: `${r.id}-${matchedDonor.id}`,
            reqId: r.id,
            hospital: matchedHospital,
            donor: matchedDonor,
            patient: r.patientName,
            bloodGroup: r.bloodGroup,
            urgency: r.urgency
          });
        }
      });
    });

    return routes;
  }, [requests, hospitals, donors]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.8, Math.min(2.2, prev + delta)));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    setSelectedEntity(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      {/* Top Map Toolbar */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-md">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Karachi Regional Donor & Center Cluster Map</h3>
              <span className="text-[10px] uppercase font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                Live Geofence
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Aggregated geographical nodes · 5 Hospital Centers · {donors.length} Registered Donors
            </p>
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Mode Segmented Switch */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                setViewMode('cluster');
                setSelectedEntity(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'cluster'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Cluster View ({clusters.length})
            </button>
            <button
              onClick={() => {
                setViewMode('nodes');
                setSelectedEntity(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'nodes'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Individual Pins ({filteredDonors.length + hospitals.length})
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'radar' ? 'light' : 'radar')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            {theme === 'radar' ? 'Night Radar' : 'Clinical Light'}
          </button>

          {/* Reset View */}
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-5 py-3 bg-slate-800/90 text-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Blood Filter */}
          <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400">Filter Group:</span>
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="bg-transparent font-bold text-rose-400 outline-none cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bg) => (
                <option key={bg} value={bg} className="bg-slate-900 text-white">
                  {bg}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-emerald-400 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
              <option value="AVAILABLE" className="bg-slate-900 text-white">Available (Green)</option>
              <option value="COOLDOWN" className="bg-slate-900 text-white">In 90-Day Cooldown</option>
              <option value="SNOOZED" className="bg-slate-900 text-white">Snoozed</option>
            </select>
          </div>

          {/* Layer toggles */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={showHospitals}
              onChange={(e) => setShowHospitals(e.target.checked)}
              className="rounded text-rose-600 cursor-pointer"
            />
            Donation Centers ({hospitals.length})
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={showDonors}
              onChange={(e) => setShowDonors(e.target.checked)}
              className="rounded text-emerald-600 cursor-pointer"
            />
            Active Donors ({filteredDonors.length})
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={showDispatchLines}
              onChange={(e) => setShowDispatchLines(e.target.checked)}
              className="rounded text-rose-500 cursor-pointer"
            />
            Live Dispatch Routes ({activeDispatchRoutes.length})
          </label>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => handleZoom(0.2)}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => handleZoom(-0.2)}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Map Viewport */}
      <div className="relative w-full h-[540px] sm:h-[580px] overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${BOUNDS.svgWidth} ${BOUNDS.svgHeight}`}
          className={`w-full h-full transition-colors duration-300 ${
            theme === 'radar' ? 'bg-[#080d1a]' : 'bg-slate-100'
          }`}
          style={{
            transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center'
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={theme === 'radar' ? '#141e33' : '#e2e8f0'}
                strokeWidth="0.8"
              />
            </pattern>

            {/* Glowing marker glow filters */}
            <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Arabian Sea / Coastline Contour (South-West) */}
          <path
            d="M 0,420 Q 180,480 320,530 T 600,610 L 600,640 L 0,640 Z"
            fill={theme === 'radar' ? '#060a14' : '#cbd5e1'}
            opacity={theme === 'radar' ? 0.7 : 0.4}
          />
          <text
            x="80"
            y="580"
            fill={theme === 'radar' ? '#334155' : '#94a3b8'}
            fontSize="12"
            fontFamily="monospace"
            letterSpacing="2"
          >
            ARABIAN SEA / CLIFTON SHORELINE
          </text>

          {/* District Sector Boundaries & Labels */}
          <g opacity={theme === 'radar' ? 0.4 : 0.6}>
            {/* North Nazimabad */}
            <text x="140" y="110" fill={theme === 'radar' ? '#64748b' : '#64748b'} fontSize="11" fontWeight="600">
              NORTH NAZIMABAD & CENTRAL
            </text>
            {/* Gulshan */}
            <text x="540" y="140" fill={theme === 'radar' ? '#64748b' : '#64748b'} fontSize="11" fontWeight="600">
              GULSHAN-E-IQBAL & UNIVERSITY RD
            </text>
            {/* Stadium / PECHS */}
            <text x="360" y="270" fill={theme === 'radar' ? '#64748b' : '#64748b'} fontSize="11" fontWeight="600">
              STADIUM RD & PECHS MEDICAL NODE
            </text>
            {/* Clifton & DHA */}
            <text x="210" y="470" fill={theme === 'radar' ? '#64748b' : '#64748b'} fontSize="11" fontWeight="600">
              CLIFTON & DHA PHASE 5
            </text>
            {/* Korangi & Malir */}
            <text x="680" y="380" fill={theme === 'radar' ? '#64748b' : '#64748b'} fontSize="11" fontWeight="600">
              KORANGI & MALIR HEALTH SECTOR
            </text>
          </g>

          {/* Transit Emergency Dispatch Routes (Animated dashed lines) */}
          {showDispatchLines &&
            activeDispatchRoutes.map((route) => {
              const hPos = projectCoordinates(route.hospital.lat, route.hospital.lng);
              const dPos = projectCoordinates(route.donor.lat, route.donor.lng);
              return (
                <g key={route.id} className="cursor-pointer">
                  <line
                    x1={hPos.x}
                    y1={hPos.y}
                    x2={dPos.x}
                    y2={dPos.y}
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    opacity="0.8"
                  />
                  {/* Midpoint ETA Badge */}
                  <g transform={`translate(${(hPos.x + dPos.x) / 2}, ${(hPos.y + dPos.y) / 2})`}>
                    <rect
                      x="-42"
                      y="-11"
                      width="84"
                      height="22"
                      rx="6"
                      fill={theme === 'radar' ? '#0f172a' : '#ffffff'}
                      stroke="#f43f5e"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={theme === 'radar' ? '#fecdd3' : '#e11d48'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      12 MIN DISPATCH
                    </text>
                  </g>
                </g>
              );
            })}

          {/* ==========================================================
              VIEW MODE: CLUSTER VIEW
              ========================================================== */}
          {viewMode === 'cluster' &&
            clusters.map((cluster) => {
              const isSelected = selectedEntity?.data?.id === cluster.id;
              const hasAvailable = cluster.availableCount > 0;

              return (
                <g
                  key={cluster.id}
                  transform={`translate(${cluster.x}, ${cluster.y})`}
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedEntity({ type: 'cluster', data: cluster })}
                >
                  {/* Catchment Radius Ring */}
                  <circle
                    r={cluster.radiusKm * 10}
                    fill={hasAvailable ? '#10b981' : '#f59e0b'}
                    fillOpacity={theme === 'radar' ? 0.08 : 0.12}
                    stroke={hasAvailable ? '#10b981' : '#f59e0b'}
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />

                  {/* Cluster Core Bubble */}
                  <circle
                    r={26 + Math.min(cluster.totalNodes * 3, 14)}
                    fill={theme === 'radar' ? '#0f172a' : '#ffffff'}
                    stroke={hasAvailable ? '#10b981' : '#f59e0b'}
                    strokeWidth={isSelected ? '3' : '2'}
                    filter={theme === 'radar' ? 'url(#glow-emerald)' : undefined}
                  />

                  {/* Center Node Count */}
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    fill={theme === 'radar' ? '#ffffff' : '#0f172a'}
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {cluster.totalNodes}
                  </text>
                  <text
                    x="0"
                    y="10"
                    textAnchor="middle"
                    fill={theme === 'radar' ? '#94a3b8' : '#64748b'}
                    fontSize="8"
                    fontWeight="600"
                    letterSpacing="0.5"
                  >
                    NODES
                  </text>

                  {/* Cluster Name Label below bubble */}
                  <g transform="translate(0, 44)">
                    <rect
                      x="-95"
                      y="-11"
                      width="190"
                      height="22"
                      rx="6"
                      fill={theme === 'radar' ? '#0b1120' : '#ffffff'}
                      stroke={theme === 'radar' ? '#1e293b' : '#cbd5e1'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={theme === 'radar' ? '#f8fafc' : '#0f172a'}
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {cluster.name.split(':')[1]?.trim() || cluster.name}
                    </text>
                  </g>

                  {/* Mini Blood Distribution Pill */}
                  <g transform="translate(0, -38)">
                    <rect
                      x="-48"
                      y="-9"
                      width="96"
                      height="18"
                      rx="5"
                      fill={theme === 'radar' ? '#1e293b' : '#f1f5f9'}
                      stroke={theme === 'radar' ? '#334155' : '#cbd5e1'}
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill={hasAvailable ? '#34d399' : '#fbbf24'}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {cluster.availableCount} Ready · {cluster.hospitals.length} Centers
                    </text>
                  </g>
                </g>
              );
            })}

          {/* ==========================================================
              VIEW MODE: INDIVIDUAL NODES VIEW
              ========================================================== */}
          {viewMode === 'nodes' && (
            <>
              {/* Hospital Centers */}
              {showHospitals &&
                hospitals.map((h) => {
                  const { x, y } = projectCoordinates(h.lat, h.lng);
                  const isSelected = selectedEntity?.data?.id === h.id;

                  return (
                    <g
                      key={h.id}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer transition-transform hover:scale-110"
                      onClick={() => setSelectedEntity({ type: 'hospital', data: h })}
                    >
                      {/* Catchment circle */}
                      <circle
                        r="38"
                        fill="#f43f5e"
                        fillOpacity={theme === 'radar' ? 0.08 : 0.06}
                        stroke="#f43f5e"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />

                      {/* Hospital Center Shield */}
                      <rect
                        x="-14"
                        y="-14"
                        width="28"
                        height="28"
                        rx="8"
                        fill="#e11d48"
                        stroke={isSelected ? '#ffffff' : '#be123c'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        filter="url(#glow-rose)"
                      />
                      {/* Cross icon */}
                      <path d="M -2 -7 L 2 -7 L 2 -2 L 7 -2 L 7 2 L 2 2 L 2 7 L -2 7 L -2 2 L -7 2 L -7 -2 L -2 -2 Z" fill="#ffffff" />

                      {/* Label */}
                      <g transform="translate(0, 24)">
                        <rect
                          x="-65"
                          y="-9"
                          width="130"
                          height="18"
                          rx="5"
                          fill={theme === 'radar' ? '#0f172a' : '#ffffff'}
                          stroke={theme === 'radar' ? '#334155' : '#cbd5e1'}
                          strokeWidth="0.8"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill={theme === 'radar' ? '#f8fafc' : '#0f172a'}
                          fontSize="8.5"
                          fontWeight="bold"
                        >
                          {h.name.split(' ')[0]} {h.name.split(' ')[1]}
                        </text>
                      </g>
                    </g>
                  );
                })}

              {/* Active Donors */}
              {showDonors &&
                filteredDonors.map((d) => {
                  const { x, y } = projectCoordinates(d.lat, d.lng);
                  const st = getDonorStatus(d);
                  const isSelected = selectedEntity?.data?.id === d.id;

                  const color =
                    st.status === 'Available'
                      ? '#10b981'
                      : st.status === 'Cooldown'
                      ? '#f59e0b'
                      : '#64748b';

                  return (
                    <g
                      key={d.id}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer transition-transform hover:scale-125"
                      onClick={() => setSelectedEntity({ type: 'donor', data: d })}
                    >
                      {/* Outer pulse if available */}
                      {st.status === 'Available' && (
                        <circle
                          r="18"
                          fill="#10b981"
                          fillOpacity={theme === 'radar' ? 0.2 : 0.15}
                          stroke="#10b981"
                          strokeWidth="0.8"
                        />
                      )}

                      {/* Pin Circle */}
                      <circle
                        r="12"
                        fill={color}
                        stroke={isSelected ? '#ffffff' : theme === 'radar' ? '#0f172a' : '#ffffff'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        filter={st.status === 'Available' && theme === 'radar' ? 'url(#glow-emerald)' : undefined}
                      />

                      {/* Blood Group text */}
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {d.bloodGroup}
                      </text>

                      {/* Donor First Name */}
                      <text
                        x="0"
                        y="22"
                        textAnchor="middle"
                        fill={theme === 'radar' ? '#cbd5e1' : '#334155'}
                        fontSize="8"
                        fontWeight="600"
                      >
                        {d.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
            </>
          )}
        </svg>

        {/* Selected Entity Flyout Inspector Drawer */}
        {selectedEntity && (
          <div className="absolute top-4 right-4 z-20 w-80 max-w-[calc(100%-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 text-left animate-in fade-in duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {selectedEntity.type === 'hospital' ? (
                  <div className="p-2 rounded-xl bg-rose-600 text-white">
                    <Hospital className="w-4 h-4" />
                  </div>
                ) : selectedEntity.type === 'donor' ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                    {selectedEntity.data.bloodGroup}
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-indigo-600 text-white">
                    <Layers className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                    {selectedEntity.type === 'hospital'
                      ? 'Verified Hospital Center'
                      : selectedEntity.type === 'donor'
                      ? 'Registered Donor Node'
                      : 'Geographical Cluster Area'}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                    {selectedEntity.data.name}
                  </h4>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Entity Specific Details */}
            {selectedEntity.type === 'donor' && (
              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Current Status:</span>
                  <span className="font-semibold text-emerald-600">
                    {getDonorStatus(selectedEntity.data).label}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Readiness Score:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selectedEntity.data.readinessScore}/100
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Sector / Area:</span>
                  <span className="text-slate-800 dark:text-slate-100">{selectedEntity.data.cityArea}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Lifetime Donations:</span>
                  <span className="font-mono font-bold">{selectedEntity.data.totalDonations} Units</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Contact Node:</span>
                  <span className="font-mono">{selectedEntity.data.phone}</span>
                </div>
              </div>
            )}

            {selectedEntity.type === 'hospital' && (
              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Facility Bed Capacity:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selectedEntity.data.beds} Beds
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Blood Transfusion Bank:</span>
                  <span className="font-semibold text-emerald-600">Active & 24/7 Verified</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Location:</span>
                  <span>{selectedEntity.data.area}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Dispatch Phone:</span>
                  <span className="font-mono">{selectedEntity.data.phone}</span>
                </div>
              </div>
            )}

            {selectedEntity.type === 'cluster' && (
              <div className="py-3 space-y-2.5 text-xs">
                <p className="text-[11px] text-slate-500">{selectedEntity.data.tagline}</p>
                <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedEntity.data.totalNodes}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Available</span>
                    <span className="font-bold text-emerald-600">
                      {selectedEntity.data.availableCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Hospitals</span>
                    <span className="font-bold text-rose-600">
                      {selectedEntity.data.hospitals.length}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Blood Group Reserves in this Zone:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selectedEntity.data.bloodGroups).map(([bg, count]) => (
                      <span
                        key={bg}
                        className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-mono font-bold"
                      >
                        {bg}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setViewMode('nodes');
                if (selectedEntity.type === 'cluster') {
                  setZoomLevel(1.4);
                }
              }}
              className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-semibold text-xs transition-all cursor-pointer"
            >
              Zoom & Inspect Local Sector Pins
            </button>
          </div>
        )}

        {/* Floating Map Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-3 text-white text-[11px] shadow-lg flex flex-col gap-1.5 pointer-events-none">
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Map Key</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-rose-600 border border-white" />
            <span className="text-slate-300">Donation Center / Hospital</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white" />
            <span className="text-slate-300">Available Donor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white" />
            <span className="text-slate-300">In 90-Day Cooldown / Resting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-rose-500 border-b border-dashed" />
            <span className="text-slate-300">Active Dispatch Transit Route</span>
          </div>
        </div>
      </div>

      {/* Cluster Geographical Summary Strip */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Mapped Nodes</span>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {donors.length + hospitals.length} Locations
          </p>
          <span className="text-[10px] text-slate-500">5 Centers · {donors.length} Donors</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Real-Time Clusters</span>
          <p className="text-xl font-black text-indigo-600 font-mono mt-0.5">{clusters.length} Sectors</p>
          <span className="text-[10px] text-slate-500">Dynamic Proximity Grouping</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Rapid Dispatch Radius</span>
          <p className="text-xl font-black text-emerald-600 font-mono mt-0.5">&lt; 14 Minutes</p>
          <span className="text-[10px] text-emerald-700">92% City Corridor Coverage</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Dispatch Routes</span>
          <p className="text-xl font-black text-rose-600 font-mono mt-0.5">
            {activeDispatchRoutes.length} Dispatched
          </p>
          <span className="text-[10px] text-rose-600 font-semibold">AKUH & SIUT En Route</span>
        </div>
      </div>
    </div>
  );
}
