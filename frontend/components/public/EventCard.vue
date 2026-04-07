<template>
  <article class="event-card" :class="{ 'event-card--past': !isActive }">
    <!-- Media -->
    <div class="card-media" @click="openDetail">
      <img v-if="event.imageUrl" :src="event.imageUrl" :alt="event.eventName" class="card-img" />
      <div v-else class="image-placeholder" :style="{ background: categoryGradient }"></div>
<div class="category-badge">{{ event.categoryName }}</div>
<span v-if="!isActive" class="past-badge">Finalizado</span>
      <button class="btn-like" :class="{ active: liked }" @click.stop="toggleLike"
  :title="liked ? 'Ya no me interesa' : 'Me interesa'">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
      :fill="liked ? '#e74c3c' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </svg>
</button>
    </div>

    <!-- Body -->
    <div class="card-body" @click="openDetail">
      <p class="card-meta">
  <span>📅 {{ formatDate(event.date_time) }}</span>
  <span>📍 {{ event.location }}</span>
</p>
      <h2 class="card-title">{{ event.eventName }}</h2>
      <p class="card-description">{{ event.description }}</p>
    </div>

    <!-- Footer -->
    <div class="card-footer">
  <div v-if="!isActive" class="footer-past">
    <span class="price-tag price-tag--free">Evento finalizado</span>
    <button class="btn-detail-ghost" @click="openDetail">Ver historial</button>
  </div>

  <template v-else-if="ticketTypes.length">
    <div class="footer-types">
      <button
        v-for="tp in ticketTypes.slice(0, 3)"
        :key="tp.id"
        class="btn-type"
        :class="{ 'btn-type--sold': (availability[tp.id] ?? 0) === 0 }"
        :disabled="(availability[tp.id] ?? 0) === 0"
        @click="openDetailWithType(tp.id)"
      >
        <span class="btn-type-name">{{ tp.name }}</span>
        <span class="btn-type-price">{{ tp.price === 0 ? 'Gratis' : `$${tp.price.toLocaleString('es-CO')}` }}</span>
      </button>
      <button v-if="ticketTypes.length > 3" class="btn-type btn-type--more" @click="openDetail">
        +{{ ticketTypes.length - 3 }} más
      </button>
    </div>
  </template>

  <template v-else>
    <div class="footer-no-types">
      <span class="price-tag">{{ event.price === 0 ? 'Gratis' : `Desde $${event.price.toLocaleString('es-CO')}` }}</span>
      <button class="btn-detail-ghost" @click="openDetail">Ver evento</button>
    </div>
  </template>
</div>
    <!-- Modal de detalle -->
    <Teleport to="body">
      <EventDetailModal
        v-if="showDetail"
        :event="event"
        :initial-type-id="selectedTypeId"
        @close="showDetail = false"
      />
      <!-- Modal de login requerido -->
      <Transition name="modal">
        <div v-if="showRegisterModal" class="modal-overlay" @click.self="showRegisterModal = false">
          <div class="guest-modal">
            <button class="guest-modal-close" @click="showRegisterModal = false">✕</button>
            <div class="guest-modal-icon">🎟️</div>
            <h3 class="guest-modal-title">¿Te interesa este evento?</h3>
            <p class="guest-modal-text">Crea una cuenta gratis para guardar tus eventos favoritos.</p>
            <div class="guest-modal-actions">
              <NuxtLink to="/register" class="guest-modal-btn guest-modal-btn--primary">Registrarse</NuxtLink>
              <NuxtLink to="/login" class="guest-modal-btn">Iniciar sesión</NuxtLink>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </article>
</template>

<script setup lang="ts">
import type { Event } from '~/composables/useEvents'
import { useTickets, isEventActive } from '~/composables/useTickets'
import EventDetailModal from '~/components/public/EventDetailModal.vue'

const props = defineProps<{ event: Event }>()

// Composables
const { isGuest, authHeaders } = useAuth()
const { getTypesForEvent, getAvailability, init, ensureTypesForEvent } = useTickets()

const API = 'http://localhost:3001/api'

const showRegisterModal = ref(false)
const showDetail = ref(false)
const selectedTypeId = ref<string | null>(null)

const isActive = computed(() => isEventActive(props.event.date_time))
const ticketTypes = computed(() => getTypesForEvent(props.event.id_event))
const availability = computed(() => getAvailability(props.event.id_event))
const liked = ref(false)

onMounted(async () => {
  init()
  ensureTypesForEvent(props.event)
  if (!isGuest.value) {
    try {
      const res = await fetch(`${API}/favorites/${props.event.id_event}/status`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        liked.value = data.favorited
      }
    } catch {}
  }
})

