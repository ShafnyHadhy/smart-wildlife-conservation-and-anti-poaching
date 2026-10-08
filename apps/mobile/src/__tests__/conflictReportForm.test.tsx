import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Lightweight React Native mock for pure unit tests
vi.mock('react-native', () => {
  return {
    View: ({ children, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID, ...props }, children),
    Text: ({ children, ...props }: any) =>
      React.createElement('span', props, children),
    TextInput: ({ value, onChangeText, placeholder, ...props }: any) =>
      React.createElement('input', {
        value,
        onChange: (e: any) => onChangeText?.(e.target.value),
        placeholder,
        ...props,
      }),
    TouchableOpacity: ({ children, onPress, ...props }: any) =>
      React.createElement('button', { onClick: onPress, type: 'button', ...props }, children),
    ScrollView: ({ children, ...props }: any) =>
      React.createElement('div', props, children),
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement('div', props, children),
    StatusBar: () => null,
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Alert: {
      alert: vi.fn(),
    },
    ActivityIndicator: () => React.createElement('div', null, 'Loading...'),
  };
});

import { ConflictReportFormScreen } from '../features/uc04-conflicts/screens/ConflictReportFormScreen';
import { ConflictListScreen } from '../features/uc04-conflicts/screens/ConflictListScreen';
import { mobileConflictService } from '../features/uc04-conflicts/services/conflictService';
import { ConflictType, ConflictStatus } from '../features/uc04-conflicts/types';

vi.mock('../features/uc04-conflicts/services/conflictService', () => ({
  mobileConflictService: {
    submitConflict: vi.fn(),
    getConflictReports: vi.fn(),
    getPendingOfflineConflicts: vi.fn(),
  },
}));

describe('UC04: Mobile Conflict Reporting & Tracking (Wireframe Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mobileConflictService.submitConflict).mockResolvedValue({
      direct: true,
      result: { id: 'test-conflict-id' },
    });
    vi.mocked(mobileConflictService.getConflictReports).mockResolvedValue([
      {
        id: 'conf-1',
        communityMemberId: 'mem-1',
        conflictType: ConflictType.CROP_DAMAGE,
        description: 'Bull elephant broke fence and ate banana crops',
        latitude: 6.368,
        longitude: 81.332,
        status: ConflictStatus.UNDER_REVIEW,
        reportedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reporterName: 'Gamini Senanayake',
        villageName: 'Palatupana',
      },
    ]);
    vi.mocked(mobileConflictService.getPendingOfflineConflicts).mockResolvedValue([]);
  });

  describe('ConflictReportFormScreen (4-Step Wireframe Wizard)', () => {
    it('renders Step 1 with conflict categories matching wireframe', () => {
      render(<ConflictReportFormScreen isOnline={true} />);

      expect(screen.getByText('Report Conflict')).toBeDefined();
      expect(screen.getByText(/Step 1 of 4/i)).toBeDefined();
      expect(screen.getByText(/What type of conflict occurred/i)).toBeDefined();
      expect(screen.getByText('ONLINE')).toBeDefined();

      // Categories from wireframe
      expect(screen.getByText('Crop-Raiding')).toBeDefined();
      expect(screen.getByText('Elephant Sighting')).toBeDefined();
      expect(screen.getByText('Predator Sighting')).toBeDefined();
      expect(screen.getByText('Attack on Livestock')).toBeDefined();
      expect(screen.getByText('Property Damage')).toBeDefined();
      expect(screen.getByText('Other')).toBeDefined();
    });

    it('renders offline mode badge when offline', () => {
      render(<ConflictReportFormScreen isOnline={false} />);
      expect(screen.getByText(/OFFLINE MODE ACTIVE/i)).toBeDefined();
    });

    it('allows changing village preset in Step 2 and fills coordinates', () => {
      render(<ConflictReportFormScreen isOnline={true} initialStep={2} />);

      expect(screen.getByText(/Step 2 of 4/i)).toBeDefined();
      expect(screen.getByText(/Where is the incident located/i)).toBeDefined();

      const kithulkoteBtn = screen.getByText('Kithulkote Village');
      fireEvent.click(kithulkoteBtn);

      expect(screen.getAllByText(/Kithulkote Village/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/6.35500/i)).toBeDefined();
    });

    it('navigates through wizard steps and submits successfully', async () => {
      const onSuccess = vi.fn();
      render(<ConflictReportFormScreen isOnline={true} onSubmitSuccess={onSuccess} initialStep={1} />);

      // Step 1: Select Crop-Raiding and click Next
      const cropRaidingCard = screen.getByText('Crop-Raiding');
      fireEvent.click(cropRaidingCard);

      const nextBtnStep1 = screen.getByText(/Continue to Location/i);
      fireEvent.click(nextBtnStep1);

      // Step 2: Location
      expect(screen.getByText(/Step 2 of 4/i)).toBeDefined();
      const nextBtnStep2 = screen.getByText(/Continue to Details/i);
      fireEvent.click(nextBtnStep2);

      // Step 3: Details & Narrative
      expect(screen.getByText(/Step 3 of 4/i)).toBeDefined();
      const descInput = screen.getByPlaceholderText(/Bull elephant/i);
      fireEvent.change(descInput, {
        target: { value: 'Three elephants crossed buffer canal at 9pm and damaged crops.' },
      });

      const nextBtnStep3 = screen.getByText(/Review Report/i);
      fireEvent.click(nextBtnStep3);

      // Step 4: Review Your Report
      expect(screen.getByText(/Step 4 of 4/i)).toBeDefined();
      expect(screen.getByText(/Review Conflict Summary/i)).toBeDefined();

      const submitBtn = screen.getByText(/Submit Conflict Report/i);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mobileConflictService.submitConflict).toHaveBeenCalledTimes(1);
        expect(mobileConflictService.submitConflict).toHaveBeenCalledWith(
          expect.objectContaining({
            conflictType: ConflictType.CROP_DAMAGE,
            latitude: expect.any(Number),
            longitude: expect.any(Number),
          }),
          true
        );
      });

      // Step 5: Report Submitted Confirmation Screen
      await waitFor(() => {
        expect(screen.getByText(/Report Logged Successfully/i)).toBeDefined();
        expect(screen.getByText(/REFERENCE NUMBER/i)).toBeDefined();
        expect(screen.getByText(/View My Reports/i)).toBeDefined();
      });
    });

    it('supports alternate flow: selecting village location preset', () => {
      render(<ConflictReportFormScreen isOnline={true} initialStep={2} />);

      const villageBtn = screen.getByText(/Kithulkote Village/i);
      fireEvent.click(villageBtn);

      expect(screen.getAllByText(/Kithulkote Village/i).length).toBeGreaterThan(0);
    });

    it('handles exception flow: notifies user when required description is missing or invalid', () => {
      render(<ConflictReportFormScreen isOnline={true} initialStep={3} />);

      const nextBtnStep3 = screen.getByText(/Review Report/i);
      fireEvent.click(nextBtnStep3);

      expect(screen.getByText(/Please type a description of the incident \(at least 5 characters\)\./i)).toBeDefined();
    });
  });

  describe('ConflictListScreen', () => {
    it('renders list of logged incidents and category tags', async () => {
      render(<ConflictListScreen />);

      await waitFor(() => {
        expect(screen.getByText('Conflict Reports')).toBeDefined();
        expect(screen.getByText(/Logged Incidents/i)).toBeDefined();
        expect(screen.getByText(/Bull elephant broke fence/i)).toBeDefined();
        expect(screen.getByText(/UNDER_REVIEW/i)).toBeDefined();
      });
    });
  });
});
