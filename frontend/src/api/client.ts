import { hc } from 'hono/client';
import { type ApiRoutes } from '@server/app';
// @init:firebase-start
import { getCurrentUserIdToken } from '@/lib/firebase';
// @init:firebase-end

const baseUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';

// @init:firebase-start
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
// @init:firebase-end
// @init:no-firebase-start
// const client = hc<ApiRoutes>(baseUrl);
// @init:no-firebase-end
export const api = client.api;
