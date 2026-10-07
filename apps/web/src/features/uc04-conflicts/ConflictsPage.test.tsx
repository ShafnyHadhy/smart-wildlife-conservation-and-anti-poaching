import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictsPage } from '../../pages/ConflictsPage';
import { webConflictService } from './services/conflictService';
import { ConflictStatus, ConflictType } from './types';

vi.mock('./services/conflictService', () => ({
  webConflictService: {
    fetchConflicts: vi.fn(),
    fetchConflictStats: vi.fn(),
    createConflict: vi.fn(),
    updateConflictStatus: vi.fn(),
  },
}));

describe('UC04: Web ConflictsPage Triage Console', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(webConflictService.fetchConflictStats).mockResolvedValue({
      total: 3,
      submitted: 1,
      underReview: 1,
      responding: 1,
      resolved: 0,
      closed: 0,
      cropDamageCount: 2,
      elephantHumanCount: 1,
      propertyDamageCount: 0,
      livestockAttackCount: 0,
    });

    vi.mocked(webConflictService.fetchConflicts).mockResolvedValue([
      {
        id: 'conf-1',
        communityMemberId: 'mem-1',
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'Lone bull elephant entered banana plantation',
        latitude: 6.368,
        longitude: 81.332,
        status: ConflictStatus.UNDER_REVIEW,
        reportedAt: '2026-10-05T07:20:00.000Z',
        createdAt: '2026-10-05T07:20:00.000Z',
        updatedAt: '2026-10-05T07:20:00.000Z',
        reporterName: 'Gamini Senanayake',
        reporterPhone: '+94 71 111 2233',
        villageName: 'Palatupana',
        parkName: 'Yala National Park',
      },
      {
        id: 'conf-2',
        communityMemberId: 'mem-2',
        conflictType: ConflictType.ELEPHANT_HUMAN_CONFLICT,
        description: 'Elephant herd near village irrigation tank',
        latitude: 6.418,
        longitude: 81.341,
        status: ConflictStatus.RESPONDING,
        reportedAt: '2026-10-05T09:30:00.000Z',
        createdAt: '2026-10-05T09:30:00.000Z',
        updatedAt: '2026-10-05T09:30:00.000Z',
        reporterName: 'Kamal Gunaratne',
        villageName: 'Kataragama Boundary',
        parkName: 'Yala National Park',
        potentialDuplicateOf: 'conf-1',
        distanceToDuplicateKm: 0.85,
      },
    ]);
  });

  it('renders page header with UC04 SHELL badge and KPI cards', async () => {
    render(<ConflictsPage />);

    expect(screen.getByText('Human-Wildlife Conflict Reports')).toBeInTheDocument();
    expect(screen.getByText('UC04 SHELL')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Conflict Reports')).toBeInTheDocument();
      expect(screen.getByText('Awaiting Officer Triage')).toBeInTheDocument();
      expect(screen.getByText('Active Rapid Response')).toBeInTheDocument();
      expect(screen.getByText('Mitigated & Resolved')).toBeInTheDocument();
    });
  });

  it('renders table rows with cluster duplicate indicators and triage buttons', async () => {
    render(<ConflictsPage />);

    await waitFor(() => {
      expect(screen.getByText('CROP DAMAGE')).toBeInTheDocument();
      expect(screen.getByText('ELEPHANT HUMAN CONFLICT')).toBeInTheDocument();
      expect(screen.getByText('Cluster Duplicate')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Triage/i }).length).toBe(2);
    });
  });

  it('opens ConflictDetailModal on triage button click and allows status transition', async () => {
    render(<ConflictsPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Triage/i })[0]).toBeInTheDocument();
    });

    const triageButtons = screen.getAllByRole('button', { name: /Triage/i });
    fireEvent.click(triageButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Liaison Officer Operational Triage & Actions')).toBeInTheDocument();
      expect(screen.getByText('Save Triage Updates')).toBeInTheDocument();
    });

    // Select RESPONDING
    const respondingBtn = screen.getByRole('button', { name: 'RESPONDING (DISPATCH)' });
    fireEvent.click(respondingBtn);

    const saveBtn = screen.getByRole('button', { name: 'Save Triage Updates' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(webConflictService.updateConflictStatus).toHaveBeenCalledWith(
        'conf-1',
        expect.objectContaining({
          status: ConflictStatus.RESPONDING,
        })
      );
    });
  });

  it('opens NewConflictModal when clicking Log Conflict Report', async () => {
    render(<ConflictsPage />);

    const logBtn = screen.getByRole('button', { name: /Log Conflict Report/i });
    fireEvent.click(logBtn);

    await waitFor(() => {
      expect(screen.getByText('Log Human-Wildlife Conflict Report')).toBeInTheDocument();
      expect(screen.getByText('Submit Incident Report')).toBeInTheDocument();
    });
  });
});
