import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2022,
    },
    rules: {
      // Error en variables no usadas (excepto las que empiezan con _)
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Permitir console.log (útil en un backend)
      'no-console': 'off',
      // Evitar el uso de eval
      'no-eval': 'error',
      // Requerir manejo de errores en callbacks de Node
      'handle-callback-err': 'warn',
    },
  },
  {
    // Ignorar archivos generados y dependencias
    ignores: ['node_modules/**', 'coverage/**'],
  },
];
