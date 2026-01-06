import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
	ignores: ['jest.config.ts'],
	commonRules: {
		'no-console': 2,
	},
})

export default [
	...baseConfig,
	{
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
		},
	},
]
