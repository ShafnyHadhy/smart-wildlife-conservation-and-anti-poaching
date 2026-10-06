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

describe('UC04: Mobile Conflict Reporting & Tracking', () => {
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

  describe('ConflictReportFormScreen', () => {
    it('renders form header, online indicator, and conflict categories', () => {
      render(<ConflictReportFormScreen isOnline={true} />);

      expect(screen.getByText('Report Conflict')).toBeDefined();
      expect(screen.getByText('Human-Wildlife Incident (UC04)')).toBeDefined();
      expect(screen.getByText('ONLINE')).toBeDefined();
      expect(screen.getByText('Crop Damage')).toBeDefined();
      expect(screen.getByText('Elephant Encounter')).toBeDefined();
      expect(screen.getByText('Property Damage')).toBeDefined();
    });

    it('renders offline mode badge when offline', () => {
      render(<ConflictReportFormScreen isOnline={false} />);
      expect(screen.getByText('OFFLINE')).toBeDefined();
      expect(screen.getByText('Offline Queue Active')).toBeDefined();
    });

    it('allows changing village preset and fills coordinates', () => {
      render(<ConflictReportFormScreen isOnline={true} />);

      const kittulkoteBtn = screen.getByText('Kittulkote Village');
      fireEvent.click(kittulkoteBtn);

      expect(screen.getByDisplayValue('6.355')).toBeDefined();
      expect(screen.getByDisplayValue('81.335')).toBeDefined();
    });

    it('submits conflict report successfully when online', async () => {
      const onSuccess = vi.fn();
      render(<ConflictReportFormScreen isOnline={true} onSubmitSuccess={onSuccess} />);

      const descInput = screen.getByPlaceholderText(/Bull elephant/i);
      fireEvent.change(descInput, {
        target: { value: 'Three elephants crossed buffer canal at 9pm' },
      });

      const submitBtn = screen.getByText('Submit Conflict Report');
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
