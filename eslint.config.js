import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
	// 1. TypeScript files (.vitepress/config.mts, theme entry, helpers)
	{
		files: ['**/*.{ts,mts}'],
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.strict],
		rules: {
			// Import sorting and grouping
			'simple-import-sort/imports': [
				'error',
				{
					groups: [
						['^vitepress', '^vue'], // 1. VitePress & Vue core
						['^@?\\w'], // 2. Third-party dependencies
						['^@/'], // 3. Absolute aliases
					],
				},
			],
			'simple-import-sort/exports': 'error',

			// Relative imports are strictly prohibited
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['../*'],
							message: 'Relative parent imports are prohibited. Use an alias (e.g., @/).',
						},
						{
							group: ['./*'],
							message: 'Relative current directory imports are prohibited. Use an alias (e.g., @/).',
						},
					],
				},
			],

			// Strict TypeScript, low noise
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			// No superfluous typing: return and variable types are inferred when possible
			'@typescript-eslint/explicit-function-return-type': 'off',

			// Mandatory _ prefix on private properties and methods
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'memberLike',
					modifiers: ['private'],
					format: ['camelCase'],
					leadingUnderscore: 'require',
				},
			],

			// Complexity and size metrics
			'max-lines-per-function': [
				'error',
				{
					max: 25,
					skipBlankLines: true,
					skipComments: true,
					IIFEs: true,
				},
			],
			'@typescript-eslint/max-params': ['error', { max: 7 }],
			'max-depth': ['error', 2],
			complexity: ['error', { max: 6 }],
			'no-param-reassign': ['error', { props: true }],

			// No block bodies in lambdas
			'no-restricted-syntax': [
				'warn',
				{
					selector: 'CallExpression[callee.name="computed"] > ArrowFunctionExpression[body.type="BlockStatement"]',
					message:
						'computed() must not use a block body. Use a simple expression, or delegate the calculation to a private method.',
				},
				{
					selector: 'ArrowFunctionExpression[body.type="BlockStatement"]',
					message:
						'Arrow functions must not use block bodies ({ ... }). Extract logic into a dedicated method or use concise body expressions.',
				},
			],
		},
	},

	// 2. Theme and custom components (.vue)
	{
		files: ['**/*.vue'],
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...pluginVue.configs['flat/recommended']],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.vue'],
				sourceType: 'module',
			},
		},
		rules: {
			// Import sorting inside the <script> tag
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',

			// Vue 3 / VitePress conventions
			'vue/multi-word-component-names': 'off', // Allows short names common in docs (e.g. Home.vue)
			'vue/html-indent': ['error', 'tab'], // Matches the tab indentation preference
			'vue/max-attributes-per-line': [
				'error',
				{
					singleline: 3,
					multiline: 1,
				},
			],
			'@typescript-eslint/no-explicit-any': 'error',
		},
	},

	// 3. Generated or static files to ignore
	{
		ignores: ['.claude/**', '.vitepress/cache/**', '.vitepress/dist/**', 'node_modules/**', 'coverage/**', '**/*.d.ts'],
	},

	// Prettier through ESLint only for code; Markdown is formatted by the Prettier CLI (`pnpm format`)
	{ ...prettier, files: ['**/*.{js,mjs,ts,mts,vue}'] },
);
