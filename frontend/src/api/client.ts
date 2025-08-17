import { hc } from 'hono/client';
import { type ApiRoutes } from '@server/app';

const baseUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';

const client = hc<ApiRoutes>(baseUrl, {
  init: {
    credentials: 'include',
  },
});
export const api = client.api;
