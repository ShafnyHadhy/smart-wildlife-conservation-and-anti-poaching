import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { AppHeader } from '../../../components/common/AppHeader';
import { AppCard } from '../../../components/common/AppCard';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ConflictType, CreateConflictReportDTO } from '../types';
import { mobileConflictService } from '../services/conflictService';

interface ConflictReportFormScreenProps {
  isOnline?: boolean;
  onBack?: () => void;
  onSubmitSuccess?: () => void;
}

const VILLAGE_PRESETS = [
  { name: 'Kataragama Boundary', lat: 6.418, lng: 81.341, parkId: '11111111-1111-1111-1111-111111111111' },
  { name: 'Kittulkote Village', lat: 6.355, lng: 81.335, parkId: '11111111-1111-1111-1111-111111111111' },
  { name: 'Palatupana Perimeter', lat: 6.273, lng: 81.436, parkId: '11111111-1111-1111-1111-111111111111' },
  { name: 'Lunugamvehera Border', lat: 6.376, lng: 81.205, parkId: '11111111-1111-1111-1111-111111111111' },
];

const CONFLICT_TYPES: { type: ConflictType; title: string; icon: string; desc: string }[] = [
  {
    type: ConflictType.CROP_DAMAGE,
    title: 'Crop Damage',
    icon: '🌾',
    desc: 'Elephants raiding banana, paddy, or sugar cane fields',
  },
  {
    type: ConflictType.ELEPHANT_HUMAN_CONFLICT,
    title: 'Elephant Encounter',
    icon: '🐘',
    desc: 'Direct wild elephant confrontation near residences',
  },
  {
    type: ConflictType.ANIMAL_INTRUSION,
    title: 'Village Intrusion',
    icon: '🏡',
    desc: 'Animal crossed boundary fence into residential sector',
  },
  {
    type: ConflictType.PROPERTY_DAMAGE,
    title: 'Property Damage',
    icon: '🏚️',
    desc: 'Broken boundary fences, wells, or farm huts',
  },
  {
    type: ConflictType.LIVESTOCK_ATTACK,
    title: 'Livestock Attack',
    icon: '🐄',
    desc: 'Predator or wild elephant attacked domestic cattle',
  },
  {
    type: ConflictType.OTHER,
    title: 'Other Hazard',
    icon: '⚠️',
    desc: 'Sighting or potential safety risk in community buffer',
  },
];

