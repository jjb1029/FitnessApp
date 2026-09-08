// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'src/data/migrations/*'],
  },
  {
    rules: {
      // Zod schemas and their inferred types intentionally share a name.
      '@typescript-eslint/no-redeclare': 'off',
    },
  },
  {
    // Import boundaries (docs/03 §2): engine and domain never import the app.
    files: ['src/engine/**/*.ts', 'src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-native', 'expo*', '@/ui', '@/ui/*', '@/data', '@/data/*', '@/features/*', '@/store/*', '@/services/*', 'drizzle-orm', 'drizzle-orm/*'], message: 'engine and domain must stay pure (docs/03 §2).' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/*', '!@/domain'], message: 'domain imports nothing from the app.' }] }],
    },
  },
]);
