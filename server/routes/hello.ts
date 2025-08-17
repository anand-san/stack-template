import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sampleCreateSchema } from '@sandilya-stack/shared/types';

export const helloRoute = new Hono()
  .get('/', async c => {
    const userId = c.get('authUserId');
    const clerkClient = c.get('clerk');

    const user = await clerkClient.users.getUser(userId);

    return c.json({ message: `Hello ${user.firstName}! (from server)` });
  })
  .post(
    '/',

    zValidator('json', sampleCreateSchema),
    async c => {
      const body = await c.req.valid('json');

      c.status(201);
      return c.json({ message: 'Created', data: body.title });
    },
  )
  .delete('/:id{[0-9]+}', async c => {
    const id = Number.parseInt(c.req.param('id'));

    return c.json({ message: 'Deleted', id });
  });
