<template>
  <div class="pub-shell">
    <header class="pub-header">
      <div class="pub-header-inner">
        <NuxtLink to="/public" class="pub-logo">🎟️ Eventos Boyacá</NuxtLink>
        <div class="pub-header-actions">
          <div class="user-menu" v-click-outside="closeDropdown">
            <button class="user-icon-btn" @click="dropdownOpen = !dropdownOpen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="dropdownOpen" class="pub-dropdown">
                <div class="pub-dropdown-header">
                  <div class="pub-dropdown-name">{{ user?.name }}</div>
                  <div class="pub-dropdown-email">{{ user?.email }}</div>
                </div>
                <div class="pub-dropdown-divider"></div>
                <NuxtLink
                  to="/public/profile"
                  class="pub-dropdown-item active-item"
                  @click="closeDropdown"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      stroke-width="1.8"
                    />
                  </svg>
                  Ver perfil
                </NuxtLink>
                <NuxtLink
                  to="/public/favorites"
                  class="pub-dropdown-item"
                  @click="closeDropdown"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                  Ver favoritos
                </NuxtLink>
                <NuxtLink
                  to="/public/purchases"
                  class="pub-dropdown-item"
                  @click="closeDropdown"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M3 6h18M16 10a4 4 0 01-8 0"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Mis compras
                </NuxtLink>
                <div class="pub-dropdown-divider"></div>
                <button
                  class="pub-dropdown-item pub-dropdown-item--danger"
                  @click="handleLogout"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </header>

    <main class="pub-main">
      <div class="profile-wrap">
        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-avatar">{{ initials }}</div>
            <div>
              <div class="profile-name">{{ user?.name }}</div>
              <span class="profile-role-badge">Usuario externo</span>
            </div>
          </div>

          <div class="profile-body">
            <div class="profile-row">
              <div class="profile-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                </svg>
                Nombre
              </div>
              <div class="profile-value">{{ user?.name ?? '—' }}</div>
            </div>

            <div class="profile-row">
              <div class="profile-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <path
                    d="M22 6l-10 7L2 6"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
                Correo
              </div>
              <div class="profile-value">{{ user?.email ?? '—' }}</div>
            </div>

            <div class="profile-row">
              <div class="profile-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                  <path
                    d="M16 2v4M8 2v4M3 10h18"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
                Miembro desde
              </div>
              <div class="profile-value">{{ formattedDate }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const { user, logout } = useAuth();
const dropdownOpen = ref(false);

function closeDropdown() {
  dropdownOpen.value = false;
}

const initials = computed(() => {
  if (!user.value?.name) return '?';
  return user.value.name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

const formattedDate = computed(() => {
  const date = (user.value as any)?.created_at;
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return date;
  }
});

async function handleLogout() {
  closeDropdown();
  await logout();
  await navigateTo('/login');
}

interface ClickOutsideElement extends HTMLElement {
  _clickOutside?: (e: MouseEvent) => void;
}

const vClickOutside = {
  mounted(el: ClickOutsideElement, binding: any) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value();
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el: ClickOutsideElement) {
    if (el._clickOutside)
      document.removeEventListener('click', el._clickOutside);
  },
};
</script>

<style scoped>
.pub-shell {
  min-height: 100vh;
  background: var(--bg-base);
}

.pub-header {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.pub-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pub-logo {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--primary);
  text-decoration: none;
}

.pub-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-menu {
  position: relative;
}

.user-icon-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  transition:
    background var(--transition),
    border-color var(--transition);
}

.user-icon-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
  color: var(--primary);
}

.pub-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 100;
  overflow: hidden;
}

.pub-dropdown-header {
  padding: 12px 14px;
}

.pub-dropdown-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
}

.pub-dropdown-email {
  font-size: 0.74rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.pub-dropdown-divider {
  height: 1px;
  background: var(--border);
}

.pub-dropdown-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition:
    background var(--transition),
    color var(--transition);
  text-decoration: none;
  text-align: left;
}

.pub-dropdown-item:hover {
  background: var(--bg-elevated);
  color: var(--primary);
}

.pub-dropdown-item--danger {
  color: var(--danger);
}

.pub-dropdown-item--danger:hover {
  background: var(--danger-pale);
  color: var(--danger);
}

.active-item {
  color: var(--primary);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.pub-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.profile-wrap {
  max-width: 560px;
}

.profile-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.profile-avatar {
  width: 56px;
  height: 56px;
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

.profile-role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.profile-body {
  padding: 8px 0;
}

.profile-row {
  display: flex;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  gap: 16px;
}

.profile-row:last-child {
  border-bottom: none;
}

.profile-label {
  width: 160px;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 7px;
}

.profile-value {
  font-size: 0.88rem;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .profile-wrap {
    max-width: 100%;
  }

  .profile-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .profile-label {
    width: auto;
  }
}
</style>
