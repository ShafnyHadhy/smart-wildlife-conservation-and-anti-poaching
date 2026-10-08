import {
  ConflictReport,
  ConflictStatus,
  ConflictType,
} from '../types';

/** Colours shared by every UC04 screen so both roles see the same status language. */
export const PALETTE = {
  forest: '#2F7D32',
  forestDark: '#1C2A1E',
  forestSoft: '#E8F3E8',
  earth: '#A76D40',
  sand: '#D1B370',
  sandSoft: '#FAF7EE',
  page: '#F5F5DC',
  ink: '#1C2A1E',
  muted: '#6B7280',
  line: '#E5E7EB',
  white: '#FFFFFF',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  amber: '#B45309',
  amberSoft: '#FEF3C7',
  blue: '#1D4ED8',
  blueSoft: '#DBEAFE',
};

export interface StatusMeta {
  label: string;
  icon: string;
  fg: string;
  bg: string;
  /** Plain-language sentence shown to the community member. */
  communityMessage: string;
  /** Short action-oriented label shown to rangers. */
  rangerLabel: string;
}

export const STATUS_META: Record<ConflictStatus, StatusMeta> = {
  [ConflictStatus.SUBMITTED]: {
    label: 'Received',
    icon: '📨',
    fg: PALETTE.blue,
    bg: PALETTE.blueSoft,
    communityMessage:
      'Your report has been received. A ranger or liaison officer will review it shortly.',
    rangerLabel: 'New – needs review',
  },
  [ConflictStatus.UNDER_REVIEW]: {
    label: 'Under review',
    icon: '🔍',
    fg: PALETTE.amber,
    bg: PALETTE.amberSoft,
    communityMessage:
      'A ranger has accepted your report and is assessing the situation.',
    rangerLabel: 'In review',
  },
  [ConflictStatus.RESPONDING]: {
    label: 'Team responding',
    icon: '🚨',
    fg: PALETTE.danger,
    bg: PALETTE.dangerSoft,
    communityMessage:
      'A response team has been sent. Stay safe and follow the ranger’s instructions.',
    rangerLabel: 'Team dispatched',
  },
  [ConflictStatus.RESOLVED]: {
    label: 'Resolved',
    icon: '✅',
    fg: PALETTE.forest,
    bg: PALETTE.forestSoft,
    communityMessage: 'The situation has been dealt with. Thank you for reporting.',
    rangerLabel: 'Resolved',
  },
  [ConflictStatus.CLOSED]: {
    label: 'Closed',
    icon: '🗂️',
    fg: '#44403C',
    bg: '#E7E5E4',
    communityMessage: 'This report has been closed by the wildlife office.',
    rangerLabel: 'Closed',
  },
};

/** Ordered stages shown in the progress tracker (CLOSED is displayed as the last stage). */
export const STATUS_PIPELINE: ConflictStatus[] = [
  ConflictStatus.SUBMITTED,
  ConflictStatus.UNDER_REVIEW,
  ConflictStatus.RESPONDING,
  ConflictStatus.RESOLVED,
];

export function pipelineIndex(status: ConflictStatus): number {
  if (status === ConflictStatus.CLOSED) return STATUS_PIPELINE.length - 1;
  return Math.max(0, STATUS_PIPELINE.indexOf(status));
}

export function isOpenStatus(status: ConflictStatus): boolean {
  return status !== ConflictStatus.RESOLVED && status !== ConflictStatus.CLOSED;
}

export interface ConflictTypeMeta {
  label: string;
  icon: string;
  hint: string;
}

export const CONFLICT_TYPE_META: Record<ConflictType, ConflictTypeMeta> = {
  [ConflictType.ELEPHANT_HUMAN_CONFLICT]: {
    label: 'Elephant Sighting',
    icon: '🐘',
    hint: 'Elephant seen near homes, roads or farmland',
  },
  [ConflictType.CROP_DAMAGE]: {
    label: 'Crop-Raiding',
    icon: '🌾',
    hint: 'Crops eaten or trampled by wildlife',
  },
  [ConflictType.ANIMAL_INTRUSION]: {
    label: 'Predator Sighting',
    icon: '🐆',
    hint: 'Leopard, bear, boar or other animal inside the community',
  },
  [ConflictType.LIVESTOCK_ATTACK]: {
    label: 'Attack on Livestock',
    icon: '🐄',
    hint: 'Cattle, goats or poultry attacked',
  },
  [ConflictType.PROPERTY_DAMAGE]: {
    label: 'Property Damage',
    icon: '🏠',
    hint: 'Houses, fences, wells or storage damaged',
  },
  [ConflictType.OTHER]: {
    label: 'Other',
    icon: '⚠️',
    hint: 'Any other human–wildlife problem',
  },
};

export function typeMeta(type: ConflictType): ConflictTypeMeta {
  return CONFLICT_TYPE_META[type] || CONFLICT_TYPE_META[ConflictType.OTHER];
}

export function referenceCode(report: Pick<ConflictReport, 'id' | 'reportedAt'>): string {
  const year = new Date(report.reportedAt).getFullYear();
  return `HWC-${year}-${report.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function timeAgo(iso?: string, now: number = Date.now()): string {
  if (!iso) return '';
  const diff = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** The sentence describing the most recent thing that happened on a report. */
export function latestUpdateLine(report: ConflictReport): string {
  const history = report.statusHistory || [];
  const last = history[history.length - 1];
  if (last && last.byRole === 'RANGER') {
    const who = last.byName || 'Ranger';
    const what = last.action || last.note || STATUS_META[last.status].label;
    return `${who}: ${what}`;
  }
  return STATUS_META[report.status].communityMessage;
}

export interface ConflictNotification {
  id: string;
  reportId: string;
  reference: string;
  status: ConflictStatus;
  title: string;
  body: string;
  at: string;
  unread: boolean;
}

/**
 * Builds the community notification feed from ranger-made status changes.
 * Anything newer than `seenAt` is flagged as unread.
 */
export function buildNotifications(
  reports: ConflictReport[],
  seenAt: number
): ConflictNotification[] {
  const items: ConflictNotification[] = [];
  for (const report of reports) {
    const history = report.statusHistory || [];
    const rangerEntries = history.filter((h) => h.byRole === 'RANGER');
    const entries =
      rangerEntries.length > 0 || report.status === ConflictStatus.SUBMITTED
        ? rangerEntries
        : [{ status: report.status, at: report.updatedAt, byName: report.handledByName, note: report.triageNotes, action: report.mitigationAction }];

    for (const entry of entries) {
      const meta = STATUS_META[entry.status];
      const detail = [entry.action, entry.note].filter(Boolean).join(' – ');
      items.push({
        id: `${report.id}-${entry.at}-${entry.status}`,
        reportId: report.id,
        reference: referenceCode(report),
        status: entry.status,
        title: `${meta.icon} ${meta.label}: ${typeMeta(report.conflictType).label}`,
        body: detail || meta.communityMessage,
        at: entry.at,
        unread: new Date(entry.at).getTime() > seenAt,
      });
    }
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
