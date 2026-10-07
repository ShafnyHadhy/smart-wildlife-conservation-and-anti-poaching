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
        <AppHeader title="Report sent" subtitle="Thank you for helping your community" />
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.successCard}>
            <View style={s.successCheck}>
              <Text style={s.successCheckText}>✓</Text>
            </View>
            <Text style={s.successTitle}>
              {result.queued ? 'Saved on your phone' : 'Report Submitted!'}
            </Text>
            <Text style={s.successText}>
              {result.queued
                ? 'You are offline. Your report is stored safely and will be sent automatically when you are back online.'
                : 'Rangers can now see your report on the operations dashboard.'}
            </Text>
            <View style={s.refBox}>
              <Text style={s.refLabel}>Reference Number</Text>
              <Text style={s.refCode}>{result.reference}</Text>
            </View>
            {result.duplicate && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxText}>
                  ℹ️ A similar report was already received near this place. Yours is still saved and
                  will help rangers confirm the situation.
                </Text>
              </View>
            )}
          </View>

          <View style={s.nextCard}>
            <Text style={s.nextTitle}>What happens next?</Text>
            <Text style={s.nextItem}>1️⃣  A ranger or liaison officer reviews your report.</Text>
            <Text style={s.nextItem}>2️⃣  You will see the status change in “My Reports”.</Text>
            <Text style={s.nextItem}>3️⃣  You get a notification when action is taken.</Text>
          </View>

          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => onSubmitSuccess?.(result.reportId)}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>📋 View My Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.outlineBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={s.outlineBtnText}>Back to home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  /* ------------------------------- wizard ---------------------------------- */
  return (
    <View style={s.page}>
      <AppHeader
        title="Report Human-Wildlife Conflict"
        subtitle={isOnline ? 'Online – sent straight to rangers' : 'Offline queue active'}
        showBackButton={true}
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* connectivity chip */}
        <View style={[s.netChip, { backgroundColor: isOnline ? '#DCFCE7' : PALETTE.amberSoft }]}>
          <Text style={[s.netChipText, { color: isOnline ? '#166534' : '#92400E' }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          {!isOnline && (
            <Text style={s.netChipSub}>Offline Queue Active</Text>
          )}
        </View>

        {/* progress */}
        <View style={s.progressRow}>
          {STEP_LABELS.map((label, idx) => {
            const n = idx + 1;
            const done = step > n;
            const active = step === n;
            return (
              <View key={label} style={s.progressItem}>
                <View style={[s.progressDot, (done || active) && s.progressDotOn]}>
                  <Text style={[s.progressDotText, (done || active) && { color: PALETTE.white }]}>
                    {done ? '✓' : n}
                  </Text>
                </View>
                <Text style={[s.progressLabel, active && { color: PALETTE.ink, fontWeight: '800' }]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={s.stepCounter}>Step {step} of 4</Text>

        {/* ------------------------------ STEP 1 ------------------------------ */}
        {step === 1 && (
          <View>
            <Text style={s.h2}>What type of conflict are you reporting?</Text>
            <Text style={s.hint}>Choose the one that best describes what you saw.</Text>
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
                  <Text style={s.typeIcon}>{meta.icon}</Text>
                  <View style={{ flex: 1 }}>
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
              <Text style={s.primaryBtnText}>Next &gt;</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ------------------------------ STEP 2 ------------------------------ */}
        {step === 2 && (
          <View>
            <Text style={s.h2}>Where did the incident occur?</Text>
            <Text style={s.hint}>
              Share your live location, or choose the nearest village if GPS is not working.
            </Text>

            <TouchableOpacity
              style={[s.primaryBtn, source === 'live' && s.primaryBtnDone]}
              onPress={useLiveLocation}
              disabled={locating}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.primaryBtnText}>
                  {source === 'live' ? '✅ Live location attached – tap to refresh' : '📍 Use my live location'}
                </Text>
              )}
            </TouchableOpacity>

            {locNotice ? (
              <View style={s.warnBox}>
                <Text style={s.warnText}>📍 {locNotice}</Text>
              </View>
            ) : null}

            {/* Quick Village Presets */}
            <Text style={s.label}>Or choose nearest village</Text>
            <View style={s.chipWrap}>
              {VILLAGE_PRESETS.map((v, idx) => (
                <TouchableOpacity
                  key={v.name}
                  style={[s.chip, villageIdx === idx && s.chipOn]}
                  onPress={() => chooseVillage(idx)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.chipText, villageIdx === idx && s.chipTextOn]}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {source !== 'none' && hasCoords && (
              <View style={s.locCard}>
                <Text style={s.locTitle}>📍 Selected location</Text>
                <Text style={s.locName}>{resolvedPlaceName() || 'Chosen position'}</Text>
                <Text style={s.locCoords}>
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                  {source === 'live' && accuracy ? `  (±${Math.round(accuracy)} m)` : ''}
                  {source === 'village' ? '  (approximate)' : ''}
                </Text>
                <MapLink latitude={lat} longitude={lng} />
              </View>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <View style={s.navRow}>
              <TouchableOpacity style={s.navBack} onPress={() => setStep(1)} activeOpacity={0.85}>
                <Text style={s.outlineBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.navNext} onPress={goNextFromLocation} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Next &gt;</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ------------------------------ STEP 3 ------------------------------ */}
        {step === 3 && (
          <View>
            <Text style={s.h2}>Tell us more about the incident</Text>
            <Text style={s.hint}>The more detail you give, the faster rangers can respond.</Text>

            <Text style={s.label}>When did it happen?</Text>
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

            <Text style={s.label}>Number of animals</Text>
            <View style={s.stepperRow}>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => {
                  setAnimalsUnknown(false);
                  setAnimalCount((c) => Math.max(1, c - 1));
                }}
              >
                <Text style={s.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.stepperValue}>{animalsUnknown ? '?' : animalCount}</Text>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => {
                  setAnimalsUnknown(false);
                  setAnimalCount((c) => c + 1);
                }}
              >
                <Text style={s.stepperBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chip, animalsUnknown && s.chipOn, { marginLeft: 12 }]}
                onPress={() => setAnimalsUnknown(!animalsUnknown)}
              >
                <Text style={[s.chipText, animalsUnknown && s.chipTextOn]}>Not sure</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Is anyone in immediate danger?</Text>
            <View style={s.twoCols}>
              <TouchableOpacity
                style={[s.choice, immediateRisk && s.choiceDanger]}
                onPress={() => setImmediateRisk(true)}
              >
                <Text style={[s.choiceText, immediateRisk && { color: PALETTE.danger }]}>
                  🚨 Yes, urgent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.choice, !immediateRisk && s.choiceOk]}
                onPress={() => setImmediateRisk(false)}
              >
                <Text style={[s.choiceText, !immediateRisk && { color: PALETTE.forest }]}>
                  No, not urgent
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Description of incident *</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Bull elephant broke the fence and ate banana plants near the canal"
              placeholderTextColor="#9CA3AF"
              multiline={true}
              numberOfLines={4}
            />

            <Text style={s.label}>Photos (optional, up to {MAX_PHOTOS})</Text>
            <View style={s.twoCols}>
              <TouchableOpacity
                style={s.photoBtn}
                onPress={() => addPhoto('camera')}
                disabled={photoBusy}
                activeOpacity={0.85}
              >
                <Text style={s.photoBtnText}>📷 Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.photoBtn}
                onPress={() => addPhoto('library')}
                disabled={photoBusy}
                activeOpacity={0.85}
              >
                <Text style={s.photoBtnText}>🖼️ Choose photo</Text>
              </TouchableOpacity>
            </View>
            {photoBusy ? <ActivityIndicator size="small" color={PALETTE.forest} /> : null}
            {photoError ? <Text style={s.errorText}>{photoError}</Text> : null}
            {photos.length > 0 && (
              <View style={s.photoRow}>
                {photos.map((uri, idx) => (
                  <View key={`${idx}`} style={s.photoWrap}>
                    <Image source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                    <TouchableOpacity
                      style={s.photoRemove}
                      onPress={() => setPhotos((p) => p.filter((_, i) => i !== idx))}
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
                <Text style={s.primaryBtnText}>Next &gt;</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ------------------------------ STEP 4 ------------------------------ */}
        {step === 4 && (
          <View>
            <Text style={s.h2}>Review Your Report</Text>
            <Text style={s.hint}>Check everything, then press submit.</Text>

            <View style={s.card}>
              <ReviewRow
                label="Type"
                value={`${CONFLICT_TYPE_META[type].icon} ${CONFLICT_TYPE_META[type].label}`}
                onEdit={() => setStep(1)}
              />
              <ReviewRow
                label="Location"
                value={`${resolvedPlaceName() || 'Chosen position'}\n${hasCoords ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : ''}`}
                onEdit={() => setStep(2)}
              />
              <ReviewRow
                label="When"
                value={(WHEN_OPTIONS.find((w) => w.key === whenKey) || WHEN_OPTIONS[0]).label}
                onEdit={() => setStep(3)}
              />
              <ReviewRow
                label="Animals"
                value={animalsUnknown ? 'Not sure' : String(animalCount)}
                onEdit={() => setStep(3)}
              />
              <ReviewRow
                label="Immediate danger"
                value={immediateRisk ? '🚨 Yes – urgent' : 'No'}
                onEdit={() => setStep(3)}
              />
              <ReviewRow label="Description" value={description.trim()} onEdit={() => setStep(3)} />
              <ReviewRow
                label="Photos"
                value={photos.length ? `${photos.length} attached` : 'None'}
                onEdit={() => setStep(3)}
              />
              <ReviewRow
                label="Reporter"
                value={`${reporterName || 'You'}${reporterPhone ? `\n${reporterPhone}` : ''}`}
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
                  📴 No internet. Your report will be saved on this phone and sent automatically as
                  soon as you are online.
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
                <Text style={s.primaryBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.outlineBtn} onPress={() => setStep(3)} activeOpacity={0.85}>
              <Text style={s.outlineBtnText}>Back</Text>
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
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.reviewEdit}>Edit</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Kept for callers/tests that want the raw Maps URL of a chosen point.
export const buildMapsUrl = mapsUrl;

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PALETTE.page },
  scroll: { padding: 16, paddingBottom: 40 },

  netChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  netChipText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  netChipSub: { fontSize: 11, color: '#92400E', marginLeft: 8, fontWeight: '600' },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressItem: { alignItems: 'center', flex: 1 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotOn: { backgroundColor: PALETTE.forest },
  progressDotText: { fontSize: 12, fontWeight: '800', color: PALETTE.muted },
  progressLabel: { fontSize: 11, color: PALETTE.muted, marginTop: 4, fontWeight: '600' },
  stepCounter: {
    textAlign: 'center',
    fontSize: 12,
    color: PALETTE.earth,
    fontWeight: '800',
    marginBottom: 16,
  },

  h2: { fontSize: 20, fontWeight: '800', color: PALETTE.ink, marginBottom: 4 },
  hint: { fontSize: 13, color: PALETTE.muted, marginBottom: 14, lineHeight: 18 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: PALETTE.earth,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.line,
    padding: 14,
    marginBottom: 10,
  },
  typeCardOn: { borderColor: PALETTE.forest, backgroundColor: PALETTE.forestSoft },
  typeIcon: { fontSize: 30, marginRight: 14 },
  typeTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.ink },
  typeHint: { fontSize: 12, color: PALETTE.muted, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: PALETTE.forest },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PALETTE.forest },

  card: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.sand,
    padding: 14,
    marginTop: 10,
  },
  manualCardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.ink,
    marginBottom: 6,
  },
  locCard: {
    backgroundColor: PALETTE.forestSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.forest,
    padding: 14,
    marginTop: 14,
  },
  locTitle: { fontSize: 12, fontWeight: '800', color: PALETTE.forest, textTransform: 'uppercase' },
  locName: { fontSize: 16, fontWeight: '800', color: PALETTE.ink, marginTop: 6 },
  locCoords: { fontSize: 12, color: PALETTE.muted, marginTop: 2 },

  input: {
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: PALETTE.ink,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  twoCols: { flexDirection: 'row', gap: 10 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE.sand,
  },
  chipOn: { backgroundColor: PALETTE.forest, borderColor: PALETTE.forest },
  chipText: { fontSize: 13, fontWeight: '700', color: '#5C4033' },
  chipTextOn: { color: PALETTE.white },

  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 20, fontWeight: '800', color: PALETTE.forest },
  stepperValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: PALETTE.ink,
  },

  choice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.line,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
  },
  choiceDanger: { borderColor: PALETTE.danger, backgroundColor: PALETTE.dangerSoft },
  choiceOk: { borderColor: PALETTE.forest, backgroundColor: PALETTE.forestSoft },
  choiceText: { fontWeight: '800', fontSize: 13, color: PALETTE.muted },

  photoBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.forest,
    borderStyle: 'dashed',
    backgroundColor: PALETTE.forestSoft,
    alignItems: 'center',
  },
  photoBtnText: { fontWeight: '800', color: PALETTE.forest, fontSize: 13 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: PALETTE.line },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PALETTE.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: PALETTE.white, fontSize: 11, fontWeight: '900' },

  primaryBtn: {
    backgroundColor: PALETTE.forest,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnDone: { backgroundColor: '#276B2A' },
  primaryBtnText: { color: PALETTE.white, fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: PALETTE.forest,
    backgroundColor: PALETTE.white,
  },
  outlineBtnText: { color: PALETTE.forest, fontSize: 15, fontWeight: '800' },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { color: PALETTE.earth, fontWeight: '800', fontSize: 14 },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  navBack: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PALETTE.forest,
    backgroundColor: PALETTE.white,
  },
  navNext: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: PALETTE.forest,
  },

  warnBox: {
    backgroundColor: PALETTE.amberSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  warnText: { color: '#92400E', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  infoBox: { backgroundColor: PALETTE.blueSoft, borderRadius: 10, padding: 12, marginTop: 14 },
  infoBoxText: { color: PALETTE.blue, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  errorText: { color: PALETTE.danger, fontSize: 13, fontWeight: '700', marginTop: 10 },

  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.line,
  },
  reviewLabel: { fontSize: 11, fontWeight: '800', color: PALETTE.muted, textTransform: 'uppercase' },
  reviewValue: { fontSize: 14, color: PALETTE.ink, fontWeight: '600', marginTop: 3, lineHeight: 19 },
  reviewEdit: { color: PALETTE.forest, fontWeight: '800', fontSize: 13 },

  successCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.sand,
    padding: 20,
    alignItems: 'center',
  },
  successCheck: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PALETTE.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheckText: { color: PALETTE.white, fontSize: 38, fontWeight: '900' },
  successTitle: { fontSize: 22, fontWeight: '900', color: PALETTE.ink, marginTop: 14 },
  successText: { fontSize: 13, color: PALETTE.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  refBox: {
    alignSelf: 'stretch',
    backgroundColor: PALETTE.sandSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.sand,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  refLabel: { fontSize: 11, fontWeight: '800', color: PALETTE.earth, textTransform: 'uppercase' },
  refCode: { fontSize: 24, fontWeight: '900', color: PALETTE.ink, marginTop: 4, letterSpacing: 1 },
  nextCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.sand,
    padding: 16,
    marginTop: 14,
  },
  nextTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.ink, marginBottom: 8 },
  nextItem: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 19 },
});
