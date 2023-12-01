import { defineCollection, z } from 'astro:content'

// Type-check frontmatter using a schema
const posts = defineCollection({
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		category: z.string(),
		tags: z.array(z.string())
	})
})

export const collections = { posts }
