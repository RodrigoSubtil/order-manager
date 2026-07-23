import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export function createWebEslintConfig({ ignores = [] } = {}) {
  return tseslint.config(
    { ignores: ['coverage', 'dist', ...ignores] },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.browser,
      },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    },
    eslintConfigPrettier,
  );
}

export function createNodeEslintConfig({ ignores = [] } = {}) {
  return tseslint.config(
    { ignores: ['coverage', 'dist', ...ignores] },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.ts'],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.node,
      },
    },
    eslintConfigPrettier,
  );
}
