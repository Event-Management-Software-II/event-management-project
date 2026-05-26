import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,

        // Vue Composition API (Nuxt 3 auto-imports, no necesitan import explícito)
        ref: 'readonly',
        computed: 'readonly',
        reactive: 'readonly',
        readonly: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        onBeforeMount: 'readonly',
        onBeforeUnmount: 'readonly',
        nextTick: 'readonly',
        toRef: 'readonly',
        toRefs: 'readonly',
        shallowRef: 'readonly',

        // Nuxt 3 auto-imports
        definePageMeta: 'readonly',
        navigateTo: 'readonly',
        useRuntimeConfig: 'readonly',
        useRoute: 'readonly',
        useRouter: 'readonly',
        useFetch: 'readonly',
        useAsyncData: 'readonly',
        useNuxtApp: 'readonly',
        useState: 'readonly',
        defineNuxtComponent: 'readonly',

        // Composables del proyecto (auto-importados por Nuxt desde /composables)
        useAuth: 'readonly',
        useEvents: 'readonly',
        useTickets: 'readonly',
        useUsers: 'readonly',
        useCategories: 'readonly',
        useDashboard: 'readonly',
        useTicketCatalog: 'readonly',
      },
    },
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // Nuxt usa index.vue para enrutamiento — esta regla no aplica a páginas
      'vue/multi-word-component-names': 'off',
      // En <script setup> todas las vars son expuestas al template.
      // Si el template está en un .html externo, ESLint no puede verificar su uso.
      '@typescript-eslint/no-unused-vars': 'warn',
      // El parser de Vue + TypeScript falla con ciertas expresiones en archivos
      // que usan templates externos (.html). Se deshabilita para .vue.
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },

  {
    rules: {
      // `catch (e: any)` es un patrón común — advertir en vez de error
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    ignores: ['node_modules/**', '.nuxt/**', '.output/**'],
  },
]);
