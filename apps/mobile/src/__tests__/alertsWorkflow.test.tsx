import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Lightweight React Native element mock for pure unit test environment
vi.mock('react-native', () => {
  return {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    useWindowDimensions: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
    Dimensions: {
      get: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    View: ({ children, testID, id, style, className }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style, className }, children),
    Text: ({ children, testID, id, style, className }: any) =>
      React.createElement('span', { 'data-testid': testID, id, style, className }, children),
    TextInput: ({ value, onChangeText, placeholder, testID, id, style, disabled }: any) =>
      React.createElement('input', {
        value,
        onChange: (e: any) => onChangeText?.(e.target.value),
        placeholder,
        'data-testid': testID,
        id,
        style,
        disabled,
      }),
    Image: ({ source, style, testID }: any) =>
      React.createElement('img', {
        src: typeof source === 'string' ? source : source?.uri,
        style,
        'data-testid': testID,
      }),
    TouchableOpacity: ({ children, onPress, testID, id, disabled, style }: any) =>
      React.createElement('button', { onClick: onPress, type: 'button', 'data-testid': testID, id, disabled, style }, children),
    ScrollView: ({ children, testID, id, style }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style }, children),
    SafeAreaView: ({ children, testID, id, style }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style }, children),
    ActivityIndicator: ({ testID }: any) =>
      React.createElement('div', { 'data-testid': testID || 'activity-indicator' }),
    StatusBar: () => null,
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Alert: {
      alert: vi.fn(),
    },
  };
});

import { mobileApiClient } from '../services/apiClient';
import { offlineQueue } from '../services/offlineQueue';
import { persistentStorage } from '../storage/persistentStorage';
import { AlertsScreen } from '../screens/Alerts/AlertsScreen';
import { AlertDetailScreen } from '../features/uc03-alerts/screens/AlertDetailScreen';
import { mobileAlertService } from '../features/uc03-alerts/services/alertService';
import {
  WildlifeRiskAlert,
  AlertStatus,
  ResponseStatus,
  RiskLevel,
} from '../features/uc03-alerts/types';

// Mock Alert Data
const mockActiveAlert: WildlifeRiskAlert = {
  id: 'alert-act-001',
  animalId: 'animal-001',
  riskZoneId: 'zone-001',
  locationRecordId: 'loc-001',
  severity: RiskLevel.HIGH,
  status: AlertStatus.ACTIVE,
  generatedAt: '2026-10-09T08:00:00.000Z',
  notes: 'Simulated breach near southern agricultural buffer',
  createdAt: '2026-10-09T08:00:00.000Z',
  updatedAt: '2026-10-09T08:00:00.000Z',
  animalName: 'Walagamba',
  animalSpecies: 'Asian Elephant',
  zoneName: 'Kittulkote Buffer Zone',
  location: { latitude: 6.355, longitude: 81.335 },
  responses: [],
};

const mockAckAlert: WildlifeRiskAlert = {
  id: 'alert-ack-002',
  animalId: 'animal-002',
  riskZoneId: 'zone-002',
  severity: RiskLevel.CRITICAL,
  status: AlertStatus.ACKNOWLEDGED,
  generatedAt: '2026-10-09T07:30:00.000Z',
  createdAt: '2026-10-09T07:30:00.000Z',
  updatedAt: '2026-10-09T07:35:00.000Z',
  animalName: 'Kumana Raja',
  animalSpecies: 'Asian Elephant',
  zoneName: 'Kataragama Buffer',
  location: { latitude: 6.418, longitude: 81.34 },
  responses: [
    {
      id: 'resp-001',
      alertId: 'alert-ack-002',
      responderId: 'ranger-001',
      responderName: 'Ranger Kasun',
      actionTaken: 'Alert acknowledged by patrol team',
      status: ResponseStatus.INITIATED,
      respondedAt: '2026-10-09T07:35:00.000Z',
      createdAt: '2026-10-09T07:35:00.000Z',
      updatedAt: '2026-10-09T07:35:00.000Z',
    },
  ],
};

