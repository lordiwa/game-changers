// ESLint 10 flat config.
// IMPORTANT: The `no-restricted-imports` rule below is enforced ONLY in apps/pwa/src/components/**
// and apps/pwa/src/views/** per ARCH-07. The exact message string is required verbatim by
// 02-01-PLAN.md acceptance_criteria — do not edit it.
import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import securityPlugin from 'eslint-plugin-security';

const ON_SNAPSHOT_MESSAGE =
  'onSnapshot on collections is forbidden — use VueFire useDocument on aggregate docs only. See PITFALLS Pitfall #2.';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      security: securityPlugin,
    },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'warn',
    },
  },
  ...vue.configs['flat/recommended'],
  {
    // Scoped no-restricted-imports rule: blocks `onSnapshot` from `firebase/firestore`
    // ONLY in PWA components and views (read-budget discipline per ARCH-07 + PITFALLS #2).
    files: ['apps/pwa/src/components/**/*.{ts,vue}', 'apps/pwa/src/views/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/firestore',
              importNames: ['onSnapshot'],
              message: ON_SNAPSHOT_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.firebase/**',
      'coverage/**',
      'StartData/**',
      '.planning/**',
    ],
  },
];
