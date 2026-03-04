<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-logo">🎟️ Eventos Boyacá</div>

      <template v-if="!sent">
        <h1 class="auth-title">Recuperar contraseña</h1>
        <p class="auth-sub">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>

        <p v-if="errorMsg" class="auth-error-global">{{ errorMsg }}</p>

        <div class="auth-form">
          <div class="field">
            <label class="field-label">Correo electrónico <span class="field-required">*</span></label>
            <input
              v-model="email"
              type="email"
              placeholder="tu@correo.com"
              class="field-input"
              :class="{ 'field-input--error': errorMsg }"
              @keyup.enter="submit"
            />
          </div>

          <button class="auth-btn" :class="{ 'auth-btn--loading': loading }" :disabled="loading" @click="submit">
            <svg v-if="loading" class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="56" stroke-dashoffset="14" stroke-linecap="round"/>
            </svg>
            {{ loading ? 'Enviando…' : 'Enviar enlace' }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="auth-success">
          <div class="auth-success-icon">📬</div>
          <h1 class="auth-title">Revisa tu correo</h1>
          <p class="auth-sub">
            Si existe una cuenta con <strong>{{ email }}</strong>, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
        </div>
      </template>

      <p class="auth-footer-text" style="margin-top: 24px">
        <NuxtLink to="/login" class="auth-link">← Volver al inicio de sesión</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { forgotPassword, loading } = useAuth()

const email    = ref('')
const errorMsg = ref('')
const sent     = ref(false)

async function submit() {
  errorMsg.value = ''
  const result = await forgotPassword(email.value)
  if (result.success) {
    sent.value = true
  } else {
    errorMsg.value = result.message ?? 'Error al enviar el correo.'
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
  line-height: 1.55;
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
}
.auth-btn:hover:not(:disabled) { background: var(--primary-hover); }
.auth-btn:disabled { opacity: .6; cursor: not-allowed; }
.auth-btn--loading { cursor: wait; }

.auth-success { text-align: center; }
.auth-success-icon { font-size: 3rem; margin-bottom: 16px; }

.auth-link {
  color: var(--primary);
  font-size: .82rem;
  font-weight: 600;
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }

.auth-footer-text {
  text-align: center;
  margin-top: 20px;
  font-size: .82rem;
  color: var(--text-muted);
}

.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>