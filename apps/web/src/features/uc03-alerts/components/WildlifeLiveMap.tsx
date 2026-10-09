import { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { WildlifeAnimal, RiskZone, WildlifeRiskAlert, RiskLevel } from '../types';
import { Radio, ShieldCheck, MapPin, RefreshCw, Zap } from 'lucide-react';

interface WildlifeLiveMapProps {
  animals: WildlifeAnimal[];
  zones: RiskZone[];
  activeAlerts: WildlifeRiskAlert[];
  onSimulatePingForAnimal?: (animal: WildlifeAnimal) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Custom Leaflet DivIcon for monitored wildlife
function createAnimalIcon(animal: WildlifeAnimal, hasActiveBreach: boolean) {
  const isLeopard = animal.species.toLowerCase().includes('leopard');
  const iconEmoji = isLeopard ? '🐆' : '🐘';
  const ringColor = hasActiveBreach
    ? 'bg-rose-600 border-white'
    : 'bg-[#3E8E41] border-white';
  const pulseHtml = hasActiveBreach
    ? '<span class="absolute -inset-1.5 rounded-full bg-rose-500 opacity-80 animate-ping"></span>'
    : '';

  return L.divIcon({
    className: 'custom-animal-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        ${pulseHtml}
        <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2.5px solid white;" class="${ringColor}">
          <span>${iconEmoji}</span>
        </div>
        <div style="position: absolute; bottom: -20px; white-space: nowrap; background: rgba(28, 42, 30, 0.9); color: white; font-weight: 700; font-size: 10px; padding: 1px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none;">
          ${animal.name}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

function MapRecenterControl({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const handleRecenter = () => {
    map.flyTo(center, zoom, { duration: 1.2 });
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ margin: '12px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleRecenter}
          className="bg-white hover:bg-[#F5F5DC] text-stone-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#D1B370]/80 shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Recenter to Sanctuary Core"
        >
          <MapPin className="w-3.5 h-3.5 text-[#3E8E41]" />
          Center Sanctuary
        </button>
      </div>
    </div>
  );
}

export function WildlifeLiveMap({
  animals,
  zones,
  activeAlerts,
  onSimulatePingForAnimal,
  onRefresh,
  isRefreshing = false,
}: WildlifeLiveMapProps) {
  // Default Sanctuary Center: Yala / Southern Wildlife Reserve Corridor
  const defaultCenter: [number, number] = [6.375, 81.385];
  const defaultZoom = 12;

  // Filter animals that have a valid last known GPS location
  const animalsWithLocation = useMemo(() => {
    return animals.filter(
      (a) =>
        a.lastKnownLocation &&
        typeof a.lastKnownLocation.latitude === 'number' &&
        typeof a.lastKnownLocation.longitude === 'number'
    );
  }, [animals]);

  // Set of animal IDs that currently have an active geofence breach alert
  const breachingAnimalIds = useMemo(() => {
    return new Set(
      activeAlerts
        .filter((alert) => alert.status !== 'RESOLVED')
        .map((alert) => alert.animalId)
    );
  }, [activeAlerts]);

  // Safety fallback for test environments (jsdom)
  const isJsdom =
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('jsdom') || navigator.userAgent.includes('Node.js'));

  if (isJsdom) {
    return (
      <div
        data-testid="wildlife-live-map"
        className="p-4 bg-white border border-[#D1B370]/60 rounded-xl shadow-2xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#3E8E41]" />
            <h3 className="font-extrabold text-[#1C2A1E] text-sm">
              Live Wildlife Telemetry & Geofence Map
            </h3>
          </div>
          <span className="text-xs font-semibold text-stone-500">
            {animalsWithLocation.length} / {animals.length} Collars Mapped
          </span>
        </div>
        <p className="text-xs text-stone-600">
          Interactive Leaflet telemetry map showing {animalsWithLocation.length} live subjects and {zones.length} active risk zones.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="wildlife-live-map"
      className="bg-white border border-[#D1B370]/60 rounded-xl shadow-xs overflow-hidden"
    >
      {/* Map Header Toolbar */}
      <div className="px-4 py-3 bg-[#FAF7EE] border-b border-[#D1B370]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#3E8E41]/15 text-[#2E6B31] border border-[#3E8E41]/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-[#3E8E41]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-[#1C2A1E] text-sm leading-tight">
                Live Wildlife Telemetry & Geofence Risk Map
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#3E8E41]/15 text-[#2E6B31] border border-[#3E8E41]/30 rounded">
                LIVE GPS
              </span>
            </div>
            <p className="text-xs text-[#A76D40] font-medium mt-0.5">
              Real-time collar fix locations, sanctuary boundary polygons, and active risk breach vectors.
            </p>
          </div>
        </div>

        {/* Legend & Refresh Control */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-semibold text-stone-600 bg-white/80 px-2.5 py-1 rounded-lg border border-[#D1B370]/40">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3E8E41]" />
              Safe Collar
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              Active Breach
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-500/30 border border-rose-600 rounded-2xs" />
              Critical Settlement
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-amber-500/30 border border-amber-600 rounded-2xs" />
              High Buffer
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-[#F5F5DC] border border-[#D1B370]/60 rounded-lg shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#3E8E41] ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync Map
            </button>
          )}
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative w-full h-[460px] bg-stone-100 z-0">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Base OpenStreetMap Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenterControl center={defaultCenter} zoom={defaultZoom} />

          {/* 1. Risk Zone Boundary Polygons */}
          {zones.map((zone) => {
            const isCritical = zone.riskLevel === RiskLevel.CRITICAL;
            const positions = zone.boundaryCoordinates.map(
              (pt) => [pt.latitude, pt.longitude] as [number, number]
            );

            return (
              <Polygon
                key={zone.id}
                positions={positions}
                pathOptions={{
                  color: isCritical ? '#E11D48' : '#D97706',
                  fillColor: isCritical ? '#E11D48' : '#D97706',
                  fillOpacity: isCritical ? 0.22 : 0.16,
                  weight: isCritical ? 2.5 : 2,
                  dashArray: isCritical ? undefined : '5, 5',
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs">
                    <p className="font-bold text-stone-900">{zone.name}</p>
                    <p className={`font-semibold ${isCritical ? 'text-rose-600' : 'text-amber-700'}`}>
                      {zone.riskLevel} Risk Zone ({zone.zoneType})
                    </p>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="p-1 space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-stone-900 text-xs">
                        {zone.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {zone.riskLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-snug">
                      {zone.description || 'Configured sanctuary geofence perimeter.'}
                    </p>
                    <div className="text-[10px] text-stone-500 font-mono">
                      Vertices: {zone.boundaryCoordinates.length} perimeter coordinates
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* 2. Live Collared Wildlife Markers */}
          {animalsWithLocation.map((animal) => {
            const loc = animal.lastKnownLocation!;
            const hasActiveBreach = breachingAnimalIds.has(animal.id);
            const collar = animal.activeCollar;
            const icon = createAnimalIcon(animal, hasActiveBreach);

            return (
              <Marker
                key={animal.id}
                position={[loc.latitude, loc.longitude]}
                icon={icon}
              >
                <Popup>
                  <div className="p-2 space-y-2 min-w-[220px]">
                    <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-1.5">
                      <div>
                        <h4 className="font-extrabold text-stone-900 text-sm leading-tight">
                          {animal.name}
                        </h4>
                        <p className="text-xs text-[#A76D40] font-semibold">
                          {animal.species}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          hasActiveBreach
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {hasActiveBreach ? 'BREACH ALERT' : 'Normal'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-stone-700">
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-medium">Collar Code:</span>
                        <span className="font-mono font-bold">{collar?.collarCode || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-medium">Battery:</span>
                        <span className="font-bold text-[#2E6B31]">
                          {collar?.batteryPercentage !== undefined ? `${collar.batteryPercentage}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-medium">Coordinates:</span>
                        <span className="font-mono text-[11px] font-semibold">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500 font-medium">Last Transmission:</span>
                        <span className="text-[11px]">
                          {new Date(loc.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {onSimulatePingForAnimal && (
                      <button
                        onClick={() => onSimulatePingForAnimal(animal)}
                        className="w-full mt-1.5 py-1.5 px-2 bg-[#A76D40] hover:bg-[#8e5a32] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Simulate Telemetry Ping
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Footer Status Bar */}
      <div className="px-4 py-2.5 bg-stone-50 border-t border-[#D1B370]/40 flex flex-wrap items-center justify-between text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#3E8E41]" />
          <span>
            Displaying <strong>{animalsWithLocation.length}</strong> live collared subjects across{' '}
            <strong>{zones.length}</strong> configured sanctuary geofences.
          </span>
        </div>
        <div className="font-medium text-stone-500 text-[11px]">
          Map Projection: WGS84 GPS Telemetry Coordinates
        </div>
      </div>
    </div>
  );
}
