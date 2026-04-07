<template>
  <div class="pub-shell">
    <header class="pub-header">
      <div class="pub-header-inner">
        <span class="pub-logo">🎟️ Eventos Boyacá</span>

        <div class="user-menu" v-click-outside="closeDropdown">
          <button class="user-icon-btn" @click="dropdownOpen = !dropdownOpen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" />
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
            </svg>
          </button>
          <Transition name="dropdown">
            <div v-if="dropdownOpen" class="pub-dropdown">
              <template v-if="!isGuest">
                <div class="pub-dropdown-header">
                  <div class="pub-dropdown-name">{{ user?.name }}</div>
                  <div class="pub-dropdown-email">{{ user?.email }}</div>
                </div>
                <div class="pub-dropdown-divider"></div>
                <NuxtLink to="/public/profile" class="pub-dropdown-item" @click="closeDropdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8"
                      stroke-linecap="round" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
                  </svg>
                  Ver perfil
                </NuxtLink>
                <NuxtLink to="/public/favorites" class="pub-dropdown-item" @click="closeDropdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                  Ver favoritos
                </NuxtLink>
                <NuxtLink to="/public/purchases" class="pub-dropdown-item" @click="closeDropdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  Mis compras
                </NuxtLink>
                <div class="pub-dropdown-divider"></div>
                <button class="pub-dropdown-item pub-dropdown-item--danger" @click="handleLogout">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor"
                      stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                  Cerrar sesión
                </button>
              </template>
              <template v-else>
                <div class="pub-dropdown-header">
                  <div class="pub-dropdown-name">Bienvenido</div>
                  <div class="pub-dropdown-email">Accede a tu cuenta</div>
                </div>
                <div class="pub-dropdown-divider"></div>
                <NuxtLink to="/login" class="pub-dropdown-item" @click="closeDropdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor"
                      stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                  Iniciar sesión
                </NuxtLink>
                <NuxtLink to="/register" class="pub-dropdown-item" @click="closeDropdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8zM20 8v6M23 11h-6"
                      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                  Registrarse
                </NuxtLink>
              </template>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <main class="pub-main">
      <div class="pub-head">
        <h2 class="pub-title">Explora los eventos</h2>
        <p class="pub-count">{{ filtered.length }} evento(s) encontrado(s)</p>
      </div>

      <div class="pub-search">
        <SearchBar :categories="sortedActiveCategories" @update:query="q => query = q"
          @update:category="c => selectedCategory = c" />
      </div>

      <div class="pub-content">
        <aside class="pub-aside">
          <Filters @update:filters="f => activeFilters = f" />
        </aside>
        <section class="pub-grid-wrap">
          <div v-if="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Cargando eventos…</div>
          <div v-else class="pub-grid">
            <EventCard v-for="e in filtered" :key="e.id_event" :event="e" />
          </div>
          <div v-if="!loading && filtered.length === 0" class="pub-empty">
            <p>🎟️</p>
            <p>No se encontraron eventos</p>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useEvents } from '~/composables/useEvents'
import { useCategories } from '~/composables/useCategories'
import SearchBar from '~/components/public/SearchBar.vue'
import Filters from '~/components/public/Filters.vue'
import EventCard from '~/components/public/EventCard.vue'

const { visibleEvents, loading, fetchEvents } = useEvents()
const { sortedActiveCategories, fetchCategories } = useCategories()
const { user, logout } = useAuth()
const isGuest = computed(() => !user.value)
const dropdownOpen = ref(false)
function closeDropdown() { dropdownOpen.value = false }
async function handleLogout() { closeDropdown(); await logout(); await navigateTo('/login') }
interface ClickOutsideElement extends HTMLElement {
  _clickOutside?: (e: MouseEvent) => void
}

const vClickOutside = {
  mounted(el: ClickOutsideElement, binding: any) {
    el._clickOutside = (e: MouseEvent) => { if (!el.contains(e.target as Node)) binding.value() }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el: ClickOutsideElement) {
    if (el._clickOutside) document.removeEventListener('click', el._clickOutside)
  },
}

onMounted(async () => {
  await Promise.all([fetchEvents(), fetchCategories('asc')])
})

const query = ref('')
const selectedCategory = ref<number | ''>('')
const activeFilters = ref({ free: false, presencial: false, online: false })

const filtered = computed(() =>
  visibleEvents.value.filter(e => {
    const matchQuery = !query.value ||
    e.eventName.toLowerCase().includes(query.value.toLowerCase()) ||
      e.location.toLowerCase().includes(query.value.toLowerCase())
    const matchCategory = !selectedCategory.value || e.id_category === selectedCategory.value
    const matchFree = !activeFilters.value.free || e.price === 0
    return matchQuery && matchCategory && matchFree
  })
)
</script>

<style>
:root {
  --primary: #34656d;
  --primary-hover: #2a535a;
  --primary-light: #5d9ea8;
  --primary-pale: #e8f4f5;
  --bg-base: #f7f8fa;
  --bg-surface: #ffffff;
  --bg-elevated: #f0f2f5;
  --border: #e4e7ec;
  --border-strong: #cbd2dc;
  --text-primary: #1a2332;
  --text-secondary: #4a5568;
  --text-muted: #8a9bb0;
  --danger: #c0392b;
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
}

.pub-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.pub-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}

.pub-title {
  font-size: 1.5rem;
  font-weight: 800;
}

.pub-count {
  font-size: .82rem;
  color: var(--text-muted);
}

.pub-search {
  margin-bottom: 24px;
}

.pub-content {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.pub-aside {
  width: 200px;
  flex-shrink: 0;
}

.pub-grid-wrap {
  flex: 1;
  min-width: 0;
}

.pub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.pub-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 1.1rem;
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
  transition: background var(--transition), border-color var(--transition);
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
  box-shadow: 0 8px 24px rgba(0, 0, 0, .10);
  min-width: 200px;
  z-index: 100;
  overflow: hidden;
}

.pub-dropdown-header {
  padding: 12px 14px;
}

.pub-dropdown-name {
  font-size: .84rem;
  font-weight: 700;
  color: var(--text-primary);
}

.pub-dropdown-email {
  font-size: .74rem;
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
  font-size: .82rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
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

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width:768px) {
  .pub-content {
    flex-direction: column;
  }

  .pub-aside {
    width: 100%;
  }

  .pub-grid {
    grid-template-columns: 1fr;
  }
}
</style>