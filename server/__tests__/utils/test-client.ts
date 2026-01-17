/**
 * Test utilities for Hono app testing
 */

import type { Hono } from 'hono';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

/**
 * Creates a test client for making requests to a Hono app
 */
export function createTestClient(app: Hono) {
  const baseUrl = 'http://localhost';

  return {
    /**
     * Make a request to the app
     */
    async request(path: string, options: RequestOptions = {}) {
      const { method = 'GET', headers = {}, body } = options;

      const requestInit: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (body && method !== 'GET') {
        requestInit.body = JSON.stringify(body);
      }

      const url = new URL(path, baseUrl);
      const request = new Request(url.toString(), requestInit);

      return app.fetch(request);
    },

    /**
     * Make an authenticated request with a Bearer token
     */
    async authenticatedRequest(
      path: string,
      token: string,
      options: RequestOptions = {},
    ) {
      return this.request(path, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    },

    // Convenience methods
    get: (path: string, headers?: Record<string, string>) =>
      createTestClient(app).request(path, { method: 'GET', headers }),

    post: (path: string, body: unknown, headers?: Record<string, string>) =>
      createTestClient(app).request(path, { method: 'POST', body, headers }),

    put: (path: string, body: unknown, headers?: Record<string, string>) =>
      createTestClient(app).request(path, { method: 'PUT', body, headers }),

    delete: (path: string, headers?: Record<string, string>) =>
      createTestClient(app).request(path, { method: 'DELETE', headers }),
  };
}

/**
 * Helper to parse JSON response
 */
export async function parseJsonResponse<T = unknown>(
  response: Response,
): Promise<T> {
  return response.json() as Promise<T>;
}
