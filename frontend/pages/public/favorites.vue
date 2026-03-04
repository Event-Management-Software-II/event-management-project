<template>
    <div class="pub-shell">
        <header class="pub-header">
            <div class="pub-header-inner">
                <NuxtLink to="/public" class="pub-logo">🎟️ Eventos Boyacá</NuxtLink>
                <div class="pub-header-actions">
                    <div class="user-menu" v-click-outside="closeDropdown">
                        <button class="user-icon-btn" @click="dropdownOpen = !dropdownOpen">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor"
                                    stroke-width="1.8" stroke-linecap="round" />
                                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
                            </svg>
                        </button>
                        <Transition name="dropdown">
                            <div v-if="dropdownOpen" class="pub-dropdown">
                                <div class="pub-dropdown-header">
                                    <div class="pub-dropdown-name">{{ user?.name }}</div>
                                    <div class="pub-dropdown-email">{{ user?.email }}</div>
                                </div>
                                <div class="pub-dropdown-divider"></div>
                                <NuxtLink to="/public/profile" class="pub-dropdown-item" @click="closeDropdown">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor"
                                            stroke-width="1.8" stroke-linecap="round" />
                                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" />
                                    </svg>
                                    Ver perfil
                                </NuxtLink>
                                <NuxtLink to="/public/favorites" class="pub-dropdown-item active-item"
                                    @click="closeDropdown">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                    </svg>
                                    Ver favoritos
                                </NuxtLink>
                                <div class="pub-dropdown-divider"></div>
                                <button class="pub-dropdown-item pub-dropdown-item--danger" @click="handleLogout">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
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
            <div class="pub-head">
                <h2 class="pub-title">Mis favoritos</h2>
                <p class="pub-count">{{ favoriteEvents.length }} evento(s)</p>
            </div>

            <div v-if="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Cargando eventos…</div>

            <div v-else-if="favoriteEvents.length === 0" class="pub-empty">
                <p>❤️</p>
                <p>Aún no tienes eventos favoritos</p>
                <NuxtLink to="/public" class="back-btn">Explorar eventos</NuxtLink>
            </div>

            <div v-else class="pub-grid">
                <EventCard v-for="e in favoriteEvents" :key="e.id_event" :event="e" />
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import EventCard from '~/components/public/EventCard.vue'

definePageMeta({ layout: false })

const { user, logout } = useAuth()
const { visibleEvents, loading, fetchEvents } = useEvents()
const dropdownOpen = ref(false)

onMounted(() => fetchEvents())

// Solo eventos que el usuario marcó como favorito
// Esto se actualizará cuando el backend devuelva el estado de interés por usuario
const favoriteEvents = computed(() => visibleEvents.value.filter(e => e.interested))

function closeDropdown() { dropdownOpen.value = false }

async function handleLogout() {
    closeDropdown()
    await logout()
    await navigateTo('/login')
}

const vClickOutside = {
    mounted(el: HTMLElement, binding: any) {
        el._clickOutside = (e: MouseEvent) => { if (!el.contains(e.target as Node)) binding.value() }
        document.addEventListener('click', el._clickOutside)
    },
    unmounted(el: HTMLElement) { document.removeEventListener('click', el._clickOutside) },
}
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

.active-item {
    color: var(--primary);
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

.pub-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
}

.pub-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 24px;
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

.pub-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.pub-empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
}

.pub-empty p:first-child {
    font-size: 2.5rem;
    margin-bottom: 12px;
}

.pub-empty p {
    font-size: 1rem;
    margin-bottom: 20px;
}

.back-btn {
    display: inline-block;
    padding: 9px 20px;
    background: var(--primary);
    color: #fff;
    border-radius: var(--radius-md);
    font-size: .85rem;
    font-weight: 700;
    text-decoration: none;
    transition: background var(--transition);
}

.back-btn:hover {
    background: var(--primary-hover);
}

@media (max-width: 768px) {
    .pub-grid {
        grid-template-columns: 1fr;
    }
}
</style>