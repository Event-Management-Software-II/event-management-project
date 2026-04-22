import { ref, computed, readonly } from 'vue';

export type UserRole = 'admin' | 'external' | 'guest';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  _global?: string;
}

function validateRegister(form: RegisterForm): AuthFormErrors {
  const errors: AuthFormErrors = {};
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.';
  if (!form.email.trim()) errors.email = 'El correo es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Correo inválido.';
  if (!form.password) errors.password = 'La contraseña es obligatoria.';
  else if (form.password.length < 6) errors.password = 'Mínimo 6 caracteres.';
  if (form.confirmPassword !== form.password)
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  return errors;
}

function validateLogin(form: LoginForm): AuthFormErrors {
  const errors: AuthFormErrors = {};
  if (!form.email.trim()) errors.email = 'El correo es obligatorio.';
  if (!form.password) errors.password = 'La contraseña es obligatoria.';
  return errors;
}

function mapUser(u: any): AuthUser {
  const rawRole = u.role?.roleName || u.role?.name || u.role || 'guest';

  const role: UserRole =
    rawRole === 'admin' ? 'admin' : rawRole === 'user' ? 'external' : 'guest';

  return {
    id: u.id_user || u.id,
    name: u.full_name || u.name,
    email: u.email,
    role,
  };
}

const token = ref<string | null>(
  import.meta.client ? localStorage.getItem('auth_token') : null
);
const user = ref<AuthUser | null>(
  import.meta.client && localStorage.getItem('auth_user')
    ? JSON.parse(localStorage.getItem('auth_user')!)
    : null
);
const loading = ref(false);

export function useAuth() {
  const config = useRuntimeConfig();
  const API = `${config.public.apiUrl}/api`;

  const isAuthenticated = computed(() => !!token.value);

  const role = computed(() => user.value?.role || 'guest');

  const isAdmin = computed(() => role.value === 'admin');
  const isExternal = computed(() => role.value === 'external');

  function restoreSession() {
    if (import.meta.client) {
      token.value = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          user.value = JSON.parse(storedUser);
        } catch {
          user.value = null;
        }
      }
    }
  }

  function clearSession() {
    token.value = null;
    user.value = null;
    if (import.meta.client) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  function startSessionTimer() {
    setTimeout(
      () => {
        console.warn('Sesión por expirar');
      },
      8 * 60 * 1000
    );

    setTimeout(
      () => {
        clearSession();
        navigateTo('/login');
      },
      10 * 60 * 1000
    );
  }

  function authHeaders(): HeadersInit {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  }

  async function login(
    form: LoginForm
  ): Promise<{ success: boolean; message?: string }> {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok)
        return {
          success: false,
          message: data.error ?? 'Credenciales inválidas.',
        };

      token.value = data.token;
      user.value = mapUser(data.user);

      if (import.meta.client) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(user.value));
        startSessionTimer();
      }
      return { success: true };
    } catch {
      return {
        success: false,
        message: 'Error de conexión al iniciar sesión.',
      };
    } finally {
      loading.value = false;
    }
  }

  async function register(
    form: RegisterForm
  ): Promise<{ success: boolean; message?: string }> {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.name,
          email: form.email,
          password: form.password,
          roleName: 'user',
        }),
      });
      const data = await res.json();
      if (!res.ok)
        return {
          success: false,
          message: data.error ?? 'Error al registrarse.',
        };

      return { success: true };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    } finally {
      loading.value = false;
    }
  }

  async function forgotPassword(
    email: string
  ): Promise<{ success: boolean; message?: string }> {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok)
        return {
          success: false,
          message: data.error ?? 'Error al enviar el correo.',
        };
      return { success: true, message: data.message ?? 'Revisa tu correo.' };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
    } finally {
      clearSession();
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return;
    try {
      const res = await fetch(`${API}/auth/me`, { headers: authHeaders() });
      if (!res.ok) {
        clearSession();
        return;
      }
      const mapped = mapUser(await res.json());
      user.value = mapped;
      if (import.meta.client)
        localStorage.setItem('auth_user', JSON.stringify(mapped));
    } catch {
      clearSession();
    }
  }

  return {
    user: readonly(user),
    token: readonly(token),
    role,
    loading: readonly(loading),
    isAuthenticated,
    isAdmin,
    isExternal,
    login,
    register,
    logout,
    forgotPassword,
    fetchCurrentUser,
    authHeaders,
    validateLogin,
    validateRegister,
    restoreSession,
  };
}
