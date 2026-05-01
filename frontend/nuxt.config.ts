import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2026-05-01',
  ssr: true,
  app: {
    head: {
      title: 'Event Management',
      meta: [{ name: 'description', content: 'Catálogo de eventos' }],
    },
  },
  devServer: {
    host: '0.0.0.0',
    port: 3002,
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL,
    },
  },
  css: ['~/assets/styles/main.css'],
});
