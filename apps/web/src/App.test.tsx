import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { StatusBadge } from './components/common/StatusBadge';
import { StatCard } from './components/common/StatCard';
import { EmptyState } from './components/common/EmptyState';

// Mock global fetch for API endpoints
beforeEach(() => {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/health')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'ok',
            service: 'smart-wildlife-backend',
            version: '1.0.0',
            database: { status: 'connected', latencyMs: 25 },
          }),
      });
    }

    if (url.includes('/api/patrols')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'patrol-1',
                patrolCode: 'PAT-2026-001',
                rangerName: 'Saman Perera',
                routeName: 'Coastal Corridor',
                status: 'ACTIVE',
                startTime: new Date().toISOString(),
              },
            ],
          }),
      });
    }

    if (url.includes('/api/alerts')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'alert-1',
                animalName: 'Walagamba',
                animalSpecies: 'Elephas maximus',
                severity: 'HIGH',
                status: 'ACTIVE',
                zoneName: 'Kittulkote Buffer Zone',
                generatedAt: new Date().toISOString(),
              },
            ],
          }),
      });
    }

    // Default mock response for incidents, conflict-reports, patrol-routes
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [],
        }),
    });
  });
});

describe('Web Application Shell & Navigation', () => {
  it('renders sidebar brand and navigation tabs', async () => {
    render(<App />);

    expect(screen.getByText('SMART WILDLIFE')).toBeInTheDocument();
    expect(screen.getByText('Conservation HQ')).toBeInTheDocument();
    expect(screen.getByText('Dr. Kamal Jayasuriya')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Patrol Monitoring/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wildlife \/ Poaching/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wildlife Risk Alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Human-Wildlife Conflict/i })).toBeInTheDocument();
  });

  it('renders summary stat cards on dashboard home', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Active Patrols')).toBeInTheDocument();
      expect(screen.getByText('Wildlife Alerts')).toBeInTheDocument();
      expect(screen.getByText('Field Incidents')).toBeInTheDocument();
      expect(screen.getByText('Conflict Reports')).toBeInTheDocument();
    });
  });

  it('navigates to Patrol Monitoring (UC01 shell)', async () => {
    render(<App />);

    const patrolBtn = screen.getByRole('button', { name: /Patrol Monitoring/i });
    fireEvent.click(patrolBtn);

    await waitFor(() => {
      expect(screen.getByText('Patrol Monitoring Command')).toBeInTheDocument();
      expect(screen.getByText('UC01 SHELL')).toBeInTheDocument();
    });
  });

  it('navigates to Wildlife / Poaching Incidents (UC02 shell)', async () => {
    render(<App />);

    const incidentBtn = screen.getByRole('button', { name: /Wildlife \/ Poaching/i });
    fireEvent.click(incidentBtn);

    await waitFor(() => {
      expect(screen.getByText('Wildlife & Poaching Incidents')).toBeInTheDocument();
      expect(screen.getByText('UC02 SHELL')).toBeInTheDocument();
    });
  });

  it('navigates to Wildlife Risk Alerts (UC03 shell)', async () => {
    render(<App />);

    const alertBtn = screen.getByRole('button', { name: /Wildlife Risk Alerts/i });
    fireEvent.click(alertBtn);

    await waitFor(() => {
      expect(screen.getByText('Wildlife Risk Alerts & Early Warning')).toBeInTheDocument();
      expect(screen.getByText('UC03 SHELL')).toBeInTheDocument();
    });
  });

  it('navigates to Human-Wildlife Conflicts (UC04 shell)', async () => {
    render(<App />);

    const conflictBtn = screen.getByRole('button', { name: /Human-Wildlife Conflict/i });
    fireEvent.click(conflictBtn);

    await waitFor(() => {
      expect(screen.getByText('Human-Wildlife Conflict Reports')).toBeInTheDocument();
      expect(screen.getByText('UC04 SHELL')).toBeInTheDocument();
    });
  });
});

describe('Web Reusable Components', () => {
  it('renders StatusBadge with proper styling', () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    expect(container.textContent).toContain('ACTIVE');
  });

  it('renders StatCard with title, value, and subtitle', () => {
    render(
      <StatCard
        title="Field Rangers"
        value={12}
        subtitle="Patrolling Yala Sector 1"
      />
    );
    expect(screen.getByText('Field Rangers')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Patrolling Yala Sector 1')).toBeInTheDocument();
  });

  it('renders EmptyState with message and action button', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Incidents"
        message="No wire snares reported today."
        action={{
          label: 'Refresh Data',
          onClick: handleAction,
        }}
      />
    );

    expect(screen.getByText('No Incidents')).toBeInTheDocument();
    expect(screen.getByText('No wire snares reported today.')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Refresh Data/i });
    fireEvent.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
