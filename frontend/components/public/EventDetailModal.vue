<template>
  <Transition name="modal">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="detail-modal" role="dialog" :aria-label="event.NameEvent">

        <!-- Botón cerrar -->
        <button class="modal-close" @click="$emit('close')" aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Columna izquierda: info del evento -->
        <div class="modal-left">

          <!-- Imagen del evento -->
<!-- Imagen del evento -->
<div class="modal-img-wrap">
  <img v-if="event.imageUrl" :src="event.imageUrl" :alt="event.NameEvent" class="modal-img" />
  <div v-else class="modal-img-placeholder" :style="{ background: categoryGradient }"></div>
  <span class="modal-category-chip">{{ event.nameCategory }}</span>
  <span class="modal-status-chip" :class="isActive ? 'chip--active' : 'chip--past'">
    {{ isActive ? 'Activo' : 'Finalizado' }}
  </span>
</div>

          <!-- Info principal -->
          <div class="modal-info">
            <h2 class="modal-event-name">{{ event.NameEvent }}</h2>
            <div class="modal-metas">
              <span class="modal-meta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                {{ formatDate(event.date_time) }}
              </span>
              <span class="modal-meta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="1.8"/></svg>
                {{ event.location }}
              </span>
            </div>
            <p class="modal-description">{{ event.description }}</p>
          </div>

          <!-- Imagen distribución del lugar -->
          <div class="venue-map-section">
            <h4 class="section-label">Distribución del lugar</h4>
            <div class="venue-map" :class="`venue-map--${venueLayout}`">
              <!-- Escenario -->
              <div class="venue-stage">🎭 Escenario</div>

              <!-- Zonas según tipos de entrada -->
              <div class="venue-zones">
                <div
                  v-for="(tp, i) in ticketTypes"
                  :key="tp.id"
                  class="venue-zone"
                  :class="[`zone-color-${i % 6}`, { 'zone--selected': selectedTypeId === tp.id, 'zone--sold': (availability[tp.id] ?? 0) === 0 }]"
                  @click="selectType(tp.id)"
                >
                  <span class="zone-name">{{ tp.name }}</span>
                  <span class="zone-seats">{{ (availability[tp.id] ?? 0) === 0 ? 'Agotado' : `${availability[tp.id]} disp.` }}</span>
                </div>
              </div>

              <!-- Leyenda -->
              <div class="venue-legend">
                <div v-for="(tp, i) in ticketTypes" :key="tp.id" class="legend-item">
                  <span class="legend-dot" :class="`zone-color-${i % 6}`"></span>
                  <span>{{ tp.name }} — {{ tp.price === 0 ? 'Gratis' : `$${tp.price.toLocaleString('es-CO')}` }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna derecha: compra -->
        <div class="modal-right">

          <!-- Evento finalizado -->
          <div v-if="!isActive" class="past-notice">
            <div class="past-notice-icon">📁</div>
            <h3>Evento finalizado</h3>
            <p>Este evento ya concluyó. Puedes revisar tus boletas anteriores en tu historial.</p>
            <NuxtLink to="/public/tickets" class="btn-primary" @click="$emit('close')">
              Ver mis boletas
            </NuxtLink>
          </div>

          <template v-else>
            <!-- Sin sesión -->
            <div v-if="isGuest" class="login-prompt">
              <div class="login-prompt-icon">🔒</div>
              <h3>Inicia sesión para comprar</h3>
              <p>Necesitas una cuenta para adquirir boletas.</p>
              <NuxtLink to="/login" class="btn-primary" @click="$emit('close')">Iniciar sesión</NuxtLink>
              <NuxtLink to="/register" class="btn-secondary" @click="$emit('close')">Registrarse</NuxtLink>
            </div>

            <template v-else>

              <!-- PASO 1: Selección de tipos -->
              <div v-if="step === 'select'">
                <h3 class="aside-title">Selecciona tus entradas</h3>
                <p class="aside-sub">Haz clic en una zona del mapa o elige aquí</p>

                <div class="types-list">
                  <div
                    v-for="(tp, i) in ticketTypes"
                    :key="tp.id"
                    class="type-item"
                    :class="{ 'type-item--selected': selectedTypeId === tp.id, 'type-item--sold': (availability[tp.id] ?? 0) === 0 }"
                    @click="(availability[tp.id] ?? 0) > 0 && selectType(tp.id)"
                  >
                    <div class="type-item-color" :class="`zone-color-${i % 6}`"></div>
                    <div class="type-item-info">
                      <span class="type-item-name">{{ tp.name }}</span>
                      <span class="type-item-price">{{ tp.price === 0 ? 'Gratis' : `$${tp.price.toLocaleString('es-CO')}` }}</span>
                    </div>
                    <div class="type-item-right">
                      <span class="type-avail" :class="{ 'sold-out': (availability[tp.id] ?? 0) === 0 }">
                        {{ (availability[tp.id] ?? 0) === 0 ? 'Agotado' : `${availability[tp.id]} disp.` }}
                      </span>
                      <svg v-if="selectedTypeId === tp.id" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#34656d" stroke-width="2.5" stroke-linecap="round"/>
                      </svg>
                    </div>
                  </div>

                  <div v-if="!ticketTypes.length" class="no-types">
                    ℹ️ El administrador aún no configuró los tipos de entrada.
                  </div>
                </div>

                <!-- Descripción del tipo seleccionado -->
                <Transition name="slide">
                  <div v-if="selectedType" class="type-description">
                    <h4>{{ selectedType.name }}</h4>
                    <p>{{ typeDescriptions[selectedType.id] ?? defaultDescription(selectedType) }}</p>
                    <div class="qty-row">
                      <span class="qty-label">Cantidad</span>
                      <div class="qty-control">
                        <button @click="qty = Math.max(1, qty - 1)">−</button>
                        <span>{{ qty }}</span>
                        <button @click="qty = Math.min(availability[selectedType.id] ?? 0, qty + 1)"
                          :disabled="qty >= (availability[selectedType.id] ?? 0)">+</button>
                      </div>
                    </div>

                    <div class="add-row">
                      <button class="btn-add" @click="addToCart">
                        + Agregar al carrito
                        <span class="add-price">{{ selectedType.price === 0 ? 'Gratis' : `$${(selectedType.price * qty).toLocaleString('es-CO')}` }}</span>
                      </button>
                    </div>
                  </div>
                </Transition>

                <!-- Carrito acumulado -->
                <div v-if="cart.length" class="cart-section">
                  <h4 class="cart-title">Tu selección</h4>
                  <div v-for="(item, idx) in cart" :key="idx" class="cart-item">
                    <span class="cart-item-name">{{ item.typeName }} × {{ item.qty }}</span>
                    <div class="cart-item-right">
                      <span class="cart-item-price">{{ item.total === 0 ? 'Gratis' : `$${item.total.toLocaleString('es-CO')}` }}</span>
                      <button class="cart-item-remove" @click="removeFromCart(idx)">✕</button>
                    </div>
                  </div>
                  <div class="cart-total">
                    <span>Total</span>
                    <span>{{ cartTotal === 0 ? 'Gratis' : `$${cartTotal.toLocaleString('es-CO')}` }}</span>
                  </div>

                  <div class="no-cancel-notice">
                    ⚠️ Las boletas <strong>no se pueden cancelar</strong>. Para ayuda escribe a
                    <a href="mailto:soporte@eventosboyaca.com">soporte@eventosboyaca.com</a>
                  </div>

                  <button class="btn-primary btn-checkout" @click="step = 'confirm'">
                    Continuar con {{ cartTotalItems }} boleta(s)
                  </button>
                </div>
              </div>

              <!-- PASO 2: Confirmación -->
              <div v-if="step === 'confirm'">
                <button class="btn-back" @click="step = 'select'">← Volver</button>
                <h3 class="aside-title">Confirmar compra</h3>

                <div class="confirm-summary">
                  <div class="confirm-event">
                    <span class="confirm-event-name">{{ event.NameEvent }}</span>
                    <span class="confirm-event-date">{{ formatDate(event.date_time) }}</span>
                  </div>
                  <div v-for="(item, idx) in cart" :key="idx" class="confirm-row">
                    <span>{{ item.typeName }} × {{ item.qty }}</span>
                    <span>{{ item.total === 0 ? 'Gratis' : `$${item.total.toLocaleString('es-CO')}` }}</span>
                  </div>
                  <div class="confirm-total">
                    <span>Total a pagar</span>
                    <span>{{ cartTotal === 0 ? 'Gratis' : `$${cartTotal.toLocaleString('es-CO')}` }}</span>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Nombre del titular / grupo</label>
                  <input v-model="holderName" class="form-input" placeholder="Ej: María García" />
                </div>

                <div class="payment-notice">
                  <div class="payment-notice-icon">💳</div>
                  <div>
                    <strong>Pago en taquilla</strong>
                    <p>Presenta tus boletas con código QR en la entrada del evento para pagar.</p>
                  </div>
                </div>

                <span v-if="buyError" class="form-err">{{ buyError }}</span>

                <button class="btn-primary btn-checkout" :disabled="!holderName.trim() || buyLoading" @click="confirmPurchase">
                  {{ buyLoading ? 'Procesando…' : '✓ Confirmar y obtener boletas' }}
                </button>

                <!-- Botón comprar más -->
                <button class="btn-secondary btn-buy-more" @click="step = 'select'">
                  + Comprar más boletas
                </button>
              </div>

            </template>
          </template>

          <!-- PASO 3: Éxito con QR -->
          <TicketSuccessModal
            v-if="step === 'success'"
            :tickets="boughtTickets"
            @close="handleSuccessClose"
            @buy-more="resetAndBuyMore"
          />
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useTickets, isEventActive } from '~/composables/useTickets'
import type { Ticket, TicketType } from '~/composables/useTickets'
import TicketSuccessModal from '~/components/public/TicketSuccessModal.vue'

