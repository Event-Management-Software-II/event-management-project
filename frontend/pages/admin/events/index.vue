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
          {{ c.nameCategory }}
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
              <th>Valor</th>
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
              <td class="td-name">{{ ev.NameEvent }}</td>
              <td class="td-secondary">{{ ev.nameCategory }}</td>
              <td class="td-secondary">{{ ev.value === 0 ? 'Gratis' : `$${ev.value.toLocaleString('es-CO')}` }}</td>
              <td class="td-secondary">{{ ev.location }}</td>
              <td>
                <span :class="['badge', ev.deleted_at ? 'badge--hidden' : 'badge--visible']">
                  {{ ev.deleted_at ? 'Inactivo' : 'Activo' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <AppButtonAdmin variant="ghost" size="sm" icon-only @click="openModal('edit', ev)" title="Editar">
                    <template #icon>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      </svg>
                    </template>
                  </AppButtonAdmin>
                  <AppButtonAdmin v-if="!ev.deleted_at" variant="danger" size="sm" icon-only @click="confirmDelete(ev)" title="Eliminar">
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
              <AppInputAdmin v-model="form.NameEvent"    label="Nombre"      placeholder="Nombre del evento"   :error="formErrors.NameEvent"   required />
              <AppInputAdmin v-model="form.Id_category"  label="Categoría"   as="select"                       :error="formErrors.Id_category" required>
                <option value="" disabled>Selecciona una categoría</option>
                <option v-for="c in sortedActiveCategories" :key="c.id_category" :value="String(c.id_category)">
                  {{ c.nameCategory }}
                </option>
              </AppInputAdmin>
              <AppInputAdmin v-model="form.value"        label="Valor (COP)" placeholder="0"   type="number" :min="0" :error="formErrors.value" required />
              <AppInputAdmin v-model="form.description"  label="Descripción" as="textarea"     placeholder="Descripción del evento (mín. 20 caracteres)" :error="formErrors.description" required />
              <AppInputAdmin v-model="form.location"     label="Ubicación"   placeholder="Ciudad, lugar"       :error="formErrors.location"    required />
              <AppInputAdmin v-model="form.date_time"    label="Fecha y hora (opcional)" type="datetime-local" />
              <AppInputAdmin v-model="form.imageUrl"     label="URL imagen (opcional)"   placeholder="https://..." />
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
                ¿Seguro que quieres eliminar <strong>{{ deletingEvent?.NameEvent }}</strong>? El evento quedará inactivo.
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

onMounted(async () => {
  await Promise.all([fetchEventsAdmin(), fetchCategoriesAdmin()])
})

const searchQuery    = ref('')
const filterCategory = ref<number | ''>('')

const filteredEvents = computed(() => {
  return events.value.filter(ev => {
    const matchName = !searchQuery.value || ev.NameEvent.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCat  = !filterCategory.value || ev.Id_category === filterCategory.value
    return matchName && matchCat
  })
})

// ── Modal form ──
const modalOpen  = ref(false)
const mode       = ref<'create' | 'edit'>('create')
const editing    = ref<Event | null>(null)
const saving     = ref(false)
const formErrors = ref<Record<string, string>>({})

const emptyForm = (): EventForm => ({
  NameEvent: '', Id_category: '', value: '', description: '', location: '', date_time: '', imageUrl: '',
})
const form = ref<EventForm>(emptyForm())

function openModal(m: 'create' | 'edit', ev?: Event) {
  mode.value   = m
  editing.value = ev ?? null
  formErrors.value = {}
  form.value = ev
    ? { NameEvent: ev.NameEvent, Id_category: String(ev.Id_category), value: String(ev.value), description: ev.description, location: ev.location, date_time: ev.date_time ?? '', imageUrl: ev.imageUrl ?? '' }
    : emptyForm()
  modalOpen.value = true
}
function closeModal() { modalOpen.value = false; formErrors.value = {} }

async function save() {
  saving.value = true;
  
  try {
    const result = mode.value === 'create'
      ? await createEvent(form.value)
      : await updateEvent(editing.value!.id_event, form.value);

    if (result.success) {
      closeModal();
    } else {
      formErrors.value = { 
        ...(result.errors || {}), 
        _global: result.message || '' 
      };
    }
  } catch (error) {
    console.error('Error al guardar el evento:', error);
    formErrors.value = { _global: 'Error de conexión con el servidor.' };
  } finally {
    saving.value = false;
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
</style>