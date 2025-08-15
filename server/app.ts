import { Hono, type Context } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { HTTPException } from 'hono/http-exception';
import { helloRoute } from './routes/hello';

const app = new Hono();

app.onError((err: unknown, ctx: Context) => {
  if (err instanceof HTTPException) {
    return ctx.json({ error: err.message }, err.status);
  }
  return ctx.json({ error: 'Something went horribly wrong' }, 500);
});

// Middlwares
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Access-Control-Allow-Headers',
      'Origin',
      'Accept',
      'X-Requested-With',
      'Content-Type',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'Authorization',
    ],
    credentials: true,
  }),
);

const apiRoutes = app
  .basePath('/api')
  .get('/health', c => c.text('OK', 201))
  .route('/hello', helloRoute);

app.get('*', serveStatic({ root: './frontend/dist' }));
app.get('*', serveStatic({ path: './frontend/dist/index.html' }));

export default app;
export type ApiRoutes = typeof apiRoutes;