export function ConflictReportFormScreen({
  isOnline = true,
  onBack,
  onSubmitSuccess,
}: ConflictReportFormScreenProps) {
  const [selectedType, setSelectedType] = useState<ConflictType>(ConflictType.CROP_DAMAGE);
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number>(0);
  const [latitude, setLatitude] = useState<string>(VILLAGE_PRESETS[0].lat.toString());
  const [longitude, setLongitude] = useState<string>(VILLAGE_PRESETS[0].lng.toString());
  const [description, setDescription] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('Gamini Senanayake');
  const [reporterPhone, setReporterPhone] = useState<string>('+94 71 111 2233');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectVillage = (index: number) => {
    setSelectedVillageIndex(index);
    const v = VILLAGE_PRESETS[index];
    setLatitude(v.lat.toString());
    setLongitude(v.lng.toString());
  };

  const handleAutoGPS = () => {
    // Simulated high-precision Sri Lankan buffer fix
    const v = VILLAGE_PRESETS[selectedVillageIndex];
    const jitterLat = (Math.random() - 0.5) * 0.004;
    const jitterLng = (Math.random() - 0.5) * 0.004;
    const newLat = (v.lat + jitterLat).toFixed(6);
    const newLng = (v.lng + jitterLng).toFixed(6);
    setLatitude(newLat);
    setLongitude(newLng);
    Alert.alert('GPS Fix Acquired', `Location calibrated at ${newLat}, ${newLng}`);
  };

  const handleSubmit = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Coordinates', 'Please enter valid decimal geographic coordinates.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      Alert.alert('Missing Details', 'Please provide a descriptive account of the incident (at least 5 characters).');
      return;
    }

    try {
      setSubmitting(true);
      const preset = VILLAGE_PRESETS[selectedVillageIndex];
      const dto: CreateConflictReportDTO = {
        communityMemberId: 'bbbb0001-0000-0000-0000-000000000001',
        parkId: preset.parkId,
        conflictType: selectedType,
        description: `${description.trim()} [Reporter: ${reporterName}, Contact: ${reporterPhone}]`,
        latitude: lat,
        longitude: lng,
        reportedAt: new Date().toISOString(),
        clientMutationId: `mob-hwc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };

      const res = await mobileConflictService.submitConflict(dto, isOnline);

      if (res.direct) {
        Alert.alert(
          'Conflict Report Submitted',
          'Successfully transmitted to Park Command Center. Rapid response team will review.',
          [{ text: 'OK', onPress: () => onSubmitSuccess?.() || onBack?.() }]
        );
      } else {
        Alert.alert(
          'Stored Locally (Offline)',
          'No cellular signal. Report safely stored in offline queue and will sync automatically when reconnected.',
          [{ text: 'OK', onPress: () => onSubmitSuccess?.() || onBack?.() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit conflict report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Report Conflict"
        subtitle="Human-Wildlife Incident (UC04)"
        showBackButton={!!onBack}
        onBack={onBack}
      />

      <ScreenContainer scrollable={true}>
        {/* Offline / Connectivity Mode Card */}
        <AppCard variant={isOnline ? 'default' : 'highlight'} style={styles.modeCard}>
          <View style={styles.modeRow}>
            <View style={styles.modeTextCol}>
              <Text style={styles.modeTitle}>
                {isOnline ? 'Online Direct Dispatch' : 'Offline Queue Active'}
              </Text>
              <Text style={styles.modeSubtitle}>
                {isOnline
                  ? 'Transmits instantly to Community Liaison Desk.'
                  : 'Zero signal. Reports cached in local device storage.'}
              </Text>
            </View>
            <StatusBadge
              status={isOnline ? 'ONLINE' : 'OFFLINE'}
              size="small"
              variant={isOnline ? 'success' : 'warning'}
            />
          </View>
        </AppCard>

        {/* Section 1: Conflict Nature */}
        <Text style={styles.sectionTitle}>1. Nature of Wildlife Incident</Text>
        <View style={styles.typesGrid}>
          {CONFLICT_TYPES.map((item) => {
            const isSelected = selectedType === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                onPress={() => setSelectedType(item.type)}
                activeOpacity={0.8}
              >
                <Text style={styles.typeIcon}>{item.icon}</Text>
                <View style={styles.typeTextWrap}>
                  <Text style={[styles.typeTitle, isSelected && styles.typeTitleSelected]}>
                    {item.title}
                  </Text>
                  <Text style={styles.typeDesc} numberOfLines={2}>
                    {item.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section 2: Buffer Zone Village Presets */}
        <Text style={styles.sectionTitle}>2. Buffer Zone Location</Text>
        <View style={styles.villageRow}>
          {VILLAGE_PRESETS.map((v, idx) => {
            const isSelected = selectedVillageIndex === idx;
            return (
              <TouchableOpacity
                key={v.name}
                style={[styles.villageChip, isSelected && styles.villageChipSelected]}
                onPress={() => handleSelectVillage(idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.villageChipText, isSelected && styles.villageChipTextSelected]}>
                  {v.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Coordinates Card */}
        <AppCard style={styles.coordCard}>
          <View style={styles.coordHeader}>
            <Text style={styles.coordLabel}>Spatial Coordinates (WGS-84)</Text>
            <TouchableOpacity style={styles.gpsBtn} onPress={handleAutoGPS} activeOpacity={0.8}>
              <Text style={styles.gpsBtnText}>📍 Calibrate GPS</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.coordInputsRow}>
            <View style={styles.inputWrapHalf}>
              <Text style={styles.inputSmallLabel}>Latitude</Text>
              <TextInput
                style={styles.coordInput}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
                placeholder="6.355000"
              />
            </View>
            <View style={styles.inputWrapHalf}>
              <Text style={styles.inputSmallLabel}>Longitude</Text>
              <TextInput
                style={styles.coordInput}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
                placeholder="81.335000"
              />
            </View>
          </View>
        </AppCard>

        {/* Section 3: Community Member / Contact */}
        <Text style={styles.sectionTitle}>3. Reporter Information</Text>
        <AppCard style={styles.formCard}>
          <Text style={styles.inputLabel}>Reporting Resident / Liaison Name</Text>
          <TextInput
            style={styles.textInput}
            value={reporterName}
            onChangeText={setReporterName}
            placeholder="e.g. Gamini Senanayake"
          />

          <Text style={[styles.inputLabel, { marginTop: 10 }]}>Contact Mobile Number</Text>
          <TextInput
            style={styles.textInput}
            value={reporterPhone}
            onChangeText={setReporterPhone}
            keyboardType="phone-pad"
            placeholder="+94 77 123 4567"
          />
        </AppCard>

        {/* Section 4: Factual Incident Narrative */}
        <Text style={styles.sectionTitle}>4. Incident Narrative & Details</Text>
        <AppCard style={styles.formCard}>
          <Text style={styles.inputLabel}>Describe herd size, damaged crops, or breached fence</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Bull elephant entered sugarcane plantation past ditch fence at 10 PM. Estimated 40 plants destroyed. Requesting thunder flashes."
            multiline={true}
            numberOfLines={4}
          />
        </AppCard>

        {/* Submit Action */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Transmitting Report...' : 'Submit Conflict Report'}
          </Text>
        </TouchableOpacity>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  modeCard: {
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeTextCol: {
    flex: 1,
    marginRight: 8,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  modeSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 8,
  },
  typesGrid: {
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  typeButtonSelected: {
    borderColor: '#3E8E41',
    backgroundColor: '#FAF7EE',
    borderWidth: 2,
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeTextWrap: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  typeTitleSelected: {
    color: '#3E8E41',
  },
  typeDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  villageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  villageChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  villageChipSelected: {
    backgroundColor: '#3E8E41',
    borderColor: '#3E8E41',
  },
  villageChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  villageChipTextSelected: {
    color: '#FFFFFF',
  },
  coordCard: {
    marginBottom: 14,
  },
  coordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  gpsBtn: {
    backgroundColor: '#FAF7EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E8E41',
  },
  coordInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrapHalf: {
    flex: 1,
  },
  inputSmallLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  coordInput: {
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1C2A1E',
  },
  formCard: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C2A1E',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1C2A1E',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3E8E41',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
