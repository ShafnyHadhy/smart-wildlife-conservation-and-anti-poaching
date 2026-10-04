import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { closePool } from '../src/config/database';

describe('Health & Root API Endpoints', () => {
  afterAll(async () => {
    await closePool();
  });

  it('GET / should return root application metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body.status).toBe('operational');
    expect(res.body.endpoints).toHaveProperty('health', '/api/health');
  });

  it('GET /api/health should respond with valid health structure', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('service', 'smart-wildlife-backend');
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('provider', 'neon-postgres');
    expect(['connected', 'disconnected', 'unconfigured']).toContain(res.body.database.status);
  });
});
