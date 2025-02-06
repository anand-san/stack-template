import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authenticateUser } from '../middlewares/getUser';
import { sampleCreateSchema } from '@sandilya-stack/shared/types';

export const helloRoute = new Hono()
  .get('/', authenticateUser, async c => {
    return c.json({ message: 'Hello!' });
  })
  .post(
    '/',
    authenticateUser,
    zValidator('json', sampleCreateSchema),
    async c => {
      const body = await c.req.valid('json');
      console.log('title', body.title);

      c.status(201);
      return c.json({ message: 'Created' });
    },
  )
  .delete('/:id{[0-9]+}', authenticateUser, async c => {
    const id = Number.parseInt(c.req.param('id'));

    return c.json({ message: 'Deleted', id });
  });
