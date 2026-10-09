import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertsPage } from '../../pages/AlertsPage';
import { webAlertService } from './services/alertService';
import {
  AlertStatus,
  RiskLevel,
  ResponseStatus,
  WildlifeRiskAlert,
  WildlifeAnimal,
} from './types';

vi.mock('./services/alertService', () => ({
  webAlertService: {
    fetchAlerts: vi.fn(),
    fetchAlertById: vi.fn(),
    respondToAlert: vi.fn(),
    fetchAnimals: vi.fn(),
    fetchRiskZones: vi.fn(),
    simulatePing: vi.fn(),
  },
}));

describe('UC03: Web AlertsPage & Alert Lifecycle Integration', () => {
  const mockAnimals: WildlifeAnimal[] = [
    {
      id: 'animal-1',
      name: 'Walagamba',
      species: 'Asian Elephant',
      gender: 'MALE' as any,
      identificationTag: 'ELE-001',
      healthStatus: 'HEALTHY',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      activeCollar: {
        id: 'collar-1',
        animalId: 'animal-1',
        collarCode: 'COLLAR-ELE-001',
        model: 'SolarPro',
        batteryPercentage: 88,
        isActive: true,
        lastTransmissionAt: '2026-10-08T10:00:00.000Z',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    },
    {
      id: 'animal-2',
      name: 'Kulu',
      species: 'Sri Lankan Leopard',
      gender: 'MALE' as any,
      identificationTag: 'LEP-001',
      healthStatus: 'HEALTHY',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      activeCollar: {
        id: 'collar-2',
        animalId: 'animal-2',
        collarCode: 'COLLAR-LEP-001',
        model: 'BioPulse',
        batteryPercentage: 45,
        isActive: true,
        lastTransmissionAt: '2026-10-08T09:45:00.000Z',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    },
  ];

  const mockAlerts: WildlifeRiskAlert[] = [
    {
      id: 'alert-1',
      animalId: 'animal-1',
      riskZoneId: 'zone-1',
      severity: RiskLevel.CRITICAL,
      status: AlertStatus.ACTIVE,
      generatedAt: '2026-10-08T10:15:00.000Z',
      notes: 'Automated geofence breach: Walagamba detected inside Kittulkote Village Settlement Zone',
      animalName: 'Walagamba',
      animalSpecies: 'Asian Elephant',
      zoneName: 'Kittulkote Village Settlement Zone',
      location: { latitude: 6.355, longitude: 81.335 },
      createdAt: '2026-10-08T10:15:00.000Z',
      updatedAt: '2026-10-08T10:15:00.000Z',
      responses: [],
    },
    {
      id: 'alert-2',
      animalId: 'animal-2',
      riskZoneId: 'zone-2',
      severity: RiskLevel.HIGH,
      status: AlertStatus.ACKNOWLEDGED,
      generatedAt: '2026-10-08T09:30:00.000Z',
      notes: 'Breach detected: Kulu approaching Kataragama Agricultural Buffer Zone',
      animalName: 'Kulu',
      animalSpecies: 'Sri Lankan Leopard',
      zoneName: 'Kataragama Agricultural Buffer Zone',
      location: { latitude: 6.418, longitude: 81.34 },
      createdAt: '2026-10-08T09:30:00.000Z',
      updatedAt: '2026-10-08T09:35:00.000Z',
      responses: [
        {
          id: 'resp-1',
          alertId: 'alert-2',
          responderId: 'aaaa0002-0000-0000-0000-000000000002',
          responderName: 'Ranger Kasun Bandara',
          actionTaken: 'Duty ranger acknowledged warning notification',
          status: ResponseStatus.INITIATED,
          respondedAt: '2026-10-08T09:35:00.000Z',
          createdAt: '2026-10-08T09:35:00.000Z',
          updatedAt: '2026-10-08T09:35:00.000Z',
        },
      ],
    },
    {
      id: 'alert-3',
      animalId: 'animal-1',
      riskZoneId: 'zone-2',
      severity: RiskLevel.HIGH,
      status: AlertStatus.RESOLVED,
      generatedAt: '2026-10-07T14:00:00.000Z',
      notes: 'Historical boundary breach resolved yesterday',
      animalName: 'Walagamba',
      animalSpecies: 'Asian Elephant',
      zoneName: 'Kataragama Agricultural Buffer Zone',
      location: { latitude: 6.415, longitude: 81.338 },
      createdAt: '2026-10-07T14:00:00.000Z',
      updatedAt: '2026-10-07T15:00:00.000Z',
      responses: [
        {
          id: 'resp-2',
          alertId: 'alert-3',
          responderId: 'aaaa0002-0000-0000-0000-000000000002',
          responderName: 'Ranger Kasun Bandara',
          actionTaken: 'Elephant safely guided back into park interior',
          status: ResponseStatus.COMPLETED,
          respondedAt: '2026-10-07T15:00:00.000Z',
          createdAt: '2026-10-07T15:00:00.000Z',
          updatedAt: '2026-10-07T15:00:00.000Z',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webAlertService.fetchAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(webAlertService.fetchAnimals).mockResolvedValue(mockAnimals);
    vi.mocked(webAlertService.fetchRiskZones).mockResolvedValue([
      {
        id: 'zone-1',
        parkId: 'park-1',
        name: 'Kittulkote Village Settlement Zone',
        zoneType: 'VILLAGE_SETTLEMENT' as any,
        riskLevel: RiskLevel.CRITICAL,
        boundaryCoordinates: [
          { latitude: 6.35, longitude: 81.33 },
          { latitude: 6.36, longitude: 81.33 },
          { latitude: 6.36, longitude: 81.34 },
          { latitude: 6.35, longitude: 81.34 },
        ],
        description: 'Village zone',
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
    vi.mocked(webAlertService.fetchAlertById).mockImplementation(async (id: string) => {
      const match = mockAlerts.find((a) => a.id === id);
      if (!match) throw new Error('Not found');
      return match;
    });
  });

  it('1. Alerts page loads real alert data, renders table and collar fleet', async () => {
    render(<AlertsPage />);

    // Renders header
    expect(screen.getByText('Wildlife Risk Alerts & Early Warning')).toBeInTheDocument();
    expect(screen.getByText('UC03 LIVE')).toBeInTheDocument();

    // Fetches alerts & animals on mount
    await waitFor(() => {
      expect(webAlertService.fetchAlerts).toHaveBeenCalledTimes(1);
      expect(webAlertService.fetchAnimals).toHaveBeenCalledTimes(1);
    });

    // Renders animals in collar fleet cards
    expect(screen.getAllByText('Walagamba').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kulu').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('COLLAR-ELE-001')).toBeInTheDocument();

    // Renders alerts in table
    expect(screen.getByText('Kittulkote Village Settlement Zone')).toBeInTheDocument();
    expect(screen.getAllByText('Kataragama Agricultural Buffer Zone').length).toBeGreaterThanOrEqual(1);
  });

  it('2. Status filter buttons filter alerts correctly in table', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kittulkote Village Settlement Zone')).toBeInTheDocument();
    });

    // Filter by RESOLVED
    const resolvedBtn = screen.getByRole('button', { name: 'RESOLVED' });
    fireEvent.click(resolvedBtn);

    // Kittulkote (ACTIVE) should not be visible in filtered list
    expect(screen.queryByText('Kittulkote Village Settlement Zone')).not.toBeInTheDocument();
    // Alert 3 (RESOLVED) should be visible
    expect(screen.getByText('Showing 1 of 3 alerts')).toBeInTheDocument();

    // Filter by ALL restores full list
    const allBtn = screen.getByRole('button', { name: 'ALL' });
    fireEvent.click(allBtn);
    expect(screen.getByText('Showing 3 of 3 alerts')).toBeInTheDocument();
  });

  it('3. Renders EmptyState when no alerts match filter', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kittulkote Village Settlement Zone')).toBeInTheDocument();
    });

    // Filter by RESPONDING (no alerts with this status in mock)
    const respondingBtn = screen.getByRole('button', { name: 'RESPONDING' });
    fireEvent.click(respondingBtn);

    expect(screen.getByText('No Alerts Found')).toBeInTheDocument();
    expect(screen.getByText('No alerts currently match the "RESPONDING" filter criteria.')).toBeInTheDocument();
  });

  it('4. Opens AlertDetailModal and displays ACTIVE alert with Acknowledge action', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kittulkote Village Settlement Zone')).toBeInTheDocument();
    });

    // Click on row for alert 1 (ACTIVE)
    const activeRow = screen.getByText('Kittulkote Village Settlement Zone');
    fireEvent.click(activeRow);

    await waitFor(() => {
      expect(webAlertService.fetchAlertById).toHaveBeenCalledWith('alert-1');
    });

    // Modal is open
    expect(screen.getByText('Alert Lifecycle Progression')).toBeInTheDocument();
    expect(screen.getByText('Acknowledge Alert →')).toBeInTheDocument();
    expect(screen.getAllByText('6.3550, 81.3350').length).toBeGreaterThanOrEqual(1);
  });

  it('5. Acknowledging ACTIVE alert calls respondToAlert with INITIATED status and updates alert', async () => {
    vi.mocked(webAlertService.respondToAlert).mockResolvedValue({
      id: 'resp-new',
      alertId: 'alert-1',
      responderId: 'aaaa0002-0000-0000-0000-000000000002',
      actionTaken: 'Duty ranger acknowledged warning notification',
      status: ResponseStatus.INITIATED,
      respondedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kittulkote Village Settlement Zone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Kittulkote Village Settlement Zone'));

    await waitFor(() => {
      expect(screen.getByText('Acknowledge Alert →')).toBeInTheDocument();
    });

    // Click Acknowledge Alert button to open action form
    fireEvent.click(screen.getByText('Acknowledge Alert →'));
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();

    // Submit action
    fireEvent.click(screen.getByText('Confirm Action'));

    await waitFor(() => {
      expect(webAlertService.respondToAlert).toHaveBeenCalledWith('alert-1', expect.objectContaining({
        status: ResponseStatus.INITIATED,
      }));
    });
  });

  it('6. Detail modal for ACKNOWLEDGED alert displays Start Response action', async () => {
    render(<AlertsPage />);

    const respondButtons = await screen.findAllByRole('button', { name: 'Respond' });
    // Alert 2 (ACKNOWLEDGED) is the second row
    fireEvent.click(respondButtons[1]);

    await waitFor(() => {
      expect(webAlertService.fetchAlertById).toHaveBeenCalledWith('alert-2');
    });

    // Should display Start Response button
    expect(screen.getByText('Start Response →')).toBeInTheDocument();
  });

  it('7. Detail modal for RESPONDING alert displays Resolve Alert action', async () => {
    const respondingAlert: WildlifeRiskAlert = {
      ...mockAlerts[0],
      id: 'alert-resp',
      status: AlertStatus.RESPONDING,
    };
    vi.mocked(webAlertService.fetchAlertById).mockResolvedValue(respondingAlert);

    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kittulkote Village Settlement Zone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Kittulkote Village Settlement Zone'));

    await waitFor(() => {
      expect(screen.getByText('Resolve Alert →')).toBeInTheDocument();
    });
  });

  it('8. Detail modal for RESOLVED alert shows closed status with no action button', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kittulkote Village Settlement Zone')).toBeInTheDocument();
    });

    // Filter to RESOLVED so only alert-3 is displayed
    fireEvent.click(screen.getByRole('button', { name: 'RESOLVED' }));

    // Click row or exact View button
    const viewButton = screen.getByRole('button', { name: 'View' });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(webAlertService.fetchAlertById).toHaveBeenCalledWith('alert-3');
    });

    expect(screen.getByText('Resolved & Closed')).toBeInTheDocument();
    expect(screen.queryByText(/Acknowledge Alert|Start Response|Resolve Alert/i)).not.toBeInTheDocument();
  });

  it('9. Opens SimulateTelemetryModal and submits simulated GPS ping', async () => {
    vi.mocked(webAlertService.simulatePing).mockResolvedValue({
      location: {
        id: 'loc-sim-1',
        animalId: 'animal-1',
        latitude: 6.355,
        longitude: 81.335,
        recordedAt: new Date().toISOString(),
        isSimulated: true,
        createdAt: new Date().toISOString(),
      },
      alert: {
        ...mockAlerts[0],
        id: 'alert-sim-generated',
      },
    });

    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Simulate Telemetry')).toBeInTheDocument();
    });

    // Open simulation modal
    fireEvent.click(screen.getByRole('button', { name: /simulate telemetry/i }));
    expect(screen.getByText('Simulate GPS Telemetry Ping')).toBeInTheDocument();

    // Click Transmit Simulated Ping
    const submitBtn = screen.getByRole('button', { name: /transmit simulated ping/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(webAlertService.simulatePing).toHaveBeenCalledTimes(1);
    });

    // Displays breach result
    expect(screen.getByText('Geofence Breach Detected!')).toBeInTheDocument();
    expect(screen.getByText('Telemetry Transmitted Successfully')).toBeInTheDocument();
  });

  it('10. Simulator handles safe ping outside risk zones (no alert result)', async () => {
    vi.mocked(webAlertService.simulatePing).mockResolvedValue({
      location: {
        id: 'loc-safe-1',
        animalId: 'animal-1',
        latitude: 6.375,
        longitude: 81.52,
        recordedAt: new Date().toISOString(),
        isSimulated: true,
        createdAt: new Date().toISOString(),
      },
      alert: null,
    });

    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Simulate Telemetry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /simulate telemetry/i }));

    // Apply safe preset
    fireEvent.click(screen.getByText('Safe Sanctuary Interior'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /transmit simulated ping/i }));

    await waitFor(() => {
      expect(webAlertService.simulatePing).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('No New Alert Created')).toBeInTheDocument();
    expect(screen.getAllByText(/safe sanctuary interior/i).length).toBeGreaterThanOrEqual(1);
  });

  it('11. Renders Live Wildlife Telemetry & Geofence Map with toggle control', async () => {
    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('wildlife-live-map')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /hide live map/i })).toBeInTheDocument();

    // Toggle hide map
    fireEvent.click(screen.getByRole('button', { name: /hide live map/i }));
    expect(screen.queryByTestId('wildlife-live-map')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show live map/i })).toBeInTheDocument();

    // Toggle show map again
    fireEvent.click(screen.getByRole('button', { name: /show live map/i }));
    expect(screen.getByTestId('wildlife-live-map')).toBeInTheDocument();
  });
});
