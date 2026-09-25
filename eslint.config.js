const eslint = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/**', 'client/dist/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        React: 'readonly',
      },
    },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['client/**/*.js', 'client/**/*.jsx'],
    languageOptions: { sourceType: 'module' },
    rules: { 'no-unused-vars': 'off' },
  },
];