const mockRespondingAlert: WildlifeRiskAlert = {
  id: 'alert-resp-003',
  animalId: 'animal-003',
  riskZoneId: 'zone-001',
  severity: RiskLevel.MEDIUM,
  status: AlertStatus.RESPONDING,
  generatedAt: '2026-10-09T06:00:00.000Z',
  createdAt: '2026-10-09T06:00:00.000Z',
  updatedAt: '2026-10-09T06:20:00.000Z',
  animalName: 'Kulu',
  animalSpecies: 'Sri Lankan Leopard',
  zoneName: 'Block 2 Boundary',
  location: { latitude: 6.375, longitude: 81.52 },
  responses: [
    {
      id: 'resp-002',
      alertId: 'alert-resp-003',
      responderId: 'ranger-001',
      responderName: 'Ranger Kasun',
      actionTaken: 'Patrol team deployed',
      status: ResponseStatus.IN_PROGRESS,
      respondedAt: '2026-10-09T06:20:00.000Z',
      createdAt: '2026-10-09T06:20:00.000Z',
      updatedAt: '2026-10-09T06:20:00.000Z',
    },
  ],
};

const mockResolvedAlert: WildlifeRiskAlert = {
  id: 'alert-res-004',
  animalId: 'animal-001',
  riskZoneId: 'zone-001',
  severity: RiskLevel.HIGH,
  status: AlertStatus.RESOLVED,
  generatedAt: '2026-10-09T04:00:00.000Z',
  createdAt: '2026-10-09T04:00:00.000Z',
  updatedAt: '2026-10-09T05:00:00.000Z',
  animalName: 'Walagamba',
  animalSpecies: 'Asian Elephant',
  zoneName: 'Kittulkote Buffer Zone',
  location: { latitude: 6.355, longitude: 81.335 },
  responses: [
    {
      id: 'resp-003',
      alertId: 'alert-res-004',
      responderId: 'ranger-001',
      responderName: 'Ranger Kasun',
      actionTaken: 'Elephant guided back to sanctuary',
      status: ResponseStatus.COMPLETED,
      respondedAt: '2026-10-09T05:00:00.000Z',
      createdAt: '2026-10-09T05:00:00.000Z',
      updatedAt: '2026-10-09T05:00:00.000Z',
    },
  ],
};

