import { z } from "zod";

export const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const updateTodoSchema = z
  .object({
    title: z.string().min(1, "Title is required").optional(),
    completed: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.completed !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

export const idParamSchema = z.object({
  id: z.string().min(1, "Id is required"),
});

export type TodoIdParam = z.infer<typeof idParamSchema>;
