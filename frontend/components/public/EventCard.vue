<template>
  <article class="event-card">
    <!-- Media -->
    <div class="card-media">
      <img v-if="event.imageUrl" :src="event.imageUrl" :alt="event.NameEvent" class="card-img" />
      <div v-else class="image-placeholder" :style="{ background: categoryGradient }"></div>
      <div class="category-badge">{{ event.nameCategory }}</div>
    </div>

    <!-- Body -->
    <div class="card-body">
      <p class="date">📅 {{ formatDate(event.date_time) }} · 📍 {{ event.location }}</p>
      <h2 class="card-title">{{ event.NameEvent }}</h2>
      <p class="card-description">{{ event.description }}</p>
    </div>

    <!-- Footer -->
    <div class="card-footer">
      <span class="price">{{ event.value === 0 ? 'Gratis' : `$${event.value.toLocaleString('es-CO')}` }}</span>
      <div class="card-actions">
        <button class="btn-like" :class="{ active: liked }" @click="toggleLike"
          :title="liked ? 'Ya no me interesa' : 'Me interesa'">
          {{ liked ? '❤️' : '🤍' }}
          <span class="like-count">{{ likeCount }}</span>
        </button>
      </div>
      <Teleport to="body">
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
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Event } from '~/composables/useEvents'

const props = defineProps<{ event: Event }>()

const { registerInterest, removeInterest, getInterestStatus } = useEvents()
const { isGuest } = useAuth()
const showRegisterModal = ref(false)

const liked = ref(false)
const likeCount = ref(0)

onMounted(async () => {
  const status = await getInterestStatus(props.event.id_event)
  liked.value = status.interested
  likeCount.value = status.total_interests
})

async function toggleLike() {
  if (isGuest.value) { showRegisterModal.value = true; return }
  if (liked.value) {
    const r = await removeInterest(props.event.id_event)
    if (r.success) { liked.value = false; likeCount.value = r.total_interests ?? likeCount.value - 1 }
  } else {
    const r = await registerInterest(props.event.id_event)
    if (r.success) { liked.value = true; likeCount.value = r.total_interests ?? likeCount.value + 1 }
  }
}

const gradients: Record<string, string> = {
  'Música y Entretenimiento': 'linear-gradient(135deg, #f97316, #fb923c)',
  'Tecnología e Innovación': 'linear-gradient(135deg, #6366f1, #818cf8)',
  'Literatura y Cultura': 'linear-gradient(135deg, #ec4899, #f472b6)',
  'Deporte y Bienestar': 'linear-gradient(135deg, #10b981, #34d399)',
  'Gastronomía': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
}

const categoryGradient = computed(() =>
  gradients[props.event.nameCategory] ?? 'linear-gradient(135deg, #6366f1, #a78bfa)'
)

function formatDate(d: string | null) {
  if (!d) return 'Fecha por confirmar'
  try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}
</script>

<style scoped>
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

.guest-modal {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 32px 28px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .2);
}

.guest-modal-close {
  position: absolute;
  top: 12px;
  right: 14px;
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--text-muted);
  cursor: pointer;
}

.guest-modal-close:hover {
  color: var(--text-primary);
}

.guest-modal-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.guest-modal-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.guest-modal-text {
  font-size: .84rem;
  color: var(--text-muted);
  margin-bottom: 24px;
  line-height: 1.5;
}

.guest-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guest-modal-btn {
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: .85rem;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
  transition: background var(--transition);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.guest-modal-btn:hover {
  background: var(--bg-elevated);
}

.guest-modal-btn--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.guest-modal-btn--primary:hover {
  background: var(--primary-hover);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity .18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>