const props = defineProps<{
  event: any
  initialTypeId?: string | null
}>()
const emit = defineEmits(['close'])

const { isGuest, user } = useAuth()
const { getTypesForEvent, getAvailability, purchaseTickets, init } = useTickets()

// ── Estado ───────────────────────────────────────────────────────────────────
const step = ref<'select' | 'confirm' | 'success'>('select')
const selectedTypeId = ref<string | null>(props.initialTypeId ?? null)
const qty = ref(1)
const holderName = ref(user.value?.name ?? '')
const buyLoading = ref(false)
const buyError = ref('')
const boughtTickets = ref<Ticket[]>([])

const isActive = computed(() => isEventActive(props.event.date_time))
const ticketTypes = computed<TicketType[]>(() => getTypesForEvent(props.event.id_event))
const availability = computed(() => getAvailability(props.event.id_event))
const selectedType = computed(() => ticketTypes.value.find(t => t.id === selectedTypeId.value) ?? null)

onMounted(() => { init() })

// ── Carrito ──────────────────────────────────────────────────────────────────
interface CartItem { typeId: string; typeName: string; qty: number; price: number; total: number }
const cart = ref<CartItem[]>([])

const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.total, 0))
const cartTotalItems = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))

function addToCart() {
  if (!selectedType.value) return
  const existing = cart.value.find(i => i.typeId === selectedTypeId.value)
  const maxAvail = availability.value[selectedTypeId.value!] ?? 0
  const alreadyInCart = existing?.qty ?? 0

  if (alreadyInCart + qty.value > maxAvail) {
    buyError.value = `Solo hay ${maxAvail - alreadyInCart} entradas disponibles de este tipo.`
    return
  }
  buyError.value = ''
  if (existing) {
    existing.qty += qty.value
    existing.total = existing.qty * existing.price
  } else {
    cart.value.push({
      typeId: selectedType.value.id,
      typeName: selectedType.value.name,
      qty: qty.value,
      price: selectedType.value.price,
      total: selectedType.value.price * qty.value,
    })
  }
  qty.value = 1
  selectedTypeId.value = null
}