async function toggleLike() {
  if (isGuest.value) { showRegisterModal.value = true; return }
  if (liked.value) {
    const res = await fetch(`${API}/favorites/${props.event.id_event}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (res.ok) liked.value = false
  } else {
    const res = await fetch(`${API}/favorites/${props.event.id_event}`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (res.ok) liked.value = true
  }
}

function openDetail() {
  selectedTypeId.value = null
  showDetail.value = true
}
function openDetailWithType(typeId: string) {
  selectedTypeId.value = typeId
  showDetail.value = true
}

const gradients: Record<string, string> = {
  'Música': 'linear-gradient(135deg,#f97316,#fb923c)',
  'Deportes': 'linear-gradient(135deg,#10b981,#34d399)',
  'Teatro': 'linear-gradient(135deg,#ec4899,#f472b6)',
  'Tecnología': 'linear-gradient(135deg,#6366f1,#818cf8)',
  'Gastronomía': 'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'Música y Entretenimiento': 'linear-gradient(135deg,#f97316,#fb923c)',
  'Tecnología e Innovación': 'linear-gradient(135deg,#6366f1,#818cf8)',
  'Literatura y Cultura': 'linear-gradient(135deg,#ec4899,#f472b6)',
  'Deporte y Bienestar': 'linear-gradient(135deg,#10b981,#34d399)',
}

const categoryGradient = computed(() =>
  gradients[props.event.categoryName ?? ''] ?? 'linear-gradient(135deg, #6366f1, #a78bfa)'
)

function formatDate(d: string | null) {
  if (!d) return 'Fecha por confirmar'
  try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}
</script>
<style scoped>
.event-card {
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border, #e4e7ec);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: default;
}
.event-card:hover {
  box-shadow: 0 8px 32px rgba(0,0,0,.10);
  transform: translateY(-2px);
}
.event-card--past { opacity: .85; }

/* Media */
.card-media {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.card-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0,0,0,0.45),
    rgba(0,0,0,0.1),
    transparent
  );
}

.card-img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.card-media:hover .card-img { transform: scale(1.03); }
.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  background-size: cover;
  background-position: center;

  filter: brightness(.95);
}
.placeholder-emoji { font-size: 2.5rem; }

.category-badge {
  position: absolute;
  top: 14px;
  left: 14px;

  background: rgba(255,255,255,0.95);
  color: #1a2332;

  padding: 6px 14px;
  border-radius: 999px;

  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .5px;

  box-shadow: 0 2px 10px rgba(0,0,0,.08);
}

.past-badge {
  position: absolute; bottom: 10px; right: 10px;
  background: rgba(0,0,0,.55); color: #fff;
  border-radius: 20px; padding: 3px 10px; font-size: .72rem; font-weight: 700;
}

/* Corazón */
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

/* Body */
.card-body { padding: 14px 16px 8px; flex: 1; cursor: pointer; }
.card-meta { font-size: .76rem; color: var(--text-muted, #8a9bb0); margin-bottom: 6px; display: flex; flex-direction: column; gap: 2px; }
.card-title { font-size: 1rem; font-weight: 800; color: var(--text-primary, #1a2332); margin-bottom: 6px; line-height: 1.3; }
.card-description {
  font-size: .8rem; color: var(--text-secondary, #4a5568); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* Footer */
.card-footer { padding: 12px 16px 14px; border-top: 1px solid var(--border, #e4e7ec); }

.footer-types { display: flex; flex-wrap: wrap; gap: 6px; }
.btn-type {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 7px 12px; border-radius: 10px;
  background: var(--primary-pale, #e8f4f5); border: 1px solid #c8e6ea;
  cursor: pointer; transition: background .15s, border-color .15s, transform .12s;
  text-align: left;
}
.btn-type:hover:not(:disabled) { background: #d1ecf0; border-color: #34656d; transform: translateY(-1px); }
.btn-type--sold { background: #f1f5f9; border-color: #e2e8f0; cursor: not-allowed; opacity: .6; }
.btn-type--more { background: #f7f8fa; border-color: #e4e7ec; color: #4a5568; font-size: .78rem; font-weight: 700; align-items: center; justify-content: center; }
.btn-type-name { font-size: .76rem; font-weight: 700; color: #1a2332; }
.btn-type-price { font-size: .72rem; color: #34656d; font-weight: 600; }

.footer-past, .footer-no-types { display: flex; justify-content: space-between; align-items: center; }
.price-tag { font-size: .84rem; font-weight: 700; color: #34656d; }
.price-tag--free { color: #8a9bb0; }
.btn-detail-ghost {
  padding: 6px 14px; background: none; border: 1px solid #e4e7ec;
  border-radius: 8px; font-size: .8rem; font-weight: 700; color: #4a5568;
  cursor: pointer; transition: border-color .15s, color .15s;
}
.btn-detail-ghost:hover { border-color: #34656d; color: #34656d; }

/* Guest modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
}
.guest-modal {
  background: #fff; border-radius: 16px; padding: 32px 28px;
  max-width: 360px; width: 100%; text-align: center; position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.guest-modal-close { position: absolute; top: 12px; right: 14px; background: none; border: none; font-size: 1rem; color: #8a9bb0; cursor: pointer; }
.guest-modal-icon { font-size: 2.5rem; margin-bottom: 12px; }
.guest-modal-title { font-size: 1rem; font-weight: 800; margin-bottom: 8px; }
.guest-modal-text { font-size: .84rem; color: #4a5568; margin-bottom: 24px; line-height: 1.5; }
.guest-modal-actions { display: flex; flex-direction: column; gap: 10px; }
.guest-modal-btn { padding: 10px; border-radius: 8px; font-size: .85rem; font-weight: 700; text-decoration: none; text-align: center; transition: background .15s; color: #4a5568; border: 1px solid #e4e7ec; }
.guest-modal-btn:hover { background: #f7f8fa; }
.guest-modal-btn--primary { background: #34656d; color: #fff; border-color: #34656d; }
.guest-modal-btn--primary:hover { background: #2a535a; }

.modal-enter-active, .modal-leave-active { transition: opacity .18s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>