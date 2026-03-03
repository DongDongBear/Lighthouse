import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({}).optional(),
});

export const collections = { docs };
