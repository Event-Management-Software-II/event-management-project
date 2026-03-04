<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-logo">🎟️ Eventos Boyacá</div>
      <h1 class="auth-title">Iniciar sesión</h1>
      <p class="auth-sub">Bienvenido de nuevo</p>

      <p v-if="errors._global" class="auth-error-global">{{ errors._global }}</p>

      <div class="auth-form">
        <div class="field">
          <label class="field-label">Correo electrónico <span class="field-required">*</span></label>
          <input
            v-model="form.email"
            type="email"
            placeholder="tu@correo.com"
            class="field-input"
            :class="{ 'field-input--error': errors.email }"
            @keyup.enter="submit"
          />
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
        </div>

        <div class="field">
          <label class="field-label">Contraseña <span class="field-required">*</span></label>
          <div class="field-password-wrap">
            <input
              v-model="form.password"
              :type="showPass ? 'text' : 'password'"
              placeholder="Tu contraseña"
              class="field-input"
              :class="{ 'field-input--error': errors.password }"
              @keyup.enter="submit"
            />
            <button class="toggle-pass" type="button" @click="showPass = !showPass" tabindex="-1">
              <svg v-if="showPass" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
              </svg>
            </button>
          </div>
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>

        <div class="auth-forgot">
          <NuxtLink to="/forgot-password" class="auth-link">¿Olvidaste tu contraseña?</NuxtLink>
        </div>

        <button class="auth-btn" :class="{ 'auth-btn--loading': loading }" :disabled="loading" @click="submit">
          <svg v-if="loading" class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="56" stroke-dashoffset="14" stroke-linecap="round"/>
          </svg>
          {{ loading ? 'Ingresando…' : 'Iniciar sesión' }}
        </button>
      </div>

      <p class="auth-footer-text">
        ¿No tienes cuenta?
        <NuxtLink to="/register" class="auth-link">Regístrate</NuxtLink>
      </p>

      <p class="auth-footer-text" style="margin-top:8px">
        <NuxtLink to="/public" class="auth-link auth-link--muted">Continuar como invitado →</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AuthFormErrors } from '~/composables/useAuth'

definePageMeta({ layout: false })

const { login, loading, isAdmin, isExternal } = useAuth()

const form     = ref({ email: '', password: '' })
const errors   = ref<AuthFormErrors>({})
const showPass = ref(false)

async function submit() {
  errors.value = {}
  const result = await login(form.value)
  if (result.success) {
    if (isAdmin.value)    await navigateTo('/admin/events')
    else                  await navigateTo('/public')
  } else {
    errors.value = result.errors ?? {}
  }
}
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: 24px;
}

.auth-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0,0,0,.08);
}

.auth-logo {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 24px;
  text-align: center;
}

.auth-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 4px;
}

.auth-sub {
  font-size: .85rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 28px;
}

.auth-error-global {
  background: var(--danger-pale);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: .82rem;
  padding: 10px 14px;
  margin-bottom: 16px;
  text-align: center;
}

.auth-form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 5px; }

.field-label {
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-required { color: var(--danger); }

.field-input {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: .875rem;
  padding: 9px 13px;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.field-input::placeholder { color: var(--text-muted); }
.field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(52,101,109,.1); }
.field-input--error { border-color: var(--danger); background: var(--danger-pale); }

.field-password-wrap { position: relative; }
.field-password-wrap .field-input { padding-right: 40px; }
.toggle-pass {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  padding: 4px;
}
.toggle-pass:hover { color: var(--primary); }

.field-error { font-size: .74rem; color: var(--danger); }

.auth-forgot { text-align: right; margin-top: -6px; }

.auth-btn {
  width: 100%;
  padding: 10px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: .88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.auth-btn:hover:not(:disabled) { background: var(--primary-hover); }
.auth-btn:disabled { opacity: .6; cursor: not-allowed; }
.auth-btn--loading { cursor: wait; }

.auth-link {
  color: var(--primary);
  font-size: .82rem;
  font-weight: 600;
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }
.auth-link--muted { color: var(--text-muted); font-weight: 500; }
.auth-link--muted:hover { color: var(--primary); }

.auth-footer-text {
  text-align: center;
  margin-top: 20px;
  font-size: .82rem;
  color: var(--text-muted);
}

.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>