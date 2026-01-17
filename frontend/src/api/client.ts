import { hc } from 'hono/client';
import { type ApiRoutes } from '@server/app';
import { getCurrentUserIdToken } from '@/lib/firebase';

const baseUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';

const client = hc<ApiRoutes>(baseUrl, {
  init: {
    credentials: 'include',
  },
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getCurrentUserIdToken();
    const headers = new Headers(init?.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, {
      ...init,
      headers,
    });
  },
});
export const api = client.api;
