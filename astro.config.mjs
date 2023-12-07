import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import compressor from 'astro-compressor'

// https://astro.build/config
export default defineConfig({
	site: 'https://thiagomajesk.github.io/',
	integrations: [mdx(), sitemap(), tailwind(), compressor()],
	markdown: {
		shikiConfig: {
			wrap: true,
			theme: 'material-theme-ocean'
		}
	}
})