function removeFromCart(idx: number) { cart.value.splice(idx, 1) }

// ── Compra ───────────────────────────────────────────────────────────────────
function confirmPurchase() {
  if (!holderName.value.trim()) { buyError.value = 'El nombre es obligatorio.'; return }
  buyLoading.value = true; buyError.value = ''
  const result = purchaseTickets(
    { id_event: props.event.id_event, NameEvent: props.event.NameEvent, date_time: props.event.date_time, location: props.event.location },
    { types: cart.value.map(i => ({ typeId: i.typeId, quantity: i.qty })), holderName: holderName.value.trim() }
  )
  buyLoading.value = false
  if (!result.success) { buyError.value = result.error ?? 'Error al procesar.'; return }
  boughtTickets.value = result.tickets!
  step.value = 'success'
}

function handleSuccessClose() { emit('close') }
function resetAndBuyMore() {
  cart.value = []
  selectedTypeId.value = null
  qty.value = 1
  buyError.value = ''
  step.value = 'select'
}

function selectType(typeId: string) {
  selectedTypeId.value = selectedTypeId.value === typeId ? null : typeId
  qty.value = 1
}

// ── Descripción de tipos (mock, admin configurará esto luego) ────────────────
const typeDescriptions: Record<string, string> = {}
function defaultDescription(tp: TicketType): string {
  const priceStr = tp.price === 0 ? 'entrada gratuita' : `entrada a $${tp.price.toLocaleString('es-CO')}`
  return `Zona ${tp.name}: ${priceStr}. Disfruta del evento desde esta área. Los tickets son válidos hasta el día siguiente al evento.`
}

