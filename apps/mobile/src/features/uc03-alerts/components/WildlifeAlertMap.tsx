import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import {
  TbCurrentLocation,
  TbPlus,
  TbMinus,
  TbSatellite,
} from 'react-icons/tb';
import {
  HiOutlineMapPin,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import {
  WildlifeRiskAlert,
  RiskZone,
  WildlifeAnimal,
  RiskLevel,
} from '../types';

interface WildlifeAlertMapProps {
  alert: WildlifeRiskAlert;
  zones?: RiskZone[];
  animals?: WildlifeAnimal[];
  height?: number;
  onRecenter?: () => void;
  interactive?: boolean;
}

export function WildlifeAlertMap({
  alert,
  zones = [],
  animals = [],
  height = 280,
  onRecenter,
}: WildlifeAlertMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const hasLocation =
    !!alert.location &&
    typeof alert.location.latitude === 'number' &&
    typeof alert.location.longitude === 'number';

  // Calculate bounding box encompassing all risk zones and the current alert
  const bounds = useMemo(() => {
    const lats: number[] = [];
    const lngs: number[] = [];

    if (hasLocation) {
      lats.push(alert.location!.latitude);
      lngs.push(alert.location!.longitude);
    }

    zones.forEach((z) => {
      (z.boundaryCoordinates || []).forEach((pt) => {
        lats.push(pt.latitude);
        lngs.push(pt.longitude);
      });
    });

    animals.forEach((a) => {
      if (a.lastKnownLocation) {
        lats.push(a.lastKnownLocation.latitude);
        lngs.push(a.lastKnownLocation.longitude);
      }
    });

    if (lats.length === 0 || lngs.length === 0) {
      return null;
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = Math.max(maxLat - minLat, 0.04);
    const lngDelta = Math.max(maxLng - minLng, 0.04);

    // 20% margin padding
    const paddingLat = latDelta * 0.2;
    const paddingLng = lngDelta * 0.2;

    return {
      minLat: minLat - paddingLat,
      maxLat: maxLat + paddingLat,
      minLng: minLng - paddingLng,
      maxLng: maxLng + paddingLng,
    };
  }, [hasLocation, alert.location, zones, animals]);

  // Coordinate projection from lat/lng to SVG viewBox (1000 x 600)
  const project = useMemo(() => {
    if (!bounds) {
      return (_lat: number, _lng: number) => ({ x: 500, y: 300 });
    }

    const { minLat, maxLat, minLng, maxLng } = bounds;
    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    return (lat: number, lng: number) => {
      // Base normalized coordinates in 1000x600 space
      const baseX = ((lng - minLng) / lngSpan) * 1000;
      const baseY = ((maxLat - lat) / latSpan) * 600;

      // Apply zoom & pan transformations relative to center (500, 300)
      const cx = 500;
      const cy = 300;
      const zoomedX = cx + (baseX - cx) * zoomLevel + panOffset.x;
      const zoomedY = cy + (baseY - cy) * zoomLevel + panOffset.y;

      return { x: zoomedX, y: zoomedY };
    };
  }, [bounds, zoomLevel, panOffset]);

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    if (onRecenter) {
      onRecenter();
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.3, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.3, 0.7));
  };

  if (!hasLocation && zones.length === 0) {
    return (
      <View style={[styles.mapContainer, { height }]}>
        <View style={styles.noLocationOverlay}>
          <HiOutlineMapPin size={36} color="#A76D40" />
          <Text style={styles.noLocationTitle}>Coordinates Pending Telemetry Lock</Text>
          <Text style={styles.noLocationSubtitle}>
            GPS transmission has not locked valid coordinates for this alert record yet.
          </Text>
        </View>
      </View>
    );
  }

  // Pre-project alert marker coordinate
  const alertPos = hasLocation
    ? project(alert.location!.latitude, alert.location!.longitude)
    : null;

  return (
    <View style={[styles.mapContainer, { height }]} testID="wildlife-alert-map">
      {/* Interactive Map Canvas rendered with responsive SVG */}
      <svg
        viewBox="0 0 1000 600"
        width="100%"
        height="100%"
        style={{
          display: 'block',
          backgroundColor: '#E8EDE2',
        }}
      >
        <defs>
          {/* Subtle sanctuary terrain grid pattern */}
          <pattern
            id="tacticalGrid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#D3DEC9"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        {/* 1. Tactical Grid & Contour background */}
        <rect width="1000" height="600" fill="#E8EDE2" />
        <rect width="1000" height="600" fill="url(#tacticalGrid)" />

        {/* Concentric sanctuary radar contour rings */}
        <circle cx="500" cy="300" r="180" fill="none" stroke="#D3DEC9" strokeWidth="1" strokeDasharray="4 6" opacity="0.7" />
        <circle cx="500" cy="300" r="340" fill="none" stroke="#D3DEC9" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />

        {/* Sanctuary perimeter baseline */}
        <text
          x="40"
          y="45"
          fill="#5D7553"
          fontSize="14"
          fontWeight="800"
          letterSpacing="1.5"
          opacity="0.85"
        >
          YALA WILDLIFE SANCTUARY SECTOR
        </text>

        {/* 2. Risk Zones Polygons with boundary coordinates */}
        {zones.map((zone) => {
          if (!zone.boundaryCoordinates || zone.boundaryCoordinates.length < 3) {
            return null;
          }

          const pointsStr = zone.boundaryCoordinates
            .map((p) => {
              const pt = project(p.latitude, p.longitude);
              return `${pt.x},${pt.y}`;
            })
            .join(' ');

          const isCritical = zone.riskLevel === RiskLevel.CRITICAL;
          const isHigh = zone.riskLevel === RiskLevel.HIGH;

          const fillColor = isCritical
            ? 'rgba(225, 29, 72, 0.20)'
            : isHigh
            ? 'rgba(217, 119, 6, 0.20)'
            : 'rgba(62, 142, 65, 0.15)';

          const strokeColor = isCritical
            ? '#E11D48'
            : isHigh
            ? '#D97706'
            : '#3E8E41';

          // Centroid approximation for watermark label
          let sumX = 0;
          let sumY = 0;
          zone.boundaryCoordinates.forEach((p) => {
            const pt = project(p.latitude, p.longitude);
            sumX += pt.x;
            sumY += pt.y;
          });
          const count = zone.boundaryCoordinates.length;
          const cx = sumX / count;
          const cy = sumY / count;

          return (
            <g key={zone.id}>
              <polygon
                points={pointsStr}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeDasharray={isCritical || isHigh ? '8 5' : 'none'}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                fill={isCritical ? '#9F1239' : '#92400E'}
                fontSize="15"
                fontWeight="900"
                letterSpacing="1"
                opacity="0.8"
              >
                {zone.name.toUpperCase()}
              </text>
              <text
                x={cx}
                y={cy + 18}
                textAnchor="middle"
                fill={isCritical ? '#BE123C' : '#B45309'}
                fontSize="11"
                fontWeight="800"
                letterSpacing="0.8"
                opacity="0.75"
              >
                ({zone.riskLevel} RISK ZONE)
              </text>
            </g>
          );
        })}

        {/* 3. Other Monitored Wildlife GPS Positions */}
        {animals.map((anim) => {
          if (!anim.lastKnownLocation || anim.id === alert.animalId) {
            return null;
          }
          const pt = project(
            anim.lastKnownLocation.latitude,
            anim.lastKnownLocation.longitude
          );
          return (
            <g key={anim.id}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="7"
                fill="#3E8E41"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={pt.y - 11}
                textAnchor="middle"
                fill="#1C2A1E"
                fontSize="10"
                fontWeight="700"
              >
                {anim.name}
              </text>
            </g>
          );
        })}

        {/* 4. Telemetry Trail for Subject Animal */}
        {alertPos && (
          <g>
            {/* Approach trajectory simulation trail */}
            <path
              d={`M ${alertPos.x - 70} ${alertPos.y + 40} Q ${alertPos.x - 30} ${
                alertPos.y + 20
              } ${alertPos.x} ${alertPos.y}`}
              fill="none"
              stroke="#A76D40"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.75"
            />

            {/* Pulsing Danger Zone Radius around subject */}
            <circle
              cx={alertPos.x}
              cy={alertPos.y}
              r="34"
              fill={
                alert.severity === RiskLevel.CRITICAL
                  ? 'rgba(225, 29, 72, 0.22)'
                  : 'rgba(217, 119, 6, 0.22)'
              }
              stroke={
                alert.severity === RiskLevel.CRITICAL ? '#E11D48' : '#D97706'
              }
              strokeWidth="1.5"
            />

            {/* Inner Marker Core */}
            <circle
              cx={alertPos.x}
              cy={alertPos.y}
              r="14"
              fill="#1C2A1E"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
            <circle
              cx={alertPos.x}
              cy={alertPos.y}
              r="5"
              fill={
                alert.severity === RiskLevel.CRITICAL ? '#E11D48' : '#F59E0B'
              }
            />

            {/* Animal Tag Badge above marker */}
            <rect
              x={alertPos.x - 48}
              y={alertPos.y - 42}
              width="96"
              height="22"
              rx="6"
              fill="#1C2A1E"
              stroke="#D1B370"
              strokeWidth="1"
            />
            <text
              x={alertPos.x}
              y={alertPos.y - 27}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="800"
              letterSpacing="0.5"
            >
              {alert.animalName || 'SUBJECT'}
            </text>
          </g>
        )}
      </svg>

      {/* Map Control Buttons: Recenter, Zoom In, Zoom Out */}
      <View style={styles.controlsGroup}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleReset}
          activeOpacity={0.7}
          title="Recenter Map"
        >
          <TbCurrentLocation size={16} color="#2D5A27" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleZoomIn}
          activeOpacity={0.7}
          title="Zoom In"
        >
          <TbPlus size={16} color="#2D5A27" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleZoomOut}
          activeOpacity={0.7}
          title="Zoom Out"
        >
          <TbMinus size={16} color="#2D5A27" />
        </TouchableOpacity>
      </View>

      {/* Status Pill: GPS Active (Inspired directly by reference image) */}
      <View style={styles.statusPill}>
        <View style={styles.gpsActiveDot} />
        <TbSatellite size={12} color="#065F46" />
        <Text style={styles.statusPillText}>
          {hasLocation
            ? `GPS • Active (${alert.location!.latitude.toFixed(4)}, ${alert.location!.longitude.toFixed(4)})`
            : 'GPS • Signal Searching'}
        </Text>
      </View>

      {/* Legend Badge Overlay */}
      <View style={styles.legendOverlay}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#E11D48' }]} />
          <Text style={styles.legendText}>Critical</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#1C2A1E' }]} />
          <Text style={styles.legendText}>Alert Pos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    backgroundColor: '#E8EDE2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C8D5BF',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#1C2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  controlsGroup: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    gap: 6,
    zIndex: 10,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1B370',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  gpsActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.2,
  },
  legendOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5D8',
    gap: 8,
    zIndex: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
  },
  noLocationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: '#FAF7EE',
  },
  noLocationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#854F26',
    textAlign: 'center',
  },
  noLocationSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
});
