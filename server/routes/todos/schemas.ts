import { z } from 'zod';

export const createTodoSchema = z.object({
  title: z.string().min(1),
});

export const updateTodoSchema = z
  .object({
    title: z.string().min(1).optional(),
    completed: z.boolean().optional(),
  })
  .refine(v => v.title !== undefined || v.completed !== undefined, {
    message: 'At least one field must be provided',
  });

export const idParamSchema = z.object({
  id: z.string().min(1),
});
