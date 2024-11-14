import { z } from "zod";

// Define the schema for creating an opportunity
export const sampleCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export type SampleCreateSchema = z.infer<typeof sampleCreateSchema>;
