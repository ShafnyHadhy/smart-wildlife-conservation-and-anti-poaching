import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Patrol, PatrolRoute, PatrolStatus } from '@wildlife/shared';
import { Compass, MapPin } from 'lucide-react';
import {
  getRangerLocationInfo,
  formatRangerLocationLabel,
  formatCoordinates,
  isCheckpointVisited,
} from '../utils';

export interface PatrolRouteMapProps {
  patrol: Patrol;
  route?: PatrolRoute | null;
  className?: string;
}

export function PatrolRouteMap({ patrol, route, className = '' }: PatrolRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Extract planned checkpoints with valid coordinates
  const plannedCheckpoints = (route?.waypoints || []).filter(
    (wp) =>
      typeof wp.latitude === 'number' &&
      typeof wp.longitude === 'number' &&
      !Number.isNaN(wp.latitude) &&
      !Number.isNaN(wp.longitude) &&
      Number.isFinite(wp.latitude) &&
      Number.isFinite(wp.longitude) &&
      !(wp.latitude === 0 && wp.longitude === 0)
  );

  // Extract recorded waypoints
  const recordedWaypoints = patrol.waypoints || [];

  // Evaluate ranger location
  const locationInfo = getRangerLocationInfo(recordedWaypoints);
  const isRangerLocationUsable =
    patrol.status !== PatrolStatus.PLANNED &&
    patrol.status !== PatrolStatus.CANCELLED &&
    locationInfo.status !== 'Unavailable' &&
    locationInfo.latestWaypoint !== null &&
    typeof locationInfo.latestWaypoint.latitude === 'number' &&
    typeof locationInfo.latestWaypoint.longitude === 'number' &&
    !Number.isNaN(locationInfo.latestWaypoint.latitude) &&
    !Number.isNaN(locationInfo.latestWaypoint.longitude) &&
    Number.isFinite(locationInfo.latestWaypoint.latitude) &&
    Number.isFinite(locationInfo.latestWaypoint.longitude) &&
    !(locationInfo.latestWaypoint.latitude === 0 && locationInfo.latestWaypoint.longitude === 0);

  const hasAnyCoordinates = plannedCheckpoints.length > 0 || isRangerLocationUsable;

  useEffect(() => {
    if (!hasAnyCoordinates || !mapContainerRef.current) {
      return;
    }

    try {
      // Clean up previous map instance if re-rendering
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize Leaflet map
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      });
      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      const allCoordinates: L.LatLngTuple[] = [];

      // Sort planned checkpoints by sequence order
      const sortedCheckpoints = [...plannedCheckpoints].sort(
        (a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
      );

      // Draw corridor route line if 2+ checkpoints exist
      if (sortedCheckpoints.length > 1) {
        const routePoints: L.LatLngTuple[] = sortedCheckpoints.map((cp) => [
          cp.latitude,
          cp.longitude,
        ]);
        L.polyline(routePoints, {
          color: '#2E6B31',
          weight: 3.5,
          dashArray: '6, 8',
          opacity: 0.85,
        }).addTo(map);
      }

      // Add checkpoint markers
      sortedCheckpoints.forEach((cp, idx) => {
        const isVisited = isCheckpointVisited(cp, recordedWaypoints);
        const latLng: L.LatLngTuple = [cp.latitude, cp.longitude];
        allCoordinates.push(latLng);

        const seq = cp.sequenceOrder || idx + 1;
        const iconHtml = isVisited
          ? `<div style="background-color: #2E6B31; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">✓</div>`
          : `<div style="background-color: #78716c; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${seq}</div>`;

        const checkpointIcon = L.divIcon({
          className: 'patrol-checkpoint-marker',
          html: iconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker(latLng, { icon: checkpointIcon }).addTo(map);

        // Bind informative popup
        const coordsText = formatCoordinates(cp.latitude, cp.longitude) || '';
        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 160px;">
            <div style="font-weight: bold; color: #1C2A1E; font-size: 13px; margin-bottom: 2px;">
              Checkpoint #${seq}
            </div>
            <div style="margin-bottom: 6px;">
              <span style="display: inline-block; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 9999px; ${
                isVisited
                  ? 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;'
                  : 'background-color: #f5f5f4; color: #57534e; border: 1px solid #d6d3d1;'
              }">
                ${isVisited ? '✓ Visited' : 'Pending / Unvisited'}
              </span>
            </div>
            <div style="color: #57534e; font-size: 11px;">
              ${cp.notes ? `<div style="margin-bottom: 2px;"><em>${cp.notes}</em></div>` : ''}
              <div><strong>Coords:</strong> ${coordsText}</div>
              <div><strong>Type:</strong> ${cp.locationType || 'GPS'}</div>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
      });

      // Add ranger location marker if available
      if (isRangerLocationUsable && locationInfo.latestWaypoint) {
        const rangerWp = locationInfo.latestWaypoint;
        const rangerLatLng: L.LatLngTuple = [rangerWp.latitude, rangerWp.longitude];
        allCoordinates.push(rangerLatLng);

        const isCurrent = locationInfo.status === 'Current';
        const rangerColor = isCurrent ? '#3E8E41' : '#d97706';
        const rangerLabel = formatRangerLocationLabel(locationInfo, patrol.status);
        const rangerCoordsText = formatCoordinates(rangerWp.latitude, rangerWp.longitude) || '';

        const rangerIcon = L.divIcon({
          className: 'patrol-ranger-marker',
          html: `
            <div style="position: relative; width: 36px; height: 36px;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${rangerColor}; opacity: 0.35; ${
                isCurrent ? 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''
              }"></div>
              <div style="position: relative; background-color: ${
                isCurrent ? '#15803d' : '#b45309'
              }; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
                🛡️
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const rangerMarker = L.marker(rangerLatLng, {
          icon: rangerIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 170px;">
            <div style="font-weight: bold; color: #1C2A1E; font-size: 13px; margin-bottom: 2px;">
              ${patrol.rangerName || 'Assigned Ranger'}
            </div>
            <div style="margin-bottom: 6px;">
              <span style="display: inline-block; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 9999px; ${
                isCurrent
                  ? 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;'
                  : 'background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
              }">
                ${isCurrent ? '● Current Location' : '▲ Stale Location'}
              </span>
            </div>
            <div style="color: #57534e; font-size: 11px;">
              <div><strong>Status:</strong> ${rangerLabel}</div>
              <div><strong>Coordinates:</strong> ${rangerCoordsText}</div>
            </div>
          </div>
        `;
        rangerMarker.bindPopup(popupContent);
      }

      // Center and fit bounds around all coordinates
      if (allCoordinates.length > 1) {
        const bounds = L.latLngBounds(allCoordinates);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (allCoordinates.length === 1) {
        map.setView(allCoordinates[0], 14);
      }
    } catch {
      // Safely handle JSDOM or environments without canvas/layout
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hasAnyCoordinates, plannedCheckpoints.length, isRangerLocationUsable, patrol.id]);

  // If no usable coordinates exist, display clear fallback
  if (!hasAnyCoordinates) {
    return (
      <div
        data-testid="patrol-map-no-location"
        className={`p-8 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs text-center flex flex-col items-center justify-center gap-2 ${className}`}
      >
        <div className="p-3 bg-[#FAF7EE] border border-[#D1B370]/50 rounded-2xl text-stone-400">
          <MapPin className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-stone-700">
          No location data available for this patrol.
        </p>
        <p className="text-xs text-stone-500 max-w-sm">
          Route checkpoints and ranger GPS coordinates have not been recorded or configured yet for this patrol run.
        </p>
      </div>
    );
  }

  const visitedCount = plannedCheckpoints.filter((cp) =>
    isCheckpointVisited(cp, recordedWaypoints)
  ).length;
  const pendingCount = Math.max(0, plannedCheckpoints.length - visitedCount);

  return (
    <div
      data-testid="patrol-route-map"
      className={`p-5 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs space-y-3.5 ${className}`}
    >
      {/* Map Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#1C2A1E] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#3E8E41]" />
            <span>Patrol Route Corridor Map</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Visualizing corridor checkpoints and ranger field positioning.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-[#2E6B31]" />
            <span>Visited ({visitedCount})</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-300">
            <span className="w-2 h-2 rounded-full bg-[#78716c]" />
            <span>Pending ({pendingCount})</span>
          </span>

          {isRangerLocationUsable && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                locationInfo.status === 'Current'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  locationInfo.status === 'Current'
                    ? 'bg-[#3E8E41] animate-pulse'
                    : 'bg-amber-600'
                }`}
              />
              <span>Ranger Location ({locationInfo.status})</span>
            </span>
          )}
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        data-testid="patrol-route-map-canvas"
        className="w-full h-80 sm:h-96 rounded-xl border border-[#D1B370]/50 overflow-hidden shadow-inner z-0"
        style={{ minHeight: '320px' }}
      />
    </div>
  );
}
