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
                <div
                    v-for="e in favoriteEvents"
                    :key="e.id_event"
                    class="fav-card"
                    @click="openEvent(e.id_event)"
                >
                    <div class="fav-card-img">
                        <img v-if="e.imageUrl" :src="e.imageUrl" :alt="e.NameEvent" />
                        <div v-else class="fav-card-placeholder"></div>
                        <span class="fav-card-category">{{ e.nameCategory }}</span>
                        <button class="btn-like active" @click.stop="removeFavorite(e.id_event)" title="Ya no me interesa">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                                    fill="#e74c3c" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>
                    <div class="fav-card-body">
                        <p class="fav-card-meta">
                            <span>📅 {{ formatDate(e.date_time) }}</span>
                            <span>📍 {{ e.location }}</span>
                        </p>
                        <h3 class="fav-card-title">{{ e.NameEvent }}</h3>
                        <p class="fav-card-price">{{ !e.minPrice || e.minPrice === 0 ? 'Gratis' : `Desde $${Number(e.minPrice).toLocaleString('es-CO')}` }}</p>
                    </div>
                </div>
            </div>

            <!-- Modal de detalle -->
            <Teleport to="body">
                <EventDetailModal
                    v-if="selectedEvent"
                    :event="selectedEvent"
                    @close="selectedEvent = null"
                />
            </Teleport>
        </main>
    </div>
</template>

<script setup lang="ts">
import EventDetailModal from '~/components/public/EventDetailModal.vue'

definePageMeta({ layout: false })

// Evita SSR para esta página — depende de localStorage para el token
if (import.meta.server) {
  await navigateTo('/login')
}

const { user, logout, authHeaders } = useAuth()
const dropdownOpen = ref(false)

const favoriteEvents = ref<any[]>([])
const loading = ref(false)

const selectedEvent = ref<any | null>(null)

async function removeFavorite(idEvent: number) {
  try {
    const res = await fetch(`http://localhost:3001/api/favorites/${idEvent}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (res.ok) {
      favoriteEvents.value = favoriteEvents.value.filter(e => e.id_event !== idEvent)
    }
  } catch (e) {
    console.error('Error removing favorite:', e)
  }
}

async function openEvent(idEvent: number) {
  try {
    const res = await fetch(`http://localhost:3001/api/events/${idEvent}`)
    const data = await res.json()
    if (data && data.id_event) {
      // Normalizar al mismo shape que usa EventDetailModal
      selectedEvent.value = {
        ...data,
        NameEvent:    data.eventName,
        nameCategory: data.category?.categoryName ?? '',
        imageUrl:     data.images?.[0]?.image_url ?? null,
      }
    }
  } catch (e) {
    console.error('Error fetching event detail:', e)
  }
}

onMounted(async () => {
  console.log('montado, fetching favorites...')
  loading.value = true
  try {
    const res = await fetch('http://localhost:3001/api/favorites', {
      headers: authHeaders(),
    })
    console.log('status:', res.status)
    const json = await res.json()
    console.log('response:', json)
    if (json.ok) {
      // El backend devuelve idEvent, dateTime, favoritedAt — normalizamos al shape que espera EventCard
      favoriteEvents.value = json.data.map((f: any) => ({
        id_event:     f.idEvent,
        NameEvent:    f.eventName,
        eventName:    f.eventName,
        minPrice:     f.minPrice,
        location:     f.location,
        date_time:    f.dateTime,
        nameCategory: f.categoryName,
        imageUrl:     f.imageUrl,
        description:  '',
      }))
    }
  } catch (e) {
    console.error('Error fetching favorites:', e)
  } finally {
    loading.value = false
  }
})

function closeDropdown() { dropdownOpen.value = false }

function formatDate(d: string | null) {
  if (!d) return 'Fecha por confirmar'
  try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

async function handleLogout() {
    closeDropdown()
    await logout()
    await navigateTo('/login')
}

type ClickOutsideEl = HTMLElement & { _clickOutside?: (e: MouseEvent) => void }

const vClickOutside = {
    mounted(el: ClickOutsideEl, binding: any) {
        el._clickOutside = (e: MouseEvent) => { if (!el.contains(e.target as Node)) binding.value() }
        document.addEventListener('click', el._clickOutside)
    },
    unmounted(el: ClickOutsideEl) {
        if (el._clickOutside) document.removeEventListener('click', el._clickOutside)
    },
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

/* Tarjeta de favorito */
.fav-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    transition: box-shadow 0.2s, transform 0.2s;
    cursor: pointer;
}
.fav-card:hover {
    box-shadow: 0 8px 32px rgba(0,0,0,.10);
    transform: translateY(-2px);
}
.fav-card-img {
    position: relative;
    aspect-ratio: 16/9;
    overflow: hidden;
    flex-shrink: 0;
}
.fav-card-img img {
    width: 100%; height: 100%; object-fit: cover;
}
.fav-card-placeholder {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
}
.fav-card-category {
    position: absolute; top: 12px; left: 12px;
    background: rgba(255,255,255,.95); color: #1a2332;
    padding: 4px 12px; border-radius: 999px;
    font-size: .72rem; font-weight: 700;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
}
.fav-card-body {
    padding: 14px 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.fav-card-meta {
    font-size: .76rem; color: var(--text-muted);
    display: flex; flex-direction: column; gap: 2px;
}
.fav-card-title {
    font-size: 1rem; font-weight: 800;
    color: var(--text-primary); line-height: 1.3;
}
.fav-card-price {
    font-size: .84rem; font-weight: 700; color: #34656d;
    margin-top: auto;
}
.btn-like {
    position: absolute; top: 10px; right: 10px;
    display: flex; align-items: center; gap: 4px;
    background: rgba(255,255,255,.92); border: none; border-radius: 20px;
    padding: 5px 10px; cursor: pointer; font-size: .78rem; font-weight: 700;
    color: #4a5568; transition: background .15s, transform .15s;
    box-shadow: 0 2px 8px rgba(0,0,0,.10);
    z-index: 2;
}
.btn-like:hover { background: #fff; transform: scale(1.08); }
.btn-like.active { color: #e74c3c; }
</style>