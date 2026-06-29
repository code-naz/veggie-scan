export default [
	{
		files: ['assets/js/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				document: 'readonly',
				navigator: 'readonly',
				window: 'readonly',
				console: 'readonly',
				setTimeout: 'readonly',
				performance: 'readonly',
				requestAnimationFrame: 'readonly',
				HTMLMediaElement: 'readonly',
				tf: 'readonly',
				lucide: 'readonly'
			}
		},
		rules: {
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'no-undef': 'error',
			'semi': ['error', 'always'],
			'quotes': ['error', 'single', { avoidEscape: true }]
		}
	}
];
