import { z } from 'zod';
import { Timestamp } from '../firebase';

export const todoSchema = z.object({
  userId: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});

export type Todo = z.infer<typeof todoSchema>;
