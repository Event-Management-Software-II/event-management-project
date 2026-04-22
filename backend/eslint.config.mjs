import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    ...js.configs.recommended,
  },
  prettierConfig,
]);