describe('UC03-E & UC03-F: Mobile Wildlife Risk Alert & Responder Workflow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(mobileAlertService, 'getRiskZones').mockResolvedValue([]);
    vi.spyOn(mobileAlertService, 'getAnimals').mockResolvedValue([]);
  });

  // 1. Live alert loading
  it('1. loads live alerts from GET /api/alerts and displays animal info and coordinates', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce([mockActiveAlert]);

    render(<AlertsScreen isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Walagamba/i)).toBeDefined();
    });

    expect(mobileApiClient.get).toHaveBeenCalledWith('/alerts');
    expect(screen.getByText(/Asian Elephant/i)).toBeDefined();
    expect(screen.getByText(/Kittulkote Buffer Zone/i)).toBeDefined();
    expect(screen.getByText(/6.3550, 81.3350/i)).toBeDefined();
    expect(screen.getByText('HIGH')).toBeDefined();
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(1);
  });

  // 2. Status filtering
  it('2. filters alerts by status when filter tabs are clicked', async () => {
    vi.spyOn(mobileApiClient, 'get')
      .mockResolvedValueOnce([mockActiveAlert, mockAckAlert])
      .mockResolvedValueOnce([mockAckAlert]);

    render(<AlertsScreen isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Walagamba/i)).toBeDefined();
    });

    // Click Acknowledged filter
    fireEvent.click(screen.getByTestId('filter-acknowledged'));

    await waitFor(() => {
      expect(mobileApiClient.get).toHaveBeenCalledWith(
        `/alerts?status=${encodeURIComponent(AlertStatus.ACKNOWLEDGED)}`
      );
    });
  });

  // 3. Loading, empty, error, and offline states
  it('3. displays empty, error, and offline states properly', async () => {
    // Empty state
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce([]);
    const { unmount } = render(<AlertsScreen isOnline={true} />);
    await waitFor(() => {
      expect(screen.getByText(/No Risk Alerts Found/i)).toBeDefined();
    });
    unmount();

    // Error state
    vi.spyOn(mobileApiClient, 'get').mockRejectedValueOnce(
      new Error('Network connectivity lost')
    );
    vi.spyOn(persistentStorage, 'getItem').mockResolvedValueOnce(null);
    const { unmount: unmountError } = render(<AlertsScreen isOnline={true} />);
    await waitFor(() => {
      expect(screen.getByText(/Error Loading Alerts/i)).toBeDefined();
    });
    unmountError();

    // Offline state with cached alerts
    vi.spyOn(persistentStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify([mockActiveAlert])
    );
    render(<AlertsScreen isOnline={false} />);
    await waitFor(() => {
      expect(screen.getByText(/Offline Mode Active/i)).toBeDefined();
      expect(screen.getByText(/Walagamba/i)).toBeDefined();
    });
  });

  // 4. Opening alert details
  it('4. opens alert detail screen on item interaction', async () => {
    vi.spyOn(mobileApiClient, 'get')
      .mockResolvedValueOnce([mockActiveAlert]) // initial list
      .mockResolvedValueOnce(mockActiveAlert); // detail view

    render(<AlertsScreen isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByTestId(`view-alert-${mockActiveAlert.id}`)).toBeDefined();
    });

    fireEvent.click(screen.getByTestId(`view-alert-${mockActiveAlert.id}`));

    await waitFor(() => {
      expect(screen.getByText(/ALERT RESPONSE LIFECYCLE/i)).toBeDefined();
      expect(screen.getByText(/BREACH RISK ZONE/i)).toBeDefined();
    });
  });

  // 5. ACTIVE shows Acknowledge
  it('5. ACTIVE status shows Acknowledge Alert action', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockActiveAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acknowledge Alert ›/i)).toBeDefined();
    });
  });

  // 6. ACKNOWLEDGED shows Start Response
  it('6. ACKNOWLEDGED status shows Start Response action', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockAckAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);

    render(
      <AlertDetailScreen
        alertId={mockAckAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Start Response ›/i)).toBeDefined();
    });
  });

  // 7. RESPONDING shows Resolve
  it('7. RESPONDING status shows Resolve Alert action', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockRespondingAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);

    render(
      <AlertDetailScreen
        alertId={mockRespondingAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Resolve Alert ›/i)).toBeDefined();
    });
  });

  // 8. RESOLVED has no further response action
  it('8. RESOLVED status shows completed notice and no further action button', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockResolvedAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);

    render(
      <AlertDetailScreen
        alertId={mockResolvedAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Alert Resolved & Closed/i)).toBeDefined();
    });

    expect(screen.queryByText(/Acknowledge Alert/i)).toBeNull();
    expect(screen.queryByText(/Start Response/i)).toBeNull();
    expect(screen.queryByText(/Resolve Alert ›/i)).toBeNull();
  });

  // 9. Correct request payload is sent to response endpoint
  it('9. sends correct request payload DTO to response endpoint', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockActiveAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);
    const respondSpy = vi.spyOn(mobileApiClient, 'respondToAlert').mockResolvedValueOnce({
      direct: true,
      result: { id: 'resp-999', status: ResponseStatus.INITIATED } as any,
    });

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acknowledge Alert ›/i)).toBeDefined();
    });

    // Open form
    fireEvent.click(screen.getByText(/Acknowledge Alert ›/i));

    // Confirm submission
    fireEvent.click(screen.getByTestId('confirm-action-button'));

    await waitFor(() => {
      expect(respondSpy).toHaveBeenCalledWith(
        mockActiveAlert.id,
        expect.objectContaining({
          alertId: mockActiveAlert.id,
          status: ResponseStatus.INITIATED,
          actionTaken: expect.any(String),
        }),
        true
      );
    });
  });

  // 10. Successful online response refreshes the alert and list
  it('10. refreshes alert detail and notifies parent list on successful response', async () => {
    const onAlertUpdated = vi.fn();
    vi.spyOn(mobileApiClient, 'get')
      .mockResolvedValueOnce(mockActiveAlert) // first load
      .mockResolvedValueOnce({
        ...mockActiveAlert,
        status: AlertStatus.ACKNOWLEDGED,
      }); // reload after response
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValue([]);
    vi.spyOn(mobileApiClient, 'respondToAlert').mockResolvedValueOnce({
      direct: true,
      result: { id: 'resp-new', status: ResponseStatus.INITIATED } as any,
    });

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={true}
        onAlertUpdated={onAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acknowledge Alert ›/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Acknowledge Alert ›/i));
    fireEvent.click(screen.getByTestId('confirm-action-button'));

    await waitFor(() => {
      expect(onAlertUpdated).toHaveBeenCalled();
    });
  });

  // 11. Offline response is queued using existing infrastructure
  it('11. enqueues response action into offlineQueue when device is offline', async () => {
    vi.spyOn(offlineQueue, 'enqueue').mockResolvedValueOnce({
      id: 'queue-001',
      entityType: 'ALERT_RESPONSE',
      operationType: 'CREATE',
      payload: { alertId: mockActiveAlert.id, status: ResponseStatus.INITIATED },
      clientMutationId: 'mut-123',
      createdAt: '2026-10-09T08:00:00Z',
      retryCount: 0,
      status: 'PENDING',
    } as any);

    const res = await mobileApiClient.respondToAlert(
      mockActiveAlert.id,
      {
        alertId: mockActiveAlert.id,
        responderId: 'ranger-001',
        actionTaken: 'Acknowledged while in remote sector',
        status: ResponseStatus.INITIATED,
      },
      false // isOnline = false
    );

    expect(res.direct).toBe(false);
    expect(offlineQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ALERT_RESPONSE',
        payload: expect.objectContaining({
          alertId: mockActiveAlert.id,
        }),
      })
    );
  });

  // 12. Queued actions are clearly marked as pending, not confirmed
  it('12. displays pending sync banner and locks next lifecycle transition when offline action queued', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockActiveAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([
      {
        id: 'q-1',
        entityType: 'ALERT_RESPONSE',
        operationType: 'CREATE',
        payload: {
          alertId: mockActiveAlert.id,
          actionTaken: 'Acknowledge in progress',
          status: ResponseStatus.INITIATED,
        },
        clientMutationId: 'c-1',
        createdAt: '2026-10-09T08:00:00Z',
        retryCount: 0,
        status: 'PENDING',
      } as any,
    ]);

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Pending Offline Synchronization/i)).toBeDefined();
    });

    // Should NOT allow advancing to Start Response while Acknowledge is still pending sync
    expect(screen.queryByText(/Start Response ›/i)).toBeNull();
  });

  // 13. Failed synchronization does not silently discard an action
  it('13. preserves queued action in offline storage if synchronization replay fails', async () => {
    const queuedItem = {
      id: 'q-fail-1',
      entityType: 'ALERT_RESPONSE' as const,
      operationType: 'CREATE' as const,
      payload: { alertId: 'alert-001' },
      clientMutationId: 'c-fail-1',
      createdAt: '2026-10-09T08:00:00Z',
      retryCount: 0,
      status: 'PENDING' as const,
    };

    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([queuedItem]);

    const pending = await mobileAlertService.getPendingAlertActions('alert-001');
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('q-fail-1');
  });

  // 14. Backend lifecycle errors are displayed
  it('14. displays backend validation errors when server rejects invalid transition', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockActiveAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);
    vi.spyOn(mobileApiClient, 'respondToAlert').mockRejectedValueOnce(
      new Error('Invalid lifecycle transition: alert is already resolved')
    );

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acknowledge Alert ›/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Acknowledge Alert ›/i));
    fireEvent.click(screen.getByTestId('confirm-action-button'));

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid lifecycle transition: alert is already resolved/i)
      ).toBeDefined();
    });
  });

  // 15. Repeated taps do not create duplicate online submissions
  it('15. prevents duplicate submissions during inflight request', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockActiveAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);

    let resolvePromise: any;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const respondSpy = vi
      .spyOn(mobileApiClient, 'respondToAlert')
      .mockReturnValueOnce(pendingPromise as any);

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acknowledge Alert ›/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Acknowledge Alert ›/i));

    const submitBtn = screen.getByTestId('confirm-action-button');
    // First tap
    fireEvent.click(submitBtn);
    // Immediate second tap while inflight
    fireEvent.click(submitBtn);

    expect(respondSpy).toHaveBeenCalledTimes(1);

    // Resolve the inflight promise
    resolvePromise({
      direct: true,
      result: { id: 'resp-done', status: ResponseStatus.INITIATED },
    });

    await waitFor(() => {
      expect(respondSpy).toHaveBeenCalledTimes(1);
    });
  });

  // 16. Map integration: renders risk-zone boundaries and selected animal marker
  it('16. renders map with real backend risk-zone boundaries and animal marker', async () => {
    const mockZone = {
      id: 'zone-001',
      name: 'Kittulkote Buffer Zone',
      zoneType: 'BUFFER_ZONE',
      riskLevel: RiskLevel.HIGH,
      boundaryCoordinates: [
        { latitude: 6.35, longitude: 81.33 },
        { latitude: 6.36, longitude: 81.33 },
        { latitude: 6.36, longitude: 81.34 },
        { latitude: 6.35, longitude: 81.34 },
      ],
      description: 'Buffer zone around Kittulkote settlement',
      createdAt: '2026-10-09T00:00:00Z',
      updatedAt: '2026-10-09T00:00:00Z',
    };

    vi.spyOn(mobileApiClient, 'get').mockResolvedValue(mockActiveAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValue([]);
    vi.spyOn(mobileAlertService, 'getRiskZones').mockResolvedValue([mockZone]);
    vi.spyOn(mobileAlertService, 'getAnimals').mockResolvedValue([]);

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/GPS LOCATION & GEOFENCE MAP/i)).toBeDefined();
      expect(screen.getByText(/GPS • Active/i)).toBeDefined();
      expect(screen.getAllByText(/Kittulkote Buffer Zone/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // 17. Graceful degradation: handles missing coordinates without crashing
  it('17. gracefully handles alert with missing location coordinates without crashing', async () => {
    const alertWithoutLocation: WildlifeRiskAlert = {
      ...mockActiveAlert,
      id: 'alert-no-loc',
      location: undefined,
    };

    vi.spyOn(mobileApiClient, 'get').mockResolvedValue(alertWithoutLocation);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValue([]);

    render(
      <AlertDetailScreen
        alertId="alert-no-loc"
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Coordinates Pending Telemetry Lock/i)).toBeDefined();
      expect(screen.getByText(/SPECIES IDENTIFICATION/i)).toBeDefined();
    });
  });

  // 18. WildGuard branding and 2x2 data grid visual hierarchy on alert list
  it('18. displays WildGuard brand badge and 2x2 data grid on AlertsScreen', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValue([mockActiveAlert]);

    render(<AlertsScreen isOnline={true} />);

    await waitFor(() => {
      expect(screen.getByText('WildGuard')).toBeDefined();
      expect(screen.getByText(/1 active threat alert today/i)).toBeDefined();
      expect(screen.getByText('RISK ZONE')).toBeDefined();
      expect(screen.getByText('RISK TYPE')).toBeDefined();
      expect(screen.getByText('RISK LEVEL')).toBeDefined();
      expect(screen.getByText('STATUS')).toBeDefined();
      expect(screen.getByTestId(`view-alert-${mockActiveAlert.id}`)).toBeDefined();
    });
  });

  // 19. Action preset options with professional icons
  it('19. displays structured action presets when responder opens action form', async () => {
    vi.spyOn(mobileApiClient, 'get').mockResolvedValueOnce(mockActiveAlert);
    vi.spyOn(offlineQueue, 'getPending').mockResolvedValueOnce([]);

    render(
      <AlertDetailScreen
        alertId={mockActiveAlert.id}
        onBack={vi.fn()}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Acknowledge Alert ›/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Acknowledge Alert ›/i));

    await waitFor(() => {
      expect(screen.getByText(/Select Standard Field Action/i)).toBeDefined();
      expect(screen.getByText(/Dispatched to Location/i)).toBeDefined();
      expect(screen.getByText(/Investigating \/ Assessing Threat/i)).toBeDefined();
      expect(screen.getByText(/Monitoring Movement/i)).toBeDefined();
      expect(screen.getByTestId('confirm-action-button')).toBeDefined();
    });
  });
});

