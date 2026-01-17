import { describe, it, expect } from 'bun:test';
import app from '../../app';
import { createTestClient } from '../utils/test-client';

describe('Health Endpoint', () => {
  const client = createTestClient(app);

  it('should return OK with status 201', async () => {
    const response = await client.get('/health');

    expect(response.status).toBe(201);
    expect(await response.text()).toBe('OK');
  });
});
