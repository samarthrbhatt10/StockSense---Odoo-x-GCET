import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z
    .string({ required_error: "Enter something to search for", invalid_type_error: "Search text must be a single value" })
    .trim()
    .min(1, "Enter something to search for")
    .max(60, "Search text must be at most 60 characters"),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
