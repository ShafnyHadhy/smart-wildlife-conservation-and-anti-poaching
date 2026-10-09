import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { ConflictReport, ConflictStatus, ConflictStatusEntry } from '../types';
import {
  PALETTE,
  STATUS_META,
  STATUS_PIPELINE,
  pipelineIndex,
  formatDateTime,
  mapsUrl,
} from '../utils/conflictMeta';

/* -------------------------------------------------------------------------- */
/* Status pill                                                                 */
/* -------------------------------------------------------------------------- */
export function StatusPill({
  status,
  ranger = false,
}: {
  status: ConflictStatus;
  ranger?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <View style={[parts.pill, { backgroundColor: meta.bg }]}>
      <Text style={[parts.pillText, { color: meta.fg }]}>
        {meta.icon} {ranger ? meta.rangerLabel : meta.label}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Horizontal 4-stage tracker                                                  */
/* -------------------------------------------------------------------------- */
export function StageTracker({ status }: { status: ConflictStatus }) {
  const current = pipelineIndex(status);
  return (
    <View style={parts.trackerRow}>
      {STATUS_PIPELINE.map((stage, idx) => {
        const done = idx < current || (idx === current && idx === STATUS_PIPELINE.length - 1);
        const active = idx === current && !done;
        return (
          <React.Fragment key={stage}>
            <View style={parts.trackerStage}>
              <View
                style={[
                  parts.trackerDot,
                  done && parts.trackerDotDone,
                  active && parts.trackerDotActive,
                ]}
              >
                <Text style={[parts.trackerDotText, (done || active) && { color: PALETTE.white }]}>
                  {done ? '✓' : idx + 1}
                </Text>
              </View>
              <Text
                style={[
                  parts.trackerLabel,
                  (done || active) && { color: PALETTE.ink, fontWeight: '800' },
                ]}
                numberOfLines={2}
              >
                {STATUS_META[stage].label}
              </Text>
            </View>
            {idx < STATUS_PIPELINE.length - 1 && (
              <View style={[parts.trackerLine, idx < current && parts.trackerLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Vertical timeline of every status change                                    */
/* -------------------------------------------------------------------------- */
export function StatusTimeline({ report }: { report: ConflictReport }) {
  let entries: ConflictStatusEntry[] = report.statusHistory || [];
  if (entries.length === 0) {
    entries = [
      {
        status: ConflictStatus.SUBMITTED,
        at: report.reportedAt,
        byRole: 'COMMUNITY_MEMBER',
        byName: report.reporterName,
        note: 'Report submitted.',
      },
    ];
  }
  const ordered = [...entries].reverse(); // newest first
  return (
    <View>
      {ordered.map((entry, idx) => {
        const meta = STATUS_META[entry.status];
        const isLatest = idx === 0;
        return (
          <View key={`${entry.at}-${idx}`} style={parts.tlRow}>
            <View style={parts.tlRail}>
              <View
                style={[
                  parts.tlDot,
                  { backgroundColor: isLatest ? meta.fg : PALETTE.line },
                ]}
              />
              {idx < ordered.length - 1 && <View style={parts.tlLine} />}
            </View>
            <View style={parts.tlBody}>
              <Text style={parts.tlTitle}>
                {meta.icon} {meta.label}
              </Text>
              <Text style={parts.tlMeta}>
                {formatDateTime(entry.at)}
                {entry.byName ? ` · ${entry.byName}` : ''}
              </Text>
              {entry.action ? <Text style={parts.tlAction}>🛠 {entry.action}</Text> : null}
              {entry.note ? <Text style={parts.tlNote}>“{entry.note}”</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Photo grid with tap-to-enlarge                                              */
/* -------------------------------------------------------------------------- */
export function PhotoGrid({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!photos || photos.length === 0) {
    return <Text style={parts.muted}>No photos were attached to this report.</Text>;
  }
  return (
    <View>
      {open ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen(null)}>
          <Image source={{ uri: open }} style={parts.photoLarge} resizeMode="cover" />
          <Text style={parts.photoHint}>Tap the photo to close</Text>
        </TouchableOpacity>
      ) : null}
      <View style={parts.photoRow}>
        {photos.map((uri, idx) => (
          <TouchableOpacity key={`${idx}`} onPress={() => setOpen(uri)} activeOpacity={0.8}>
            <Image source={{ uri }} style={parts.photoThumb} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Small layout helpers                                                        */
/* -------------------------------------------------------------------------- */
export function Section({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <View style={[parts.section, accent ? { borderColor: accent } : null]}>
      <Text style={parts.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={parts.infoRow}>
      <Text style={parts.infoLabel}>{label}</Text>
      <Text style={parts.infoValue}>{String(value)}</Text>
    </View>
  );
}

export function MapLink({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <TouchableOpacity
      style={parts.mapLink}
      onPress={() => Linking.openURL(mapsUrl(latitude, longitude))}
      activeOpacity={0.8}
    >
      <Text style={parts.mapLinkText}>🗺 Open location in Maps</Text>
    </TouchableOpacity>
  );
}

export function EmptyState({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text?: string;
}) {
  return (
    <View style={parts.empty}>
      <Text style={parts.emptyIcon}>{icon}</Text>
      <Text style={parts.emptyTitle}>{title}</Text>
      {text ? <Text style={parts.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={parts.errorBanner}>
      <Text style={parts.errorText}>⚠️ {message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} style={parts.errorBtn}>
          <Text style={parts.errorBtnText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const parts = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, fontWeight: '800' },

  trackerRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8 },
  trackerStage: { alignItems: 'center', width: 64 },
  trackerDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PALETTE.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerDotDone: { backgroundColor: PALETTE.forest },
  trackerDotActive: { backgroundColor: PALETTE.earth },
  trackerDotText: { fontSize: 13, fontWeight: '800', color: PALETTE.muted },
  trackerLabel: {
    marginTop: 6,
    fontSize: 11,
    color: PALETTE.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  trackerLine: { flex: 1, height: 3, backgroundColor: PALETTE.line, marginTop: 14 },
  trackerLineDone: { backgroundColor: PALETTE.forest },

  tlRow: { flexDirection: 'row' },
  tlRail: { width: 22, alignItems: 'center' },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  tlLine: { width: 2, flex: 1, backgroundColor: PALETTE.line, marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: 16 },
  tlTitle: { fontSize: 14, fontWeight: '800', color: PALETTE.ink },
  tlMeta: { fontSize: 11, color: PALETTE.muted, marginTop: 2 },
  tlAction: { fontSize: 12, fontWeight: '700', color: PALETTE.forest, marginTop: 6 },
  tlNote: { fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: PALETTE.line },
  photoLarge: { width: '100%', height: 220, borderRadius: 12, backgroundColor: PALETTE.line },
  photoHint: { fontSize: 11, color: PALETTE.muted, textAlign: 'center', marginVertical: 6 },

  section: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.sand,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: PALETTE.earth,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.line,
  },
  infoLabel: { fontSize: 12, color: PALETTE.muted, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, color: PALETTE.ink, fontWeight: '700', flex: 2, textAlign: 'right' },
  mapLink: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PALETTE.forestSoft,
    alignItems: 'center',
  },
  mapLinkText: { color: PALETTE.forest, fontWeight: '800', fontSize: 13 },

  muted: { fontSize: 12, color: PALETTE.muted },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: PALETTE.ink, marginTop: 10 },
  emptyText: { fontSize: 13, color: PALETTE.muted, textAlign: 'center', marginTop: 6 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.dangerSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: PALETTE.danger, fontSize: 12, fontWeight: '700' },
  errorBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: PALETTE.danger,
  },
  errorBtnText: { color: PALETTE.white, fontWeight: '800', fontSize: 12 },
});
