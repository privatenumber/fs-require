import { defineConfig, pvtnbr } from 'lintroll';

export default defineConfig([
	...pvtnbr({
		node: true,
	}),
	{
		// The build targets Node.js 12.22. esbuild lowers syntax to that target,
		// but keeps `node:` specifiers and doesn't polyfill built-in methods
		files: ['src/**/*.ts'],
		rules: {
			// require('node:*') was added in Node.js v14.18.0
			'n/prefer-node-protocol': 'off',

			// String#replaceAll() was added in Node.js v15.0.0
			'unicorn/prefer-string-replace-all': 'off',
		},
	},
]);
