import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: true,
  nitro: { compatibilityDate: '2026-02-24' },
  app: {
    head: {
      title: 'Event Management',
      meta: [{ name: 'description', content: 'Catálogo de eventos' }]
    }, 
    
  },
  devServer: {
    host:'0.0.0.0',
    port: 3002
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL
    }
  },
  css: ['~/assets/styles/main.css']
})
