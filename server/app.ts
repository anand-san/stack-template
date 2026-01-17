import { Hono, type Context } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { HTTPException } from 'hono/http-exception';
import { helloRoute } from './routes/hello';
import { todosRoute } from './routes/todos';
import env from './env';
import { authenticateUser } from './middlewares/auth/getUser';
const app = new Hono();

app.onError((err: unknown, ctx: Context) => {
  if (err instanceof HTTPException) {
    return ctx.json({ error: err.message }, err.status);
  }
  return ctx.json({ error: 'Something went horribly wrong' }, 500);
});

// Middlwares
app.use('*', logger());
app.use('/api/*', authenticateUser);
app.use(
  '*',
  cors({
    origin: origin => {
      {
        if (origin.endsWith('.sandilya.dev')) {
          return origin;
        }
        return env.FRONTEND_URL;
      }
    },
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
  .get('/health', c => c.text('OK', 201))
  .basePath('/api')
  .route('/hello', helloRoute)
  // Note: This is just a sample route to demonstrate basic usage of services while templating
  .route('/todos', todosRoute);

app.get('*', serveStatic({ root: './frontend' }));
app.get('*', serveStatic({ path: './frontend/index.html' }));

export default app;
export type ApiRoutes = typeof apiRoutes;
