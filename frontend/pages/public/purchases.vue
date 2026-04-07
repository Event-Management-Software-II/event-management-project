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
                                <NuxtLink to="/public/favorites" class="pub-dropdown-item" @click="closeDropdown">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                    </svg>
                                    Ver favoritos
                                </NuxtLink>
                                <NuxtLink to="/public/purchases" class="pub-dropdown-item active-item" @click="closeDropdown">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor"
                                            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" stroke-width="1.8"
                                            stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    Mis compras
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
                <h2 class="pub-title">Mis compras</h2>
                <p class="pub-count">{{ purchases.length }} compra(s)</p>
            </div>

            <div v-if="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Cargando compras…</div>

            <div v-else-if="purchases.length === 0" class="pub-empty">
                <p>🛍️</p>
                <p>Aún no tienes compras registradas</p>
                <NuxtLink to="/public" class="back-btn">Explorar eventos</NuxtLink>
            </div>

            <div v-else class="purchase-list">
                <div v-for="p in purchases" :key="p.id_purchase" class="purchase-card">
                    <!-- Imagen / portada -->
                    <div class="purchase-card-img">
                        <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.NameEvent" />
                        <div v-else class="purchase-card-placeholder"></div>
                        <span class="purchase-card-category">{{ p.nameCategory }}</span>
                        <span class="purchase-badge" :class="`purchase-badge--${p.status}`">
                            {{ statusLabel(p.status) }}
                        </span>
                    </div>

                    <!-- Info del evento -->
                    <div class="purchase-card-body">
                        <div class="purchase-card-top">
                            <h3 class="purchase-card-title">{{ p.NameEvent }}</h3>
                            <p class="purchase-card-meta">
                                <span>📅 {{ formatDate(p.date_time) }}</span>
                                <span>📍 {{ p.location }}</span>
                            </p>
                        </div>

                        <!-- Detalle de la compra -->
                        <div class="purchase-card-detail">
                            <div class="purchase-detail-row">
                                <span class="purchase-detail-label">Tickets</span>
                                <span class="purchase-detail-value">{{ p.quantity }}</span>
                            </div>
                            <div class="purchase-detail-row">
                                <span class="purchase-detail-label">Precio unitario</span>
                                <span class="purchase-detail-value">
                                    {{ p.unit_price === 0 ? 'Gratis' : `$${Number(p.unit_price).toLocaleString('es-CO')}` }}
                                </span>
                            </div>
                            <div class="purchase-detail-row purchase-detail-row--total">
                                <span class="purchase-detail-label">Total</span>
                                <span class="purchase-detail-value">
                                    {{ p.total_price === 0 ? 'Gratis' : `$${Number(p.total_price).toLocaleString('es-CO')}` }}
                                </span>
                            </div>
                        </div>

                        <p class="purchase-card-date">Comprado el {{ formatDate(p.created_at) }}</p>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

if (import.meta.server) {
    await navigateTo('/login')
}

const { user, logout, authHeaders } = useAuth()
const dropdownOpen = ref(false)

const purchases = ref<any[]>([])
const loading = ref(false)

onMounted(async () => {
    loading.value = true
    try {
        const res = await fetch('http://localhost:3001/api/purchases', {
            headers: authHeaders(),
        })
        const json = await res.json()
        if (json.ok) {
            purchases.value = json.data.map((p: any) => ({
                id_purchase:  p.idPurchase,
                id_event:     p.idEvent,
                NameEvent:    p.name,
                nameCategory: p.category,
                location:     p.location,
                date_time:    p.dateTime,
                imageUrl:     p.imageUrl,
                quantity:     p.quantity,
                unit_price:   p.unitPrice,
                total_price:  p.totalPrice,
                status:       p.status,
                created_at:   p.createdAt,
            }))
        }
    } catch (e) {
        console.error('Error fetching purchases:', e)
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

function statusLabel(status: string) {
    const map: Record<string, string> = {
        pendiente:   'Pendiente',
        completada:  'Completada',
        cancelada:   'Cancelada',
    }
    return map[status] ?? status
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

.user-menu { position: relative; }

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

.pub-dropdown-header { padding: 12px 14px; }
.pub-dropdown-name { font-size: .84rem; font-weight: 700; color: var(--text-primary); }
.pub-dropdown-email { font-size: .74rem; color: var(--text-muted); margin-top: 2px; }
.pub-dropdown-divider { height: 1px; background: var(--border); }

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

.pub-dropdown-item:hover { background: var(--bg-elevated); color: var(--primary); }
.pub-dropdown-item--danger { color: var(--danger); }
.pub-dropdown-item--danger:hover { background: var(--danger-pale); color: var(--danger); }
.active-item { color: var(--primary); }

.dropdown-enter-active, .dropdown-leave-active { transition: opacity .15s ease, transform .15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

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

.pub-title { font-size: 1.5rem; font-weight: 800; }
.pub-count { font-size: .82rem; color: var(--text-muted); }

.pub-empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
}

.pub-empty p:first-child { font-size: 2.5rem; margin-bottom: 12px; }
.pub-empty p { font-size: 1rem; margin-bottom: 20px; }

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

.back-btn:hover { background: var(--primary-hover); }

/* Lista de compras */
.purchase-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.purchase-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    gap: 0;
    transition: box-shadow 0.2s;
}

.purchase-card:hover {
    box-shadow: 0 6px 24px rgba(0, 0, 0, .08);
}

.purchase-card-img {
    position: relative;
    width: 180px;
    flex-shrink: 0;
    overflow: hidden;
}

.purchase-card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.purchase-card-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
}

.purchase-card-category {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(255, 255, 255, .95);
    color: #1a2332;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: .7rem;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .08);
}

/* Badge de estado */
.purchase-badge {
    position: absolute;
    bottom: 12px;
    left: 12px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: .68rem;
    font-weight: 700;
    letter-spacing: .03em;
}

.purchase-badge--completada {
    background: #d1fae5;
    color: #065f46;
}

.purchase-badge--pendiente {
    background: #fef9c3;
    color: #854d0e;
}

.purchase-badge--cancelada {
    background: #fee2e2;
    color: #991b1b;
}

/* Cuerpo de la tarjeta */
.purchase-card-body {
    flex: 1;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.purchase-card-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.3;
    margin-bottom: 2px;
}

.purchase-card-meta {
    font-size: .76rem;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

/* Detalle cantidad / precio */
.purchase-card-detail {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.purchase-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: .8rem;
}

.purchase-detail-label {
    color: var(--text-muted);
    font-weight: 600;
}

.purchase-detail-value {
    color: var(--text-primary);
    font-weight: 700;
}

.purchase-detail-row--total {
    border-top: 1px solid var(--border);
    padding-top: 6px;
    margin-top: 2px;
}

.purchase-detail-row--total .purchase-detail-value {
    color: var(--primary);
    font-size: .9rem;
}

.purchase-card-date {
    font-size: .72rem;
    color: var(--text-muted);
    margin-top: auto;
}

@media (max-width: 640px) {
    .purchase-card {
        flex-direction: column;
    }

    .purchase-card-img {
        width: 100%;
        height: 160px;
    }
}
</style>