// middleware/auth.admin.ts
export default defineNuxtRouteMiddleware(() => {
  const { restoreSession, isAuthenticated, isAdmin } = useAuth()
  restoreSession()
  if (!isAuthenticated.value) return navigateTo('/login')
  if (!isAdmin.value)         return navigateTo('/public')
})