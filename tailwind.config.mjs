const defaultTheme = require('tailwindcss/defaultTheme')
const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['InterVariable', 'Inter', ...defaultTheme.fontFamily.sans],
				mono: ['JetBrains Mono Variable', 'JetBrains Mono', ...defaultTheme.fontFamily.mono]
			},
			keyframes: {
				wiggle: {
					'0%, 100%': { transform: 'rotate(-1deg)' },
					'50%': { transform: 'rotate(10deg)' }
				}
			},
			animation: {
				wiggle: 'wiggle 1s ease-in infinite'
			}
		}
	},
	plugins: [
		require('@tailwindcss/typography'),
		plugin(function ({ addVariant }) {
			addVariant(
				'prose-inline-code',
				'&.prose :where(:not(pre)>code):not(:where([class~="not-prose"] *))'
			)
		})
	]
}
