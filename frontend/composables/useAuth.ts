// composables/useAuth.ts
const API = 'http://localhost:3001/api'

export type UserRole = 'admin' | 'external' | 'guest'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
}

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthFormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  _global?: string
}

function validateRegister(form: RegisterForm): AuthFormErrors {
  const errors: AuthFormErrors = {}
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.'
  if (!form.email.trim()) errors.email = 'El correo es obligatorio.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Correo inválido.'
  if (!form.password) errors.password = 'La contraseña es obligatoria.'
  else if (form.password.length < 6) errors.password = 'Mínimo 6 caracteres.'
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Las contraseñas no coinciden.'
  return errors
}

function validateLogin(form: LoginForm): AuthFormErrors {
  const errors: AuthFormErrors = {}
  if (!form.email.trim()) errors.email = 'El correo es obligatorio.'
  if (!form.password) errors.password = 'La contraseña es obligatoria.'
  return errors
}

export function useAuth() {
  // useState is SSR-safe and shared across the app
  const user    = useState<AuthUser | null>('auth_user', () => null)
  const token   = useState<string | null>('auth_token', () => null)
  const loading = useState<boolean>('auth_loading', () => false)

  const isAuthenticated = computed(() => !!user.value)
  const role            = computed<UserRole>(() => user.value?.role ?? 'guest')
  const isAdmin         = computed(() => role.value === 'admin')
  const isExternal      = computed(() => role.value === 'external')
  const isGuest         = computed(() => role.value === 'guest')

  // Restore session from localStorage (client only)
  function restoreSession() {
    if (!import.meta.client) return
    if (token.value) return
    const savedToken = localStorage.getItem('auth_token')
    const savedUser  = localStorage.getItem('auth_user')
    if (savedToken && savedUser) {
      try {
        token.value = savedToken
        user.value  = JSON.parse(savedUser)
      } catch {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
  }

  function saveSession(t: string, u: AuthUser) {
    token.value = t
    user.value  = u
    if (import.meta.client) {
      localStorage.setItem('auth_token', t)
      localStorage.setItem('auth_user', JSON.stringify(u))
    }
  }

  function clearSession() {
    token.value = null
    user.value  = null
    if (import.meta.client) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  async function login(form: LoginForm): Promise<{ success: boolean; errors?: AuthFormErrors }> {
    const errors = validateLogin(form)
    if (Object.keys(errors).length) return { success: false, errors }
    loading.value = true
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, errors: { _global: data.error ?? 'Credenciales incorrectas.' } }
      saveSession(data.token, data.user)
      return { success: true }
    } catch {
      return { success: false, errors: { _global: 'Error de conexión.' } }
    } finally {
      loading.value = false
    }
  }

  async function register(form: RegisterForm): Promise<{ success: boolean; errors?: AuthFormErrors }> {
    const errors = validateRegister(form)
    if (Object.keys(errors).length) return { success: false, errors }
    loading.value = true
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, errors: { _global: data.error ?? 'Error al registrarse.' } }
      saveSession(data.token, data.user)
      return { success: true }
    } catch {
      return { success: false, errors: { _global: 'Error de conexión.' } }
    } finally {
      loading.value = false
    }
  }

  async function forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    if (!email.trim()) return { success: false, message: 'El correo es obligatorio.' }
    loading.value = true
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, message: data.error ?? 'Error al enviar el correo.' }
      return { success: true, message: data.message ?? 'Revisa tu correo.' }
    } catch {
      return { success: false, message: 'Error de conexión.' }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      })
    } finally {
      clearSession()
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return
    try {
      const res = await fetch(`${API}/auth/me`, { headers: authHeaders() })
      if (!res.ok) { clearSession(); return }
      user.value = await res.json()
      if (import.meta.client) localStorage.setItem('auth_user', JSON.stringify(user.value))
    } catch {
      clearSession()
    }
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    role,
    isAdmin,
    isExternal,
    isGuest,
    authHeaders,
    restoreSession,
    login,
    register,
    forgotPassword,
    logout,
    fetchCurrentUser,
  }
}