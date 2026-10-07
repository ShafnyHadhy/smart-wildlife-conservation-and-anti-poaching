import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';

/**
 * High-fidelity visual thumbnails for the 6 conflict categories
 */
export function ConflictTypeThumb({ type }: { type: string }) {
  switch (type) {
    case 'ELEPHANT_HUMAN_CONFLICT':
      return (
        <View style={[styles.thumbBox, { backgroundColor: '#E2E8F0', borderColor: '#94A3B8' }]}>
          <Text style={styles.thumbEmoji}>🐘</Text>
        </View>
      );
    case 'CROP_DAMAGE':
      return (
        <View style={[styles.thumbBox, { backgroundColor: '#ECFDF5', borderColor: '#86EFAC' }]}>
          <Text style={styles.thumbEmoji}>🌾</Text>
        </View>
      );
    case 'ANIMAL_INTRUSION':
      return (
        <View style={[styles.thumbBox, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
          <Text style={styles.thumbEmoji}>🐆</Text>
        </View>
      );
    case 'LIVESTOCK_ATTACK':
      return (
        <View style={[styles.thumbBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
          <Text style={styles.thumbEmoji}>🐄</Text>
        </View>
      );
    case 'PROPERTY_DAMAGE':
      return (
        <View style={[styles.thumbBox, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
          <Text style={styles.thumbEmoji}>🏚️</Text>
        </View>
      );
    case 'OTHER':
    default:
      return (
        <View style={[styles.thumbBox, { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' }]}>
          <Text style={styles.thumbEmoji}>🐒</Text>
        </View>
      );
  }
}

/**
 * Stylized interactive map representation showing Hambantota / Kithulu Buffer Zone
 */
export function BufferZoneMapGraphic({
  villageName,
  zoomLevel = 1,
}: {
  villageName: string;
  zoomLevel?: number;
}) {
  return (
    <View style={styles.mapContainer}>
      {/* Background terrain layers */}
      <View style={styles.mapTerrain}>
        {/* River / Canal */}
        <View style={styles.mapRiver} />
        {/* Road line B631 */}
        <View style={styles.mapRoadMajor} />
        <View style={styles.mapRoadMinor} />

        {/* Road badge */}
        <View style={styles.roadBadge}>
          <Text style={styles.roadBadgeText}>B631</Text>
        </View>

        {/* Landmark labels */}
        <View style={styles.landmarkLabelLeft}>
          <Text style={styles.landmarkText}>Kithulu</Text>
        </View>

        <View style={styles.landmarkLabelRight}>
          <Text style={styles.landmarkText}>Hambantota</Text>
        </View>

        {/* Dynamic target Village marker */}
        <View style={styles.villagePinWrap}>
          {/* Buffer Radius Circle */}
          <View style={styles.bufferRadiusRing} />
          {/* Location Pin */}
          <View style={styles.pinCenterBadge}>
            <Text style={styles.pinIconText}>📍</Text>
          </View>
          <View style={styles.pinPulseShadow} />
        </View>
      </View>
    </View>
  );
}

let customBannerSource: any = null;
try {
  customBannerSource = require('../../../../assets/banner.png');
} catch {
  customBannerSource = null;
}

/**
 * Scenic Wildlife Nature Banner for Community Home Header
 */
export function ScenicNatureBanner() {
  if (customBannerSource) {
    return (
      <View style={styles.scenicBanner}>
        <Image
          source={customBannerSource}
          style={styles.scenicBannerImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={styles.scenicBanner}>
      <View style={styles.scenicSky}>
        <View style={styles.scenicSun} />
        <Text style={styles.scenicBirds}>🕊️  🕊️</Text>
      </View>
      <View style={styles.scenicMountains}>
        <View style={styles.mountainRidgeLeft} />
        <View style={styles.mountainRidgeRight} />
      </View>
      <View style={styles.scenicLake} />
      <View style={styles.scenicTreesRow}>
        <Text style={styles.treeIcon}>🌲</Text>
        <Text style={styles.treeIcon}>🌳</Text>
        <Text style={styles.treeIcon}>🌲</Text>
        <Text style={styles.treeIcon}>🌳</Text>
      </View>
    </View>
  );
}

/**
 * Meadow Wildlife Silhouette Footer Graphic ("People. Wildlife. Safer Communities.")
 */
export function WildlifeFooterSilhouette() {
  return (
    <View style={styles.footerSilhouetteContainer}>
      <View style={styles.animalsRow}>
        <Text style={styles.animalSilhouette}>🐘</Text>
        <Text style={styles.animalSilhouetteSmall}>🦌</Text>
        <Text style={styles.animalSilhouetteTiny}>🐗</Text>
      </View>
      <View style={styles.grassLine} />
      <Text style={styles.footerTagline}>People. Wildlife. Safer Communities.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbEmoji: {
    fontSize: 26,
  },
  mapContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  mapTerrain: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E5F1E5',
  },
  mapRiver: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '28%',
    width: 14,
    backgroundColor: '#93C5FD',
    transform: [{ skewX: '-15deg' }],
    opacity: 0.85,
  },
  mapRoadMajor: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#FDE047',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EAB308',
  },
  mapRoadMinor: {
    position: 'absolute',
    top: '30%',
    bottom: 0,
    left: '60%',
    width: 4,
    backgroundColor: '#E2E8F0',
  },
  roadBadge: {
    position: 'absolute',
    top: '42%',
    right: '30%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  roadBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
  },
  landmarkLabelLeft: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  landmarkLabelRight: {
    position: 'absolute',
    bottom: 26,
    right: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  landmarkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  villagePinWrap: {
    position: 'absolute',
    top: '32%',
    left: '46%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bufferRadiusRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(26, 83, 54, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(26, 83, 54, 0.4)',
  },
  pinCenterBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#14532D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinIconText: {
    fontSize: 18,
  },
  pinPulseShadow: {
    width: 10,
    height: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    marginTop: 2,
  },
  scenicBanner: {
    width: '100%',
    height: 220,
    backgroundColor: '#BFDBFE',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  scenicBannerImage: {
    width: '100%',
    height: '100%',
  },
  scenicSky: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  scenicSun: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF08A',
    opacity: 0.9,
  },
  scenicBirds: {
    fontSize: 14,
    color: '#334155',
  },
  scenicMountains: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    height: 70,
  },
  mountainRidgeLeft: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    width: 220,
    height: 70,
    backgroundColor: '#475569',
    borderTopRightRadius: 100,
    opacity: 0.7,
  },
  mountainRidgeRight: {
    position: 'absolute',
    bottom: 0,
    right: -20,
    width: 240,
    height: 60,
    backgroundColor: '#334155',
    borderTopLeftRadius: 120,
    opacity: 0.85,
  },
  scenicLake: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#38BDF8',
  },
  scenicTreesRow: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    flexDirection: 'row',
    gap: 8,
  },
  treeIcon: {
    fontSize: 16,
  },
  footerSilhouetteContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 10,
  },
  animalsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 4,
  },
  animalSilhouette: {
    fontSize: 26,
  },
  animalSilhouetteSmall: {
    fontSize: 20,
  },
  animalSilhouetteTiny: {
    fontSize: 16,
  },
  grassLine: {
    width: '60%',
    height: 2,
    backgroundColor: '#166534',
    marginBottom: 6,
    opacity: 0.3,
  },
  footerTagline: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#166534',
    letterSpacing: 0.4,
  },
});