// ── Mapa del lugar ───────────────────────────────────────────────────────────
const venueLayout = computed(() => {
  const n = ticketTypes.value.length
  if (n <= 2) return 'simple'
  if (n <= 4) return 'medium'
  return 'full'
})

// ── Estética ─────────────────────────────────────────────────────────────────
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
  gradients[props.event.nameCategory] ?? 'linear-gradient(135deg,#6366f1,#a78bfa)'
)

function formatDate(d: string | null) {
  if (!d) return 'Fecha por confirmar'
  try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}
</script>

<style scoped>
/* ── Overlay & modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px;
  overflow-y: auto;
}
.detail-modal {
  background: #fff; border-radius: 20px;
  width: min(960px, 100%); max-height: 92vh; overflow-y: auto;
  display: grid; grid-template-columns: 1fr 380px;
  position: relative; box-shadow: 0 32px 80px rgba(0,0,0,.22);
}
.modal-close {
  position: absolute; top: 14px; right: 14px; z-index: 10;
  background: rgba(255,255,255,.9); border: 1px solid #e4e7ec; border-radius: 50%;
  width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #4a5568; transition: background .15s, color .15s;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
}
.modal-close:hover { background: #fff; color: #1a2332; }

/* ── Columna izquierda ── */
.modal-left { overflow-y: auto; }
.modal-img-wrap { position: relative; aspect-ratio: 16/8; overflow: hidden; }
.modal-img { width: 100%; height: 100%; object-fit: cover; }
.modal-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.modal-category-chip { position: absolute; bottom: 10px; left: 12px; background: rgba(255,255,255,.92); border-radius: 20px; padding: 4px 12px; font-size: .74rem; font-weight: 700; }
.modal-status-chip { position: absolute; bottom: 10px; right: 12px; border-radius: 20px; padding: 4px 12px; font-size: .74rem; font-weight: 700; }
.chip--active { background: #dcfce7; color: #166534; }
.chip--past { background: #f1f5f9; color: #64748b; }

.modal-info { padding: 20px 24px 16px; }
.modal-event-name { font-size: 1.35rem; font-weight: 800; color: #1a2332; margin-bottom: 10px; line-height: 1.25; }
.modal-metas { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.modal-meta { display: flex; align-items: center; gap: 5px; font-size: .8rem; color: #4a5568; }
.modal-description { font-size: .86rem; color: #4a5568; line-height: 1.65; }

/* ── Mapa del lugar ── */
.venue-map-section { padding: 0 24px 24px; }
.section-label { font-size: .76rem; font-weight: 700; color: #8a9bb0; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }
.venue-map { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px; padding: 16px; }
.venue-stage { background: #1a2332; color: #fff; text-align: center; border-radius: 8px; padding: 8px; font-size: .8rem; font-weight: 700; margin-bottom: 14px; letter-spacing: .04em; }
.venue-zones { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; margin-bottom: 14px; }
.venue-zone {
  border-radius: 10px; padding: 10px 8px; text-align: center; cursor: pointer;
  display: flex; flex-direction: column; gap: 4px; border: 2px solid transparent;
  transition: transform .15s, border-color .15s, box-shadow .15s;
}
.venue-zone:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.venue-zone--selected { border-color: #1a2332 !important; box-shadow: 0 4px 16px rgba(0,0,0,.15); transform: translateY(-2px); }
.venue-zone--sold { opacity: .45; cursor: not-allowed; }
.zone-name { font-size: .76rem; font-weight: 700; color: #1a2332; }
.zone-seats { font-size: .68rem; color: #4a5568; }

/* Colores de zonas */
.zone-color-0 { background: #fde8d0; }
.zone-color-1 { background: #dbeafe; }
.zone-color-2 { background: #dcfce7; }
.zone-color-3 { background: #fce7f3; }
.zone-color-4 { background: #ede9fe; }
.zone-color-5 { background: #fef9c3; }

.venue-legend { display: flex; flex-wrap: wrap; gap: 8px; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: .72rem; color: #4a5568; }
.legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

/* ── Columna derecha ── */
.modal-right {
  border-left: 1px solid #e4e7ec; padding: 28px 22px;
  overflow-y: auto; display: flex; flex-direction: column;
  background: #fafbfc;
}

.past-notice, .login-prompt { text-align: center; padding: 20px 0; }
.past-notice-icon, .login-prompt-icon { font-size: 2.5rem; margin-bottom: 12px; }
.past-notice h3, .login-prompt h3 { font-size: 1rem; font-weight: 800; margin-bottom: 8px; }
.past-notice p, .login-prompt p { font-size: .84rem; color: #4a5568; margin-bottom: 20px; line-height: 1.5; }

.aside-title { font-size: 1rem; font-weight: 800; color: #1a2332; margin-bottom: 4px; }
.aside-sub { font-size: .78rem; color: #8a9bb0; margin-bottom: 16px; }

/* Tipos */
.types-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.type-item {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border: 1.5px solid #e4e7ec; border-radius: 12px; cursor: pointer;
  transition: border-color .15s, background .15s;
}
.type-item:hover:not(.type-item--sold) { border-color: #34656d; background: #f0faf8; }
.type-item--selected { border-color: #34656d; background: #e8f4f5; }
.type-item--sold { opacity: .5; cursor: not-allowed; }
.type-item-color { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
.type-item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.type-item-name { font-size: .86rem; font-weight: 700; color: #1a2332; }
.type-item-price { font-size: .78rem; color: #34656d; font-weight: 600; }
.type-item-right { display: flex; align-items: center; gap: 8px; }
.type-avail { font-size: .72rem; color: #8a9bb0; }
.type-avail.sold-out { color: #e74c3c; font-weight: 700; }
.no-types { text-align: center; padding: 20px; font-size: .84rem; color: #8a9bb0; background: #f7f8fa; border-radius: 10px; }

/* Descripción del tipo */
.type-description {
  background: #fff; border: 1px solid #e4e7ec; border-radius: 12px;
  padding: 14px 16px; margin-bottom: 16px;
}
.type-description h4 { font-size: .88rem; font-weight: 800; color: #1a2332; margin-bottom: 6px; }
.type-description p { font-size: .8rem; color: #4a5568; line-height: 1.55; margin-bottom: 12px; }

.qty-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.qty-label { font-size: .8rem; font-weight: 700; color: #1a2332; }
.qty-control { display: flex; align-items: center; gap: 12px; }
.qty-control button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e4e7ec; background: #f7f8fa; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.qty-control button:hover:not(:disabled) { background: #e8f4f5; border-color: #34656d; }
.qty-control button:disabled { opacity: .35; cursor: not-allowed; }
.qty-control span { font-size: .95rem; font-weight: 800; min-width: 24px; text-align: center; }

.add-row { }
.btn-add {
  width: 100%; padding: 10px; background: #1a2332; color: #fff; border: none;
  border-radius: 10px; font-size: .84rem; font-weight: 700; cursor: pointer;
  display: flex; justify-content: space-between; align-items: center;
  transition: background .15s;
}
.btn-add:hover { background: #2d3748; }
.add-price { font-size: .8rem; opacity: .85; }

/* Carrito */
.cart-section { border-top: 1px solid #e4e7ec; padding-top: 14px; margin-top: 4px; }
.cart-title { font-size: .78rem; font-weight: 700; color: #8a9bb0; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 10px; }
.cart-item { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f0f2f5; }
.cart-item-name { font-size: .84rem; color: #1a2332; font-weight: 600; }
.cart-item-right { display: flex; align-items: center; gap: 10px; }
.cart-item-price { font-size: .84rem; color: #34656d; font-weight: 700; }
.cart-item-remove { background: none; border: none; color: #8a9bb0; cursor: pointer; font-size: .8rem; padding: 2px 4px; border-radius: 4px; }
.cart-item-remove:hover { color: #e74c3c; background: #fee2e2; }
.cart-total { display: flex; justify-content: space-between; padding: 10px 0; font-weight: 800; font-size: .9rem; color: #1a2332; }

.no-cancel-notice { background: #fff8e1; border: 1px solid #f9d71c55; border-radius: 8px; padding: 10px 12px; font-size: .76rem; color: #7a6200; margin: 12px 0; line-height: 1.5; }
.no-cancel-notice a { color: #34656d; font-weight: 600; }

/* Confirmación */
.btn-back { background: none; border: none; color: #34656d; font-size: .82rem; font-weight: 700; cursor: pointer; padding: 0; margin-bottom: 14px; display: flex; align-items: center; gap: 4px; }
.confirm-summary { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
.confirm-event { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e4e7ec; }
.confirm-event-name { font-size: .9rem; font-weight: 800; color: #1a2332; }
.confirm-event-date { font-size: .76rem; color: #8a9bb0; }
.confirm-row { display: flex; justify-content: space-between; font-size: .84rem; color: #4a5568; padding: 5px 0; }
.confirm-total { display: flex; justify-content: space-between; font-weight: 800; font-size: .92rem; color: #1a2332; padding-top: 10px; border-top: 1px solid #e4e7ec; margin-top: 6px; }

.payment-notice { display: flex; gap: 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 12px 14px; margin: 14px 0; }
.payment-notice-icon { font-size: 1.5rem; flex-shrink: 0; }
.payment-notice strong { font-size: .84rem; color: #1a2332; display: block; margin-bottom: 3px; }
.payment-notice p { font-size: .78rem; color: #0369a1; line-height: 1.45; margin: 0; }

/* Form */
.form-group { margin-bottom: 12px; }
.form-label { display: block; font-size: .76rem; font-weight: 700; color: #1a2332; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .04em; }
.form-input { width: 100%; border: 1px solid #e4e7ec; border-radius: 8px; padding: 9px 12px; font-size: .86rem; outline: none; transition: border-color .15s; background: #fff; }
.form-input:focus { border-color: #34656d; }
.form-err { display: block; font-size: .78rem; color: #c0392b; margin-top: 4px; margin-bottom: 8px; }

/* Botones */
.btn-primary { display: block; width: 100%; padding: 12px; background: #34656d; color: #fff; border: none; border-radius: 10px; font-size: .88rem; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; transition: background .15s; }
.btn-primary:hover:not(:disabled) { background: #2a535a; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary { display: block; width: 100%; padding: 10px; background: #fff; color: #34656d; border: 1px solid #d1e8ea; border-radius: 10px; font-size: .84rem; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; transition: background .15s; margin-top: 8px; }
.btn-secondary:hover { background: #e8f4f5; }
.btn-checkout { margin-top: 12px; }
.btn-buy-more { margin-top: 8px; }

/* Transiciones */
.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: all .2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* Responsive */
@media (max-width: 720px) {
  .detail-modal { grid-template-columns: 1fr; max-height: none; height: 100%; border-radius: 16px 16px 0 0; }
  .modal-right { border-left: none; border-top: 1px solid #e4e7ec; }
  .modal-overlay { align-items: flex-end; padding: 0; }
}
</style>