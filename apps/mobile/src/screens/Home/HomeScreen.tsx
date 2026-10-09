import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import {
  HiPlus,
  HiChevronRight,
  HiOutlineBookOpen,
  HiOutlineBellAlert,
} from 'react-icons/hi2';
import {
  TbReportSearch,
  TbShieldCheck,
  TbSettings,
  TbAlertTriangle,
  TbCompass,
} from 'react-icons/tb';
import {
  FcHighPriority,
  FcDataBackup,
} from 'react-icons/fc';
import { GiElephant } from 'react-icons/gi';
import { FiUser } from 'react-icons/fi';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TabKey } from '../../components/navigation/BottomTabBar';
import { AuthUser } from '../../services/authService';
import { ScenicNatureBanner } from '../../features/uc04-conflicts/components/ConflictVisuals';

interface HomeScreenProps {
  isOnline: boolean;
  pendingCount: number;
  onNavigateTab: (tab: TabKey) => void;
  onOpenConflictForm?: () => void;
  onOpenConflictList?: () => void;
  onToggleOnline?: () => void;
  onSyncNow?: () => void;
  user?: AuthUser;
}

export function HomeScreen({
  isOnline,
  pendingCount,
  onNavigateTab,
  onOpenConflictForm,
  onOpenConflictList,
  onToggleOnline,
  onSyncNow,
  user,
}: HomeScreenProps) {
  const displayName = user?.fullName || 'Saman Perera';
  const displayRoleText = user ? user.subtitle : 'Ranger • Yala National Park';
  const isCommunityMember = user?.role === 'COMMUNITY_MEMBER';
  const displayInitials = user?.initials || 'SP';
  const [activeModal, setActiveModal] = React.useState<'none' | 'wildlife_info' | 'safety_tips'>('none');

  const handleAction = (label: string, targetTab?: TabKey) => {
    if (targetTab) {
      onNavigateTab(targetTab);
    } else {
      Alert.alert(
        label,
        'This action will connect to the dedicated feature module in upcoming phases.'
      );
    }
  };

  if (isCommunityMember) {
    return (
      <ScreenContainer scrollable={true} contentContainerStyle={{ paddingBottom: 14 }}>
        {/* Scenic Banner Header matching wireframe */}
        <View style={styles.communityHeaderBanner}>
          <ScenicNatureBanner />
          <View style={styles.communityHeaderOverlay}>
            <View style={styles.communityHeaderTitles}>
              <Text style={styles.communityAppTitle}>Wildlife Conservation</Text>
              <Text style={styles.communityAppSubtitle}>
                People. Wildlife. Safer Communities.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.communityAvatarCircle}
              onPress={() => onNavigateTab('PROFILE')}
              activeOpacity={0.8}
            >
              <FiUser size={22} color="#14532D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline status notification */}
        {!isOnline || pendingCount > 0 ? (
          <View style={styles.commOfflineStrip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <FcDataBackup size={16} />
              <Text style={styles.commOfflineText}>
                {pendingCount > 0
                  ? `${pendingCount} offline report(s) queued on device.`
                  : 'Offline mode active. Observations stored locally.'}
              </Text>
            </View>
            {onSyncNow && isOnline && pendingCount > 0 ? (
              <TouchableOpacity onPress={onSyncNow} style={styles.commSyncBtn}>
                <Text style={styles.commSyncBtnText}>Sync</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* 5 Wireframe Action Cards */}
        <View style={styles.communityCardsStack}>
          {/* 1. Report Human-Wildlife Conflict Hero Button */}
          <TouchableOpacity
            style={styles.heroConflictBtn}
            onPress={() =>
              onOpenConflictForm ? onOpenConflictForm() : onNavigateTab('REPORTS')
            }
            activeOpacity={0.85}
          >
            <View style={styles.heroPlusCircle}>
              <HiPlus size={26} color="#14532D" />
            </View>
            <View style={styles.heroTextColumn}>
              <Text style={styles.heroBtnTitle}>
                Report Human-Wildlife Conflict
              </Text>
              <Text style={styles.heroBtnSubtitle}>
                Help keep your community and wildlife safe
              </Text>
            </View>
            <HiChevronRight size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* 2. My Reports */}
          <TouchableOpacity
            style={styles.commActionRowCard}
            onPress={() =>
              onOpenConflictList ? onOpenConflictList() : onNavigateTab('REPORTS')
            }
            activeOpacity={0.8}
          >
            <View style={styles.commCardIconBox}>
              <TbReportSearch size={22} color="#14532D" />
            </View>
            <View style={styles.commCardTextCol}>
              <Text style={styles.commCardTitle}>My Reports</Text>
              <Text style={styles.commCardSubtitle}>
                View and track your submitted reports
              </Text>
            </View>
            <HiChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* 3. Wildlife Information */}
          <TouchableOpacity
            style={styles.commActionRowCard}
            onPress={() => setActiveModal('wildlife_info')}
            activeOpacity={0.8}
          >
            <View style={styles.commCardIconBox}>
              <HiOutlineBookOpen size={22} color="#14532D" />
            </View>
            <View style={styles.commCardTextCol}>
              <Text style={styles.commCardTitle}>Wildlife Information</Text>
              <Text style={styles.commCardSubtitle}>
                Learn about local wildlife and safety
              </Text>
            </View>
            <HiChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* 4. Safety Tips */}
          <TouchableOpacity
            style={styles.commActionRowCard}
            onPress={() => setActiveModal('safety_tips')}
            activeOpacity={0.8}
          >
            <View style={styles.commCardIconBox}>
              <TbShieldCheck size={22} color="#14532D" />
            </View>
            <View style={styles.commCardTextCol}>
              <Text style={styles.commCardTitle}>Safety Tips</Text>
              <Text style={styles.commCardSubtitle}>
                How to live safely alongside wildlife
              </Text>
            </View>
            <HiChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* 5. Settings */}
          <TouchableOpacity
            style={styles.commActionRowCard}
            onPress={() => onNavigateTab('PROFILE')}
            activeOpacity={0.8}
          >
            <View style={styles.commCardIconBox}>
              <TbSettings size={22} color="#14532D" />
            </View>
            <View style={styles.commCardTextCol}>
              <Text style={styles.commCardTitle}>Settings</Text>
              <Text style={styles.commCardSubtitle}>
                App preferences
              </Text>
            </View>
            <HiChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Modal: Wildlife Information */}
        {activeModal === 'wildlife_info' && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📖 Wildlife Information</Text>
                <TouchableOpacity onPress={() => setActiveModal('none')}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalGuideItem}>
                🐘 <Text style={styles.boldText}>Asian Elephant (Elephas maximus):</Text> Sri Lanka's largest herbivore. Herds roam established migratory corridors between Yala and Lunugamvehera. Maintain at least 50m distance.
              </Text>
              <Text style={styles.modalGuideItem}>
                🐆 <Text style={styles.boldText}>Sri Lankan Leopard (Panthera pardus):</Text> Apex carnivore. Generally nocturnal and shy of human presence; safeguard domestic cattle in sturdy night pens.
              </Text>
              <Text style={styles.modalGuideItem}>
                🐗 <Text style={styles.boldText}>Wild Boar (Sus scrofa):</Text> Highly active in agricultural buffer plots near dusk; report perimeter fence breaches promptly.
              </Text>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setActiveModal('none')}
              >
                <Text style={styles.modalDoneText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modal: Safety Tips */}
        {activeModal === 'safety_tips' && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🛡️ Coexistence & Safety Tips</Text>
                <TouchableOpacity onPress={() => setActiveModal('none')}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalGuideItem}>
                1. <Text style={styles.boldText}>Maintain 50m Safe Buffer:</Text> Never approach wild elephants or lone bulls, especially during dusk or dawn.
              </Text>
              <Text style={styles.modalGuideItem}>
                2. <Text style={styles.boldText}>Night Travel Precautions:</Text> Carry bright torches and talk loudly or use chimes to avoid sudden wildlife surprises.
              </Text>
              <Text style={styles.modalGuideItem}>
                3. <Text style={styles.boldText}>Solar Electric Fences:</Text> Never tamper with community barrier fences; notify DWC immediately if vines or trees ground the lines.
              </Text>
              <Text style={styles.modalGuideItem}>
                4. <Text style={styles.boldText}>Emergency Liaison Desk:</Text> For immediate active threat dispatch, call DWC Command hotline 1992.
              </Text>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setActiveModal('none')}
              >
                <Text style={styles.modalDoneText}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Welcome & Context Banner */}
      <View style={styles.welcomeSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{displayInitials}</Text>
        </View>
        <View style={styles.welcomeTextColumn}>
          <Text style={styles.greeting}>Ayubowan,</Text>
          <Text style={styles.userName}>{displayName}</Text>
          <View style={styles.roleRow}>
            <Text style={styles.roleText}>{displayRoleText}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onToggleOnline}
          activeOpacity={0.7}
          style={styles.statusBadgeTouch}
        >
          <StatusBadge
            status={isOnline ? 'ONLINE' : 'OFFLINE'}
            variant={isOnline ? 'success' : 'offline'}
          />
        </TouchableOpacity>
      </View>

      {/* Operational Sync Status Card */}
      <AppCard variant="elevated">
        <View style={styles.syncCardHeader}>
          <Text style={styles.cardHeaderTitle}>Offline Sync Status</Text>
          <StatusBadge
            status={pendingCount === 0 ? 'SYNCED' : `${pendingCount} PENDING`}
            variant={pendingCount === 0 ? 'success' : 'warning'}
            size="small"
          />
        </View>
        <Text style={styles.syncCardText}>
          {isOnline
            ? 'Connected to central command. Live sync active.'
            : 'Working off-grid. All observations stored safely in local queue.'}
        </Text>
        <View style={styles.syncCardActions}>
          {onToggleOnline ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onToggleOnline}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                {isOnline ? 'Simulate Offline' : 'Go Online'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {onSyncNow && isOnline && pendingCount > 0 ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onSyncNow}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Sync Now</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </AppCard>

      {/* Quick Action Grid */}
      <Text style={styles.sectionHeading}>
        {isCommunityMember ? 'Community Reporting Actions' : 'Quick Field Actions'}
      </Text>
      <View style={styles.actionGrid}>
        {isCommunityMember ? (
          <>
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardPrimary]}
              onPress={() => handleAction('Report Conflict', 'REPORTS')}
              activeOpacity={0.8}
            >
              <GiElephant size={28} color="#14532D" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>Report Conflict</Text>
              <Text style={styles.actionSubtitle}>UC04 • Elephant / Crop Loss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction('View Reports', 'REPORTS')}
              activeOpacity={0.8}
            >
              <TbReportSearch size={28} color="#14532D" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>My Reports</Text>
              <Text style={styles.actionSubtitle}>Village Submissions Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction('View Alerts', 'ALERTS')}
              activeOpacity={0.8}
            >
              <HiOutlineBellAlert size={28} color="#EA580C" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>Risk Alerts</Text>
              <Text style={styles.actionSubtitle}>UC03 • Buffer Warnings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction('Field Safety Guide', 'MENU')}
              activeOpacity={0.8}
            >
              <TbShieldCheck size={28} color="#16A34A" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>Safety Guide</Text>
              <Text style={styles.actionSubtitle}>Elephant Encounter SOPs</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction('Report Incident', 'REPORTS')}
              activeOpacity={0.8}
            >
              <TbAlertTriangle size={28} color="#DC2626" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>Report Incident</Text>
              <Text style={styles.actionSubtitle}>UC02 • Poaching / Traps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { borderColor: '#3E8E41', borderWidth: 1.5 }]}
              onPress={() => (onOpenConflictList ? onOpenConflictList() : handleAction('Conflict Triage', 'REPORTS'))}
              activeOpacity={0.8}
            >
              <TbShieldCheck size={28} color="#16A34A" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>Conflict Triage</Text>
              <Text style={styles.actionSubtitle}>UC04 • Community Queue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction('View Alerts', 'ALERTS')}
              activeOpacity={0.8}
            >
              <HiOutlineBellAlert size={28} color="#EA580C" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>Risk Alerts</Text>
              <Text style={styles.actionSubtitle}>UC03 • Collar Geofence</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction('Start Patrol')}
              activeOpacity={0.8}
            >
              <TbCompass size={28} color="#0284C7" style={{ marginBottom: 6 }} />
              <Text style={styles.actionTitle}>Ranger Patrol</Text>
              <Text style={styles.actionSubtitle}>UC01 • GPS Tracking</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Field Overview Snapshot */}
      <Text style={styles.sectionHeading}>
        {isCommunityMember ? 'Community Buffer Sector' : 'Assigned Sanctuary Area'}
      </Text>
      <AppCard>
        <Text style={styles.parkName}>
          {isCommunityMember
            ? 'Kittulkote Village Sector — Yala Buffer Zone'
            : 'Yala National Park — Block 1'}
        </Text>
        <Text style={styles.parkDetails}>
          {isCommunityMember
            ? 'Boundary: Palatupana & Kataragama Agriculture Corridor'
            : 'Boundary Sector: Southeastern Coastal Zone • 978.8 km²'}
        </Text>
        <View style={styles.parkMetaRow}>
          <Text style={styles.parkMetaItem}>
            {isCommunityMember ? 'Active Bull Alerts in Area: 2' : 'Active Tracked Bulls: 3'}
          </Text>
          <Text style={styles.parkMetaItem}>
            {isCommunityMember ? 'Nearest Station: Palatupana Range Office' : 'Active Patrol Units: 2'}
          </Text>
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3E8E41',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#3E8E41',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  welcomeTextColumn: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  roleRow: {
    marginTop: 1,
  },
  roleText: {
    fontSize: 12,
    color: '#3E8E41',
    fontWeight: '700',
  },
  statusBadgeTouch: {
    marginLeft: 8,
  },
  syncCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  syncCardText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    fontWeight: '500',
  },
  syncCardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3E8E41',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  secondaryButtonText: {
    color: '#A76D40',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#A76D40',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardPrimary: {
    borderColor: '#3E8E41',
    borderWidth: 1.5,
    backgroundColor: '#F3F8F3',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  parkName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C2A1E',
    marginBottom: 4,
  },
  parkDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  parkMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#D1B370',
    paddingTop: 8,
  },
  parkMetaItem: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E8E41',
  },
  communityHeaderBanner: {
    position: 'relative',
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  communityHeaderOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  communityHeaderTitles: {
    flex: 1,
    paddingRight: 10,
  },
  communityAppTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  communityAppSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 5,
  },
  communityAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#14532D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  communityAvatarText: {
    fontSize: 18,
    color: '#14532D',
  },
  commOfflineStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  commOfflineText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  commSyncBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  commSyncBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  communityCardsStack: {
    gap: 12,
    marginBottom: 8,
  },
  heroConflictBtn: {
    backgroundColor: '#14532D',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroPlusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroPlusIcon: {
    fontSize: 26,
    fontWeight: '900',
    color: '#14532D',
  },
  heroTextColumn: {
    flex: 1,
  },
  heroBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroBtnSubtitle: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  heroChevronIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  commActionRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commCardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commCardEmoji: {
    fontSize: 20,
  },
  commCardTextCol: {
    flex: 1,
  },
  commCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  commCardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  commCardChevron: {
    fontSize: 22,
    fontWeight: '700',
    color: '#9CA3AF',
    marginLeft: 6,
  },
  modalBackdrop: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    elevation: 3,
  },
  modalCard: {
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  modalGuideItem: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  modalDoneBtn: {
    backgroundColor: '#14532D',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  settingRow: {
    marginBottom: 6,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  settingValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settingToggleBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  settingToggleText: {
    fontSize: 12,
    color: '#14532D',
    fontWeight: '700',
  },
});
