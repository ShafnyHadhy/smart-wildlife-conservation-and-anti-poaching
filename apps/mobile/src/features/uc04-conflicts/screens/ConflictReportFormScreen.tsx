import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { AppHeader } from '../../../components/common/AppHeader';
import { ConflictType, CreateConflictReportDTO } from '../types';
import { mobileConflictService } from '../services/conflictService';
import { AuthUser } from '../../../services/authService';
import { getLiveLocation, pickPhoto, PhotoSource } from '../utils/deviceAccess';
import {
  CONFLICT_TYPE_META,
  PALETTE,
  mapsUrl,
  referenceCode,
} from '../utils/conflictMeta';
import { MapLink } from '../components/ConflictParts';

interface Props {
  isOnline?: boolean;
  onBack?: () => void;
  /** Called with the new report id when the member chooses "Track my report". */
  onSubmitSuccess?: (reportId?: string) => void;
  user?: AuthUser;
  initialStep?: number;
}

const PARK_ID = '11111111-1111-1111-1111-111111111111';

export const VILLAGE_PRESETS = [
  { name: 'Kithulkote Village', landmark: 'Kithulkote, Hambantota buffer zone', lat: 6.355, lng: 81.335 },
  { name: 'Palatupana Perimeter', landmark: 'Palatupana coastal corridor, Yala', lat: 6.273, lng: 81.436 },
  { name: 'Kataragama Boundary', landmark: 'Kataragama sacred buffer zone', lat: 6.418, lng: 81.341 },
  { name: 'Lunugamvehera Border', landmark: 'Lunugamvehera reservoir boundary', lat: 6.376, lng: 81.205 },
];

const TYPE_ORDER: ConflictType[] = [
  ConflictType.ELEPHANT_HUMAN_CONFLICT,
  ConflictType.CROP_DAMAGE,
  ConflictType.ANIMAL_INTRUSION,
  ConflictType.LIVESTOCK_ATTACK,
  ConflictType.PROPERTY_DAMAGE,
  ConflictType.OTHER,
];

const WHEN_OPTIONS = [
  { key: 'now', label: 'Happening now', offsetMin: 0 },
  { key: 'hour', label: 'In the last hour', offsetMin: 30 },
  { key: 'today', label: 'Earlier today', offsetMin: 240 },
  { key: 'yesterday', label: 'Yesterday', offsetMin: 24 * 60 },
];

const STEP_LABELS = ['Type', 'Location', 'Details', 'Review'];
const MAX_PHOTOS = 5;
const MAX_PHOTO_CHARS = 2_400_000;

type LocationSource = 'none' | 'live' | 'village' | 'manual';

function nearestVillage(lat: number, lng: number) {
  let best = VILLAGE_PRESETS[0];
  let bestDist = Infinity;
  for (const v of VILLAGE_PRESETS) {
    const d = Math.hypot(v.lat - lat, v.lng - lng) * 111; // ≈ km
    if (d < bestDist) {
      best = v;
      bestDist = d;
    }
  }
  return { village: best, km: bestDist };
}

