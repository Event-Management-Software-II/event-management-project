<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Eventos</h1>
      <AppButtonAdmin variant="primary" @click="openModal('create')">
        <template #icon>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </template>
        Nuevo evento
      </AppButtonAdmin>
    </div>

    <div class="filters">
      <div class="search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="search-icon">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
          <path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input v-model="searchQuery" placeholder="Buscar evento…" class="search-input"/>
      </div>
      <select v-model="filterCategory" class="filter-select">
        <option value="">Todas las categorías</option>
        <option v-for="c in sortedActiveCategories" :key="c.id_category" :value="c.id_category">
          {{ c.categoryName }}
        </option>
      </select>
    </div>

    <div class="card">
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">Cargando…</td>
            </tr>
            <tr v-else-if="filteredEvents.length === 0">
              <td colspan="6">
                <div class="empty-state">
                  <div class="empty-state-icon">🎟️</div>
                  <div class="empty-state-text">No hay eventos.</div>
                </div>
              </td>
            </tr>
            <tr v-for="ev in filteredEvents" :key="ev.id_event" :class="{ 'row-deleted': ev.deleted_at }">
              <td class="td-name">{{ ev.eventName }}</td>
              <td class="td-secondary">{{ ev.category?.categoryName ?? ev.categoryName }}</td>
              <td class="td-secondary">{{ formatPrice(ev) }}</td>
              <td class="td-secondary">{{ ev.location }}</td>
              <td>
                <span :class="['badge', ev.deleted_at ? 'badge--hidden' : 'badge--visible']">
                  {{ ev.deleted_at ? 'Inactivo' : 'Activo' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <AppButtonAdmin variant="ghost" size="sm" icon-only @click="openModal('edit', { ...ev, images: ev.images ? [...ev.images] : undefined })" title="Editar">
                    <template #icon>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      </svg>
                    </template>
                  </AppButtonAdmin>
                  <AppButtonAdmin v-if="!ev.deleted_at" variant="danger" size="sm" icon-only @click="confirmDelete({ ...ev, images: ev.images ? [...ev.images] : undefined })" title="Eliminar">
                    <template #icon>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      </svg>
                    </template>
                  </AppButtonAdmin>
                  <AppButtonAdmin v-else variant="secondary" size="sm" icon-only @click="handleRestore(ev.id_event)" title="Restaurar">
                    <template #icon>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M1 4v6h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M3.51 15a9 9 0 1 0 .49-4.95L1 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      </svg>
                    </template>
                  </AppButtonAdmin>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL CREATE / EDIT -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title">{{ mode === 'create' ? 'Nuevo evento' : 'Editar evento' }}</h2>
              <button class="modal-close" @click="closeModal">✕</button>
            </div>
            <div class="modal-body">
              <AppInputAdmin v-model="form.eventName"   label="Nombre"      placeholder="Nombre del evento"   :error="formErrors.eventName"   required />
              <AppInputAdmin v-model="form.id_category" label="Categoría"   as="select"                       :error="formErrors.id_category" required>
                <option value="" disabled>Selecciona una categoría</option>
                <option v-for="c in sortedActiveCategories" :key="c.id_category" :value="String(c.id_category)">
                  {{ c.categoryName }}
                </option>
              </AppInputAdmin>
              <AppInputAdmin v-model="form.description" label="Descripción" as="textarea" placeholder="Descripción del evento (mín. 20 caracteres)" :error="formErrors.description" required />
              <AppInputAdmin v-model="form.location"    label="Ubicación"   placeholder="Ciudad, lugar"       :error="formErrors.location"    required />
              <AppInputAdmin v-model="form.date_time"   label="Fecha y hora (opcional)" type="datetime-local" />
              <AppInputAdmin v-model="form.image_url"   label="URL imagen (opcional)"   placeholder="https://..." />

              <!-- ── SECCIÓN DE TICKETS ── -->
              <div class="ticket-section">
                <div class="ticket-section-label">Tipo de acceso</div>

                <!-- Toggle Gratis / Pago -->
                <div class="ticket-toggle">
                  <button
                    type="button"
                    :class="['toggle-btn', !isPaid && 'toggle-btn--active']"
                    @click="setPaid(false)"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M20 12V22H4V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M22 7H2v5h20V7z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M12 22V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Gratis
                  </button>
                  <button
                    type="button"
                    :class="['toggle-btn', isPaid && 'toggle-btn--active']"
                    @click="setPaid(true)"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 6v1m0 10v1M9 9.5a3 3 0 015.5 1.5c0 2-3 2.5-3 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Pago
                  </button>
                </div>

                <!-- Lista de tipos de ticket (solo si isPaid) -->
                <div v-if="isPaid" class="ticket-types-builder">
                  <div
                    v-for="(tt, idx) in form.ticketTypes"
                    :key="idx"
                    class="ticket-type-row"
                  >
                    <div class="ticket-type-row-header">
                      <span class="ticket-type-row-title">Tipo {{ idx + 1 }}</span>
                      <button type="button" class="ticket-type-remove" @click="removeTicketType(idx)" title="Eliminar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>

                    <!-- Selector de tipo (solo muestra los que no están ya elegidos) -->
                    <div class="ticket-type-fields">
                      <div class="field-group">
                        <label class="field-label">Tipo de ticket <span class="required">*</span></label>
                        <select
                          v-model="tt.id_catalog"
                          class="field-select"
                          :class="{ 'field-error': formErrors[`tt_${idx}_id_catalog`] }"
                        >
                          <option value="" disabled>Seleccionar…</option>
                          <option
                            v-for="cat in availableCatalogFor(idx)"
                            :key="cat.id_catalog"
                            :value="String(cat.id_catalog)"
                          >
                            {{ cat.typeName }}
                          </option>
                        </select>
                        <span v-if="formErrors[`tt_${idx}_id_catalog`]" class="field-error-msg">
                          {{ formErrors[`tt_${idx}_id_catalog`] }}
                        </span>
                      </div>

                      <div class="field-group">
                        <label class="field-label">Precio (COP) <span class="required">*</span></label>
                        <input
                          v-model="tt.price"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="field-input"
                          :class="{ 'field-error': formErrors[`tt_${idx}_price`] }"
                        />
                        <span v-if="formErrors[`tt_${idx}_price`]" class="field-error-msg">
                          {{ formErrors[`tt_${idx}_price`] }}
                        </span>
                      </div>

                      <div class="field-group">
                        <label class="field-label">Capacidad <span class="required">*</span></label>
                        <input
                          v-model="tt.capacity"
                          type="number"
                          min="1"
                          placeholder="100"
                          class="field-input"
                          :class="{ 'field-error': formErrors[`tt_${idx}_capacity`] }"
                        />
                        <span v-if="formErrors[`tt_${idx}_capacity`]" class="field-error-msg">
                          {{ formErrors[`tt_${idx}_capacity`] }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Error global de tickets -->
                  <p v-if="formErrors.ticketTypes" class="ticket-global-error">{{ formErrors.ticketTypes }}</p>

                  <!-- Botón agregar tipo (deshabilitado si ya se usaron todos los del catálogo) -->
                  <button
                    type="button"
                    class="ticket-add-btn"
                    :disabled="allCatalogUsed"
                    @click="addTicketType"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                    Agregar tipo de ticket
                  </button>
                </div>

                <p v-if="!isPaid" class="free-note">
                  El evento será gratuito. No se requerirán tickets de pago.
                </p>
              </div>

              <p v-if="formErrors._global" class="global-error">{{ formErrors._global }}</p>
            </div>
            <div class="modal-footer">
              <AppButtonAdmin variant="secondary" @click="closeModal">Cancelar</AppButtonAdmin>
              <AppButtonAdmin variant="primary" :loading="saving" @click="save">
                {{ mode === 'create' ? 'Guardar' : 'Actualizar' }}
              </AppButtonAdmin>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL CONFIRMAR DELETE -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteConfirmOpen" class="modal-overlay" @click.self="deleteConfirmOpen = false">
          <div class="modal-box" style="max-width:420px">
            <div class="modal-header">
              <h2 class="modal-title" style="color:var(--danger)">Eliminar evento</h2>
              <button class="modal-close" @click="deleteConfirmOpen = false">✕</button>
            </div>
            <div class="modal-body">
              <p style="font-size:.88rem;color:var(--text-secondary)">
                ¿Seguro que quieres eliminar <strong>{{ deletingEvent?.eventName }}</strong>? El evento quedará inactivo.
              </p>
            </div>
            <div class="modal-footer">
              <AppButtonAdmin variant="secondary" @click="deleteConfirmOpen = false">Cancelar</AppButtonAdmin>
              <AppButtonAdmin variant="danger" :loading="deleting" @click="handleDelete">Eliminar</AppButtonAdmin>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Event, EventForm } from '~/composables/useEvents'
import AppButtonAdmin from '~/components/admin/AppButtonAdmin.vue'
import AppInputAdmin  from '~/components/admin/AppInputAdmin.vue'

definePageMeta({ layout: 'admin' })

const { events, loading, fetchEventsAdmin, createEvent, updateEvent, deleteEvent, restoreEvent } = useEvents()
const { sortedActiveCategories, fetchCategoriesAdmin } = useCategories()
const { sortedActiveCatalog: ticketCatalog, fetchCatalogAdmin } = useTicketCatalog()

onMounted(async () => {
  await Promise.all([fetchEventsAdmin(), fetchCategoriesAdmin(), fetchCatalogAdmin()])
})

// ── Helpers de precio ──
function formatPrice(ev: Event) {
  if (!ev.ticketTypes || ev.ticketTypes.length === 0) return 'Gratis'
  const prices = ev.ticketTypes.map((tt: any) => tt.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `$${min.toLocaleString('es-CO')}`
  return `$${min.toLocaleString('es-CO')} – $${max.toLocaleString('es-CO')}`
}

// ── Filtros ──
const searchQuery    = ref('')
const filterCategory = ref<number | ''>('')

const filteredEvents = computed(() => {
  return events.value.filter(ev => {
    const matchName = !searchQuery.value || ev.eventName.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCat  = !filterCategory.value || ev.id_category === filterCategory.value
    return matchName && matchCat
  })
})

// ── Tipos de ticket en el form ──
interface TicketTypeRow {
  id_catalog: string
  price: string
  capacity: string
}

interface ExtendedEventForm extends EventForm {
  ticketTypes: TicketTypeRow[]
}

const isPaid = ref(false)

function setPaid(val: boolean) {
  isPaid.value = val
  if (!val) {
    form.value.ticketTypes = []
  } else if (form.value.ticketTypes.length === 0) {
    form.value.ticketTypes = [{ id_catalog: '', price: '', capacity: '' }]
  }
}

function addTicketType() {
  form.value.ticketTypes.push({ id_catalog: '', price: '', capacity: '' })
}

function removeTicketType(idx: number) {
  form.value.ticketTypes.splice(idx, 1)
  if (form.value.ticketTypes.length === 0) {
    form.value.ticketTypes.push({ id_catalog: '', price: '', capacity: '' })
  }
}

// IDs de catálogo ya seleccionados en otras filas (para evitar duplicados)
const usedCatalogIds = computed(() =>
  form.value.ticketTypes.map(tt => tt.id_catalog).filter(Boolean)
)

// Para cada fila, el catálogo disponible = todos menos los usados en OTRAS filas
function availableCatalogFor(idx: number) {
  const selectedInOtherRows = form.value.ticketTypes
    .filter((_, i) => i !== idx)
    .map(tt => tt.id_catalog)
    .filter(Boolean)
  return ticketCatalog.value.filter(cat => !selectedInOtherRows.includes(String(cat.id_catalog)))
}

// True cuando ya no quedan tipos de catálogo sin usar
const allCatalogUsed = computed(() =>
  usedCatalogIds.value.filter(Boolean).length >= ticketCatalog.value.length
)

// ── Modal form ──
const modalOpen  = ref(false)
const mode       = ref<'create' | 'edit'>('create')
const editing    = ref<Event | null>(null)
const saving     = ref(false)
const formErrors = ref<Record<string, string>>({})

const emptyForm = (): ExtendedEventForm => ({
  eventName: '', id_category: '', description: '', location: '', date_time: '', image_url: '',
  ticketTypes: [],
})

const form = ref<ExtendedEventForm>(emptyForm())

function openModal(m: 'create' | 'edit', ev?: Event) {
  mode.value    = m
  editing.value = ev ?? null
  formErrors.value = {}

  if (ev) {
    const existingTickets: TicketTypeRow[] = (ev.ticketTypes ?? []).map((tt: any) => ({
      id_catalog: String(tt.id_catalog),
      price:      String(tt.price),
      capacity:   String(tt.capacity),
    }))
    isPaid.value = existingTickets.length > 0
    form.value = {
      eventName:   ev.eventName,
      id_category: String(ev.id_category),
      description: ev.description,
      location:    ev.location,
      date_time:   ev.date_time ?? '',
      image_url:   ev.imageUrl ?? '',
      ticketTypes: existingTickets,
    }
  } else {
    isPaid.value = false
    form.value = emptyForm()
  }

  modalOpen.value = true
}

function closeModal() { modalOpen.value = false; formErrors.value = {} }

// ── Validación de tickets ──
function validateTicketTypes(): boolean {
  let valid = true
  if (!isPaid.value) return true

  if (form.value.ticketTypes.length === 0) {
    formErrors.value.ticketTypes = 'Agrega al menos un tipo de ticket.'
    return false
  }

  form.value.ticketTypes.forEach((tt, idx) => {
    if (!tt.id_catalog) {
      formErrors.value[`tt_${idx}_id_catalog`] = 'Selecciona un tipo.'
      valid = false
    }
    if (tt.price === '' || Number(tt.price) < 0) {
      formErrors.value[`tt_${idx}_price`] = 'Precio inválido.'
      valid = false
    }
    if (!tt.capacity || Number(tt.capacity) <= 0) {
      formErrors.value[`tt_${idx}_capacity`] = 'Capacidad debe ser mayor a 0.'
      valid = false
    }
  })
  return valid
}

async function save() {
  formErrors.value = {}
  if (!validateTicketTypes()) return

  saving.value = true

  try {
    const payload = {
      ...form.value,
      // Si es gratis, no enviamos ticketTypes (el back espera array vacío o ausente para evento gratis)
      ticketTypes: isPaid.value
        ? form.value.ticketTypes.map(tt => ({
            id_catalog: Number(tt.id_catalog),
            price:      Number(tt.price),
            capacity:   Number(tt.capacity),
          }))
        : [],
    }

    const result = mode.value === 'create'
      ? await createEvent(payload)
      : await updateEvent(editing.value!.id_event, payload)

    if (result.success) {
      closeModal()
    } else {
      formErrors.value = {
        ...(result.errors || {}),
        _global: result.message || '',
      }
    }
  } catch (error) {
    console.error('Error al guardar el evento:', error)
    formErrors.value = { _global: 'Error de conexión con el servidor.' }
  } finally {
    saving.value = false
  }
}

// ── Delete ──
const deleteConfirmOpen = ref(false)
const deletingEvent     = ref<Event | null>(null)
const deleting          = ref(false)

function confirmDelete(ev: Event) { deletingEvent.value = ev; deleteConfirmOpen.value = true }

async function handleDelete() {
  if (!deletingEvent.value) return
  deleting.value = true
  await deleteEvent(deletingEvent.value.id_event)
  deleting.value = false
  deleteConfirmOpen.value = false
}

async function handleRestore(id: number) {
  await restoreEvent(id)
}
</script>

<style scoped>
.filters { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.search-box { flex:1; min-width:200px; position:relative; display:flex; align-items:center; }
.search-icon { position:absolute; left:11px; color:var(--text-muted); pointer-events:none; }
.search-input { width:100%; background:var(--bg-surface); border:1px solid var(--border-strong); border-radius:var(--radius-md); color:var(--text-primary); font-size:.875rem; padding:9px 13px 9px 34px; outline:none; transition:border-color var(--transition),box-shadow var(--transition); }
.search-input::placeholder { color:var(--text-muted); }
.search-input:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(52,101,109,.1); }
.filter-select { background:var(--bg-surface); border:1px solid var(--border-strong); border-radius:var(--radius-md); color:var(--text-secondary); font-size:.85rem; padding:9px 13px; outline:none; cursor:pointer; }
.table-scroll { overflow-x:auto; }
.td-name { font-weight:600; font-size:.88rem; color:var(--text-primary); max-width:220px; }
.td-secondary { font-size:.84rem; color:var(--text-secondary); }
.actions { display:flex; gap:5px; justify-content:center; }
.row-deleted td { opacity:.5; }
.badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:.7rem; font-weight:700; letter-spacing:.04em; }
.badge--visible { background:var(--primary-pale); color:var(--primary); }
.badge--hidden  { background:var(--bg-elevated); color:var(--text-muted); }
.modal-enter-active,.modal-leave-active { transition:opacity 180ms ease; }
.modal-enter-from,.modal-leave-to { opacity:0; }

/* ── Ticket section ── */
.ticket-section {
  margin-top: 4px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 14px 16px 16px;
  background: var(--bg-elevated, #f8f9fa);
}
.ticket-section-label {
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
}

/* Toggle */
.ticket-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  overflow: hidden;
  width: fit-content;
  margin-bottom: 14px;
}
.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: .82rem;
  font-weight: 600;
  background: var(--bg-surface);
  color: var(--text-muted);
  border: none;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.toggle-btn:first-child { border-right: 1px solid var(--border-strong); }
.toggle-btn--active {
  background: var(--primary);
  color: #fff;
}
.toggle-btn:hover:not(.toggle-btn--active) {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

/* Free note */
.free-note {
  font-size: .82rem;
  color: var(--text-muted);
  margin: 0;
}

/* Ticket types builder */
.ticket-types-builder { display: flex; flex-direction: column; gap: 12px; }

.ticket-type-row {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  background: var(--bg-surface);
}
.ticket-type-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.ticket-type-row-title {
  font-size: .78rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.ticket-type-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.ticket-type-remove:hover { background: var(--danger-pale, #fef2f2); color: var(--danger); }

.ticket-type-fields {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
@media (max-width: 520px) {
  .ticket-type-fields { grid-template-columns: 1fr; }
}

.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: .78rem; font-weight: 600; color: var(--text-secondary); }
.field-label .required { color: var(--danger); }
.field-select,
.field-input {
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: .84rem;
  padding: 7px 10px;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  width: 100%;
}
.field-select:focus,
.field-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(52,101,109,.1);
}
.field-select.field-error,
.field-input.field-error { border-color: var(--danger); }
.field-error-msg { font-size: .74rem; color: var(--danger); }

.ticket-global-error {
  font-size: .8rem;
  color: var(--danger);
  margin: 0;
}

.ticket-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-pale, #e8f4f5);
  border: 1px dashed var(--primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background .15s, opacity .15s;
  width: fit-content;
}
.ticket-add-btn:hover:not(:disabled) { background: var(--primary-pale); opacity: .85; }
.ticket-add-btn:disabled { opacity: .4; cursor: not-allowed; }

.global-error {
  font-size: .82rem;
  color: var(--danger);
  margin-top: 4px;
}
</style>