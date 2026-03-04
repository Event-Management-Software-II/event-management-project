<template>
  <div class="admin-shell">

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <div class="sidebar-logo">
        <span>🎟️</span>
        <span>Admin Panel</span>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink to="/admin/events" class="nav-item" active-class="active" @click="closeMobile">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8" />
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          Eventos
        </NuxtLink>

        <NuxtLink to="/admin/categories" class="nav-item" active-class="active" @click="closeMobile">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M3 7h18M3 12h12M3 17h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          Categorías
        </NuxtLink>

        <NuxtLink to="/admin/reports" class="nav-item" active-class="active" @click="closeMobile">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          Reportes
        </NuxtLink>

        <NuxtLink to="/admin/users" class="nav-item" active-class="active" @click="closeMobile">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" />
            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" />
          </svg>
          Usuarios
        </NuxtLink>

      </nav>

      <div class="sidebar-footer">
        <NuxtLink to="/public" class="back-link" @click="closeMobile">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          Ver sitio público
        </NuxtLink>
      </div>
    </aside>

    <div v-if="mobileOpen" class="backdrop" @click="closeMobile"></div>

    <!-- Main -->
    <main class="admin-main">
      <header class="topbar">
        <button class="hamburger" @click="mobileOpen = !mobileOpen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <div class="user-menu" v-click-outside="closeDropdown">
          <button class="user-btn" @click="dropdownOpen = !dropdownOpen">
            <div class="user-avatar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
              </svg>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" :class="{ 'chevron-open': dropdownOpen }">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <Transition name="dropdown">
            <div v-if="dropdownOpen" class="dropdown">
              <div class="dropdown-header">
                <div class="dropdown-name">{{ user?.name }}</div>
                <div class="dropdown-email">{{ user?.email }}</div>
              </div>
              <div class="dropdown-divider"></div>
              <NuxtLink to="/admin/profile" class="dropdown-item" @click="closeDropdown">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" />
                  <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
                </svg>
                Ver perfil
              </NuxtLink>
              <button class="dropdown-item dropdown-item--danger" @click="handleLogout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </Transition>
        </div>
      </header>
      <div class="admin-content">
        <slot />
      </div>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileOpen = ref(false)
const dropdownOpen = ref(false)

const { user, logout } = useAuth()

const initials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
})

function closeMobile() { mobileOpen.value = false }
function closeDropdown() { dropdownOpen.value = false }

watch(() => route.path, () => {
  mobileOpen.value = false
  dropdownOpen.value = false
})

async function handleLogout() {
  closeDropdown()
  await logout()
  await navigateTo('/login')
}

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el._clickOutside)
  },
}
</script>

<style>
/* ── CSS Variables globales ── */
:root {
  --primary: #34656d;
  --primary-hover: #2a535a;
  --primary-light: #5d9ea8;
  --primary-pale: #e8f4f5;
  --bg-base: #f0f2f5;
  --bg-surface: #ffffff;
  --bg-elevated: #f7f8fa;
  --border: #e4e7ec;
  --border-strong: #cbd2dc;
  --text-primary: #1a2332;
  --text-secondary: #4a5568;
  --text-muted: #5e718d;
  --danger: #c0392b;
  --danger-border: #f5c6c2;
  --danger-pale: #fdf3f2;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition: 0.18s ease;
  --font-display: 'Inter', system-ui, sans-serif;
  --font-mono: 'Inter', system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-display);
  background: var(--bg-base);
  color: var(--text-primary);
}

a {
  text-decoration: none;
  color: inherit;
}

/* ── Shell ── */
.admin-shell {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1a2332;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar-logo {
  padding: 22px 20px 18px;
  font-weight: 800;
  font-size: .95rem;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.sidebar-nav {
  flex: 1;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 12px;
  border-radius: var(--radius-md);
  font-size: .84rem;
  font-weight: 600;
  color: #5e718d;
  transition: background var(--transition), color var(--transition);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.nav-item.active {
  background: var(--primary);
  color: #ffffff;
}

.sidebar-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, .08);
}

.back-link {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: .78rem;
  color: #64748b;
  transition: color var(--transition);
}

.back-link:hover {
  color: #5e718d;
}

/* ── Main ── */
.admin-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.admin-content {
  padding: 20px 16px;
}

/* ── Shared section styles usadas por las páginas (no scoped) ── */
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .84rem;
}

.admin-table th {
  background: var(--bg-elevated);
  padding: 10px 16px;
  text-align: left;
  font-size: .7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.admin-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
  vertical-align: middle;
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.admin-table tbody tr:hover td {
  background: var(--bg-elevated);
}

.empty-state {
  padding: 48px 20px;
  text-align: center;
}

.empty-state-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.empty-state-text {
  font-size: .88rem;
  color: var(--text-muted);
}

/* ── Modal (compartido) ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-box {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1rem;
  font-weight: 700;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  line-height: 1;
}

.modal-close:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.topbar {
  display: flex;
  height: 56px;
  background: transparent;
  border-bottom: none;
  align-items: center;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 30;
  justify-content: space-between;
}

.hamburger {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: none;
  place-items: center;
  padding: 4px;
  border-radius: 6px;
}

.user-menu {
  position: relative;
  margin-left: auto;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 5px 10px 5px 5px;
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
}

.user-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-pale);
  color: var(--primary);
  font-size: .68rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chevron-open {
  transform: rotate(180deg);
  transition: transform var(--transition);
}

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .10);
  min-width: 200px;
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  padding: 12px 14px;
}

.dropdown-name {
  font-size: .84rem;
  font-weight: 700;
  color: var(--text-primary);
}

.dropdown-email {
  font-size: .74rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.dropdown-divider {
  height: 1px;
  background: var(--border);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px 14px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
  text-align: left;
}

.dropdown-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.dropdown-item--danger {
  color: var(--danger);
}

.dropdown-item--danger:hover {
  background: var(--danger-pale);
  color: var(--danger);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 39;
  background: rgba(0, 0, 0, .35);
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -260px;
    top: 0;
    bottom: 0;
    height: 100%;
    transition: left 0.28s ease;
    z-index: 40;
  }

  .hamburger {
    display: grid;
  }

  .sidebar.mobile-open {
    left: 0;
  }

  .backdrop {
    display: block;
  }

  .topbar {
    display: flex;
  }

  .admin-main {
    padding: 20px 16px;
  }
}
</style>