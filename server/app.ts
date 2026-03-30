import { Hono, type Context } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
// @init:sample-start
import { helloRoute } from './routes/hello';
import { todosRoute } from './routes/todos';
// @init:sample-end
import env from './env';
// @init:firebase-start
import { authenticateUser } from './middlewares/auth/getUser';
// @init:firebase-end
const app = new Hono();

app.onError((err: unknown, ctx: Context) => {
  if (err instanceof HTTPException) {
    return ctx.json({ error: err.message }, err.status);
  }
  return ctx.json({ error: 'Something went horribly wrong' }, 500);
});

// Middlwares
app.use('*', logger());
// @init:firebase-start
app.use('/api/*', authenticateUser);
// @init:firebase-end
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
  // @init:sample-start
  .route('/hello', helloRoute)
  .route('/todos', todosRoute);
// @init:sample-end
export default app;
export type ApiRoutes = typeof apiRoutes;
