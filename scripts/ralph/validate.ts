import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { TasksDocument } from "./types";

const taskSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["todo", "done", "pending"]),
  title: z.string().min(1),
  description: z.string().min(1),
  notes: z.array(z.string()),
});

const phaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().min(1),
  exitCriteria: z.array(z.string()),
  tasks: z.array(taskSchema).min(1),
});

const tasksDocumentSchema = z.object({
  idea: z.string().min(1),
  generatedAt: z.string().min(1),
  repo: z.string().min(1),
  phases: z.array(phaseSchema).min(1),
});

export async function loadTasksDocument(path: string): Promise<TasksDocument> {
  const raw = await readFile(path, "utf8");
  const json = JSON.parse(raw) as unknown;
  return tasksDocumentSchema.parse(json);
}
