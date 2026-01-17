import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  createTodo,
  deleteTodo,
  getTodo,
  listTodosByUserId,
  updateTodo,
} from '../services/firestoreDemo';
import {
  createTodoSchema,
  idParamSchema,
  updateTodoSchema,
} from './todos/schemas';

export const todosRoute = new Hono()
  .get('/', async c => {
    const userId = c.get('user').uid;
    const todos = await listTodosByUserId(userId);
    return c.json({ data: todos });
  })
  .post('/', zValidator('json', createTodoSchema), async c => {
    const userId = c.get('user').uid;
    const body = await c.req.valid('json');

    const created = await createTodo({ userId, title: body.title });

    c.status(201);
    return c.json(created);
  })
  .get('/:id', zValidator('param', idParamSchema), async c => {
    const userId = c.get('user').uid;
    const { id } = c.req.valid('param');

    const todo = await getTodo({ userId, id });
    if (!todo) return c.json({ message: 'Not Found' }, 404);

    return c.json({ id, data: todo });
  })
  .put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateTodoSchema),
    async c => {
      const userId = c.get('user').uid;
      const { id } = c.req.valid('param');
      const body = await c.req.valid('json');

      const updated = await updateTodo({
        userId,
        id,
        title: body.title,
        completed: body.completed,
      });
      if (!updated) return c.json({ message: 'Not Found' }, 404);

      return c.json({ id, data: updated });
    },
  )
  .delete('/:id', zValidator('param', idParamSchema), async c => {
    const userId = c.get('user').uid;
    const { id } = c.req.valid('param');

    const ok = await deleteTodo({ userId, id });
    if (!ok) return c.json({ message: 'Not Found' }, 404);

    return c.json({ message: 'Deleted', id });
  });
