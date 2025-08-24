// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'], // ignore build folders
  },

  // Base JS rules
  js.configs.recommended,

  // TS recommended configs (type-checked)
  ...tseslint.configs.recommendedTypeChecked,

  // Prettier integration
  prettier,

  {
    languageOptions: {
      parserOptions: {
        project: true, // autodetect tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
    },
    rules: {
      // 🔥 Prettier formatting enforced
      'prettier/prettier': 0,

      // 🛠 TS custom rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
);
