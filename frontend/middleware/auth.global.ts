// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const { role, restoreSession } = useAuth()

  // Restore session from localStorage on client
  restoreSession()

  const isAdminRoute = to.path.startsWith('/admin')
  const isAuthRoute  = ['/login', '/register', '/forgot-password'].includes(to.path)

  // Admin routes → only admin role allowed
  if (isAdminRoute && role.value !== 'admin') {
    return navigateTo('/login')
  }

  // If already logged in and tries to access login/register → redirect to their home
  if (isAuthRoute && role.value !== 'guest') {
    if (role.value === 'admin')    return navigateTo('/admin/events')
    if (role.value === 'external') return navigateTo('/public')
  }
})