export function ConflictReportFormScreen({
  isOnline = true,
  onBack,
  onSubmitSuccess,
  user,
  initialStep = 1,
}: Props) {
  const [step, setStep] = useState<number>(initialStep);

  // Step 1
  const [type, setType] = useState<ConflictType>(ConflictType.CROP_DAMAGE);

  // Step 2 – location
  const [source, setSource] = useState<LocationSource>('none');
  const [latitude, setLatitude] = useState<string>(VILLAGE_PRESETS[0].lat.toFixed(6));
  const [longitude, setLongitude] = useState<string>(VILLAGE_PRESETS[0].lng.toFixed(6));
  const [accuracy, setAccuracy] = useState<number | undefined>();
  const [villageIdx, setVillageIdx] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locNotice, setLocNotice] = useState<string | null>(null);

  // Step 3 – details
  const [whenKey, setWhenKey] = useState<string>('now');
  const [animalCount, setAnimalCount] = useState<number>(1);
  const [animalsUnknown, setAnimalsUnknown] = useState<boolean>(false);
  const [immediateRisk, setImmediateRisk] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    reference: string;
    reportId?: string;
    queued: boolean;
    duplicate: boolean;
  } | null>(null);

  const reporterName = user?.fullName || '';
  const reporterPhone = user?.phoneNumber || '';

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords =
    !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const resolvedPlaceName = (): string => {
    if (source === 'village' && villageIdx !== null) return VILLAGE_PRESETS[villageIdx].name;
    if (source === 'live' && hasCoords) {
      const near = nearestVillage(lat, lng);
      return near.km < 20 ? `Near ${near.village.name}` : 'Live GPS location';
    }
    return '';
  };

  /* ------------------------------ location --------------------------------- */
  const useLiveLocation = async () => {
    setLocating(true);
    setLocNotice(null);
    setError(null);
    try {
      const pos = await getLiveLocation();
      setLatitude(pos.latitude.toFixed(6));
      setLongitude(pos.longitude.toFixed(6));
      setAccuracy(pos.accuracyMeters);
      setSource('live');
      setVillageIdx(null);
      if (pos.accuracyMeters && pos.accuracyMeters > 200) {
        setLocNotice(
          `GPS accuracy is about ±${Math.round(pos.accuracyMeters)} m. You can also pick your nearest village below.`
        );
      }
    } catch (e: any) {
      setLocNotice(
        `${e?.message || 'GPS could not be read.'} Please choose your nearest village below.`
      );
    } finally {
      setLocating(false);
    }
  };

  const chooseVillage = (idx: number) => {
    const v = VILLAGE_PRESETS[idx];
    setVillageIdx(idx);
    setLatitude(v.lat.toFixed(6));
    setLongitude(v.lng.toFixed(6));
    setAccuracy(undefined);
    setSource('village');
    setLocNotice(null);
    setError(null);
  };

  /* -------------------------------- photos --------------------------------- */
  const addPhoto = async (from: PhotoSource) => {
    setPhotoError(null);
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    try {
      setPhotoBusy(true);
      const uri = await pickPhoto(from);
      if (!uri) return;
      if (uri.length > MAX_PHOTO_CHARS) {
        setPhotoError('That photo is too large. Please choose a smaller one.');
        return;
      }
      setPhotos((prev) => [...prev, uri]);
    } catch (e: any) {
      setPhotoError(e?.message || 'Could not add the photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  /* ------------------------------ navigation ------------------------------- */
  const goNextFromLocation = () => {
    if (!hasCoords) {
      setError('Please share your live location or choose your village so rangers can find the spot.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const goNextFromDetails = () => {
    if (description.trim().length < 5) {
      setError('Please type a description of the incident (at least 5 characters).');
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleBack = () => {
    setError(null);
    if (step > 1 && step <= 4) setStep(step - 1);
    else onBack?.();
  };

  /* -------------------------------- submit --------------------------------- */
  const submit = async () => {
    setError(null);
    const memberId = user?.id || 'bbbb0001-0000-0000-0000-000000000001';
    if (!hasCoords) {
      setError('Location is missing. Go back and share or choose a location.');
      setStep(2);
      return;
    }
    if (description.trim().length < 5) {
      setError('Please type a description of the incident (at least 5 characters).');
      setStep(3);
      return;
    }

    const when = WHEN_OPTIONS.find((w) => w.key === whenKey) || WHEN_OPTIONS[0];
    const reportedAt = new Date(Date.now() - when.offsetMin * 60000).toISOString();
    const dto: CreateConflictReportDTO = {
      communityMemberId: memberId,
      parkId: PARK_ID,
      conflictType: type,
      description: description.trim(),
      latitude: lat,
      longitude: lng,
      reportedAt,
      clientMutationId: `mob-hwc-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`,
      severity: immediateRisk ? 'HIGH' : 'MEDIUM',
      estimatedAnimalsInvolved: animalsUnknown ? undefined : animalCount,
      locationName: resolvedPlaceName() || undefined,
      immediateRisk,
      photoUrls: photos.length ? photos : undefined,
    };

    try {
      setSubmitting(true);
      const res = await mobileConflictService.submitConflict(dto, isOnline);
      if (res.direct) {
        const saved = res.result || {};
        setResult({
          reference: saved.id
            ? referenceCode({ id: saved.id, reportedAt })
            : 'Recorded',
          reportId: saved.id,
          queued: false,
          duplicate: !!saved.potentialDuplicateOf,
        });
      } else {
        setResult({ reference: 'Waiting to send', queued: true, duplicate: false });
      }
      setStep(5);
    } catch (e: any) {
      setError(e?.message || 'The report could not be sent. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------- success screen ----------------------------- */
  if (step === 5 && result) {
    return (
      <View style={s.page}>
        <AppHeader title="Report Submitted" subtitle="Human-Wildlife Conflict • UC04" />
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.successCard}>
            <View style={s.successCheck}>
              <Text style={s.successCheckText}>✓</Text>
            </View>
            <Text style={s.successTitle}>
              {result.queued ? 'Saved on your phone' : 'Report Logged Successfully!'}
            </Text>
            <Text style={s.successText}>
              {result.queued
                ? 'Your report has been stored in your offline queue and will automatically transmit once connected to the network.'
                : 'Wildlife Rangers have been notified at central command and can view your report immediately.'}
            </Text>

            <View style={s.refBox}>
              <Text style={s.refLabel}>REFERENCE NUMBER</Text>
              <Text style={s.refCode}>{result.reference}</Text>
            </View>

            {result.duplicate ? (
              <View style={[s.warnBox, { width: '100%' }]}>
                <Text style={s.warnText}>
                  ℹ️ Another nearby report was recently received. Rangers are clustering these incidents for rapid triage.
                </Text>
              </View>
            ) : null}

            <View style={s.nextCard}>
              <Text style={s.nextTitle}>What happens next:</Text>
              <Text style={s.nextItem}>1. 🔍 <Text style={{ fontWeight: '700' }}>Ranger Review:</Text> An officer will inspect the location & details.</Text>
              <Text style={s.nextItem}>2. 🚨 <Text style={{ fontWeight: '700' }}>Field Response:</Text> Mitigation units & patrol teams dispatch if needed.</Text>
              <Text style={s.nextItem}>3. 📲 <Text style={{ fontWeight: '700' }}>Live Updates:</Text> Track progress and status directly in "My Reports".</Text>
            </View>

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => {
                if (onSubmitSuccess) onSubmitSuccess(result.reportId);
                else handleBack();
              }}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>View My Reports ›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.outlineBtn}
              onPress={() => {
                setStep(1);
                setDescription('');
                setPhotos([]);
                setResult(null);
                setSource('none');
              }}
              activeOpacity={0.85}
            >
              <Text style={s.outlineBtnText}>+ Report Another Incident</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ----------------------------- wizard layout ----------------------------- */
  return (
    <View style={s.page}>
      <AppHeader
        title="Report Conflict"
        subtitle="Human-Wildlife Coexistence • UC04"
        showBackButton={true}
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Status Network Badge */}
        <View style={[s.netChip, { backgroundColor: isOnline ? '#DCFCE7' : PALETTE.amberSoft }]}>
          <View style={[s.netDot, { backgroundColor: isOnline ? '#16A34A' : '#D97706' }]} />
          <Text style={[s.netChipText, { color: isOnline ? '#166534' : '#92400E' }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE MODE ACTIVE'}
          </Text>
          {!isOnline && (
            <Text style={s.netChipSub}>• Local queue enabled</Text>
          )}
        </View>

        {/* Progress Stepper */}
        <View style={s.stepperWrapper}>
          <View style={s.progressRow}>
            {STEP_LABELS.map((label, idx) => {
              const n = idx + 1;
              const done = step > n;
              const active = step === n;
              return (
                <View key={label} style={s.progressItem}>
                  <View
                    style={[
                      s.progressDot,
                      active && s.progressDotActive,
                      done && s.progressDotDone,
                    ]}
                  >
                    <Text
                      style={[
                        s.progressDotText,
                        (active || done) && { color: PALETTE.white, fontWeight: '800' },
                      ]}
                    >
                      {done ? '✓' : n}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.progressLabel,
                      active && s.progressLabelActive,
                      done && s.progressLabelDone,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={s.stepCounter}>Step {step} of 4: {STEP_LABELS[step - 1]}</Text>
        </View>

        {/* ------------------------------ STEP 1 ------------------------------ */}
        {step === 1 && (
          <View style={s.stepContainer}>
            <Text style={s.h2}>What type of conflict occurred?</Text>
            <Text style={s.hint}>Choose the category that best matches what you witnessed.</Text>
            
            {TYPE_ORDER.map((t) => {
              const meta = CONFLICT_TYPE_META[t];
              const selected = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[s.typeCard, selected && s.typeCardOn]}
                  onPress={() => setType(t)}
                  activeOpacity={0.85}
                >
                  <View style={[s.typeIconBox, selected && s.typeIconBoxOn]}>
                    <Text style={s.typeIcon}>{meta.icon}</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[s.typeTitle, selected && { color: PALETTE.forest }]}>
                      {meta.label}
                    </Text>
                    <Text style={s.typeHint}>{meta.hint}</Text>
                  </View>
                  <View style={[s.radio, selected && s.radioOn]}>
                    {selected && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(2)} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Continue to Location ›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ------------------------------ STEP 2 ------------------------------ */}
        {step === 2 && (
          <View style={s.stepContainer}>
            <Text style={s.h2}>Where is the incident located?</Text>
            <Text style={s.hint}>
              Use your device's live GPS, or select your nearest village location.
            </Text>

            <TouchableOpacity
              style={[s.liveLocationBtn, source === 'live' && s.liveLocationBtnActive]}
              onPress={useLiveLocation}
              disabled={locating}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={s.btnContentRow}>
                  <Text style={s.btnIcon}>{source === 'live' ? '✅' : '📍'}</Text>
                  <Text style={s.liveLocationBtnText}>
                    {source === 'live' ? 'Live GPS Attached (Tap to Refresh)' : 'Use My Live GPS Location'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {locNotice ? (
              <View style={s.warnBox}>
                <Text style={s.warnText}>📍 {locNotice}</Text>
              </View>
            ) : null}

            {/* Quick Village Presets */}
            <Text style={s.sectionHeaderLabel}>Or choose nearest village:</Text>
            <View style={s.chipWrap}>
              {VILLAGE_PRESETS.map((v, idx) => (
                <TouchableOpacity
                  key={v.name}
                  style={[s.chip, villageIdx === idx && s.chipOn]}
                  onPress={() => chooseVillage(idx)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.chipIcon, villageIdx === idx && { color: PALETTE.white }]}>🏡</Text>
                  <Text style={[s.chipText, villageIdx === idx && s.chipTextOn]}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {source !== 'none' && hasCoords && (
              <View style={s.locCard}>
                <View style={s.locHeaderRow}>
                  <Text style={s.locTitle}>📍 SELECTED LOCATION</Text>
                  <View style={s.coordBadge}>
                    <Text style={s.coordBadgeText}>
                      {source === 'live' ? 'Live GPS Fix' : 'Village Area'}
                    </Text>
                  </View>
                </View>
                <Text style={s.locName}>{resolvedPlaceName() || 'Designated Coordinates'}</Text>
                <Text style={s.locCoords}>
                  Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
                  {source === 'live' && accuracy ? `  (±${Math.round(accuracy)} m)` : ''}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <MapLink latitude={lat} longitude={lng} />
                </View>
              </View>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <View style={s.navRow}>
              <TouchableOpacity style={s.navBack} onPress={() => setStep(1)} activeOpacity={0.85}>
                <Text style={s.outlineBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.navNext} onPress={goNextFromLocation} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Continue to Details ›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ------------------------------ STEP 3 ------------------------------ */}
        {step === 3 && (
          <View style={s.stepContainer}>
            <Text style={s.h2}>Incident Details & Severity</Text>
            <Text style={s.hint}>Providing detailed information assists rangers with rapid triage.</Text>

            <Text style={s.sectionHeaderLabel}>When did this happen?</Text>
            <View style={s.chipWrap}>
              {WHEN_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w.key}
                  style={[s.chip, whenKey === w.key && s.chipOn]}
                  onPress={() => setWhenKey(w.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.chipText, whenKey === w.key && s.chipTextOn]}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sectionHeaderLabel}>Estimated Number of Animals:</Text>
            <View style={s.stepperRow}>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => {
                  setAnimalsUnknown(false);
                  setAnimalCount((c) => Math.max(1, c - 1));
                }}
                activeOpacity={0.7}
              >
                <Text style={s.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <View style={s.stepperValueBox}>
                <Text style={s.stepperValue}>{animalsUnknown ? '?' : animalCount}</Text>
              </View>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => {
                  setAnimalsUnknown(false);
                  setAnimalCount((c) => c + 1);
                }}
                activeOpacity={0.7}
              >
                <Text style={s.stepperBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chip, animalsUnknown && s.chipOn, { marginLeft: 14 }]}
                onPress={() => setAnimalsUnknown(!animalsUnknown)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, animalsUnknown && s.chipTextOn]}>Unknown Count</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionHeaderLabel}>Is anyone in immediate danger?</Text>
            <View style={s.twoCols}>
              <TouchableOpacity
                style={[s.choice, immediateRisk && s.choiceDanger]}
                onPress={() => setImmediateRisk(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.choiceText, immediateRisk && { color: PALETTE.danger }]}>
                  🚨 Yes, High Risk / Urgent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.choice, !immediateRisk && s.choiceOk]}
                onPress={() => setImmediateRisk(false)}
                activeOpacity={0.8}
              >
                <Text style={[s.choiceText, !immediateRisk && { color: PALETTE.forest }]}>
                  🛡️ No, Stable Situation
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionHeaderLabel}>Incident Description *</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Bull elephant broke through garden fence, destroyed banana trees and is heading toward the canal."
              placeholderTextColor="#9CA3AF"
              multiline={true}
              numberOfLines={4}
            />

            <Text style={s.sectionHeaderLabel}>Attach Photos (Optional, max {MAX_PHOTOS}):</Text>
            <View style={s.twoCols}>
              <TouchableOpacity
                style={s.photoBtn}
                onPress={() => addPhoto('camera')}
                disabled={photoBusy}
                activeOpacity={0.85}
              >
                <Text style={s.photoBtnText}>📷 Live Camera Viewfinder</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.photoBtn}
                onPress={() => addPhoto('library')}
                disabled={photoBusy}
                activeOpacity={0.85}
              >
                <Text style={s.photoBtnText}>📁 Upload from Device</Text>
              </TouchableOpacity>
            </View>
            {photoBusy ? <ActivityIndicator size="small" color={PALETTE.forest} style={{ marginTop: 8 }} /> : null}
            {photoError ? <Text style={s.errorText}>{photoError}</Text> : null}
            {photos.length > 0 && (
              <View style={s.photoRow}>
                {photos.map((uri, idx) => (
                  <View key={`${idx}`} style={s.photoWrap}>
                    <Image source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                    <TouchableOpacity
                      style={s.photoRemove}
                      onPress={() => setPhotos((p) => p.filter((_, i) => i !== idx))}
                      activeOpacity={0.8}
                    >
                      <Text style={s.photoRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <View style={s.navRow}>
              <TouchableOpacity style={s.navBack} onPress={() => setStep(2)} activeOpacity={0.85}>
                <Text style={s.outlineBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.navNext} onPress={goNextFromDetails} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Review Report ›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ------------------------------ STEP 4 ------------------------------ */}
        {step === 4 && (
          <View style={s.stepContainer}>
            <Text style={s.h2}>Review Conflict Summary</Text>
            <Text style={s.hint}>Verify your observation details before submitting to wildlife personnel.</Text>

            <View style={s.reviewCard}>
              <ReviewRow
                label="Conflict Type"
                value={`${CONFLICT_TYPE_META[type].icon} ${CONFLICT_TYPE_META[type].label}`}
                onEdit={() => setStep(1)}
              />
              <ReviewRow
                label="Location & Sector"
                value={`${resolvedPlaceName() || 'Designated Coordinates'}\n(${lat.toFixed(5)}, ${lng.toFixed(5)})`}
                onEdit={() => setStep(2)}
              />
              <ReviewRow
                label="Incident Timing"
                value={(WHEN_OPTIONS.find((w) => w.key === whenKey) || WHEN_OPTIONS[0]).label}
                onEdit={() => setStep(3)}
              />
              <ReviewRow
                label="Animals Observed"
                value={animalsUnknown ? 'Count Unknown' : `${animalCount} Animal(s)`}
                onEdit={() => setStep(3)}
              />
              <ReviewRow
                label="Urgency Assessment"
                value={immediateRisk ? '🚨 High Risk / Immediate Threat' : '🛡️ Standard Priority / Stable'}
                onEdit={() => setStep(3)}
              />
              <ReviewRow label="Description Narrative" value={description.trim()} onEdit={() => setStep(3)} />
              <ReviewRow
                label="Attached Photos"
                value={photos.length ? `${photos.length} Photo(s) Attached` : 'No photos attached'}
                onEdit={() => setStep(3)}
              />
              <ReviewRow
                label="Registered Reporter"
                value={`${reporterName || 'Community Member'}${reporterPhone ? ` (${reporterPhone})` : ''}`}
              />
            </View>

            {photos.length > 0 && (
              <View style={s.photoRow}>
                {photos.map((uri, idx) => (
                  <Image key={`${idx}`} source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                ))}
              </View>
            )}

            {!isOnline && (
              <View style={s.warnBox}>
                <Text style={s.warnText}>
                  📴 Offline Mode: This report will be queued securely on this device and synced as soon as internet connectivity returns.
                </Text>
              </View>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.primaryBtnText}>✓ Submit Conflict Report</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={s.outlineBtn} onPress={() => setStep(3)} activeOpacity={0.85}>
              <Text style={s.outlineBtnText}>Back to Edit Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <View style={s.reviewRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.reviewLabel}>{label}</Text>
        <Text style={s.reviewValue}>{value}</Text>
      </View>
      {onEdit ? (
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.reviewEditBadge}>
          <Text style={s.reviewEdit}>Edit</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Kept for callers/tests that want the raw Maps URL of a chosen point.
export const buildMapsUrl = mapsUrl;

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { padding: 16, paddingBottom: 48 },

  netChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  netDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  netChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  netChipSub: { fontSize: 11, color: '#92400E', marginLeft: 4, fontWeight: '600' },

  stepperWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressItem: { alignItems: 'center', flex: 1 },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: '#15803D' },
  progressDotDone: { backgroundColor: '#0F172A' },
  progressDotText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  progressLabel: { fontSize: 11, color: '#64748B', marginTop: 6, fontWeight: '600' },
  progressLabelActive: { color: '#15803D', fontWeight: '800' },
  progressLabelDone: { color: '#0F172A', fontWeight: '700' },
  stepCounter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },

  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  h2: { fontSize: 19, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  hint: { fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 18 },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  typeCardOn: { borderColor: '#15803D', backgroundColor: '#F0FDF4' },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIconBoxOn: { backgroundColor: '#DCFCE7' },
  typeIcon: { fontSize: 24 },
  typeTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  typeHint: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: '#15803D' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#15803D' },

  liveLocationBtn: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  liveLocationBtnActive: { backgroundColor: '#166534' },
  btnContentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnIcon: { fontSize: 16 },
  liveLocationBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  locCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    padding: 14,
    marginTop: 14,
  },
  locHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locTitle: { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 0.5 },
  coordBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  coordBadgeText: { fontSize: 10, fontWeight: '800', color: '#166534' },
  locName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 6 },
  locCoords: { fontSize: 12, color: '#64748B', marginTop: 3 },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  twoCols: { flexDirection: 'row', gap: 10 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  chipOn: { backgroundColor: '#15803D', borderColor: '#15803D' },
  chipIcon: { fontSize: 12 },
  chipText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  chipTextOn: { color: '#FFFFFF' },

  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 22, fontWeight: '800', color: '#15803D', lineHeight: 26 },
  stepperValueBox: {
    minWidth: 50,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  choice: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceDanger: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  choiceOk: { borderColor: '#15803D', backgroundColor: '#F0FDF4' },
  choiceText: { fontWeight: '800', fontSize: 13, color: '#475569' },

  photoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#15803D',
    borderStyle: 'dashed',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnText: { fontWeight: '800', color: '#15803D', fontSize: 12 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#E2E8F0' },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  primaryBtn: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  outlineBtnText: { color: '#475569', fontSize: 14, fontWeight: '800' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  navBack: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  navNext: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#15803D',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  warnBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnText: { color: '#92400E', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '700', marginTop: 10 },

  reviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 6,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  reviewLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewValue: { fontSize: 14, color: '#0F172A', fontWeight: '700', marginTop: 3, lineHeight: 19 },
  reviewEditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  reviewEdit: { color: '#15803D', fontWeight: '800', fontSize: 12 },

  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  successCheck: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successCheckText: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  successTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 16 },
  successText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  refBox: {
    alignSelf: 'stretch',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  refLabel: { fontSize: 11, fontWeight: '800', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.6 },
  refCode: { fontSize: 22, fontWeight: '900', color: '#78350F', marginTop: 4, letterSpacing: 1 },
  nextCard: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 16,
  },
  nextTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  nextItem: { fontSize: 13, color: '#334155', marginTop: 4, lineHeight: 18 },
});
