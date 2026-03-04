<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Mi perfil</h1>
    </div>

    <div class="profile-card card">
      <div class="profile-header">
        <div class="profile-avatar">{{ initials }}</div>
        <div>
          <div class="profile-name">{{ user?.name }}</div>
          <span class="role-badge role-badge--admin">Administrador</span>
        </div>
      </div>

      <div class="profile-body">
        <div class="profile-row">
          <div class="profile-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/>
            </svg>
            Nombre
          </div>
          <div class="profile-value">{{ user?.name ?? '—' }}</div>
        </div>

        <div class="profile-row">
          <div class="profile-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            Correo
          </div>
          <div class="profile-value">{{ user?.email ?? '—' }}</div>
        </div>

        <div class="profile-row">
          <div class="profile-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            Rol
          </div>
          <div class="profile-value">Administrador</div>
        </div>

        <div class="profile-row">
          <div class="profile-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            Miembro desde
          </div>
          <div class="profile-value">{{ formattedDate }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { user } = useAuth()

const initials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
})

const formattedDate = computed(() => {
  const date = (user.value as any)?.created_at
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return date }
})
</script>

<style scoped>
.profile-card { max-width: 560px; }

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.profile-avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--primary-pale);
  color: var(--primary);
  font-size: 1.1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .04em;
}
.role-badge--admin { background: var(--primary-pale); color: var(--primary); }

.profile-body { padding: 8px 0; }

.profile-row {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  gap: 16px;
}
.profile-row:last-child { border-bottom: none; }

.profile-label {
  width: 160px;
  flex-shrink: 0;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 7px;
}

.profile-value {
  font-size: .88rem;
  color: var(--text-primary);
}
</style>