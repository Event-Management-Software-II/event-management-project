import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Simula un entorno de navegador para testear composables y utilidades
    environment: 'happy-dom',
    // No falla si aún no hay tests escritos
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['**/*.{vue,ts}'],
      exclude: [
        'node_modules',
        '.nuxt',
        '.output',
        'nuxt.config.ts',
        'vitest.config.ts',
      ],
    },
  },
});
