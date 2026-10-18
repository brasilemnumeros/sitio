import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// `z` saiu de `astro:content` no Astro 7 (depreciado, removido no 8) — medido em
// `node_modules/astro/types/content.d.ts`. O import canônico é `astro/zod`.
import { z } from 'astro/zod';

export const collections = {
  posts: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      // min(1): a rota usa categories[0]; um array VAZIO geraria URL sem categoria.
      categories: z.array(z.string()).min(1),
      tags: z.array(z.string()).optional(),
      audio: z.string().optional(),
      image: z.string().optional(),
    }),
  }),
};
