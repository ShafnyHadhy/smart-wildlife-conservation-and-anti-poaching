import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock global fetch for health check
beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          status: 'ok',
          service: 'smart-wildlife-backend',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          uptimeSeconds: 120,
          environment: 'development',
          database: {
            status: 'connected',
            provider: 'neon-postgres',
            latencyMs: 35,
          },
        }),
    })
  );
});

describe('Web Application Shell', () => {
  it('renders system brand title and operational tabs', async () => {
    render(<App />);

    expect(
      screen.getByText(/Smart Wildlife Conservation & Monitoring/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /UC01: Ranger Patrol Monitoring/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /UC02: Poaching & Field Incidents/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /UC03: Wildlife Risk Alerts/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /UC04: Human-Wildlife Conflict/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Neon PostgreSQL Online/i)).toBeInTheDocument();
    });
  });
});
